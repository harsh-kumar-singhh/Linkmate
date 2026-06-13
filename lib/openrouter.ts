import { AI_CORE_CONFIG } from "./ai/config";
import {
  AITask,
  AI_MODELS,
  getReducedTokenBudget,
  isTokenAllocationError,
  resolveTokenBudget,
} from "./ai/model-config";

export type AIErrorType = 'QUOTA_EXCEEDED' | 'RATE_LIMIT' | 'TIMEOUT' | 'MODEL_FAILURE' | 'LOGIC_ERROR' | 'AUTH_MISSING' | 'TOKEN_ALLOCATION' | 'UNKNOWN_INTERNAL';

export class AIError extends Error {
  type: AIErrorType;
  model_id?: string;

  constructor(message: string, type: AIErrorType, model_id?: string) {
    super(message);
    this.name = 'AIError';
    this.type = type;
    this.model_id = model_id;
  }
}

export { AI_MODELS };

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = "https://openrouter.ai/api/v1";

async function logAIEvent(event: {
  model_id: string;
  error_type?: AIErrorType;
  timestamp: string;
  attempt_number: number;
  model_attempt_number?: number;
  success: boolean;
  task?: AITask;
  requested_max_tokens?: number;
  sent_max_tokens?: number;
  allowed_max_tokens?: number;
  latency_ms?: number;
  fallback_reason?: AIErrorType | "TOKEN_CLAMPED";
  message?: string;
}) {
  // Only log detailed JSON in production if it's an error, or keep it simple
  if (!event.success || process.env.NODE_ENV === 'development') {
    console.log(`[AI LOG] ${JSON.stringify(event)}`);
  }
}

function classifyError(status: number, message: string): AIErrorType {
  const msg = message.toLowerCase();

  if (isTokenAllocationError(msg)) return 'TOKEN_ALLOCATION';
  
  if (status === 429) {
    if (msg.includes('quota') || msg.includes('credit')) {
      return 'QUOTA_EXCEEDED';
    }
    return 'RATE_LIMIT';
  }
  
  // Specific OpenRouter / Provider errors
  if (msg.includes('no endpoints') || msg.includes('model not found') || msg.includes('provider returned error')) {
    return 'MODEL_FAILURE';
  }

  if (status === 408 || status === 504) return 'TIMEOUT';
  if (status >= 500) return 'MODEL_FAILURE';
  if (status === 401) return 'AUTH_MISSING';
  if (status === 400) {
    if (msg.includes('context_length')) return 'TOKEN_ALLOCATION';
    return 'LOGIC_ERROR';
  }
  return 'UNKNOWN_INTERNAL';
}

