export type AITask = "linkedin_post" | "linkedin_long_form" | "ai_coach";

export interface AIModelConfig {
  id: string;
  priority: number;
  role: "primary" | "fallback";
  maxTokens: number;
  timeoutMs: number;
}

interface TokenPolicy {
  defaultMaxTokens: number;
  maxTokens: number;
}

export const AI_TOKEN_POLICY = {
  hardMaxTokens: 2000,
  tasks: {
    linkedin_post: {
      defaultMaxTokens: 800,
      maxTokens: 1200,
    },
    linkedin_long_form: {
      defaultMaxTokens: 1400,
      maxTokens: 2000,
    },
    ai_coach: {
      defaultMaxTokens: 900,
      maxTokens: 1200,
    },
  } satisfies Record<AITask, TokenPolicy>,
};

export const AI_MODELS: AIModelConfig[] = [
  {
    id: "google/gemini-2.5-flash",
    priority: 1,
    role: "primary",
    maxTokens: 1200,
    timeoutMs: 8000,
  },
  {
    id: "google/gemini-2.5-flash-lite",
    priority: 2,
    role: "fallback",
    maxTokens: 1200,
    timeoutMs: 8000,
  },
  {
    id: "meta-llama/llama-3.1-8b-instruct",
    priority: 3,
    role: "fallback",
    maxTokens: 1000,
    timeoutMs: 10000,
  },
];

export function getModelConfig(modelId: string): AIModelConfig | undefined {
  return AI_MODELS.find((model) => model.id === modelId);
}

export function isTokenAllocationError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("more credits") ||
    normalized.includes("fewer max_tokens") ||
    normalized.includes("max_tokens") ||
    normalized.includes("token budget") ||
    normalized.includes("context_length")
  );
}

export function resolveTokenBudget({
  requestedMaxTokens,
  task = "linkedin_post",
  model,
}: {
  requestedMaxTokens?: number;
  task?: AITask;
  model?: Pick<AIModelConfig, "id" | "maxTokens">;
}) {
  const taskPolicy = AI_TOKEN_POLICY.tasks[task];
  const requested = normalizeRequestedTokens(requestedMaxTokens, taskPolicy.defaultMaxTokens);
  const allowedMaximum = Math.min(
    taskPolicy.maxTokens,
    model?.maxTokens ?? AI_TOKEN_POLICY.hardMaxTokens,
    AI_TOKEN_POLICY.hardMaxTokens
  );
  const sent = Math.min(requested, allowedMaximum);

  return {
    task,
    requested,
    sent,
    allowedMaximum,
    clamped: sent !== requested,
    model_id: model?.id,
  };
}

export function getReducedTokenBudget(currentTokens: number, task: AITask = "linkedin_post") {
  const taskDefault = AI_TOKEN_POLICY.tasks[task].defaultMaxTokens;
  return Math.max(256, Math.min(taskDefault, Math.floor(currentTokens / 2)));
}

function normalizeRequestedTokens(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value) || value === undefined) return fallback;
  return Math.max(1, Math.floor(value));
}
