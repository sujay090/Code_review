/**
 * AI Service — NVIDIA NIM integration for code review.
 *
 * Uses NVIDIA's OpenAI-compatible chat completions API
 * with JSON mode for structured output.
 */
type ReviewIssue = {
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
    issues: ReviewIssue[];
};
declare class AiService {
    private apiKey;
    private model;
    constructor();
    /**
     * Send a commit diff to NVIDIA NIM for code review analysis.
     * Returns a structured review result with summary, score, and issues.
     */
    reviewCode(diff: string, repoFullName: string): Promise<AiReviewResult>;
}
declare const aiService: AiService;
export { aiService, AiService };
//# sourceMappingURL=ai.service.d.ts.map