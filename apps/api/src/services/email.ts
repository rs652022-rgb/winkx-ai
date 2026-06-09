import nodemailer from 'nodemailer';
import { logger } from '../lib/logger';

let transporter: nodemailer.Transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Fallback: log emails in development
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
    });
  }

  return transporter;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  text?: string;
}) {
  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: options.from || process.env.EMAIL_FROM || 'WinkX AI <noreply@winkx.ai>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logger.info(`Email sent to ${options.to}: ${options.subject}`);
  } catch (error) {
    logger.error(`Failed to send email to ${options.to}:`, error);
    // Don't throw — email failures shouldn't break the main flow
  }
}
