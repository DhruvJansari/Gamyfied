import { redis } from "../../config/redis";
import { randomOtp, safeEqual, sha256 } from "../../lib/crypto";
import { AppError, ErrorCode } from "../../lib/errors";
import { otpSender, type Channel } from "./senders";

export const OTP_TTL_SEC = 5 * 60;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SEC = 60;
const MAX_SENDS_PER_HOUR = 5;

/** Extra data carried from send → verify (the sign-up form fields). */
export type PendingProfile = { displayName: string; phone?: string; email?: string };

const otpKey = (channel: Channel, id: string) => `otp:${channel}:${sha256(id)}`;
const sendsKey = (channel: Channel, id: string) => `otp-sends:${channel}:${sha256(id)}`;

// Everything here is short-lived and harmless to lose: if Redis restarts the user just
// requests a new code. That is why OTPs never touch Postgres (Project/Rules.md, Data).
export const otpService = {
  async sendCode(channel: Channel, identifier: string, profile?: PendingProfile): Promise<void> {
    const key = otpKey(channel, identifier);

    const sentAt = await redis.hget(key, "sentAt");
    if (sentAt && Date.now() - Number(sentAt) < RESEND_COOLDOWN_SEC * 1000) {
      const wait = Math.ceil((RESEND_COOLDOWN_SEC * 1000 - (Date.now() - Number(sentAt))) / 1000);
      throw AppError.rateLimited(wait, ErrorCode.OTP_RESEND_TOO_SOON, `Wait ${wait}s before requesting another code`);
    }

    const sends = await redis.incr(sendsKey(channel, identifier));
    if (sends === 1) await redis.expire(sendsKey(channel, identifier), 60 * 60);
    if (sends > MAX_SENDS_PER_HOUR) {
      throw AppError.rateLimited(await redis.ttl(sendsKey(channel, identifier)), ErrorCode.RATE_LIMITED, "Too many codes requested, try again in an hour");
    }

    const code = randomOtp();
    const fields: Record<string, string> = { code: sha256(code), attempts: "0", sentAt: String(Date.now()) };
    if (profile) fields.profile = JSON.stringify(profile);

    await redis.multi().del(key).hset(key, fields).expire(key, OTP_TTL_SEC).exec();

    try {
      await otpSender.send(channel, identifier, code);
    } catch (err) {
      console.error(`[otp] send failed channel=${channel}`, err);
      await redis.del(key);
      throw new AppError(502, ErrorCode.OTP_SEND_FAILED, "We could not send the code, try again in a moment");
    }
  },

  /** Consumes the code on success. Returns the profile captured at send time, if any. */
  async verifyCode(channel: Channel, identifier: string, code: string): Promise<{ profile: PendingProfile | null }> {
    const key = otpKey(channel, identifier);
    const stored = await redis.hgetall(key);

    if (!stored.code) {
      throw AppError.badRequest(ErrorCode.OTP_EXPIRED, "That code has expired, request a new one");
    }

    if (Number(stored.attempts) >= MAX_ATTEMPTS) {
      await redis.del(key);
      throw AppError.badRequest(ErrorCode.OTP_TOO_MANY_ATTEMPTS, "Too many wrong attempts, request a new code");
    }

    if (!safeEqual(sha256(code), stored.code)) {
      const attempts = await redis.hincrby(key, "attempts", 1);
      if (attempts >= MAX_ATTEMPTS) await redis.del(key);
      throw AppError.badRequest(ErrorCode.OTP_INVALID, "That code is not right", { code: "Incorrect code" });
    }

    await redis.del(key);
    return { profile: stored.profile ? (JSON.parse(stored.profile) as PendingProfile) : null };
  },
};
