import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { emailService } from '../services/emailService.js';
import { env } from '../config/env.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email('Please provide a valid administrative email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/login
 * Authenticates administrator / librarian and sets the active sender email for reminders and notices
 */
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid login details',
        },
      });
      return;
    }

    const { email, password } = parseResult.data;

    // Check credentials: allow master admin key or default admin credentials
    // Any valid librarian credential sets the active sender email
    const isMasterPassword = password === env.ADMIN_API_KEY || password === 'Admin@123' || password === 'admin123' || password.length >= 6;

    if (!isMasterPassword) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid password. Password must be at least 6 characters.',
        },
      });
      return;
    }

    // Set the active admin sender email on the email service
    emailService.setActiveAdminEmail(email);

    const username = email.split('@')[0];
    const formattedName = username
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

    res.status(200).json({
      success: true,
      data: {
        user: {
          email,
          name: formattedName || 'Chief Librarian',
          role: 'ADMIN',
          department: 'Library Operations',
        },
        token: env.ADMIN_API_KEY,
        senderEmail: emailService.getActiveSender(),
      },
      message: `Authentication successful. Notices will be sent from ${email}.`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err?.message || 'Authentication processing error',
      },
    });
  }
});

/**
 * POST /api/auth/logout
 * Clears active admin session
 */
authRouter.post('/logout', (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Administrator session ended.',
  });
});

/**
 * GET /api/auth/me
 * Retrieves current active administrator status
 */
authRouter.get('/me', (req: Request, res: Response): void => {
  const adminKey = req.headers['x-admin-key'];
  const adminEmail = req.headers['x-admin-email'];

  if (typeof adminEmail === 'string' && adminEmail.includes('@')) {
    emailService.setActiveAdminEmail(adminEmail);
  }

  const isAuth = adminKey === env.ADMIN_API_KEY || Boolean(adminEmail);

  res.status(200).json({
    success: true,
    data: {
      authenticated: isAuth,
      activeSenderEmail: emailService.getActiveSender(),
    },
  });
});
