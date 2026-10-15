import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env.js';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  response?: string;
  error?: string;
  isMock: boolean;
}

export interface EmailConfigStatus {
  configured: boolean;
  host: string | null;
  port: number;
  secure: boolean;
  userConfigured: boolean;
  from: string;
  activeAdminEmail?: string | null;
  mode: 'REAL_SMTP' | 'MOCK_TRANSPORT';
  appBaseUrl: string;
}

export interface MockEmailRecord {
  to: string;
  subject: string;
  html: string;
  text: string;
  sentAt: Date;
  messageId: string;
  from?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isSmtpConfigured = false;
  private mockMailBox: MockEmailRecord[] = [];
  private forceMockMode = false;
  private activeAdminEmail: string | null = null;

  constructor() {
    this.initTransporter();
  }

  public setActiveAdminEmail(email: string | null): void {
    if (email && email.trim().includes('@')) {
      this.activeAdminEmail = email.trim();
      console.log(`[EmailService] Active admin sender set to: ${this.activeAdminEmail}`);
    } else {
      this.activeAdminEmail = null;
    }
  }

  public getActiveSender(): string {
    if (this.activeAdminEmail) {
      return `LibTrack Admin <${this.activeAdminEmail}>`;
    }
    return env.EMAIL_FROM;
  }

  public initTransporter(): void {
    // Check if real SMTP host and credentials are supplied
    const hasHost = Boolean(env.EMAIL_HOST && env.EMAIL_HOST.trim().length > 0);
    const hasUser = Boolean(env.EMAIL_USER && env.EMAIL_USER.trim().length > 0);

    if (hasHost && !this.forceMockMode && env.NODE_ENV !== 'test') {
      try {
        this.transporter = nodemailer.createTransport({
          host: env.EMAIL_HOST,
          port: env.EMAIL_PORT,
          secure: env.EMAIL_SECURE,
          auth: hasUser
            ? {
                user: env.EMAIL_USER,
                pass: env.EMAIL_PASSWORD || '',
              }
            : undefined,
          tls: {
            rejectUnauthorized: env.NODE_ENV === 'production',
          },
        });
        this.isSmtpConfigured = true;
        console.log(`[EmailService] Configured real SMTP transport: ${env.EMAIL_HOST}:${env.EMAIL_PORT}`);
      } catch (err) {
        console.warn(`[EmailService] Failed to initialize SMTP transport, falling back to mock:`, err);
        this.isSmtpConfigured = false;
        this.transporter = null;
      }
    } else {
      this.isSmtpConfigured = false;
      this.transporter = null;
      if (env.NODE_ENV !== 'test') {
        console.log(`[EmailService] No external SMTP credentials detected. Operating in safe MOCK_TRANSPORT mode.`);
      }
    }
  }

  public setForceMock(mock: boolean): void {
    this.forceMockMode = mock;
    this.initTransporter();
  }

  public isConfigured(): boolean {
    return this.isSmtpConfigured;
  }

  public getConfigStatus(): EmailConfigStatus {
    return {
      configured: this.isSmtpConfigured,
      host: env.EMAIL_HOST || null,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_SECURE,
      userConfigured: Boolean(env.EMAIL_USER && env.EMAIL_USER.length > 0),
      from: this.getActiveSender(),
      activeAdminEmail: this.activeAdminEmail,
      mode: this.isSmtpConfigured ? 'REAL_SMTP' : 'MOCK_TRANSPORT',
      appBaseUrl: env.APP_BASE_URL,
    };
  }

  public async verifyConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isSmtpConfigured || !this.transporter) {
      return {
        success: true,
        message: 'Mock transport active: notifications will be safely simulated and recorded without external network calls.',
      };
    }

    try {
      await this.transporter.verify();
      return {
        success: true,
        message: `Connected successfully to SMTP server at ${env.EMAIL_HOST}:${env.EMAIL_PORT}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `SMTP connection verification failed: ${err?.message || 'Unknown network error'}`,
      };
    }
  }

  /**
   * Dispatches email with bounded retry logic and error logging (without leaking credentials)
   */
  public async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    const sender = options.from || this.getActiveSender();

    // 1. Safe Mock Transport Mode
    if (!this.isSmtpConfigured || !this.transporter || this.forceMockMode || env.NODE_ENV === 'test') {
      const mockId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const record: MockEmailRecord = {
        to: options.to,
        from: sender,
        subject: options.subject,
        html: options.html,
        text: options.text,
        sentAt: new Date(),
        messageId: mockId,
      };
      this.mockMailBox.push(record);

      return {
        success: true,
        messageId: mockId,
        response: `250 Mock email accepted from ${sender}`,
        isMock: true,
      };
    }

    // 2. Real SMTP Transport with bounded retry (max 2 attempts)
    let lastError: any = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const info = await this.transporter.sendMail({
          from: sender,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });

        return {
          success: true,
          messageId: info.messageId,
          response: info.response || 'Accepted by SMTP provider',
          isMock: false,
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`[EmailService] Attempt ${attempt} failed for recipient ${options.to}:`, err?.message || err);
        // Short backoff before second attempt
        if (attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Failed to dispatch email after 2 attempts',
      isMock: false,
    };
  }

  // Testing helpers
  public getMockMails(): MockEmailRecord[] {
    return [...this.mockMailBox];
  }

  public clearMockMails(): void {
    this.mockMailBox = [];
  }
}

export const emailService = new EmailService();
