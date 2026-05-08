import { z } from 'zod';

export const CanvasElementSchema = z.object({
  type: z.enum(['textbox', 'rect', 'circle', 'triangle', 'image', 'line']),
  left: z.number(),
  top: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  angle: z.number().optional(),
  scaleX: z.number().optional(),
  scaleY: z.number().optional(),
  // Text-specific
  text: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontWeight: z.string().optional(),
  fontStyle: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
  lineHeight: z.number().optional(),
  charSpacing: z.number().optional(),
  // Image-specific
  src: z.string().optional(),
  uploadId: z.string().optional(),
});

export const DesignGenerationSchema = z.object({
  canvasWidth: z.number().default(1080),
  canvasHeight: z.number().default(1080),
  backgroundColor: z.string().default('#ffffff'),
  elements: z.array(CanvasElementSchema),
});

export const ModifyResponseSchema = z.object({
  modifications: z.array(z.object({
    id: z.string().optional(),
    changes: z.record(z.any()),
  })),
});

export type DesignGeneration = z.infer<typeof DesignGenerationSchema>;
export type CanvasElementOutput = z.infer<typeof CanvasElementSchema>;
export type ModifyResponse = z.infer<typeof ModifyResponseSchema>;