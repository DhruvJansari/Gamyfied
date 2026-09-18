import { request } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { VerificationRequest, VerificationStatus } from "./projects";

// Mirrors Server/src/modules/participations. The optional placement task.

export const PARTICIPATION_KINDS = ["HACKATHON", "OPEN_SOURCE", "COMMUNITY", "EVENT", "FREELANCE", "COLLABORATION", "OTHER"] as const;
export type ParticipationKind = (typeof PARTICIPATION_KINDS)[number];

export const PARTICIPATIONS_MAX = 5;

export type Participation = {
  id: string;
  kind: ParticipationKind;
  title: string;
  note: string | null;
  url: string | null;
  year: number | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
};

export type ParticipationInput = {
  kind: ParticipationKind;
  title: string;
  note: string | null;
  url: string | null;
  year: number | null;
};

export const participationsService = {
  createParticipation(input: ParticipationInput): Promise<Participation> {
    return request({ method: "POST", url: endpoints.participations.create, data: input });
  },
  updateParticipation(id: string, input: Partial<ParticipationInput>): Promise<Participation> {
    return request({ method: "PATCH", url: endpoints.participations.byId(id), data: input });
  },
  removeParticipation(id: string): Promise<{ removed: true }> {
    return request({ method: "DELETE", url: endpoints.participations.byId(id) });
  },
  requestVerification(id: string): Promise<VerificationRequest> {
    return request({ method: "POST", url: endpoints.participations.verifications(id) });
  },
};
