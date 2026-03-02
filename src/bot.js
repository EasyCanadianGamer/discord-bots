import { Client, GatewayIntentBits, Events } from 'discord.js';
import { chat } from './ai.js';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config.json', 'utf-8'));

export class Bot {
  constructor(persona, token) {
    this.persona = persona;
    this.token = token;
    this.histories = new Map(); // channelId -> message[]

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.setupHandlers();
  }

  // --- History helpers ---

  getHistory(channelId) {
    if (!this.histories.has(channelId)) this.histories.set(channelId, []);
    return this.histories.get(channelId);
  }

  pushHistory(channelId, role, content) {
    const history = this.getHistory(channelId);
    history.push({ role, content });
    const max = config.conversation.max_history;
    if (history.length > max) history.splice(0, history.length - max);
  }

  // --- Bot chain detection ---
  // Returns how many consecutive bot messages are at the end of the channel.

  async getBotChainLength(channel) {
    try {
      const fetched = await channel.messages.fetch({ limit: 15 });
      const sorted = [...fetched.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      let count = 0;
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].author.bot) count++;
        else break;
      }
      return count;
    } catch {
      return 0;
    }
  }

  // --- Channel filtering ---

  isAllowedChannel(channelId) {
    const allowed = config.conversation.allowed_channels;
    return allowed.length === 0 || allowed.includes(channelId);
  }

  // --- Event handlers ---

  setupHandlers() {
    this.client.on(Events.MessageCreate, async (message) => {
      // Never respond to ourselves
      if (message.author.id === this.client.user.id) return;

      // Channel whitelist
      if (!this.isAllowedChannel(message.channelId)) return;

      // Bot messages — respect respond_to_bots and chain limit
      if (message.author.bot) {
        if (!config.conversation.respond_to_bots) return;

        const chainLength = await this.getBotChainLength(message.channel);
        if (chainLength >= config.conversation.max_bot_chain) return;
      }

      const mode = config.conversation.mode;

      if (mode === 'mention_only') {
        if (!message.mentions.has(this.client.user.id)) return;
      } else if (mode === 'all_messages') {
        // respond to everything in allowed channels
      } else {
        // unknown mode, skip
        return;
      }

      // Strip our own @mention from the content, trim whitespace
      const content = message.cleanContent
        .replace(new RegExp(`@${escapeRegex(this.client.user.username)}`, 'gi'), '')
        .trim();

      if (!content) return;

      await this.respond(message, content);
    });
  }

  async respond(message, content) {
    const { channelId } = message;
    const authorLabel = message.author.bot
      ? message.author.username
      : message.author.username;

    this.pushHistory(channelId, 'user', `${authorLabel}: ${content}`);

    const messages = [
      { role: 'system', content: this.persona.system_prompt },
      ...this.getHistory(channelId),
    ];

    if (config.conversation.typing_indicator) {
      await message.channel.sendTyping().catch(() => {});
    }

    try {
      const raw = await chat(messages, this.persona);
      const reply = this.resolveMentions(raw);
      this.pushHistory(channelId, 'assistant', reply);
      await message.reply(reply);
    } catch (err) {
      console.error(`[${this.persona.name}] AI error:`, err.message);
      await message.reply('_(something went wrong, try again)_').catch(() => {});
    }
  }

  // Called by index.js after all bots are ready — maps name variants -> user IDs
  setMentionMap(map) {
    this.mentionMap = map;
  }

  // Replace @Name text in AI replies with real Discord <@id> mentions
  resolveMentions(text) {
    if (!this.mentionMap || this.mentionMap.size === 0) return text;
    // Sort longest-first so "Femboy Canadian" matches before "Femboy"
    const entries = [...this.mentionMap.entries()].sort((a, b) => b[0].length - a[0].length);
    for (const [name, id] of entries) {
      text = text.replace(new RegExp(`@${escapeRegex(name)}`, 'gi'), `<@${id}>`);
    }
    return text;
  }

  // Resolves when the bot is fully connected and ready (client.user is populated)
  start() {
    return new Promise((resolve, reject) => {
      this.client.once(Events.ClientReady, () => resolve());
      this.client.login(this.token).catch(reject);
    });
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
