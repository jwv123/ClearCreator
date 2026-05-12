import { Router } from 'express';
import { Ollama } from 'ollama';
import { DesignGenerationSchema, ModifyResponseSchema } from '@clearcreator/ai-schemas';
import { zodToJsonSchema } from 'zod-to-json-schema';

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'https://ollama.com',
  headers: process.env.OLLAMA_API_KEY
    ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` }
    : {},
});

const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss:120b';
const DEFAULT_VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'qwen3-vl:235b-instruct';

async function fetchImageAsBase64(imageUrl: string, maxSizeBytes = 10 * 1024 * 1024): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`URL did not return an image (content-type: ${contentType})`);
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > maxSizeBytes) {
    throw new Error(`Image exceeds maximum size of ${maxSizeBytes / 1024 / 1024}MB`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maxSizeBytes) {
    throw new Error(`Image exceeds maximum size of ${maxSizeBytes / 1024 / 1024}MB`);
  }

  return Buffer.from(arrayBuffer).toString('base64');
}

export const aiRouter = Router();

const DESIGN_SYSTEM_PROMPT = `You are a professional poster and flyer design generator. Given a user prompt, generate a structured JSON design specification.

IMPORTANT: You CANNOT see, fetch, or analyze images from URLs. If the user references a URL or image, do NOT attempt to replicate it — instead, ask them to describe the design in words, or generate an original design inspired by the general concept they describe.

The design must follow this exact schema:
{
  "canvasWidth": number (default 1080),
  "canvasHeight": number (default 1080),
  "backgroundColor": string (hex color),
  "elements": [
    {
      "type": "textbox" | "rect" | "circle" | "triangle" | "image" | "line",
      "left": number,
      "top": number,
      "width": number (optional, required for rect/triangle),
      "height": number (optional, required for rect/triangle),
      "radius": number (optional, for circles — half the desired diameter),
      "fill": string (hex color, optional),
      "stroke": string (hex color, optional),
      "strokeWidth": number (optional),
      "opacity": number (0-1, optional),
      "angle": number (optional),
      "scaleX": number (optional),
      "scaleY": number (optional),
      "text": string (for textbox, optional),
      "fontFamily": string (Google Font name, optional),
      "fontSize": number (for textbox, optional),
      "fontWeight": string (for textbox, optional),
      "fontStyle": string (for textbox, optional),
      "textAlign": "left" | "center" | "right" | "justify" (optional),
      "lineHeight": number (optional),
      "charSpacing": number (optional),
      "src": string (for image, optional),
      "uploadId": string (for image, optional),
      "zone": "header" | "body" | "footer" | "accent" (optional, for layout reasoning),
      "alignWith": "left" | "center" | "right" (optional, for alignment reasoning)
    }
  ]
}

LAYOUT PROCESS — Think through these steps BEFORE outputting coordinates:

STEP 1 - ZONES: Divide the 1080x1080 canvas into horizontal zones:
  - Header zone: top 0-300px (hero backgrounds, large titles)
  - Body zone: top 300-800px (subtitle, body text, details)
  - Footer zone: top 800-1080px (calls to action, fine print, contact info)
  Assign each element to exactly one zone. Set the "zone" field accordingly.

STEP 2 - POSITIONING: Within each zone, lay out elements top-to-bottom with calculated gaps:
  - For text, calculate height: fontSize × lineHeight × numberOfLines. Always round UP and add 30px padding.
  - Center-aligned text: left = 540, textAlign = "center", width = 600-900
  - Left-aligned text: left = 80-120, textAlign = "left", width = 840-920
  - Right-aligned text: left = canvasWidth - 80 - width, textAlign = "right"
  - Minimum 30px gap between distinct text blocks within the same zone
  - Minimum 60px gap between zones

STEP 3 - VERIFY: Before finalizing, mentally check every pair of text elements:
  - Does any text bounding box overlap another? If yes, increase the top value of the lower element.
  - Does every element stay within the safe zone (left >= 60, top >= 60, right <= 1020, bottom <= 1020)?
  - Are backgrounds listed BEFORE text elements in the array?

