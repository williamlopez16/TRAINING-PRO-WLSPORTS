import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  app.post("/api/save-initial-data", async (req, res) => {
    try {
      const fs = await import("fs/promises");
      const data = req.body;
      await fs.writeFile(
        path.join(process.cwd(), "src", "store", "initialData.json"),
        JSON.stringify(data, null, 2)
      );
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Unknown error" });
    }
  });

  app.post("/api/parse-students", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY env is missing." });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "No text provided" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Extrae la lista de estudiantes de este texto basura/PDF, ignora cosas como encabezados, profesores o materias. Formatea un JSON.
        De cada estudiante deduce si es hombre o mujer guiándote por el nombre (M = Masculino, F = Femenino, si no estás seguro al 100% o es ambiguo pon O).
        Devuelve un JSON estrictamente con esta estructura:
        {
          "students": [
            { "name": "Nombre completo Capitalizado", "gender": "M" | "F" | "O" }
          ]
        }
        
        Texto:
        ${text}`,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        }
      });

      if (!response.text) {
        return res.status(500).json({ error: "Failed to generate response" });
      }

      const parsed = JSON.parse(response.text);
      res.json(parsed);

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Unknown error" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist", "client"); // vite build default for client? Actually just dist
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
