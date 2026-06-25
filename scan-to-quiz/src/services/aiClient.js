/**
 * Unified AI HTTP client using the OpenAI compatible `/chat/completions` endpoint.
 * Single place for retry logic, abort support, and error handling across providers.
 */

const DEFAULT_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

// HTTP status codes that are NOT worth retrying (client errors, auth failures, etc.)
const NON_RETRIABLE_STATUSES = new Set([400, 401, 403, 404, 422]);

export async function aiFetch(config, payload, options = {}) {
  const { retries = DEFAULT_RETRIES, signal } = options;
  const baseUrl = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
  const endpoint = `${baseUrl}/chat/completions`;

  const headers = { 'Content-Type': 'application/json' };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal,
      });

      if (!res.ok) {
        const err = new AIHttpError(res.status, await res.text().catch(() => ''));
        // Do not retry client errors — they will never succeed
        if (NON_RETRIABLE_STATUSES.has(res.status)) throw err;
        throw err;
      }

      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (err instanceof AIHttpError && NON_RETRIABLE_STATUSES.has(err.status)) throw err;
      if (attempt === retries) throw err;
      await delay(BACKOFF_BASE_MS * Math.pow(2, attempt));
    }
  }
}

/**
 * Vision model: send image(s) with a system prompt.
 * The OCR instruction is the system message; images are the user message.
 * Uses detail:"high" for accurate text extraction on dense pages.
 */
export async function generateWithImage(config, prompt, images, options = {}) {
  // Images go in the user turn; instruction goes in the system turn
  const userContent = images.map(imgBase64 => ({
    type: 'image_url',
    image_url: {
      url: `data:image/png;base64,${imgBase64}`,
      detail: 'high'          // High-res analysis for OCR accuracy
    }
  }));

  const payload = {
    model: config.model,
    messages: [
      { role: 'system', content: prompt },   // Instruction in system role
      { role: 'user', content: userContent } // Images in user role
    ],
    temperature: 0,       // Deterministic — OCR should be faithful, not creative
    max_tokens: 8192      // Dense pages can produce 3000-5000 tokens of text
  };

  const data = await aiFetch(config, payload, options);
  if (data?.usage) {
    console.log(`[Tokens OCR] ${config.model} - Prompt: ${data.usage.prompt_tokens}, Completion: ${data.usage.completion_tokens}`);
  }
  return data?.choices?.[0]?.message?.content || '';
}

/**
 * Chat model: system instruction + user message.
 * Used for OCR review, MCQ extraction, generation, and review passes.
 */
export async function chatComplete(config, systemPrompt, userMessage, options = {}) {
  const payload = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: options.temperature ?? 0.1,
    max_tokens: options.max_tokens ?? 8192
  };

  if (options.jsonMode) {
    if (config.providerId === 'google' || config.providerId === 'groq' || config.providerId === 'custom' || config.providerId === 'deepseek' || config.providerId === 'openrouter') {
      payload.response_format = { type: "json_object" };
    } else if (config.providerId === 'ollama' || config.providerId === 'ollama-server') {
      payload.format = "json";
    }
  }

  const data = await aiFetch(config, payload, options);
  if (data?.usage) {
    console.log(`[Tokens Chat] ${config.model} - Prompt: ${data.usage.prompt_tokens}, Completion: ${data.usage.completion_tokens}`);
  }
  return data?.choices?.[0]?.message?.content || '';
}

class AIHttpError extends Error {
  constructor(status, body) {
    super(`AI HTTP ${status}: ${body.slice(0, 300)}`);
    this.name = 'AIHttpError';
    this.status = status;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
