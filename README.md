# Discord AI Bots

Run multiple AI-powered Discord bots simultaneously, each with their own persona and system prompt. Supports Ollama (local), OpenAI, and Grok as AI providers.

## Requirements

- [Node.js](https://nodejs.org/) v18+ or [Bun](https://bun.sh/)
- A Discord application/bot token for each bot
- An API key for your chosen AI provider (or a running Ollama instance)

## Setup

### 1. Install dependencies

```bash
npm install
# or
bun install
```

### 2. Create your keys file

Copy the example keys file:

```bash
cp keys_ex.json keys.json
```

Then fill in `keys.json` with your real tokens:

```json
{
  "discord": {
    "mybotname": "YOUR_DISCORD_BOT_TOKEN"
  },
  "openai": "YOUR_OPENAI_API_KEY",
  "grok": "YOUR_GROK_API_KEY"
}
```

> `keys.json` is gitignored — never commit it.

### 3. Create a persona

Add a JSON file to the `personas/` folder named after your bot (e.g. `personas/mybot.json`):

```json
{
  "name": "MyBot",
  "discord_name": "mybotname",
  "system_prompt": "You are MyBot, a helpful assistant.",
  "provider_override": null,
  "model_override": null
}
```

| Field | Description |
|---|---|
| `name` | Display name used in conversation history |
| `discord_name` | Must match the key used in `keys.json` under `discord` |
| `system_prompt` | The AI system prompt defining the bot's personality |
| `provider_override` | Override the global provider (`"ollama"`, `"openai"`, `"grok"`, or `null`) |
| `model_override` | Override the global model (e.g. `"gpt-4o"`, or `null`) |

### 4. Register the bot in config.json

Add your bot's name to the `bots` array in `config.json`:

```json
{
  "bots": ["mybotname"]
}
```

The name must match both the persona filename (`personas/mybotname.json`) and the discord key (`keys.json → discord.mybotname`).

### 5. Get your AI provider API key

#### OpenAI

1. Sign up or log in at [platform.openai.com](https://platform.openai.com/)
2. Go to **API keys** → **Create new secret key**
3. Copy the key into `keys.json` under `"openai"`

> Note: OpenAI requires a paid balance to use the API. Add credits at [platform.openai.com/settings/billing](https://platform.openai.com/settings/billing).

#### xAI (Grok)

1. Sign up or log in at [console.x.ai](https://console.x.ai/)
2. Go to **API Keys** → **Create API Key**
3. Copy the key into `keys.json` under `"grok"`

#### Ollama (free, runs locally)

1. Download and install Ollama from [ollama.com/download](https://ollama.com/download)
2. Pull a model, e.g.:

   ```bash
   ollama pull llama3.2
   ```

3. Ollama runs at `http://localhost:11434` by default — no API key needed
4. Browse available models at [ollama.com/library](https://ollama.com/library)

---

### 6. Configure your AI provider

Set `provider` in `config.json` to `ollama`, `openai`, or `grok`, and fill in the relevant section:

```json
{
  "provider": "grok",

  "ollama": {
    "base_url": "http://localhost:11434",
    "model": "llama3.2"
  },

  "openai": {
    "base_url": "https://api.openai.com/v1",
    "model": "gpt-4o-mini"
  },

  "grok": {
    "base_url": "https://api.x.ai/v1",
    "model": "grok-4-0709"
  }
}
```

### 6. Create a Discord bot application

For each bot:

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application**, give it a name
3. Go to **Bot** → copy the token into `keys.json`
4. Under **Bot**, enable **Message Content Intent**
5. Go to **OAuth2 → URL Generator**, select `bot`, then the `Send Messages` and `Read Message History` permissions
6. Use the generated URL to invite the bot to your server

### 7. Run

```bash
npm start
# or for auto-reload on file changes:
npm run dev
```

## Configuration reference

All options live in `config.json`:

| Option | Values | Description |
|---|---|---|
| `provider` | `ollama`, `openai`, `grok` | Default AI provider for all bots |
| `bots` | array of names | Which bots to start |
| `conversation.mode` | `mention_only`, `all_messages` | When to respond — only when @mentioned, or to every message |
| `conversation.allowed_channels` | array of channel IDs | Restrict bots to specific channels (empty = all channels) |
| `conversation.respond_to_bots` | `true` / `false` | Whether bots respond to other bots |
| `conversation.max_bot_chain` | number | Max consecutive bot messages before going silent (prevents infinite loops) |
| `conversation.max_history` | number | How many messages to keep in context per channel |
| `conversation.typing_indicator` | `true` / `false` | Show "Bot is typing…" while generating a response |

## Adding a second bot

1. Create another Discord application and copy its token
2. Add the token to `keys.json` under a new key: `"discord": { "alice": "...", "bob": "..." }`
3. Create `personas/bob.json` with its system prompt
4. Add `"bob"` to the `bots` array in `config.json`
5. Restart the process — both bots will run in the same process
