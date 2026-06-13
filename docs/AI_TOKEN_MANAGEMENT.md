# AI Token Management

LinkMate centralizes AI model routing and token budgets in `lib/ai/model-config.ts`.

## Source of truth

`lib/ai/model-config.ts` owns:

- model IDs
- fallback priority
- per-model `maxTokens`
- per-model timeout defaults
- per-task default and maximum token budgets
- the global hard cap
- token clamping helpers
- token allocation error detection

Do not add raw `max_tokens` defaults directly in API routes or feature code. Callers should pass the task name and an optional requested token budget to `generateWithFallback`, then let `resolveTokenBudget` decide what is safe to send.

## Current tasks

- `linkedin_post`: normal LinkedIn post generation. Default budget is `800`, max is `1200`.
- `linkedin_long_form`: longer LinkedIn-style drafts. Default budget is `1400`, max is `2000`.
- `ai_coach`: structured AI Coach responses. Default budget is `900`, max is `1200`.

No task can exceed the global `hardMaxTokens` cap of `2000`.

## Request flow

1. Feature code calls `generatePost` or `generateWithFallback`.
2. `generateWithFallback` resolves the model from `AI_MODELS`.
3. `resolveTokenBudget` computes:
   - requested token budget
   - allowed maximum
   - actual token budget sent to OpenRouter
   - whether clamping happened
4. OpenRouter requests always include `max_tokens`.
5. If OpenRouter reports a token allocation error, the same model is retried once with a reduced budget before moving to the next fallback model.

## Root cause of the 65535-token issue

Manual LinkedIn post generation did not provide `maxTokens`. `lib/openrouter.ts` forwarded `max_tokens: undefined`, which `JSON.stringify` omitted from the request body. OpenRouter/provider defaults then treated the request as allowing a very large completion budget, seen in logs as `65535` tokens. Premium Gemini models rejected the request for insufficient credits before fallback eventually reached Llama.

The fix is architectural: every OpenRouter request now receives a centrally resolved and clamped `max_tokens` value.

## Monitoring

AI logs include:

- model used
- task
- requested token budget
- actual token budget sent
- allowed maximum
- latency
- fallback or clamp reason

When clamping occurs, a warning is logged with the requested, allowed, and sent values.
