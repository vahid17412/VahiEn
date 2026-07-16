/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStoredSettings, getAllAIKeys } from "./db";
import { AIKey } from "../types";

export interface AICallOptions {
  prompt: string;
  systemInstruction?: string;
  isJson?: boolean;
}

/**
 * Direct call to the backend's system-injected default Gemini API
 */
async function callDefaultGemini(options: AICallOptions): Promise<string> {
  const response = await fetch("/api/gemini/default", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: options.prompt,
      systemInstruction: options.systemInstruction,
      isJson: options.isJson,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Default Gemini API call failed.");
  }
  return data.text;
}

/**
 * Proxy a request to a custom configured AI key through the backend's CORS proxy
 */
async function callCustomAIKey(key: AIKey, options: AICallOptions): Promise<string> {
  let url = "";
  let headers: Record<string, string> = {};
  let body: any = {};

  const model = key.model || "default";
  const systemText = options.systemInstruction || "";
  const promptText = options.prompt;

  switch (key.provider) {
    case "openai":
    case "deepseek":
    case "groq":
    case "openrouter":
    case "ollama":
    case "custom": {
      // Determine base URL based on provider
      let baseUrl = key.baseUrl || "";
      if (!baseUrl) {
        if (key.provider === "openai") baseUrl = "https://api.openai.com/v1";
        else if (key.provider === "deepseek") baseUrl = "https://api.deepseek.com/v1";
        else if (key.provider === "groq") baseUrl = "https://api.groq.com/openai/v1";
        else if (key.provider === "openrouter") baseUrl = "https://openrouter.ai/api/v1";
        else if (key.provider === "ollama") baseUrl = "http://localhost:11434/v1";
      }

      // Ensure no trailing slash
      if (baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, -1);
      }

      url = `${baseUrl}/chat/completions`;
      headers = {
        "Authorization": `Bearer ${key.apiKey}`,
      };

      body = {
        model: model,
        messages: [
          ...(systemText ? [{ role: "system", content: systemText }] : []),
          { role: "user", content: promptText },
        ],
        temperature: 0.3,
      };

      if (options.isJson) {
        body.response_format = { type: "json_object" };
      }
      break;
    }

    case "claude": {
      const baseUrl = key.baseUrl || "https://api.anthropic.com";
      url = `${baseUrl}/v1/messages`;
      headers = {
        "x-api-key": key.apiKey,
        "anthropic-version": "2023-06-01",
      };

      body = {
        model: model,
        max_tokens: 4096,
        messages: [{ role: "user", content: promptText }],
        temperature: 0.3,
      };

      if (systemText) {
        body.system = systemText;
      }
      break;
    }

    case "gemini": {
      // For custom user-provided Gemini Key
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key.apiKey}`;
      headers = {}; // API key is in query param
      
      body = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: options.isJson ? { responseMimeType: "application/json" } : {},
      };

      if (systemText) {
        body.systemInstruction = { parts: [{ text: systemText }] };
      }
      break;
    }

    default:
      throw new Error(`Unsupported AI provider: ${key.provider}`);
  }

  // Send request via backend proxy
  const proxyResponse = await fetch("/api/proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      method: "POST",
      headers,
      body,
    }),
  });

  const data = await proxyResponse.json();

  if (!proxyResponse.ok) {
    throw new Error(data.error || `AI Request to ${key.displayName} (${key.provider}) failed.`);
  }

  // Extract the response text depending on provider response format
  try {
    if (key.provider === "claude") {
      return data.content?.[0]?.text || "";
    } else if (key.provider === "gemini") {
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      // OpenAI-compatible Chat Completions
      return data.choices?.[0]?.message?.content || "";
    }
  } catch (err) {
    console.error("Failed to parse provider response payload:", data, err);
    throw new Error("Unable to parse text from AI provider response.");
  }
}

/**
 * Universal AI Gateway
 * Route requests to the assigned provider depending on user preferences
 */
export async function executeAITask(
  task: "vocabularyExplanation" | "grammarCorrection" | "writingFeedback" | "pronunciationEvaluation" | "exampleGeneration",
  prompt: string,
  systemInstruction?: string,
  isJson: boolean = false
): Promise<string> {
  const settings = getStoredSettings();
  const assignedKeyId = settings.aiTasks[task] || "default-gemini";

  const options: AICallOptions = { prompt, systemInstruction, isJson };

  if (assignedKeyId === "default-gemini") {
    return callDefaultGemini(options);
  }

  // Load user's custom key details from database
  const customKeys = await getAllAIKeys();
  const matchedKey = customKeys.find((k) => k.id === assignedKeyId);

  if (!matchedKey || !matchedKey.enabled) {
    // Fallback to active system key or another enabled custom key if available
    const fallbackKey = customKeys.find((k) => k.enabled);
    if (fallbackKey) {
      console.warn(`Configured key ${assignedKeyId} not found or disabled. Falling back to ${fallbackKey.displayName}.`);
      return callCustomAIKey(fallbackKey, options);
    }
    
    // No valid custom keys, try default Gemini system key as last-resort fallback
    console.warn(`No valid custom keys. Attempting default system Gemini client.`);
    return callDefaultGemini(options);
  }

  return callCustomAIKey(matchedKey, options);
}

/**
 * Test a specific key configuration in the AI Setup tab
 */
export async function testAIKeyConnection(key: AIKey): Promise<boolean> {
  try {
    const response = await callCustomAIKey(key, {
      prompt: "Hello, respond with exactly the word 'OK'.",
      systemInstruction: "Be extremely concise.",
    });
    return response.toUpperCase().includes("OK");
  } catch (err) {
    console.error("AI Key Test Connection Failed:", err);
    return false;
  }
}
