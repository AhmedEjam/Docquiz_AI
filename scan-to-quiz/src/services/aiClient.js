/**
 * Unified AI HTTP client using the OpenAI compatible `/chat/completions` endpoint.
 * Single place for retry logic, abort support, and error handling across providers.
 */

const DEFAULT_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

export async function aiFetch(config, payload, options = {}) {
  const { retries = DEFAULT_RETRIES, signal } = options;
  const baseUrl = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
  const endpoint = `${baseUrl}/chat/completions`;

  const headers = { 'Content-Type': 'application/json' };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal,
      });

      if (!res.ok) {
        throw new AIHttpError(res.status, await res.text().catch(() => ''));
      }

      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (attempt === retries - 1) throw err;
      await delay(BACKOFF_BASE_MS * Math.pow(2, attempt));
    }
  }
}

/** Vision model: send image(s) with a prompt */
export async function generateWithImage(config, prompt, images, options = {}) {
  // Convert base64 images into OpenAI vision format
  const content = [
    { type: 'text', text: prompt }
  ];

  for (const imgBase64 of images) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${imgBase64}` }
    });
  }

  const payload = {
    model: config.model,
    messages: [
      { role: 'user', content }
    ],
    temperature: 0.1,
    max_tokens: 4096
  };

  const data = await aiFetch(config, payload, options);
  return data.choices?.[0]?.message?.content || '';
}

/** Chat model: system + user messages */
export async function chatComplete(config, systemPrompt, userMessage, options = {}) {
  const payload = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.1,
    max_tokens: 8192
  };

  const data = await aiFetch(config, payload, options);
  return data.choices?.[0]?.message?.content || '';
}

class AIHttpError extends Error {
  constructor(status, body) {
    super(`AI HTTP ${status}: ${body.slice(0, 200)}`);
    this.name = 'AIHttpError';
    this.status = status;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
