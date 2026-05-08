import { z } from 'zod';

export const DesignTokenSchema = z.object({
  primaryColor: z.string().describe('Primary brand color (hex)'),
  secondaryColor: z.string().describe('Secondary accent color (hex)'),
  backgroundColor: z.string().describe('Background color (hex)'),
  textPrimaryColor: z.string().describe('Primary text color (hex)'),
  textSecondaryColor: z.string().describe('Secondary text color (hex)'),
  headingFont: z.string().describe('Google Font for headings'),
  bodyFont: z.string().describe('Google Font for body text'),
  spacing: z.number().default(16).describe('Base spacing unit in pixels'),
  borderRadius: z.number().default(8).describe('Border radius in pixels'),
});

export type DesignTokens = z.infer<typeof DesignTokenSchema>;