// SPDX-License-Identifier: AGPL-3.0-or-later
import nodemailer from 'nodemailer';
import type { SentMessageInfo } from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: false, // Mailpit uses plain text
});

export async function sendInvitationEmail(
  to: string,
  orgName: string,
  token: string,
): Promise<SentMessageInfo> {
  const inviteUrl = `${process.env.WEB_URL || 'http://localhost:3001'}/invitations/accept?token=${token}`;

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Portal Organisasi" <no-reply@portal.local>',
    to,
    subject: `Undangan Bergabung dengan ${orgName}`,
    html: `
      <h2>Anda diundang!</h2>
      <p>Anda telah diundang untuk bergabung dengan <strong>${orgName}</strong> di Portal Organisasi.</p>
      <p>Klik tautan di bawah ini untuk menerima undangan:</p>
      <a href="${inviteUrl}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 4px;">Terima Undangan</a>
      <p>Atau salin tautan ini ke browser Anda:</p>
      <p>${inviteUrl}</p>
    `,
  });

  console.log(`[Email] Invitation sent to ${to}. Message ID: ${info.messageId}`);
  return info;
}