CRITICAL LAYOUT RULES — violations will produce broken designs:
- The canvas is 1080x1080 pixels. (0,0) is the top-left corner.
- ELEMENT ORDERING IS CRITICAL: elements are drawn in array order. Later elements appear ON TOP of earlier ones. You MUST order elements from back to front:
  1. FIRST: full-canvas or large background rectangles (low opacity, decorative)
  2. SECOND: accent shapes (circles, small decorative rects, dividers)
  3. LAST: all text elements (titles, subtitles, body text)
  Text MUST always come after shapes in the array, or shapes will cover the text.
- Background rectangles: use "opacity": 0.15-0.4 for subtle backgrounds behind text. They must come BEFORE text in the array.
- NEVER place text elements behind shape elements. Text is always on top.
- Every element MUST have explicit "left" and "top" values.
- SAFE ZONE: ALL elements must have left >= 60 and top >= 60. Background rects covering the full canvas may start at 0,0 — everything else MUST stay within x: 60-1020 and y: 60-1020.
- Text elements MUST have "width" set to control text wrapping. Minimum width: 200.
- NEVER OVERLAP TEXT ELEMENTS. Calculate the vertical space each text block needs (fontSize × lineHeight × line count + 30px), then position the next text block BELOW it with at least 30px gap.
- Vertical spacing: leave 30-60px gaps between distinct text blocks. When in doubt, add MORE space, not less.

DESIGN PRINCIPLES:
- Use harmonious color palettes (3-5 colors that complement each other)
- Visual hierarchy: large bold headings (fontSize: 60-100), medium subheadings (28-40), small body text (16-24)
- Use 2-3 fonts maximum (one display font for headings, one clean font for body)
- For circles, use "radius" (half the desired diameter). A circle with radius 100 creates a 200px diameter circle.
- Generate DETAILED designs with 5-15 elements — use background rectangles, accent shapes, and multiple text layers
- Common layout patterns that work well:
  1. Full-width header background rect (opacity 0.2-0.4) with centered title on top
  2. Content area below with subtitle and body text
  3. Accent circles or rectangles as decorative elements in corners
  4. Thin divider lines between sections

EXAMPLE well-positioned poster (note: backgrounds FIRST, text LAST, generous spacing, safe zone respected):
{
  "canvasWidth": 1080, "canvasHeight": 1080, "backgroundColor": "#1a1a2e",
  "elements": [
    {"type": "rect", "left": 0, "top": 0, "width": 1080, "height": 300, "fill": "#e94560", "opacity": 0.9, "zone": "header"},
    {"type": "circle", "left": 80, "top": 350, "radius": 40, "fill": "#e94560", "opacity": 0.3, "zone": "accent"},
    {"type": "rect", "left": 80, "top": 500, "width": 920, "height": 3, "fill": "#e94560", "zone": "body"},
    {"type": "textbox", "left": 540, "top": 80, "width": 900, "text": "SUMMER FEST", "fontFamily": "Arial", "fontSize": 80, "fontWeight": "bold", "fill": "#ffffff", "textAlign": "center", "zone": "header", "alignWith": "center"},
    {"type": "textbox", "left": 540, "top": 220, "width": 900, "text": "Join us for an unforgettable day", "fontFamily": "Arial", "fontSize": 28, "fill": "#ffffff", "textAlign": "center", "opacity": 0.85, "zone": "header", "alignWith": "center"},
    {"type": "textbox", "left": 540, "top": 540, "width": 840, "text": "LIVE MUSIC | FOOD | ART", "fontFamily": "Arial", "fontSize": 32, "fontWeight": "bold", "fill": "#ffffff", "textAlign": "center", "zone": "body", "alignWith": "center"},
    {"type": "textbox", "left": 540, "top": 630, "width": 800, "text": "Saturday, July 15th\\nCentral Park, 2pm-10pm\\nFree admission for all ages", "fontFamily": "Arial", "fontSize": 22, "fill": "#cccccc", "textAlign": "center", "lineHeight": 1.6, "zone": "footer", "alignWith": "center"}
  ]
}

Respond ONLY with valid JSON matching this schema. No markdown, no explanation.`;

const VISION_SYSTEM_PROMPT = `You are a professional poster and flyer design generator. You will receive a reference image along with a user prompt. Carefully analyze the reference image — extract its color palette, layout structure, visual hierarchy, typography patterns, and overall mood. Recreate the design as closely as possible using the available element types.

