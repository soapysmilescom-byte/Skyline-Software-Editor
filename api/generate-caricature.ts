import { GoogleGenAI } from '@google/genai';
import { parseJsonBody, sendJson } from './_razorpay';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = await parseJsonBody(req);
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
