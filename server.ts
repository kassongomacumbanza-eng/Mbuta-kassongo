import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Kassongo AI Engine: Success initializing GoogleGenAI");
  } catch (e) {
    console.error("Kassongo AI Engine failed to initialize:", e);
  }
} else {
  console.log("Kassongo AI Engine: GEMINI_API_KEY missing or placeholder. Running in Offline Smart Mode.");
}

// REST Endpoints
app.post("/api/gemini/script", async (req, res) => {
  const { concept, duration = 15, language = "pt-BR" } = req.body;

  if (!concept) {
    return res.status(400).json({ error: "Concept is required for project generation." });
  }

  // Fallback Local Generator in case Gemini API is not accessible or key is missing
  const getLocalFallbackScript = (userConcept: string, dur: number) => {
    const isPt = language.startsWith("pt");
    const title = `Kassongo Cut: ${userConcept.substring(0, 30)}${userConcept.length > 30 ? "..." : ""}`;
    const soundtrackStyle = "Electro Trap Bass";
    
    // Generate timestamps distributed over the project duration
    const segmentCount = dur > 30 ? 4 : 3;
    const segments = [];
    const step = dur / segmentCount;
    
    const ptPhrases = [
      "Sejam muito bem-vindos ao Kassongo Cut!",
      "Este é o momento de aplicar filtros cyberpunk e legendas dinâmicas.",
      "As transições rápidas dão o ritmo perfeito para este take.",
      "Terminamos com força! Curte, compartilha e comenta aí embaixo!",
    ];
    const enPhrases = [
      "Welcome to this stellar Kassongo Cut release!",
      "Now, applying cyberpunk filters and aesthetic live captioning.",
      "Perfect rhythmic shifts matching these timeline transitions.",
      "That's a wrap! Hit that heart widget and save for later!",
    ];
    
    const phrases = isPt ? ptPhrases : enPhrases;
    for (let i = 0; i < segmentCount; i++) {
      const phrase = phrases[i % phrases.length];
      segments.push({
        startTime: parseFloat((i * step).toFixed(1)),
        endTime: parseFloat(((i + 1) * step).toFixed(1)),
        text: i === 0 ? `🔥 [Hook] ${phrase}` : phrase,
        visualCue: i % 2 === 0 ? "Zoom In overlay + Neon strobe" : "Pan left + Retro grain filter"
      });
    }

    return {
      title,
      soundtrackStyle: "Cyber Pop Sync",
      hookText: isPt ? `Bora editar: ${userConcept}` : `Let's edit: ${userConcept}`,
      captions: segments,
      suggestedFilter: "Cyberneon",
      tags: ["kassongocut", "viralcut", "editormoderno", "videotempo", "capcutpremium"]
    };
  };

  if (!ai) {
    console.log("Running Offline Smart Generator...");
    return res.json(getLocalFallbackScript(concept, duration));
  }

  try {
    const promptInstructions = `Generate a creative styled mock video timeline breakdown, speech captions, and post-production properties for: "${concept}". 
The target video duration is exactly ${duration} seconds.
Output language requirement: ${language}.
Ensure you generate a set of timestamped subtitles/captions starting from 0 up to a maximum of ${duration} seconds. No single caption block should last more than 5 seconds.
Generate realistic timelines. Make the title extremely punchy and trendy.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptInstructions,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are the creative director AI of Kassongo Cut, the premium video templates and editing suite built for speed, rhythm, and style. Return complete, syntactically-valid JSON conforming to requested schema.",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Action hook title for this export" },
            soundtrackStyle: { type: Type.STRING, description: "Best vibe fit: Synthwave, Electro Funk, Hip-Hop Bounce, Orchestral Drama" },
            hookText: { type: Type.STRING, description: "A initial flashy subtitle text to grab screen interest" },
            captions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  startTime: { type: Type.NUMBER, description: "Start seconds" },
                  endTime: { type: Type.NUMBER, description: "End seconds" },
                  text: { type: Type.STRING, description: "Dialogue or vibe commentary subtitles" },
                  visualCue: { type: Type.STRING, description: "Zoom, shake, transition, flash overlay cue" }
                },
                required: ["startTime", "endTime", "text", "visualCue"]
              }
            },
            suggestedFilter: { type: Type.STRING, description: "Best filter choice like Cyberneon, Vintage, Noir, Warm, or Rainbow" },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "soundtrackStyle", "hookText", "captions", "suggestedFilter"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini script API processing failed, using local generator:", error);
    return res.json(getLocalFallbackScript(concept, duration));
  }
});

// Quick AI sticker, preset & slogan generator
app.post("/api/gemini/stickers", async (req, res) => {
  const { concept = "vlog", count = 4 } = req.body;
  
  if (!ai) {
    return res.json({
      stickers: [
        { text: "⚡ CRITICAL HIT", color: "#e11d48" },
        { text: "✨ SO AESTHETIC", color: "#c084fc" },
        { text: "🔥 CASUAL VIBE", color: "#f59e0b" },
        { text: "🎬 TAKE ONE", color: "#10b981" }
      ]
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate ${count} trendy video stickers/overlays slogans with neon background colors hex code for a video clip regarding: "${concept}". Return purely valid JSON application structure.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stickers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: "Cute capital letter sticker phrase e.g. 'CAPS LOCK'" },
                  color: { type: Type.STRING, description: "Hex neon color code e.g. '#c084fc'" }
                },
                required: ["text", "color"]
              }
            }
          },
          required: ["stickers"]
        }
      }
    });
    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (e) {
    return res.json({
      stickers: [
        { text: "🚀 CASUAL", color: "#3b82f6" },
        { text: "🍿 SHOCK!", color: "#ec4899" },
        { text: "⭐ ULTRA", color: "#f59e0b" },
        { text: "💯 GOAT", color: "#10b981" }
      ]
    });
  }
});

// Configure Vite or Static Assets path
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware mounted successfully.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kassongo Cut server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
