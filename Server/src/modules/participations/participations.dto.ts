import type { Participation } from "./participations.repository";

export type ParticipationDto = {
  id: string;
  kind: Participation["kind"];
  title: string;
  note: string | null;
  url: string | null;
  year: number | null;
  verificationStatus: Participation["verificationStatus"];
  createdAt: string;
};

export function toParticipationDto(row: Participation): ParticipationDto {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    note: row.note,
    url: row.url,
    year: row.year,
    verificationStatus: row.verificationStatus,
    createdAt: row.createdAt.toISOString(),
  };
}
