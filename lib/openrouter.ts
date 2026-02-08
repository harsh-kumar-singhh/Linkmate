
export type AIErrorType = 'QUOTA_EXHAUSTED' | 'RATE_LIMIT' | 'TIMEOUT' | 'PROVIDER_ERROR' | 'LOGIC_ERROR' | 'UNKNOWN_ERROR';

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

export interface AIModel {
  id: string;
  priority: number;
  role: 'primary' | 'fallback';
}

export const AI_MODELS: AIModel[] = [
  {
    id: "mistralai/mistral-7b-instruct",
    priority: 1,
    role: "primary"
  },
  {
    id: "meta-llama/llama-3-8b-instruct",
    priority: 2,
    role: "fallback"
  }
];

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = "https://openrouter.ai/api/v1";

async function logAIEvent(event: {
  model_id: string;
  error_type?: AIErrorType;
  timestamp: string;
  attempt_number: number;
  success: boolean;
  message?: string;
}) {
  console.log(`[AI LOG] ${JSON.stringify(event)}`);
}

function classifyError(status: number, message: string): AIErrorType {
  if (status === 429) {
    if (message.toLowerCase().includes('quota') || message.toLowerCase().includes('credit')) {
      return 'QUOTA_EXHAUSTED';
    }
    return 'RATE_LIMIT';
  }
  if (status === 408 || status === 504) return 'TIMEOUT';
  if (status >= 500) return 'PROVIDER_ERROR';
  if (status === 400) return 'LOGIC_ERROR';
  return 'UNKNOWN_ERROR';
}

export async function generateWithFallback(
  messages: { role: string; content: string }[],
  options: { temperature?: number; max_tokens?: number; response_format?: { type: 'json_object' } } = {}
) {
  if (!OPENROUTER_API_KEY) {
    throw new AIError("OpenRouter API key not configured", "LOGIC_ERROR");
  }

  let lastError: AIError | null = null;
  const sortedModels = [...AI_MODELS].sort((a, b) => a.priority - b.priority);

  for (let i = 0; i < sortedModels.length; i++) {
    const model = sortedModels[i];
    const attempt = i + 1;

    try {
      console.log(`[AI] Attempt ${attempt} with model: ${model.id}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout

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
          max_tokens: options.max_tokens,
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
        throw new AIError("Empty response from AI", "PROVIDER_ERROR", model.id);
      }

      await logAIEvent({
        model_id: model.id,
        timestamp: new Date().toISOString(),
        attempt_number: attempt,
        success: true
      });

      return content;

    } catch (error: any) {
      const errorType = error instanceof AIError ? error.type : (error.name === 'AbortError' ? 'TIMEOUT' : 'UNKNOWN_ERROR');
      const errorMessage = error.message || "Unknown error occurred";
      
      lastError = new AIError(errorMessage, errorType, model.id);

      await logAIEvent({
        model_id: model.id,
        error_type: errorType,
        timestamp: new Date().toISOString(),
        attempt_number: attempt,
        success: false,
        message: errorMessage
      });

      // If it's a logic error (e.g. bad prompt/config), don't bother falling back
      if (errorType === 'LOGIC_ERROR') throw lastError;
      
      // Continue to next model
      console.warn(`[AI] Model ${model.id} failed (${errorType}). Trying next model...`);
    }
  }

  throw lastError || new AIError("All AI models failed", "UNKNOWN_ERROR");
}

export const USER_MESSAGES = {
  quota_exhausted: "AI generation is temporarily unavailable due to usage limits. Please try again later.",
  system_error: "We ran into an issue while generating your post. Please try again in a moment."
};

export function getPublicErrorMessage(error: any): string {
  if (error instanceof AIError && error.type === 'QUOTA_EXHAUSTED') {
    return USER_MESSAGES.quota_exhausted;
  }
  return USER_MESSAGES.system_error;
}
