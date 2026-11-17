import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON payload parser for base64 photo uploads
  app.use(express.json({ limit: "25mb" }));

  // Helper to get Gemini client
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  const STUDIO_PRICE_INR = 299;
  const STUDIO_PRICE_PAISE = STUDIO_PRICE_INR * 100;

  const getRazorpayCredentials = () => {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim() || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || "";
    return { keyId, keySecret };
  };

  // API: Health check
  app.get("/api/health", (_req, res) => {
    const { keyId, keySecret } = getRazorpayCredentials();
    res.json({
      status: "ok",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      hasRazorpay: Boolean(keyId && keySecret),
      priceInr: STUDIO_PRICE_INR,
    });
  });

  // API: Razorpay public config (never exposes secret)
  app.get("/api/razorpay/config", (_req, res) => {
    const { keyId, keySecret } = getRazorpayCredentials();
    res.json({
      configured: Boolean(keyId && keySecret),
      priceInr: STUDIO_PRICE_INR,
      amountPaise: STUDIO_PRICE_PAISE,
      currency: "INR",
    });
  });

  // API: Create Razorpay Order for ₹299
  app.post("/api/razorpay/create-order", async (req, res) => {
    try {
      const { keyId, keySecret } = getRazorpayCredentials();
      if (!keyId || !keySecret) {
        return res.status(503).json({
          error: "Razorpay gateway credentials are not configured on the server.",
        });
      }

      const { itemName = "Pixar Wedding Video Studio Pass", coupleName = "" } = req.body || {};
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const receipt = `wedtale_${Date.now().toString(36)}`;

      const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: STUDIO_PRICE_PAISE,
          currency: "INR",
          receipt,
          partial_payment: false,
          notes: {
            product: String(itemName).slice(0, 120),
            couple: String(coupleName).slice(0, 80),
            plan: "Unlimited HD/4K Studio Pass",
          },
        }),
      });

      const rzpData: any = await rzpResponse.json();
      if (!rzpResponse.ok || !rzpData?.id) {
        console.error("Razorpay order creation failed:", rzpData);
        return res.status(rzpResponse.status || 502).json({
          error:
            rzpData?.error?.description ||
            "Could not initialize Razorpay order. Please try again.",
        });
      }

      return res.json({
        success: true,
        orderId: rzpData.id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        keyId,
        priceInr: STUDIO_PRICE_INR,
      });
    } catch (err: any) {
      console.error("Error in /api/razorpay/create-order:", err);
      return res.status(500).json({
        error: err.message || "Failed to create Razorpay order",
      });
    }
  });

  // Helper to fetch and ensure a Razorpay payment is captured for at least ₹299
  const verifyLiveRazorpayPaymentStatus = async (
    paymentId: string,
    keyId: string,
    keySecret: string
  ) => {
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const resp = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        method: "GET",
        headers: { Authorization: `Basic ${authHeader}` },
      }
    );

    const payment: any = await resp.json();
    if (!resp.ok || !payment?.id) {
      return {
        ok: false as const,
        status: resp.status || 400,
        error: payment?.error?.description || "Payment ID not found on Razorpay.",
      };
    }

    if (payment.currency !== "INR" || Number(payment.amount) < STUDIO_PRICE_PAISE) {
      return {
        ok: false as const,
        status: 400,
        error: `Payment amount must be at least ₹${STUDIO_PRICE_INR} INR.`,
      };
    }

    // Auto-capture if authorized
    if (payment.status === "authorized") {
      const capResp = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/capture`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${authHeader}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: payment.amount,
            currency: payment.currency,
          }),
        }
      );
      const capData: any = await capResp.json();
      if (!capResp.ok || capData?.status !== "captured") {
        return {
          ok: false as const,
          status: 400,
          error:
            capData?.error?.description ||
            "Payment was authorized but could not be captured.",
        };
      }
      return { ok: true as const, payment: capData };
    }

    if (payment.status !== "captured") {
      return {
        ok: false as const,
        status: 400,
        error: `Payment is currently "${payment.status}". Only completed payments can unlock video downloads.`,
      };
    }

    return { ok: true as const, payment };
  };

  // API: Verify Razorpay Checkout Payment Signature (HMAC-SHA256) + Live Payment Status
  app.post("/api/razorpay/verify-payment", async (req, res) => {
    try {
      const { keyId, keySecret } = getRazorpayCredentials();
      if (!keyId || !keySecret) {
        return res.status(503).json({
          error: "Razorpay gateway credentials are not configured on the server.",
        });
      }

      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body || {};

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          error: "Missing Razorpay payment verification parameters.",
        });
      }

      const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(payload)
        .digest("hex");

      const expectedBuf = Buffer.from(expectedSignature, "utf8");
      const receivedBuf = Buffer.from(String(razorpay_signature), "utf8");

      const isSignatureValid =
        expectedBuf.length === receivedBuf.length &&
        crypto.timingSafeEqual(expectedBuf, receivedBuf);

      if (!isSignatureValid) {
        return res.status(400).json({
          verified: false,
          error: "Invalid Razorpay payment signature.",
        });
      }

      // Cross-check payment capture status directly against Razorpay API
      try {
        const liveCheck = await verifyLiveRazorpayPaymentStatus(
          String(razorpay_payment_id),
          keyId,
          keySecret
        );
        if (!liveCheck.ok) {
          return res.status(liveCheck.status).json({
            verified: false,
            error: liveCheck.error,
          });
        }
      } catch (fetchErr) {
        console.warn("Live Razorpay status check warning (signature valid):", fetchErr);
      }

      const receiptToken = crypto
        .createHmac("sha256", keySecret)
        .update(`unlock:${razorpay_payment_id}`)
        .digest("hex");

      return res.json({
        success: true,
        verified: true,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amount: STUDIO_PRICE_INR,
        currency: "INR",
        receiptToken,
      });
    } catch (err: any) {
      console.error("Error in /api/razorpay/verify-payment:", err);
      return res.status(500).json({
        error: err.message || "Payment verification failed",
      });
    }
  });

  // API: Verify an existing Razorpay Payment ID (e.g. from UPI/Payment Link) directly against Razorpay
  app.post("/api/razorpay/verify-payment-id", async (req, res) => {
    try {
      const { keyId, keySecret } = getRazorpayCredentials();
      if (!keyId || !keySecret) {
        return res.status(503).json({
          error: "Razorpay gateway credentials are not configured on the server.",
        });
      }

      const cleanId = String(req.body?.paymentId || "").trim();
      if (!/^pay_[A-Za-z0-9]{8,}$/.test(cleanId)) {
        return res.status(400).json({
          verified: false,
          error: "Please enter a valid Razorpay Payment ID (starts with pay_...).",
        });
      }

      const liveCheck = await verifyLiveRazorpayPaymentStatus(cleanId, keyId, keySecret);
      if (!liveCheck.ok) {
        return res.status(liveCheck.status).json({
          verified: false,
          error: liveCheck.error,
        });
      }

      const receiptToken = crypto
        .createHmac("sha256", keySecret)
        .update(`unlock:${liveCheck.payment.id}`)
        .digest("hex");

      return res.json({
        success: true,
        verified: true,
        orderId: liveCheck.payment.order_id || undefined,
        paymentId: liveCheck.payment.id,
        amount: Math.round(Number(liveCheck.payment.amount) / 100),
        currency: liveCheck.payment.currency || "INR",
        receiptToken,
      });
    } catch (err: any) {
      console.error("Error in /api/razorpay/verify-payment-id:", err);
      return res.status(500).json({
        error: err.message || "Could not verify Razorpay Payment ID.",
      });
    }
  });

  // API: Analyze Bride & Groom Photos and Generate 3D Pixar Caricature Persona
  app.post("/api/analyze-couple", async (req, res) => {
    try {
      const {
        bridePhoto,
        groomPhoto,
        brideName = "Bride",
        groomName = "Groom",
        stateTheme = "Pan-Indian / Bollywood Glam",
        brideAttire = "",
        groomAttire = "",
      } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        // Return rich default caricature descriptors if Gemini key not set
        return res.json({
          success: true,
          isMock: true,
          caricatureDetails: {
            groom: {
              features: `Charming Pixar 3D caricature of ${groomName} in ${groomAttire || 'royal embroidered sherwani'}, warm dark hair, joyful smile.`,
              expression: "Lovestruck, beaming with joy and adoration",
            },
            bride: {
              features: `Radiant Pixar 3D caricature of ${brideName} in ${brideAttire || 'exquisite wedding lehenga'}, big expressive sparkling eyes, glowing bridal smile.`,
              expression: "Tearful with ecstatic happiness, hand on heart",
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

      // Build parts for multimodal prompt
      const parts: any[] = [];
      
      let hasPhotos = false;
      if (bridePhoto && bridePhoto.includes("base64,")) {
        const [meta, data] = bridePhoto.split("base64,");
        const mimeType = meta.match(/data:(.*?);/)?.[1] || "image/jpeg";
        parts.push({
          inlineData: { mimeType, data },
        });
        hasPhotos = true;
      }

      if (groomPhoto && groomPhoto.includes("base64,")) {
        const [meta, data] = groomPhoto.split("base64,");
        const mimeType = meta.match(/data:(.*?);/)?.[1] || "image/jpeg";
        parts.push({
          inlineData: { mimeType, data },
        });
        hasPhotos = true;
      }

      const promptText = `
You are a lead Pixar 3D Character Stylist and wedding director specializing in Indian cultural weddings.
Analyze the couple: Bride named "${brideName}" and Groom named "${groomName}".
Selected Indian State Wedding Theme: "${stateTheme}".
Traditional Regional Attire Context:
- Bride Attire: ${brideAttire}
- Groom Attire: ${groomAttire}

${hasPhotos ? "Based on the uploaded photos of the bride and groom, identify their facial characteristics (hair color/texture, face shape, smile, eye shape, skin tone)." : "Create a romantic Pixar couple caricature."}
Incorporate the authentic regional Indian attire, jewelry, turbans/saris, and cultural wedding motifs of ${stateTheme} into their 3D Pixar designs!

Generate a 3D Pixar cute caricature profile and custom scene descriptors for a 4-scene romantic wedding invitation video:
Scene 1: "Finally" (Groom proposing on one knee with sparkling diamond ring)
Scene 2: "The Wait is Over" (Couple romantic waltz dance holding hands)
Scene 3: "We are making it official" (Couple in festive ${stateTheme} wedding attire)
Scene 4: "We are getting married" (Royal announcement invitation ceremony)

Return ONLY valid JSON with this structure:
{
  "groom": {
    "features": "description of groom's 3D Pixar character appearance and regional wedding attire",
    "expression": "proposal & dance emotion"
  },
  "bride": {
    "features": "description of bride's 3D Pixar character appearance and regional bridal attire/jewelry",
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
        model: "gemini-3.8-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const caricatureDetails = JSON.parse(responseText);

      return res.json({
        success: true,
        caricatureDetails,
      });
    } catch (err: any) {
      console.error("Error in /api/analyze-couple:", err);
      return res.status(500).json({
        error: err.message || "Failed to analyze couple photos",
      });
    }
  });

  // API: Live AI Image Generation (Optional 3D Pixar Caricature generation)
  app.post("/api/generate-caricature", async (req, res) => {
    try {
      const { prompt, sceneNumber } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(400).json({
          error: "Gemini API key is not configured. Using pre-rendered 3D Pixar studio scenes.",
        });
      }

      const enhancedPrompt = `Cute 3D Pixar Disney animated movie style caricature, 8k octane render, cute stylized proportions, big expressive emotional eyes, warm cinematic lighting: ${prompt}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: {
          parts: [{ text: enhancedPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "9:16",
          },
        },
      });

      let imageUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || "image/png";
          imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!imageUrl) {
        return res.status(500).json({ error: "No image was returned by the model" });
      }

      return res.json({ success: true, imageUrl });
    } catch (err: any) {
      console.error("Error in /api/generate-caricature:", err);
      return res.status(500).json({
        error: err.message || "Failed to generate caricature image",
      });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pixar Wedding Video Studio running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
