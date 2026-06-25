export const AI_PROVIDERS = [
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    defaultBaseUrl: 'http://localhost:11434/v1',
    requiresKey: false,
    defaultModel: 'glm-ocr-strict:latest'
  },
  {
    id: 'ollama-server',
    name: 'Ollama (Server)',
    defaultBaseUrl: 'http://192.168.1.150:11434/v1',
    requiresKey: false,
    defaultModel: 'glm-ocr-strict:latest'
  },
  {
    id: 'google',
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    requiresKey: true,
    defaultModel: 'gemini-2.5-flash'
  },

  {
    id: 'groq',
    name: 'Groq (LPU)',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    requiresKey: true,
    defaultModel: 'llama-3.3-70b-versatile'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    requiresKey: true,
    defaultModel: 'google/gemini-pro-1.5'
  },
  {
    id: 'alibaba',
    name: 'Alibaba Qwen (DashScope)',
    defaultBaseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    requiresKey: true,
    defaultModel: 'qwen-vl-max'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    requiresKey: true,
    defaultModel: 'deepseek-chat'
  },
  {
    id: 'together',
    name: 'Together AI',
    defaultBaseUrl: 'https://api.together.xyz/v1',
    requiresKey: true,
    defaultModel: 'meta-llama/Llama-3-vision-alpha'
  },
  {
    id: 'cohere',
    name: 'Cohere',
    defaultBaseUrl: 'https://api.cohere.ai/v1',
    requiresKey: true,
    defaultModel: 'command-r-plus'
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    defaultBaseUrl: 'https://api.cerebras.ai/v1',
    requiresKey: true,
    defaultModel: 'llama3.1-70b'
  },
  {
    id: 'huggingface',
    name: 'Hugging Face Inference',
    defaultBaseUrl: 'https://api-inference.huggingface.co/v1',
    requiresKey: true,
    defaultModel: 'meta-llama/Meta-Llama-3-8B-Instruct'
  },
  {
    id: 'zenmux',
    name: 'Zenmux',
    defaultBaseUrl: 'https://zenmux.ai/api/v1',
    requiresKey: true,
    defaultModel: 'deepseek/deepseek-chat'
  },
  {
    id: 'custom',
    name: 'Custom OpenAI Endpoint',
    defaultBaseUrl: 'https://api.openai.com/v1',
    requiresKey: true,
    defaultModel: 'gpt-4o'
  }
];

export function getDefaultProviderConfig(id = 'ollama') {
  const p = AI_PROVIDERS.find(x => x.id === id) || AI_PROVIDERS[0];
  return {
    providerId: p.id,
    baseUrl: p.defaultBaseUrl,
    apiKey: '',
    model: p.defaultModel
  };
}
