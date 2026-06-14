/**
 * AI Service — NVIDIA NIM integration for code review.
 *
 * Uses NVIDIA's OpenAI-compatible chat completions API
 * with JSON mode for structured output.
 */
const SYSTEM_PROMPT = `You are an expert code reviewer. You will receive a git diff and must analyse it for:

1. **Bugs** — Logic errors, null/undefined issues, off-by-one errors, race conditions
2. **Security** — Injection vulnerabilities, exposed secrets, insecure patterns
3. **Performance** — Unnecessary loops, memory leaks, N+1 queries, inefficient algorithms
4. **Code Smells** — Poor naming, duplicated code, overly complex functions, missing error handling

Guidelines:
- Only report real, actionable issues — not style preferences
- Be specific about file paths and line numbers when possible
- Provide clear fix suggestions in the description
- Score fairly: 90-100 = excellent, 70-89 = good, 50-69 = needs improvement, below 50 = significant issues
- If the diff is clean, return an empty issues array and a high score

You MUST respond with valid JSON matching this exact schema:
{
  "summary": "string — concise overall summary of code quality",
  "score": "integer 0-100 — code quality score",
  "issues": [
    {
      "type": "BUG | SECURITY | PERFORMANCE | CODE_SMELL",
      "severity": "LOW | MEDIUM | HIGH | CRITICAL",
      "title": "string — short title",
      "description": "string — detailed explanation and fix suggestion",
      "filePath": "string | null — file path where issue was found",
      "lineNumber": "integer | null — line number where issue was found"
    }
  ]
}

Respond ONLY with the JSON object. No markdown, no explanation, no code fences.`;
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
class AiService {
    apiKey;
    model;
    constructor() {
        const apiKey = process.env.NVIDIA_KEY;
        if (!apiKey) {
            throw new Error("Missing environment variable: NVIDIA_KEY");
        }
        this.apiKey = apiKey;
        this.model = "meta/llama-3.3-70b-instruct";
    }
    /**
     * Send a commit diff to NVIDIA NIM for code review analysis.
     * Returns a structured review result with summary, score, and issues.
     */
    async reviewCode(diff, repoFullName) {
        // Truncate very large diffs to stay within token limits
        const maxDiffLength = 30_000;
        const truncatedDiff = diff.length > maxDiffLength
            ? diff.slice(0, maxDiffLength) +
                "\n\n... [diff truncated due to length] ..."
            : diff;
        const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: SYSTEM_PROMPT,
                    },
                    {
                        role: "user",
                        content: `Review the following git diff from the repository "${repoFullName}":\n\n\`\`\`diff\n${truncatedDiff}\n\`\`\``,
                    },
                ],
                temperature: 0.3,
                max_tokens: 4096,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`NVIDIA NIM API error (${response.status}): ${errorText}`);
        }
        const data = (await response.json());
        if (data.error) {
            throw new Error(`NVIDIA NIM API error: ${data.error.message}`);
        }
        const text = data.choices?.[0]?.message?.content;
        if (!text) {
            throw new Error("NVIDIA NIM returned an empty response");
        }
        // Strip markdown code fences if the model wraps the JSON
        const cleaned = text
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
        const result = JSON.parse(cleaned);
        // Clamp score to 0–100
        result.score = Math.max(0, Math.min(100, result.score));
        return result;
    }
}
const aiService = new AiService();
export { aiService, AiService };
//# sourceMappingURL=ai.service.js.map