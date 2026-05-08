import { Router } from 'express';
import { Ollama } from 'ollama';
import { DesignGenerationSchema } from '@clearcreator/ai-schemas';

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'https://ollama.com',
  headers: process.env.OLLAMA_API_KEY
    ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` }
    : {},
});

export const aiRouter = Router();

const DESIGN_SYSTEM_PROMPT = `You are a professional poster and flyer design generator. Given a user prompt, generate a structured JSON design specification.

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
      "width": number (optional),
      "height": number (optional),
      "fill": string (hex color, optional),
      "stroke": string (hex color, optional),
      "strokeWidth": number (optional),
      "opacity": number (0-1, optional),
      "angle": number (optional),
      "text": string (for textbox, optional),
      "fontFamily": string (Google Font name, optional),
      "fontSize": number (for textbox, optional),
      "fontWeight": string (for textbox, optional),
      "textAlign": "left" | "center" | "right" | "justify" (optional)
    }
  ]
}

Design principles:
- Use harmonious color palettes
- Create clear visual hierarchy with font sizes
- Ensure adequate spacing between elements
- Position elements to create balanced compositions
- Use 2-3 fonts maximum per design
- The canvas dimensions are the coordinate system (0,0 is top-left)
- Leave margins of at least 40px from edges

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
    const { prompt, canvasWidth, canvasHeight, model } = req.body;

    const response = await ollama.chat({
      model: model || 'gpt-oss:120b',
      messages: [
        { role: 'system', content: DESIGN_SYSTEM_PROMPT },
        { role: 'user', content: `Create a design for: ${prompt}. Canvas size: ${canvasWidth || 1080}x${canvasHeight || 1080}px.` },
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
    const { prompt, canvasWidth, canvasHeight, model } = req.body;

    const response = await ollama.chat({
      model: model || 'gpt-oss:120b',
      messages: [
        { role: 'system', content: DESIGN_SYSTEM_PROMPT },
        { role: 'user', content: `Create a design for: ${prompt}. Canvas size: ${canvasWidth || 1080}x${canvasHeight || 1080}px.` },
      ],
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

    res.json(JSON.parse(response.message.content));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: Convert Zod schema to JSON Schema for Ollama's format parameter
function zodToJsonSchema(schema: any): object {
  // Simplified conversion — for production, use zod-to-json-schema package
  return {
    type: 'object',
    properties: {
      canvasWidth: { type: 'number' },
      canvasHeight: { type: 'number' },
      backgroundColor: { type: 'string' },
      elements: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['textbox', 'rect', 'circle', 'triangle', 'image', 'line'] },
            left: { type: 'number' },
            top: { type: 'number' },
            text: { type: 'string' },
            fontFamily: { type: 'string' },
            fontSize: { type: 'number' },
            fill: { type: 'string' },
            stroke: { type: 'string' },
            opacity: { type: 'number' },
          },
          required: ['type', 'left', 'top'],
        },
      },
    },
    required: ['canvasWidth', 'canvasHeight', 'backgroundColor', 'elements'],
  };
}