The design must follow this exact schema:
{
  "canvasWidth": number (default 1080),
  "canvasHeight": number (default 1080),
  "backgroundColor": string (hex color),
  "elements": [
    {
      "type": "textbox" | "rect" | "circle" | "triangle" | "image" | "line",
      "left": number,
      "top": number,
      "width": number (optional, required for rect/triangle),
      "height": number (optional, required for rect/triangle),
      "radius": number (optional, for circles — half the desired diameter),
      "fill": string (hex color, optional),
      "stroke": string (hex color, optional),
      "strokeWidth": number (optional),
      "opacity": number (0-1, optional),
      "angle": number (optional),
      "scaleX": number (optional),
      "scaleY": number (optional),
      "text": string (for textbox, optional),
      "fontFamily": string (Google Font name, optional),
      "fontSize": number (for textbox, optional),
      "fontWeight": string (for textbox, optional),
      "fontStyle": string (for textbox, optional),
      "textAlign": "left" | "center" | "right" | "justify" (optional),
      "lineHeight": number (optional),
      "charSpacing": number (optional),
      "src": string (for image, optional),
      "uploadId": string (for image, optional),
      "zone": "header" | "body" | "footer" | "accent" (optional, for layout reasoning),
      "alignWith": "left" | "center" | "right" (optional, for alignment reasoning)
    }
  ]
}

LAYOUT PROCESS — Think through these steps BEFORE outputting coordinates:

STEP 1 - ZONES: Divide the 1080x1080 canvas into horizontal zones:
  - Header zone: top 0-300px (hero backgrounds, large titles)
  - Body zone: top 300-800px (subtitle, body text, details)
  - Footer zone: top 800-1080px (calls to action, fine print, contact info)
  Assign each element to exactly one zone. Set the "zone" field accordingly.

STEP 2 - POSITIONING: Within each zone, lay out elements top-to-bottom with calculated gaps:
  - For text, calculate height: fontSize × lineHeight × numberOfLines. Always round UP and add 30px padding.
  - Center-aligned text: left = 540, textAlign = "center", width = 600-900
  - Left-aligned text: left = 80-120, textAlign = "left", width = 840-920
  - Right-aligned text: left = canvasWidth - 80 - width, textAlign = "right"
  - Minimum 30px gap between distinct text blocks within the same zone
  - Minimum 60px gap between zones

STEP 3 - VERIFY: Before finalizing, mentally check every pair of text elements:
  - Does any text bounding box overlap another? If yes, increase the top value of the lower element.
  - Does every element stay within the safe zone (left >= 60, top >= 60, right <= 1020, bottom <= 1020)?
  - Are backgrounds listed BEFORE text elements in the array?

CRITICAL LAYOUT RULES — violations will produce broken designs:
- The canvas is 1080x1080 pixels. (0,0) is the top-left corner.
- ELEMENT ORDERING IS CRITICAL: elements are drawn in array order. Later elements appear ON TOP. You MUST order elements from back to front:
  1. FIRST: full-canvas or large background rectangles (low opacity, decorative)
  2. SECOND: accent shapes (circles, small decorative rects, dividers)
  3. LAST: all text elements (titles, subtitles, body text)
  Text MUST always come after shapes in the array, or shapes will cover the text.
- Background rectangles: use "opacity": 0.15-0.4 for subtle backgrounds behind text. They must come BEFORE text in the array.
- NEVER place text elements behind shape elements. Text is always on top.
- Every element MUST have explicit "left" and "top" values.
- SAFE ZONE: ALL elements must have left >= 60 and top >= 60. Background rects covering the full canvas may start at 0,0 — everything else MUST stay within x: 60-1020 and y: 60-1020.
- Text elements MUST have "width" set to control text wrapping. Minimum width: 200.
- NEVER OVERLAP TEXT ELEMENTS. Calculate the vertical space each text block needs (fontSize × lineHeight × line count + 30px), then position the next text block BELOW it with at least 30px gap.
- Vertical spacing: leave 30-60px gaps between distinct text blocks. When in doubt, add MORE space, not less.

Match the reference image's color palette, layout structure, and visual hierarchy as closely as possible. Use background rectangles for colored sections, circles for decorative elements, and textboxes for all text content.

Respond ONLY with valid JSON matching this schema. No markdown, no explanation.`;

const MODIFY_SYSTEM_PROMPT = `You are a design element modifier. Given selected canvas elements and a user instruction, return the modified element properties.

