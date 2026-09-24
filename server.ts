import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Avoid tsx setting global __dirname to '.' which breaks vite-plugin-pwa resolution
if (typeof (globalThis as any).__dirname !== 'undefined') {
  delete (globalThis as any).__dirname;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Direct APK download route for Android devices
  app.get(["/api/download-apk", "/WLSPORTS-Groups.apk"], (req, res) => {
    const candidates = [
      path.join(process.cwd(), "public", "WLSPORTS-Groups.apk"),
      path.join(process.cwd(), "dist", "WLSPORTS-Groups.apk"),
      "/tmp/WLSPORTS-Groups.apk"
    ];
    for (const apkPath of candidates) {
      if (fs.existsSync(apkPath)) {
        res.setHeader("Content-Type", "application/vnd.android.package-archive");
        res.setHeader("Content-Disposition", 'attachment; filename="WLSPORTS-Groups.apk"');
        return res.sendFile(apkPath);
      }
    }
    res.status(404).send("APK not found");
  });

  // Direct Apple iOS Configuration Profile (.mobileconfig) for iPhone & iPad
  app.get(["/api/download-ios-profile", "/WLSPORTS.mobileconfig"], (req, res) => {
    try {
      const host = req.get("host") || "localhost:3000";
      const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const appUrl = `${protocol}://${host}/`;

      let iconBase64 = "";
      const iconPath = path.join(process.cwd(), "public", "apple-touch-icon.png");
      if (fs.existsSync(iconPath)) {
        iconBase64 = fs.readFileSync(iconPath).toString("base64");
      }

      const mobileConfigXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>
            ${iconBase64 ? `<key>Icon</key>\n            <data>${iconBase64}</data>` : ''}
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>WLSPORTS</string>
            <key>PayloadDescription</key>
            <string>Instala la aplicación nativa WLSPORTS Groups en tu iPhone o iPad.</string>
            <key>PayloadDisplayName</key>
            <string>WLSPORTS Groups</string>
            <key>PayloadIdentifier</key>
            <string>com.wlsports.groups.webclip</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>94B3C53C-2580-4D56-A6E9-C6F4C0D4A09B</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Precomposed</key>
            <true/>
            <key>URL</key>
            <string>${appUrl}</string>
        </dict>
    </array>
    <key>PayloadDescription</key>
    <string>Instalador oficial de WLSPORTS Groups para iPhone y iPad</string>
    <key>PayloadDisplayName</key>
    <string>WLSPORTS Groups (App iOS)</string>
    <key>PayloadIdentifier</key>
    <string>com.wlsports.groups.profile</string>
    <key>PayloadOrganization</key>
    <string>WLSPORTS</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>4E38E5A7-919F-4D2A-BD06-039A7F11C87E</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

      res.setHeader("Content-Type", "application/x-apple-aspen-config; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="WLSPORTS.mobileconfig"');
      res.send(mobileConfigXml);
    } catch (err: any) {
      console.error("Error generating iOS profile:", err);
      res.status(500).send("Error generando el instalador para iOS");
    }
  });

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
