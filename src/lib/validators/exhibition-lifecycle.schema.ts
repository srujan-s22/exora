import { z } from 'zod';

export const pauseExhibitionSchema = z.object({
  reason: z.string().min(2, 'Pause reason is required').trim(),
});

export const resumeExhibitionSchema = z.object({
  reason: z.string().trim().optional(),
});

export const endExhibitionSchema = z.object({
  reason: z.string().min(2, 'Completion reason is required').trim(),
});

export const extendExhibitionSchema = z.object({
  newEndDate: z.string().datetime({ message: 'Valid ISO date string is required' }),
  reason: z.string().min(2, 'Extension reason is required').trim(),
});

export type PauseExhibitionInput = z.infer<typeof pauseExhibitionSchema>;
export type ResumeExhibitionInput = z.infer<typeof resumeExhibitionSchema>;
export type EndExhibitionInput = z.infer<typeof endExhibitionSchema>;
export type ExtendExhibitionInput = z.infer<typeof extendExhibitionSchema>;
