import { GoogleGenAI } from '@google/genai';
import { parseJsonBody, sendJson } from './_razorpay';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = await parseJsonBody(req);
    const {
      bridePhoto,
      groomPhoto,
      brideName = 'Bride',
      groomName = 'Groom',
      stateTheme = 'Pan-Indian / Bollywood Glam',
      brideAttire = '',
      groomAttire = '',
    } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return sendJson(res, 200, {
        success: true,
        isMock: true,
        caricatureDetails: {
          groom: {
            features: `Charming Pixar 3D caricature of ${groomName} in ${groomAttire || 'royal embroidered sherwani'}, warm dark hair, joyful smile.`,
            expression: 'Lovestruck, beaming with joy and adoration',
          },
          bride: {
            features: `Radiant Pixar 3D caricature of ${brideName} in ${brideAttire || 'exquisite wedding lehenga'}, big expressive sparkling eyes, glowing bridal smile.`,
            expression: 'Tearful with ecstatic happiness, hand on heart',
          },
          vibe: `${stateTheme} royal wedding aesthetic with fairy lights, auspicious floral decorations and cinematic Pixar glow`,
          scenePrompts: {
            scene1: `Cute 3D Pixar Disney style caricature of ${groomName} kneeling on one knee proposing with glowing diamond ring to emotional ${brideName}.`,
            scene2: `Cute 3D Pixar couple ${groomName} & ${brideName} romantic waltz dance under floral canopy.`,
            scene3: `Cute 3D Pixar caricature of ${groomName} and ${brideName} in traditional ${stateTheme} wedding attire.`,
            scene4: `3D Pixar grand royal wedding announcement with ${brideName} and ${groomName} under traditional floral mandap.`,
          },
        },
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const parts: any[] = [];
    let hasPhotos = false;

    if (bridePhoto && typeof bridePhoto === 'string' && bridePhoto.includes('base64,')) {
      const [meta, data] = bridePhoto.split('base64,');
      const mimeType = meta.match(/data:(.*?);/)?.[1] || 'image/jpeg';
      parts.push({ inlineData: { mimeType, data } });
      hasPhotos = true;
    }

    if (groomPhoto && typeof groomPhoto === 'string' && groomPhoto.includes('base64,')) {
      const [meta, data] = groomPhoto.split('base64,');
      const mimeType = meta.match(/data:(.*?);/)?.[1] || 'image/jpeg';
      parts.push({ inlineData: { mimeType, data } });
      hasPhotos = true;
    }

    const promptText = `
You are a lead Pixar 3D Character Stylist and wedding director specializing in Indian cultural weddings.
Analyze the couple: Bride named "${brideName}" and Groom named "${groomName}".
Selected Wedding Theme: "${stateTheme}".
Traditional Regional Attire Context:
- Bride Attire: ${brideAttire}
- Groom Attire: ${groomAttire}

${hasPhotos ? 'Based on the uploaded photos of the bride and groom, identify their facial characteristics.' : 'Create a romantic Pixar couple caricature.'}
Incorporate authentic wedding attire and cultural wedding motifs of ${stateTheme} into their 3D Pixar designs!

Return ONLY valid JSON with this structure:
{
  "groom": {
    "features": "description of groom's 3D Pixar character appearance and wedding attire",
    "expression": "proposal & dance emotion"
  },
  "bride": {
    "features": "description of bride's 3D Pixar character appearance and bridal attire/jewelry",
    "expression": "emotional joyful expression"
  },
  "vibe": "color palette and lighting style inspired by ${stateTheme} wedding",
  "romanticQuote": "a sweet 1-line couple quote",
  "scenePrompts": {
    "scene1": "prompt for Finally proposal scene",
    "scene2": "prompt for Wait is Over dance scene",
    "scene3": "prompt for We are making it official scene in ${stateTheme} style",
    "scene4": "prompt for We are getting married scene"
  }
}
`;
    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: { responseMimeType: 'application/json' },
    });

    const caricatureDetails = JSON.parse(response.text || '{}');
    return sendJson(res, 200, { success: true, caricatureDetails });
  } catch (err: any) {
    console.error('Error in /api/analyze-couple:', err);
    return sendJson(res, 500, { error: err?.message || 'Failed to analyze couple photos' });
  }
}
