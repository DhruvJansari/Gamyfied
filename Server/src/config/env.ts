// Parsed once at boot. Nothing else in the app reads process.env directly (see Project/Rules.md, Security).

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[env] missing required variable ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value ? value : undefined;
}

function hexKey(name: string, bytes: number): Buffer {
  const raw = required(name);
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== bytes) {
    throw new Error(`[env] ${name} must be ${bytes} bytes hex (${bytes * 2} chars)`);
  }
  return buf;
}

const nodeEnv = process.env.NODE_ENV ?? "development";

const MOCK_OUTCOMES = ["VERIFIED", "PARTIALLY_VERIFIED", "FAILED", "INACCESSIBLE"] as const;
type MockOutcome = (typeof MOCK_OUTCOMES)[number];

function mockOutcome(): MockOutcome | null {
  const raw = optional("VERIFICATION_MOCK_OUTCOME");
  if (!raw) return null;
  if (!(MOCK_OUTCOMES as readonly string[]).includes(raw)) {
    throw new Error(`[env] VERIFICATION_MOCK_OUTCOME must be one of ${MOCK_OUTCOMES.join(", ")}`);
  }
  return raw as MockOutcome;
}

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: Number(process.env.PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(","),
  /** Where the Next.js app lives. OAuth callbacks redirect here. */
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  /** Public base URL of this API, used to build OAuth redirect_uri values. */
  apiPublicUrl: process.env.API_PUBLIC_URL ?? "http://localhost:3000/api",

  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL"),

  /** Signs access JWTs. */
  jwtSecret: required("SESSION_SECRET"),
  /** AES-256-GCM key for provider tokens at rest. 32 bytes, hex encoded. */
  tokenEncryptionKey: hexKey("TOKEN_ENCRYPTION_KEY", 32),

  oauth: {
    github:
      optional("GITHUB_CLIENT_ID") && optional("GITHUB_CLIENT_SECRET")
        ? { clientId: required("GITHUB_CLIENT_ID"), clientSecret: required("GITHUB_CLIENT_SECRET") }
        : null,
    google:
      optional("GOOGLE_CLIENT_ID") && optional("GOOGLE_CLIENT_SECRET")
        ? { clientId: required("GOOGLE_CLIENT_ID"), clientSecret: required("GOOGLE_CLIENT_SECRET") }
        : null,
  },

  otp: {
    /** "console" logs codes to stdout (dev). "live" sends real email / SMS. */
    sender: (optional("OTP_SENDER") ?? "console") as "console" | "live",
    /** Any SMTP URL, e.g. smtp://user:pass@smtp.gmail.com:587 */
    smtpUrl: optional("SMTP_URL"),
    mailFrom: optional("MAIL_FROM") ?? "Gamyfied <no-reply@localhost>",
    /** Self-hosted android-sms-gateway (or any vendor that accepts the same shape). */
    smsGatewayUrl: optional("SMS_GATEWAY_URL"),
    smsGatewayUser: optional("SMS_GATEWAY_USER"),
    smsGatewayPass: optional("SMS_GATEWAY_PASS"),
  },

  /**
   * Dev only: makes the placeholder verification provider return this outcome immediately
   * instead of leaving requests queued. Ignored in production.
   */
  verificationMockOutcome: mockOutcome(),
} as const;
