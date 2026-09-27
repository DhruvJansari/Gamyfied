import nodemailer, { type Transporter } from "nodemailer";

import { env } from "../../config/env";

export type Channel = "email" | "phone";

export type OtpSender = {
  send(channel: Channel, to: string, code: string): Promise<void>;
};

const EMAIL_SUBJECT = "Your StandByDev sign-in code";
const text = (code: string) => `Your StandByDev code is ${code}. It expires in 5 minutes. If you didn't request it, ignore this.`;

/** Dev sender: prints the code so you can copy it from the terminal. */
const consoleSender: OtpSender = {
  async send(channel, to, code) {
    console.log(`[otp] ${channel} → ${to}: ${code}`);
  },
};

let transporter: Transporter | undefined;
function mail(): Transporter {
  if (!transporter) {
    if (!env.otp.smtpUrl) throw new Error("[otp] SMTP_URL is required when OTP_SENDER=live");
    transporter = nodemailer.createTransport(env.otp.smtpUrl);
  }
  return transporter;
}

/** "StandByDev <foo@bar.com>" → { name: "StandByDev", email: "foo@bar.com" }. Brevo wants them split. */
function parseFrom(from: string): { name?: string; email: string } {
  const match = /^(.*)<(.+)>$/.exec(from);
  if (!match) return { email: from.trim() };
  const name = match[1]?.trim();
  return { name: name || undefined, email: match[2]!.trim() };
}

/**
 * Brevo's HTTP transactional email API (https://api.brevo.com/v3/smtp/email). Used instead of
 * SMTP when BREVO_API_KEY is set, since Render's free tier blocks outbound SMTP ports but HTTPS
 * is unaffected.
 */
async function sendViaBrevo(to: string, subject: string, body: string): Promise<void> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": env.otp.brevoApiKey!,
    },
    body: JSON.stringify({
      sender: parseFrom(env.otp.mailFrom),
      to: [{ email: to }],
      subject,
      textContent: body,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`[otp] brevo responded ${res.status}: ${detail}`);
  }
}

/**
 * SMS via a self-hosted android-sms-gateway (free, open source: an Android phone with a SIM).
 * The request shape matches its /message endpoint; any vendor with a similar POST can be
 * dropped in by changing SMS_GATEWAY_URL.
 */
async function sendSms(to: string, body: string): Promise<void> {
  const { smsGatewayUrl, smsGatewayUser, smsGatewayPass } = env.otp;
  if (!smsGatewayUrl) throw new Error("[otp] SMS_GATEWAY_URL is not configured");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (smsGatewayUser && smsGatewayPass) {
    headers.Authorization = `Basic ${Buffer.from(`${smsGatewayUser}:${smsGatewayPass}`).toString("base64")}`;
  }
  const res = await fetch(smsGatewayUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ message: body, phoneNumbers: [to] }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`[otp] sms gateway responded ${res.status}`);
}

const liveSender: OtpSender = {
  async send(channel, to, code) {
    if (channel === "email") {
      if (env.otp.brevoApiKey) {
        await sendViaBrevo(to, EMAIL_SUBJECT, text(code));
      } else {
        await mail().sendMail({ from: env.otp.mailFrom, to, subject: EMAIL_SUBJECT, text: text(code) });
      }
      return;
    }
    await sendSms(to, text(code));
  },
};

export const otpSender: OtpSender = env.otp.sender === "live" ? liveSender : consoleSender;
