import { readFileSync } from 'fs';

const keys   = JSON.parse(readFileSync('./keys.json',  'utf-8'));
const config = JSON.parse(readFileSync('./config.json', 'utf-8'));

export async function chat(messages, persona) {
  const provider = persona.provider_override ?? config.provider;

  switch (provider) {
    case 'ollama':    return chatOllama(messages, persona);
    case 'openai':    return chatOpenAI(messages, persona);
    case 'grok':      return chatGrok(messages, persona);
    default: throw new Error(`Unknown provider: "${provider}". Valid options: ollama, openai, grok`);
  }
}

async function chatOllama(messages, persona) {
  const cfg = config.ollama;
  const model = persona.model_override ?? cfg.model;

  const res = await fetch(`${cfg.base_url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  });

  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message.content;
}

async function chatOpenAI(messages, persona) {
  const cfg = config.openai;
  const model = persona.model_override ?? cfg.model;

  const res = await fetch(`${cfg.base_url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${keys.openai}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function chatGrok(messages, persona) {
  const cfg = config.grok;
  const model = persona.model_override ?? cfg.model;

  const res = await fetch(`${cfg.base_url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${keys.grok}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) throw new Error(`Grok error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}
