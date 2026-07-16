import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" }));

  // Initialize Default Google GenAI Client with system key
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      console.log("Default Gemini AI client initialized successfully.");
    } catch (err) {
      console.error("Error initializing default Gemini client:", err);
    }
  }

  // 1. DEFAULT GEMINI API ROUTE (using system API key)
  app.post("/api/gemini/default", async (req, res) => {
    if (!ai) {
      return res.status(503).json({
        error: "Default Gemini API is not configured or unavailable.",
      });
    }

    try {
      const { prompt, systemInstruction, isJson, schema } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
      }

      const config: any = {};
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }
      if (isJson) {
        config.responseMimeType = "application/json";
        if (schema) {
          config.responseSchema = schema;
        }
      }

      // Helper function to call generateContent with retry, exponential backoff, and model failover
      const callGeminiWithRetry = async (configObj: any, promptStr: string) => {
        // List of candidate models to try in sequence if there is a transient or demand issue
        const modelsToTry = [
          "gemini-3.5-flash",
          "gemini-3.1-flash-lite",
          "gemini-3-flash-preview",
          "gemini-3.1-flash-lite-preview"
        ];
        
        let lastError: any = null;

        for (const modelName of modelsToTry) {
          console.log(`[Gemini Gateway] Preparing attempt using: ${modelName}`);
          
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              const response = await ai!.models.generateContent({
                model: modelName,
                contents: promptStr,
                config: configObj,
              });
              console.log(`[Gemini Gateway] Successfully generated content using model: ${modelName}`);
              return response;
            } catch (err: any) {
              lastError = err;
              const errMsg = err?.message || String(err);
              
              // Determine if the model is busy or rate-limited without printing the word 'error' or 'failed' or raw API dumps
              const isBusy = 
                errMsg.includes("503") || 
                errMsg.includes("429") || 
                errMsg.includes("UNAVAILABLE") || 
                errMsg.includes("high demand") || 
                errMsg.includes("ResourceExhausted") ||
                errMsg.includes("quota") ||
                errMsg.includes("limit") ||
                errMsg.includes("overloaded");

              if (isBusy) {
                console.log(`[Gemini Gateway] Model "${modelName}" is currently unavailable or busy. Swapping to another model candidate...`);
                break; // Break current attempt loop and proceed to next model in modelsToTry
              }

              // Otherwise, log a simple retry message and wait a short delay
              if (attempt < 2) {
                const delay = 1000 + Math.random() * 500;
                console.log(`[Gemini Gateway] Model "${modelName}" is temporarily unresponsive. Waiting ${Math.round(delay)}ms to retry...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
              }
            }
          }
        }
        
        // If all candidate models and retries failed, throw the final error
        throw lastError;
      };

      const response = await callGeminiWithRetry(config, prompt);

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Default API Error:", error);
      res.status(500).json({
        error: error.message || "An error occurred during content generation.",
      });
    }
  });

  // 2. UNIVERSAL CORS AI PROXY ROUTE (for user-provided custom API keys & endpoints)
  app.post("/api/proxy", async (req, res) => {
    try {
      const { url, method, headers, body } = req.body;

      if (!url) {
        return res.status(400).json({ error: "URL is required for proxying." });
      }

      const requestOptions: RequestInit = {
        method: method || "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      };

      if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
        requestOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      const targetResponse = await fetch(url, requestOptions);
      const isJson = targetResponse.headers.get("content-type")?.includes("application/json");

      res.status(targetResponse.status);

      // Copy response headers (like content-type)
      const responseContentType = targetResponse.headers.get("content-type");
      if (responseContentType) {
        res.setHeader("Content-Type", responseContentType);
      }

      if (isJson) {
        const json = await targetResponse.json();
        res.json(json);
      } else {
        const text = await targetResponse.text();
        res.send(text);
      }
    } catch (error: any) {
      console.error("Proxy Error:", error);
      res.status(500).json({
        error: error.message || "Proxy failed to fetch target resource.",
      });
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
