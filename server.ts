import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Initialize Gemini
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, history, courseContext, images } = req.body;
      
      const systemInstruction = `You are a premium AI Study Assistant for Nexus Academy.
You are helping a student. You have full access to course context if provided.
You are professional, encouraging, and clear.
Provide code snippets, math formulas, or markdown when helpful.
Course Context: ${courseContext || "None provided"}`;

      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction,
        },
      });

      // We need to pass history if provided. For simplicity, we can format history as text,
      // or map to contents. The GenAI SDK supports passing contents.
      // Actually, ai.models.generateContent is easier with history if we just pass a list of contents.
      
      let contents = [];
      if (history && Array.isArray(history)) {
        history.forEach((msg) => {
          contents.push({ role: msg.role === "assistant" ? "model" : "user", parts: [{ text: msg.text }] });
        });
      }
      
      const newParts = [];
      if (message) {
         newParts.push({ text: message });
      }
      if (images && Array.isArray(images)) {
         images.forEach((imgBase64) => {
            const match = imgBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.*)$/);
            if (match) {
               newParts.push({ inlineData: { mimeType: match[1], data: match[2] }});
            } else {
               // Assuming raw base64 if no prefix
               newParts.push({ inlineData: { mimeType: 'image/jpeg', data: imgBase64 }});
            }
         });
      }
      if (newParts.length === 0) newParts.push({ text: "" }); // Fallback
      contents.push({ role: "user", parts: newParts });


      const response = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction,
        }
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const chunk of response) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
