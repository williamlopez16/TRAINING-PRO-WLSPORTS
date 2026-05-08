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
      let apiKey = req.body.apiKey;
      if (!apiKey || apiKey === 'null' || apiKey === 'undefined') {
        apiKey = process.env.GEMINI_API_KEY;
      }
      if (!apiKey || apiKey === 'null' || apiKey === 'undefined' || apiKey === 'MY_GEMINI_API_KEY' || apiKey.includes('MY_GEMINI_API_KEY')) {
        apiKey = "AIzaSyBT3DGNLEbY1FZUJsZvkJgKwKEZwKpMFng";
      }
      if (!apiKey) {
        return res.status(401).json({ error: "API_KEY_MISSING", message: "La API Key de Gemini no está configurada o es inválida en el servidor. Revisa tus Secretos/Environment variables." });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      let text = req.body.text;
      const fileDataId = req.body.fileData; // base64 string
      const fileName = req.body.fileName || "";

      if (!text && !fileDataId) {
        return res.status(400).json({ error: "No text or file provided" });
      }

      if (fileDataId) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        const buffer = Buffer.from(fileDataId, 'base64');
        
        try {
          if (ext === 'pdf') {
            const pdfParseMod = (await import('pdf-parse')) as any;
            const pdfParse = pdfParseMod.default || pdfParseMod;
            const pdfData = await pdfParse(buffer);
            text = pdfData.text;
          } else if (ext === 'xlsx' || ext === 'xls') {
            const xlsx = await import('xlsx');
            const workbook = xlsx.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            text = xlsx.utils.sheet_to_csv(sheet);
          } else if (ext === 'docx') {
            const mammoth = await import('mammoth');
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
          } else if (ext === 'txt' || ext === 'csv') {
            text = buffer.toString('utf-8');
          } else {
            return res.status(400).json({ error: "Formato de archivo no soportado. Usa PDF, Excel, Word o Texto." });
          }
        } catch (err: any) {
             return res.status(500).json({ error: "Error al leer el archivo: " + err.message });
        }
      }

      if (!text || text.trim() === "") {
         return res.status(400).json({ error: "No se pudo extraer texto del archivo o el texto está vacío." });
      }

      const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-3-flash-preview",
        "gemini-3.1-pro-preview"
      ];
      let response = null;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`Intentando conectar con Gemini usando el modelo: ${modelName}`);
          response = await ai.models.generateContent({
            model: modelName,
            contents: `Extrae la lista de estudiantes de este texto basura/PDF de clase, ignorando cosas como encabezados, profesores o materias secundarias. Formatea obligatoriamente un JSON.
            De cada estudiante deduce si es hombre o mujer guiándote por el nombre (M = Masculino, F = Femenino, si no estás seguro al 100% o es muy ambiguo pon O).
            Devuelve un JSON estrictamente con la siguiente estructura:
            {
              "students": [
                { "name": "Nombre completo Capitalizado", "gender": "M" | "F" | "O" }
              ]
            }
            
            Texto:
            ${text}`,
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
            }
          });

          if (response && response.text) {
            console.log(`¡Éxito total extrayendo datos con el modelo: ${modelName}!`);
            break;
          }
        } catch (err: any) {
          console.warn(`El modelo ${modelName} falló o no tiene cuota disponible:`, err.message || err);
          lastError = err;
        }
      }

      if (!response || !response.text) {
        throw lastError || new Error("No se pudo obtener respuesta con ninguno de los modelos de Gemini disponibles.");
      }

      if (!response.text) {
        return res.status(500).json({ error: "Failed to generate response" });
      }

      const parsed = JSON.parse(response.text);
      res.json(parsed);

    } catch (e: any) {
      const errStr = e.message || JSON.stringify(e) || String(e);
      console.error("AI Error:", errStr);
      if (errStr.includes("API key not valid") || errStr.includes("API_KEY_INVALID")) {
         return res.status(401).json({ error: "API_KEY_INVALID", message: "La API Key de Gemini configurada o proveída no es válida. Por favor, revisa tus Secretos/Environment variables e intenta de nuevo." });
      }
      res.status(500).json({ error: errStr || "Unknown error" });
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
