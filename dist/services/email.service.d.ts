/**
 * Email Service — Nodemailer integration for sending emails.
 *
 * Supports both SMTP (production) and Ethereal (dev/testing).
 * If SMTP_HOST is not set, falls back to Ethereal test accounts.
 */
type EmailPayload = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};
declare class EmailService {
    private transporter;
    /**
     * Lazily initialise the transporter.
     * Uses SMTP_* env vars if set, otherwise creates an Ethereal test account.
     */
    private getTransporter;
    /**
     * Send an email.
     * Returns the preview URL (Ethereal) or the messageId (SMTP).
     */
    send(payload: EmailPayload): Promise<string>;
    /**
     * Send a review-completed notification email.
     */
    sendReviewNotification(params: {
        to: string;
        username: string;
        repoFullName: string;
        commitId: string;
        score: number;
        issueCount: number;
        summary: string;
        reviewUrl: string;
    }): Promise<string>;
    /**
     * Send a weekly digest email.
     */
    sendWeeklyDigest(params: {
        to: string;
        username: string;
        weekStart: string;
        weekEnd: string;
        totalReviews: number;
        avgScore: number;
        totalIssues: number;
        repos: Array<{
            name: string;
            reviews: number;
            avgScore: number;
        }>;
        dashboardUrl: string;
    }): Promise<string>;
}
declare const emailService: EmailService;
export { emailService, EmailService };
//# sourceMappingURL=email.service.d.ts.map