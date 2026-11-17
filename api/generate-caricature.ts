import { GoogleGenAI } from '@google/genai';

function sendJson(res: any, statusCode: number, payload: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

async function readBody(req: any): Promise<Record<string, any>> {
  if (req?.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req?.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(req?.body)) {
    try {
      return JSON.parse(req.body.toString('utf8'));
    } catch {
      return {};
    }
  }

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    if (!req || typeof req.on !== 'function' || req.readableEnded) {
      resolve({});
      return;
    }
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = await readBody(req);
    const { prompt } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return sendJson(res, 400, {
        error: 'Gemini API key is not configured. Using pre-rendered 3D Pixar studio scenes.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const enhancedPrompt = `Cute 3D Pixar Disney animated movie style caricature, 8k octane render, cute stylized proportions, big expressive emotional eyes, warm cinematic lighting: ${prompt}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [{ text: enhancedPrompt }],
      },
      config: {
        imageConfig: { aspectRatio: '9:16' },
      },
    });

    let imageUrl: string | null = null;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      return sendJson(res, 500, { error: 'No image was returned by the model' });
    }

    return sendJson(res, 200, { success: true, imageUrl });
  } catch (err: any) {
    console.error('Error in /api/generate-caricature:', err);
    return sendJson(res, 500, { error: err?.message || 'Failed to generate caricature image' });
  }
}
