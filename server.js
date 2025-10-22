import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Chat proxy: keeps your OpenAI key on the server
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, prompt } = req.body || {};
    const finalMessages = Array.isArray(messages) && messages.length
      ? messages
      : [
          { role: "system", content: "You are a concise, helpful assistant." },
          ...(prompt ? [{ role: "user", content: prompt }] : [])
        ];

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: finalMessages,
        temperature: 0.6
      })
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(500).json({ error: "OpenAI request failed", detail: txt });
    }
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content ?? "(no reply)";
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: "Server error", detail: String(e) });
  }
});

// Fallback to index.html for root
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server listening on", PORT);
});
