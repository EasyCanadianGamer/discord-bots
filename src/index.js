import { readFileSync } from 'fs';
import { join } from 'path';
import { Bot } from './bot.js';

const keys   = JSON.parse(readFileSync('./keys.json',  'utf-8'));
const config = JSON.parse(readFileSync('./config.json', 'utf-8'));

async function main() {
  if (!config.bots || config.bots.length === 0) {
    console.error('No bots listed in config.json "bots" array.');
    process.exit(1);
  }

  const startedBots = [];

  for (const botName of config.bots) {
    // Load persona
    const personaPath = join('./personas', `${botName}.json`);
    let persona;
    try {
      persona = JSON.parse(readFileSync(personaPath, 'utf-8'));
    } catch {
      console.error(`[${botName}] Could not load persona at ${personaPath} — skipping.`);
      continue;
    }

    // Look up token — try discord_name first (supports spaces), fall back to file name
    const tokenKey = persona.discord_name ?? botName;
    const token = keys.discord?.[tokenKey] ?? keys.discord?.[botName];
    if (!token || token.startsWith('YOUR_')) {
      console.warn(`[${botName}] No token in keys.json for "${tokenKey}" — skipping.`);
      continue;
    }

    try {
      const bot = new Bot(persona, token);
      await bot.start();
      console.log(`[${persona.name}] Ready as ${bot.client.user.tag}`);
      startedBots.push(bot);
    } catch (err) {
      console.error(`[${botName}] Failed to start:`, err.message);
    }
  }

  if (startedBots.length === 0) {
    console.error('No bots started. Fill in your tokens in keys.json.');
    process.exit(1);
  }

  // Build name->userId map so bots can @mention each other properly
  const mentionMap = new Map();
  for (const bot of startedBots) {
    const id = bot.client.user.id;
    for (const name of [bot.persona.name, bot.persona.discord_name, bot.client.user.username]) {
      if (name) mentionMap.set(name.toLowerCase(), id);
    }
  }
  for (const bot of startedBots) {
    bot.setMentionMap(mentionMap);
  }

  console.log(`\n${startedBots.length} bot(s) running. Press Ctrl+C to stop.\n`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
