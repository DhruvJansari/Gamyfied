import type { VerificationSource, VerificationStatus, VerificationSubject } from "../../generated/prisma/enums";

// The seam between the profile and the (future) agent. The profile side creates a
// Verification row and hands the provider a request; the provider either answers now or
// returns null to say "queued, I'll write the outcome later". The real agent will implement
// this interface in a worker and call `verificationService.complete()` when done. Nothing on
// the profile side knows or cares which implementation is behind it.

export type VerificationRequest = {
  verificationId: string;
  userId: string;
  subjectType: VerificationSubject;
  subjectId: string;
  /** Links the agent may inspect: repo / live URL for a project, evidence URL for participation. */
  evidenceUrls: string[];
};

export type VerificationOutcome = {
  status: Exclude<VerificationStatus, "NOT_VERIFIED" | "VERIFICATION_PENDING">;
  /** What the scoring engine should add for this subject; it is capped by the item's ceiling. */
  points: number | null;
  /** Raw structured evidence the agent gathered (kept for explainability / re-scoring). */
  signals?: unknown;
  /** The agent's evaluation. */
  result?: unknown;
  errorCode?: string | null;
};

export interface VerificationProvider {
  readonly source: VerificationSource;
  /** Resolve with an outcome to finish synchronously, or null to leave the row pending. */
  request(req: VerificationRequest): Promise<VerificationOutcome | null>;
}
