# AI Provider Abstraction

CareerGPT relies on Large Language Models (LLMs) to perform:
- Non-deterministic Resume Semantic Analysis
- Interview Agent Generation & Answer Analysis
- Roadmap Rationale and Project Scoping

## Providers Supported
- **Google Gemini** (Default): High performance, cost-effective multimodal analysis.
- **OpenAI GPT**: Available fallback for text-dominant tasks.
- **Mock Provider**: Deterministic offline provider for tests, CI/CD, and demo environments.

## Cost & Observability
- CareerGPT forces `max_tokens` per query.
- Prompts are rigorously template-driven preventing infinite generative looping.
- Every API call tracks `tokens_used` and `duration_ms` via `provider.py`.
- Hard-coded rate limits prevent malicious users from draining API quotas.

## Resiliency
The Gemini provider features built-in retry logic to handle temporary `429 Too Many Requests` or `ResourceExhausted` errors with exponential backoff (capped to avoid hanging requests).
