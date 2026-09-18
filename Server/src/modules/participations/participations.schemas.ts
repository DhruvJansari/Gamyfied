import { z } from "zod";

import { ParticipationKind } from "../../generated/prisma/enums";
import { optionalHttpsUrl, optionalText } from "../../lib/zod-helpers";

const fields = {
  kind: z.enum(ParticipationKind, { message: "Pick what kind of participation this was" }),
  title: z.string().trim().min(2, "At least 2 characters").max(80, "At most 80 characters"),
  note: optionalText(500, "Note"),
  url: optionalHttpsUrl("Link"),
  year: z.number().int().min(1990, "Enter a real year").max(new Date().getFullYear() + 1, "Enter a real year").nullable().optional(),
};

/** POST /participations */
export const createParticipationSchema = z.object({
  ...fields,
  note: fields.note.default(null),
  url: fields.url.default(null),
  year: fields.year.default(null),
});
export type CreateParticipationInput = z.infer<typeof createParticipationSchema>;

/** PATCH /participations/:id */
export const updateParticipationSchema = z.object(fields).partial();
export type UpdateParticipationInput = z.infer<typeof updateParticipationSchema>;

export const participationIdParamsSchema = z.object({ id: z.uuid("Unknown entry") });