Return a JSON object:
{
  "modifications": [
    {
      "id": string (the element id, if provided),
      "changes": { property: value }
    }
  ]
}

Only include properties that need to change. Respond ONLY with valid JSON.`;

// GET /api/ai/models - List available Ollama models
aiRouter.get('/models', async (_req, res) => {
  try {
    const response = await ollama.list();
    const models = response.models.map((m) => ({
      name: m.name,
      modifiedAt: m.modified_at,
      size: m.size,
    }));
    res.json(models);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/generate - Generate a full design (non-streaming)
aiRouter.post('/generate', async (req, res) => {
  try {
    const { prompt, canvasWidth, canvasHeight, model, imageUrl, visionModel } = req.body;

    const isVision = !!imageUrl;
    const systemPrompt = isVision ? VISION_SYSTEM_PROMPT : DESIGN_SYSTEM_PROMPT;
    const selectedModel = isVision ? (visionModel || DEFAULT_VISION_MODEL) : (model || DEFAULT_MODEL);

    const userMessage: any = {
      role: 'user',
      content: isVision
        ? `Create a design inspired by the provided reference image, for: ${prompt}. Canvas size: ${canvasWidth || 1080}x${canvasHeight || 1080}px.`
        : `Create a design for: ${prompt}. Canvas size: ${canvasWidth || 1080}x${canvasHeight || 1080}px.`,
    };

    if (isVision) {
      const base64Image = await fetchImageAsBase64(imageUrl);
      userMessage.images = [base64Image];
    }

    const response = await ollama.chat({
      model: selectedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        userMessage,
      ],
      format: zodToJsonSchema(DesignGenerationSchema),
      stream: false,
    });

    const parsed = JSON.parse(response.message.content);
    const validated = DesignGenerationSchema.parse(parsed);
    res.json(validated);
  } catch (error: any) {
    console.error('AI generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/generate/stream - Generate a full design (streaming via SSE)
aiRouter.post('/generate/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { prompt, canvasWidth, canvasHeight, model, imageUrl, visionModel } = req.body;

    const isVision = !!imageUrl;
    const systemPrompt = isVision ? VISION_SYSTEM_PROMPT : DESIGN_SYSTEM_PROMPT;
    const selectedModel = isVision ? (visionModel || DEFAULT_VISION_MODEL) : (model || DEFAULT_MODEL);

    const userMessage: any = {
      role: 'user',
      content: isVision
        ? `Create a design inspired by the provided reference image, for: ${prompt}. Canvas size: ${canvasWidth || 1080}x${canvasHeight || 1080}px.`
        : `Create a design for: ${prompt}. Canvas size: ${canvasWidth || 1080}x${canvasHeight || 1080}px.`,
    };

    if (isVision) {
      const base64Image = await fetchImageAsBase64(imageUrl);
      userMessage.images = [base64Image];
    }

    const response = await ollama.chat({
      model: selectedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        userMessage,
      ],
      format: zodToJsonSchema(DesignGenerationSchema),
      stream: true,
    });

    let fullContent = '';
    for await (const part of response) {
      fullContent += part.message.content;
      res.write(`data: ${JSON.stringify({ content: part.message.content, done: part.done })}\n\n`);
    }

    // Validate the complete response
    try {
      const parsed = JSON.parse(fullContent);
      const validated = DesignGenerationSchema.parse(parsed);
      res.write(`data: ${JSON.stringify({ validated: true, design: validated, done: true })}\n\n`);
    } catch {
      res.write(`data: ${JSON.stringify({ validated: false, rawContent: fullContent, done: true })}\n\n`);
    }

    res.end();
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
    res.end();
  }
});

// POST /api/ai/modify - Modify selected elements
aiRouter.post('/modify', async (req, res) => {
  try {
    const { instruction, elementContexts, model } = req.body;

    const response = await ollama.chat({
      model: model || 'gpt-oss:120b',
      messages: [
        { role: 'system', content: MODIFY_SYSTEM_PROMPT },
        { role: 'user', content: `Instruction: ${instruction}\n\nSelected elements: ${JSON.stringify(elementContexts)}` },
      ],
      stream: false,
    });

    const parsed = JSON.parse(response.message.content);
    const validated = ModifyResponseSchema.parse(parsed);
    res.json(validated);
  } catch (error: any) {
    console.error('AI modify error:', error);
    res.status(500).json({ error: error.message });
  }
});