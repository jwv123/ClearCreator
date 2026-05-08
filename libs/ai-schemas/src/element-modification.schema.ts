import { z } from 'zod';

export const ElementModificationSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['textbox', 'rect', 'circle', 'triangle', 'image', 'line']).optional(),
  changes: z.record(z.unknown()),
});

export const ElementModificationRequestSchema = z.object({
  modifications: z.array(ElementModificationSchema),
});

export type ElementModification = z.infer<typeof ElementModificationSchema>;
export type ElementModificationRequest = z.infer<typeof ElementModificationRequestSchema>;