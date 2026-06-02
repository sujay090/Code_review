/**
 * AI Service — Gemini REST API integration for code review.
 *
 * Uses the Gemini 2.0 Flash model with structured JSON output
 * so the response is always valid, typed JSON (no manual parsing).
 */

type GeminiIssue = {
  type: "BUG" | "SECURITY" | "PERFORMANCE" | "CODE_SMELL";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  filePath: string | null;
  lineNumber: number | null;
};

export type AiReviewResult = {
  summary: string;
  score: number;
  issues: GeminiIssue[];
};

/**
 * The JSON schema we send to Gemini to enforce structured output.
 * This ensures the model returns exactly the shape we need.
 */
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: {
      type: "STRING",
      description: "A concise overall summary of the code quality in the diff",
    },
    score: {
      type: "INTEGER",
      description:
        "A code quality score from 0 to 100 (100 = perfect, 0 = terrible)",
    },
    issues: {
      type: "ARRAY",
      description: "List of issues found in the code diff",
      items: {
        type: "OBJECT",
        properties: {
          type: {
            type: "STRING",
            enum: ["BUG", "SECURITY", "PERFORMANCE", "CODE_SMELL"],
            description: "The category of the issue",
          },
          severity: {
            type: "STRING",
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            description: "How severe the issue is",
          },
          title: {
            type: "STRING",
            description: "Short title summarising the issue",
          },
          description: {
            type: "STRING",
            description:
              "Detailed explanation of the issue and how to fix it",
          },
          filePath: {
            type: "STRING",
            description:
              "The file path where the issue was found, or null if not applicable",
            nullable: true,
          },
          lineNumber: {
            type: "INTEGER",
            description:
              "The line number where the issue was found, or null if not applicable",
            nullable: true,
          },
        },
        required: ["type", "severity", "title", "description"],
      },
    },
  },
  required: ["summary", "score", "issues"],
};

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
- If the diff is clean, return an empty issues array and a high score`;

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message: string;
  };
};

class AiService {
  /**
   * Send a commit diff to Gemini for code review analysis.
   * Returns a structured review result with summary, score, and issues.
   */
  async reviewCode(
    diff: string,
    repoFullName: string,
  ): Promise<AiReviewResult> {
    const apiKey = this.getRequiredEnv("GEMINI_API_KEY");
    const model = "gemini-2.0-flash";

    // Truncate very large diffs to stay within token limits
    const maxDiffLength = 30_000;
    const truncatedDiff =
      diff.length > maxDiffLength
        ? diff.slice(0, maxDiffLength) +
          "\n\n... [diff truncated due to length] ..."
        : diff;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Review the following git diff from the repository "${repoFullName}":\n\n\`\`\`diff\n${truncatedDiff}\n\`\`\``,
              },
            ],
          },
        ],
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gemini API error (${response.status}): ${errorText}`,
      );
    }

    const data = (await response.json()) as GeminiResponse;

    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    const result = JSON.parse(text) as AiReviewResult;

    // Clamp score to 0–100
    result.score = Math.max(0, Math.min(100, result.score));

    return result;
  }

  private getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    return value;
  }
}

const aiService = new AiService();

export { aiService, AiService };
