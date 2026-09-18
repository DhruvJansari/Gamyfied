import { AppError, ErrorCode } from "../../lib/errors";
import type { Account } from "../../generated/prisma/client";
import { detectPlatform } from "../../shared/social-platforms";
import { SOCIAL_LINKS_MAX } from "../scoring/scoring.config";
import { scoringService } from "../scoring/scoring.service";
import { toSocialLinkDto, type SocialLinkDto } from "./social-links.dto";
import { socialLinksRepository } from "./social-links.repository";
import type { AddSocialLinkInput } from "./social-links.schemas";

export const socialLinksService = {
  /** A typed URL: detected, canonicalised, stored as CLAIMED. */
  async addClaimed(userId: string, input: AddSocialLinkInput): Promise<SocialLinkDto> {
    const detected = detectPlatform(input.url);
    if (!detected) {
      throw AppError.badRequest(ErrorCode.SOCIAL_PLATFORM_UNSUPPORTED, "That is not a supported developer profile", {
        url: "Paste a profile URL from GitHub, LinkedIn, LeetCode, Stack Overflow or another supported platform",
      });
    }

    const [existing, count] = await Promise.all([
      socialLinksRepository.findByUserAndPlatform(userId, detected.platform),
      socialLinksRepository.countByUserId(userId),
    ]);
    if (existing) {
      throw AppError.conflict(ErrorCode.SOCIAL_LINK_DUPLICATE, "You already have a profile on that platform", {
        url: "One link per platform",
      });
    }
    if (count >= SOCIAL_LINKS_MAX) {
      throw AppError.badRequest(ErrorCode.SOCIAL_LINK_LIMIT_REACHED, `You can add up to ${SOCIAL_LINKS_MAX} profiles`);
    }

    const row = await socialLinksRepository.createClaimed({
      userId,
      platform: detected.platform,
      url: detected.canonicalUrl,
      username: detected.username,
    });
    await scoringService.recomputeProfileScore(userId);
    return toSocialLinkDto(row);
  },

  async remove(userId: string, id: string): Promise<void> {
    const row = await socialLinksRepository.findByIdForUser(id, userId);
    if (!row) throw AppError.notFound("Link not found");
    if (row.trustLevel === "LINKED") {
      throw AppError.badRequest(ErrorCode.SOCIAL_LINK_LINKED_READONLY, "This profile is connected through sign-in and can't be removed here");
    }
    await socialLinksRepository.deleteById(id);
    await scoringService.recomputeProfileScore(userId);
  },

  /**
   * Called from OAuth sign-in. The authenticated identity always wins: it replaces a typed
   * link for the same platform and is allowed even at the link cap. Returns false when the
   * provider is not a social platform (Google) or reported no username.
   */
  async upsertLinkedFromAccount(userId: string, account: Account): Promise<boolean> {
    if (!account.providerUsername || !account.profileUrl) return false;
    const detected = detectPlatform(account.profileUrl);
    if (!detected) return false;
    await socialLinksRepository.upsertLinked({
      userId,
      platform: detected.platform,
      url: detected.canonicalUrl,
      username: detected.username,
      accountId: account.id,
    });
    return true;
  },
};
