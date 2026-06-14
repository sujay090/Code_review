declare class WebhookService {
    /**
     * Register a webhook on a GitHub repository.
     * Returns the webhook ID assigned by GitHub.
     */
    registerWebhook(accessToken: string, repoFullName: string): Promise<string>;
    /**
     * Remove a webhook from a GitHub repository.
     */
    removeWebhook(accessToken: string, repoFullName: string, webhookId: string): Promise<void>;
    /**
     * Verify the HMAC-SHA256 signature from GitHub's `X-Hub-Signature-256` header.
     * Uses constant-time comparison to prevent timing attacks.
     * this part is important
     */
    verifySignature(payload: string | Buffer, signatureHeader: string, secret: string): boolean;
    private getRequiredEnv;
}
declare const webhookService: WebhookService;
export { webhookService, WebhookService };
//# sourceMappingURL=webhook.service.d.ts.map