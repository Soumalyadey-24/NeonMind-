import OpenAI from "openai";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ================= GROQ CLIENT =================
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

// ================= ROUTE =================
app.post("/chat", async (req, res) => {
  console.log("🔥 /chat HIT");
  console.log("📩 Body:", req.body);

  const { message } = req.body;

  if (!message) {
    return res.json({
      text: "No input received",
      audio: null
    });
  }

  try {
    // ================= GROQ =================
    console.log("🧪 Calling Groq...");

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: message
        }
      ]
    });

    console.log("🧪 Groq raw:", JSON.stringify(completion));

    let aiText =
      completion?.choices?.[0]?.message?.content;

    if (!aiText || aiText.trim().length === 0) {
      aiText = "Sorry, I could not generate a response.";
    }

    console.log("🧠 AI Text:", aiText);

    // ================= ELEVENLABS =================
    const voiceRes = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL",
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          "accept": "audio/mpeg"
        },
        body: JSON.stringify({
          text: aiText,
          model_id: "eleven_turbo_v2",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.8
          }
        })
      }
    );

    if (!voiceRes.ok) {
      const err = await voiceRes.text();
      console.error("❌ ElevenLabs error:", err);

      return res.json({
        text: aiText,
        audio: null
      });
    }

    const audioBuffer = await voiceRes.arrayBuffer();
    console.log("🔊 Audio bytes:", audioBuffer.byteLength);

    return res.json({
      text: aiText,
      audio: Buffer.from(audioBuffer).toString("base64")
    });

  } catch (err) {
    console.error("💥 Server error FULL:", err);
    return res.status(500).json({
      text: "Server error",
      audio: null
    });
  }
});

// ================= START =================
app.listen(5000, () => {
  console.log("✅ Backend running on http://localhost:5000");
});
