import { createHmac, timingSafeEqual } from "node:crypto";

type GithubWebhookResponse = {
    id: number;
    active: boolean;
    events: string[];
    config: {
        url: string;
        content_type: string;
        secret?: string;
    };
};

class WebhookService {
    /**
     * Register a webhook on a GitHub repository.
     * Returns the webhook ID assigned by GitHub.
     */
    async registerWebhook(
        accessToken: string,
        repoFullName: string,
    ): Promise<string> {
        const webhookSecret = this.getRequiredEnv("GITHUB_WEBHOOK_SECRET");
        const baseUrl = this.getRequiredEnv("WEBHOOK_BASE_URL");
        const webhookUrl = `${baseUrl}/api/webhooks/github`;

        const response = await fetch(
            `https://api.github.com/repos/${repoFullName}/hooks`,
            {
                method: "POST",
                headers: {
                    Accept: "application/vnd.github+json",
                    Authorization: `Bearer ${accessToken}`,
                    "X-GitHub-Api-Version": "2022-11-28",
                },
                body: JSON.stringify({
                    name: "web",
                    active: true,
                    events: ["push"],
                    config: {
                        url: webhookUrl,
                        content_type: "json",
                        secret: webhookSecret,
                        insecure_ssl: "0",
                    },
                }),
            },
        );

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(
                `Failed to register webhook on ${repoFullName} (${response.status}): ${errorBody}`,
            );
        }

        const data = (await response.json()) as GithubWebhookResponse;
        return String(data.id);
    }

    /**
     * Remove a webhook from a GitHub repository.
     */
    async removeWebhook(
        accessToken: string,
        repoFullName: string,
        webhookId: string,
    ): Promise<void> {
        const response = await fetch(
            `https://api.github.com/repos/${repoFullName}/hooks/${webhookId}`,
            {
                method: "DELETE",
                headers: {
                    Accept: "application/vnd.github+json",
                    Authorization: `Bearer ${accessToken}`,
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            },
        );

        // 204 = success, 404 = already removed — both are fine
        if (!response.ok && response.status !== 404) {
            throw new Error(
                `Failed to remove webhook ${webhookId} from ${repoFullName} (${response.status})`,
            );
        }
    }

    /**
     * Verify the HMAC-SHA256 signature from GitHub's `X-Hub-Signature-256` header.
     * Uses constant-time comparison to prevent timing attacks.
     * this part is important
     */
    verifySignature(
        payload: string | Buffer,
        signatureHeader: string,
        secret: string,
    ): boolean {
        const hmac = createHmac("sha256", secret);
        hmac.update(payload);
        const expected = `sha256=${hmac.digest("hex")}`;

        if (expected.length !== signatureHeader.length) {
            return false;
        }

        return timingSafeEqual(
            Buffer.from(expected),
            Buffer.from(signatureHeader),
        );
    }

    private getRequiredEnv(key: string): string {
        const value = process.env[key];
        if (!value) {
            throw new Error(`Missing environment variable: ${key}`);
        }
        return value;
    }
}

const webhookService = new WebhookService();

export { webhookService, WebhookService };