export async function generateWithFallback(
  messages: { role: string; content: string }[],
  options: { temperature?: number; max_tokens?: number; response_format?: { type: 'json_object' }; timeoutMs?: number; task?: AITask } = {}
) {
  if (!OPENROUTER_API_KEY) {
    throw new AIError("OpenRouter API key not configured", "LOGIC_ERROR");
  }

  let lastError: AIError | null = null;
  const sortedModels = [...AI_MODELS].sort((a, b) => a.priority - b.priority);

  for (let i = 0; i < sortedModels.length; i++) {
    const model = sortedModels[i];
    const attempt = i + 1;
    let modelAttempt = 1;
    let requestedMaxTokens = options.max_tokens;

    while (modelAttempt <= 2) {
      const startedAt = Date.now();
      const tokenBudget = resolveTokenBudget({
        requestedMaxTokens,
        task: options.task,
        model,
      });

      if (tokenBudget.clamped) {
        console.warn(
          `[AI] Clamped max_tokens for ${model.id}: requested=${tokenBudget.requested}, allowed=${tokenBudget.allowedMaximum}, sent=${tokenBudget.sent}`
        );
      }

      try {
        console.log(
          `[AI] Attempt ${attempt}.${modelAttempt} with model: ${model.id} | task=${tokenBudget.task} | max_tokens=${tokenBudget.sent}`
        );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? model.timeoutMs);

        const response = await fetch(`${BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
            "X-Title": "LinkMate"
          },
          body: JSON.stringify({
            model: model.id,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: tokenBudget.sent,
            response_format: options.response_format
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
          const errorType = classifyError(response.status, data?.error?.message || "");
          throw new AIError(data?.error?.message || "OpenRouter Request Failed", errorType, model.id);
        }

        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          throw new AIError("Empty response from AI", "MODEL_FAILURE", model.id);
        }

        if (attempt > 1 || modelAttempt > 1) {
          console.log(`[AI] Recovery success with model: ${model.id} on attempt ${attempt}.${modelAttempt}`);
        }

        await logAIEvent({
          model_id: model.id,
          timestamp: new Date().toISOString(),
          attempt_number: attempt,
          model_attempt_number: modelAttempt,
          success: true,
          task: tokenBudget.task,
          requested_max_tokens: tokenBudget.requested,
          sent_max_tokens: tokenBudget.sent,
          allowed_max_tokens: tokenBudget.allowedMaximum,
          latency_ms: Date.now() - startedAt,
          fallback_reason: tokenBudget.clamped ? "TOKEN_CLAMPED" : undefined,
        });

        return content;

      } catch (error: any) {
        const errorType = error instanceof AIError ? error.type : (error.name === 'AbortError' ? 'TIMEOUT' : 'UNKNOWN_INTERNAL');
        const errorMessage = error.message || "Unknown error occurred";

        lastError = new AIError(errorMessage, errorType, model.id);

        // CRITICAL: Log detailed error in dev to help debugging
        if (process.env.NODE_ENV === 'development') {
          console.error(`[AI ERROR] [${model.id}] [${errorType}]:`, errorMessage);
        }

        await logAIEvent({
          model_id: model.id,
          error_type: errorType,
          timestamp: new Date().toISOString(),
          attempt_number: attempt,
          model_attempt_number: modelAttempt,
          success: false,
          task: tokenBudget.task,
          requested_max_tokens: tokenBudget.requested,
          sent_max_tokens: tokenBudget.sent,
          allowed_max_tokens: tokenBudget.allowedMaximum,
          latency_ms: Date.now() - startedAt,
          fallback_reason: errorType,
          message: errorMessage
        });

        if (errorType === 'TOKEN_ALLOCATION' && modelAttempt === 1) {
          requestedMaxTokens = getReducedTokenBudget(tokenBudget.sent, tokenBudget.task);
          console.warn(
            `[AI] Token allocation failed for ${model.id}. Retrying same model with max_tokens=${requestedMaxTokens} before fallback.`
          );
          modelAttempt++;
          continue;
        }

        // If it's a logic error (e.g. bad prompt/config), don't bother falling back
        if (errorType === 'LOGIC_ERROR') throw lastError;

        // Continue to next model if available
        if (i < sortedModels.length - 1) {
          console.warn(`[AI] Model ${model.id} failed (${errorType}). Trying next model: ${sortedModels[i+1].id}...`);
        } else {
          console.error(`[AI] Final model ${model.id} failed (${errorType}). No more fallbacks.`);
        }
        break;
      }
    }
  }

  throw lastError || new AIError("All AI models failed", "UNKNOWN_INTERNAL");
}

export const USER_MESSAGES = {
  unauthorized: AI_CORE_CONFIG.ERROR_MESSAGES.session_issue,
  quota_exhausted: AI_CORE_CONFIG.ERROR_MESSAGES.quota_exceeded_post,
  model_failure: "The AI service is temporarily busy. Please try again in 30 seconds.",
  unknown: AI_CORE_CONFIG.ERROR_MESSAGES.unknown_internal
};

export function getPublicErrorMessage(error: any): string {
  if (error instanceof AIError) {
    if (error.type === 'QUOTA_EXCEEDED') {
      return USER_MESSAGES.quota_exhausted;
    }
    if (error.type === 'MODEL_FAILURE' || error.type === 'RATE_LIMIT' || error.type === 'TIMEOUT' || error.type === 'TOKEN_ALLOCATION') {
      return USER_MESSAGES.model_failure;
    }
    if (error.type === 'AUTH_MISSING') {
      return USER_MESSAGES.unauthorized;
    }
  }
  return USER_MESSAGES.unknown;
}

/**
 * Returns a structured error response for the AI Coach
 */
export function getCoachErrorResponse(error: any) {
  const message = getPublicErrorMessage(error);
  let code = AI_CORE_CONFIG.ERROR_CATEGORIES.UNKNOWN_INTERNAL;

  if (error instanceof AIError) {
    if (error.type === 'QUOTA_EXCEEDED') code = AI_CORE_CONFIG.ERROR_CATEGORIES.QUOTA_EXCEEDED;
    else if (error.type === 'AUTH_MISSING') code = AI_CORE_CONFIG.ERROR_CATEGORIES.AUTH_MISSING;
    else if (error.type === 'TIMEOUT') code = AI_CORE_CONFIG.ERROR_CATEGORIES.TIMEOUT;
    else if (error.type === 'MODEL_FAILURE' || error.type === 'RATE_LIMIT' || error.type === 'TOKEN_ALLOCATION') code = AI_CORE_CONFIG.ERROR_CATEGORIES.MODEL_FAILURE;
  }

  return { error: message, code };
}
