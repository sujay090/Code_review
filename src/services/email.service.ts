/**
 * Email Service — Nodemailer integration for sending emails.
 *
 * Supports both SMTP (production) and Ethereal (dev/testing).
 * If SMTP_HOST is not set, falls back to Ethereal test accounts.
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

class EmailService {
  private transporter: Transporter | null = null;

  /**
   * Lazily initialise the transporter.
   * Uses SMTP_* env vars if set, otherwise creates an Ethereal test account.
   */
  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      // Production SMTP
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      // Development — use Ethereal fake SMTP
      const testAccount = await nodemailer.createTestAccount();

      this.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.log(
        `[Email] Using Ethereal test account: ${testAccount.user}`,
      );
    }

    return this.transporter;
  }

  /**
   * Send an email.
   * Returns the preview URL (Ethereal) or the messageId (SMTP).
   */
  async send(payload: EmailPayload): Promise<string> {
    const transporter = await this.getTransporter();

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM ?? '"Code Review AI" <noreply@codereview.ai>',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    // In dev, log the Ethereal preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Email] Preview: ${previewUrl}`);
      return previewUrl as string;
    }

    return info.messageId;
  }

  /**
   * Send a review-completed notification email.
   */
  async sendReviewNotification(params: {
    to: string;
    username: string;
    repoFullName: string;
    commitId: string;
    score: number;
    issueCount: number;
    summary: string;
    reviewUrl: string;
  }): Promise<string> {
    const scoreColor =
      params.score >= 90
        ? "#10b981"
        : params.score >= 70
          ? "#06b6d4"
          : params.score >= 50
            ? "#f59e0b"
            : "#ef4444";

    return this.send({
      to: params.to,
      subject: `Code Review: ${params.repoFullName} scored ${params.score}/100`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #0e7490, #7c3aed); padding: 32px 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">Code Review Complete</h1>
            <p style="margin: 8px 0 0; color: #cbd5e1; font-size: 14px;">${params.repoFullName}</p>
          </div>
          <div style="padding: 24px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; width: 80px; height: 80px; line-height: 80px; border-radius: 16px; background: ${scoreColor}20; border: 2px solid ${scoreColor}; font-size: 32px; font-weight: bold; color: ${scoreColor};">
                ${params.score}
              </div>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Quality Score</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Commit</td>
                <td style="padding: 8px 0; color: #e2e8f0; font-size: 13px; text-align: right; font-family: monospace;">${params.commitId.slice(0, 7)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Issues Found</td>
                <td style="padding: 8px 0; color: ${params.issueCount > 0 ? "#f59e0b" : "#10b981"}; font-size: 13px; text-align: right; font-weight: 600;">${params.issueCount}</td>
              </tr>
            </table>
            <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">${params.summary}</p>
            </div>
            <a href="${params.reviewUrl}" style="display: block; text-align: center; background: #06b6d4; color: #0f172a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Full Review</a>
          </div>
          <div style="padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b;">
            <p style="margin: 0; color: #475569; font-size: 11px;">Code Review AI · Automated code analysis powered by Gemini</p>
          </div>
        </div>
      `,
      text: `Code Review Complete — ${params.repoFullName}\n\nScore: ${params.score}/100\nCommit: ${params.commitId.slice(0, 7)}\nIssues: ${params.issueCount}\n\n${params.summary}\n\nView: ${params.reviewUrl}`,
    });
  }

  /**
   * Send a weekly digest email.
   */
  async sendWeeklyDigest(params: {
    to: string;
    username: string;
    weekStart: string;
    weekEnd: string;
    totalReviews: number;
    avgScore: number;
    totalIssues: number;
    repos: Array<{ name: string; reviews: number; avgScore: number }>;
    dashboardUrl: string;
  }): Promise<string> {
    const repoRows = params.repos
      .map(
        (r) =>
          `<tr>
            <td style="padding: 8px 12px; color: #e2e8f0; font-size: 13px;">${r.name}</td>
            <td style="padding: 8px 12px; color: #94a3b8; font-size: 13px; text-align: center;">${r.reviews}</td>
            <td style="padding: 8px 12px; color: ${r.avgScore >= 70 ? "#10b981" : "#f59e0b"}; font-size: 13px; text-align: center; font-weight: 600;">${r.avgScore}</td>
          </tr>`,
      )
      .join("");

    return this.send({
      to: params.to,
      subject: `Weekly Digest: ${params.totalReviews} reviews, avg score ${params.avgScore}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #7c3aed, #0e7490); padding: 32px 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">Weekly Digest</h1>
            <p style="margin: 8px 0 0; color: #cbd5e1; font-size: 14px;">${params.weekStart} — ${params.weekEnd}</p>
          </div>
          <div style="padding: 24px;">
            <div style="display: flex; gap: 12px; margin-bottom: 24px;">
              <div style="flex: 1; background: #1e293b; border-radius: 8px; padding: 16px; text-align: center;">
                <p style="margin: 0; font-size: 28px; font-weight: bold; color: #06b6d4;">${params.totalReviews}</p>
                <p style="margin: 4px 0 0; font-size: 11px; color: #64748b; text-transform: uppercase;">Reviews</p>
              </div>
              <div style="flex: 1; background: #1e293b; border-radius: 8px; padding: 16px; text-align: center;">
                <p style="margin: 0; font-size: 28px; font-weight: bold; color: ${params.avgScore >= 70 ? "#10b981" : "#f59e0b"};">${params.avgScore}</p>
                <p style="margin: 4px 0 0; font-size: 11px; color: #64748b; text-transform: uppercase;">Avg Score</p>
              </div>
              <div style="flex: 1; background: #1e293b; border-radius: 8px; padding: 16px; text-align: center;">
                <p style="margin: 0; font-size: 28px; font-weight: bold; color: #f59e0b;">${params.totalIssues}</p>
                <p style="margin: 4px 0 0; font-size: 11px; color: #64748b; text-transform: uppercase;">Issues</p>
              </div>
            </div>
            ${params.repos.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="border-bottom: 1px solid #334155;">
                  <th style="padding: 10px 12px; color: #64748b; font-size: 11px; text-align: left; text-transform: uppercase;">Repository</th>
                  <th style="padding: 10px 12px; color: #64748b; font-size: 11px; text-align: center; text-transform: uppercase;">Reviews</th>
                  <th style="padding: 10px 12px; color: #64748b; font-size: 11px; text-align: center; text-transform: uppercase;">Avg Score</th>
                </tr>
              </thead>
              <tbody>${repoRows}</tbody>
            </table>` : ""}
            <a href="${params.dashboardUrl}" style="display: block; text-align: center; background: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 24px;">Open Dashboard</a>
          </div>
          <div style="padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b;">
            <p style="margin: 0; color: #475569; font-size: 11px;">Code Review AI · Weekly Report</p>
          </div>
        </div>
      `,
      text: `Weekly Digest (${params.weekStart} – ${params.weekEnd})\n\nReviews: ${params.totalReviews}\nAvg Score: ${params.avgScore}\nIssues: ${params.totalIssues}\n\nView: ${params.dashboardUrl}`,
    });
  }
}

const emailService = new EmailService();

export { emailService, EmailService };
