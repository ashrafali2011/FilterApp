import nodemailer from "nodemailer";
import { logger } from "./logger";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendOtpEmail(toEmail: string, otp: string, username: string): Promise<void> {
  const from = process.env.SMTP_FROM ?? "AquaTrack <noreply@aquatrack.app>";
  const subject = "Your AquaTrack password reset code";
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px">
      <div style="text-align:center;margin-bottom:24px">
        <span style="font-size:36px">💧</span>
        <h1 style="margin:8px 0 4px;font-size:22px;color:#0f172a">AquaTrack</h1>
        <p style="color:#64748b;margin:0;font-size:14px">Water Filter Maintenance Tracker</p>
      </div>
      <div style="background:#fff;border-radius:8px;padding:24px;border:1px solid #e2e8f0">
        <p style="color:#0f172a;margin-top:0">Hi <strong>${username}</strong>,</p>
        <p style="color:#475569">We received a request to reset your password. Use the code below — it expires in <strong>10 minutes</strong>.</p>
        <div style="text-align:center;margin:24px 0">
          <span style="display:inline-block;background:#f0f9ff;border:2px dashed #0ea5e9;border-radius:8px;padding:16px 32px;font-size:32px;font-weight:700;letter-spacing:8px;color:#0284c7">${otp}</span>
        </div>
        <p style="color:#64748b;font-size:13px;margin-bottom:0">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
      </div>
    </div>
  `;
  const text = `Your AquaTrack password reset code is: ${otp}\n\nIt expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`;

  const transporter = getTransporter();

  if (!transporter) {
    logger.warn({ toEmail, otp }, "SMTP not configured — OTP logged to console (dev mode)");
    logger.info(`\n========================================\n📧 PASSWORD RESET OTP for ${toEmail}: ${otp}\n========================================`);
    return;
  }

  await transporter.sendMail({ from, to: toEmail, subject, html, text });
  logger.info({ toEmail }, "OTP email sent");
}
