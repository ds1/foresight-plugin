# Foresight user guide

Foresight is a strategic futures thinking partner for Claude Code. It also has a public, read-only database of signals of change that any MCP-compatible client can query. Both are published under one agent name, **`foresight.agt`**, at **[fore.si](https://fore.si)**.

This guide covers:

- [Choosing how to use it](#choosing-how-to-use-it)
- [Install the Claude Code plugin](#install-the-claude-code-plugin)
- [Your first session](#your-first-session)
- [Interaction styles](#interaction-styles)
- [Modes](#modes)
- [Your signal database and dashboard](#your-signal-database-and-dashboard)
- [Connect the signal database to any MCP client](#connect-the-signal-database-to-any-mcp-client)
- [Tools reference](#tools-reference)
- [What's in the published database](#whats-in-the-published-database)
- [Verify foresight.agt](#verify-foresightagt)
- [Troubleshooting](#troubleshooting)

## Choosing how to use it

| You want to | Use |
|---|---|
| Run foresight work (scans, scenarios, forecasts, memos) inside Claude Code | The **plugin**. It includes the MCP server too. |
| Query published signals from Claude Desktop, claude.ai, Cursor, an agent framework, or your own code | The **MCP server** at `https://fore.si/mcp` |

## Install the Claude Code plugin

In Claude Code:

```
/plugin marketplace add ds1/foresight-plugin
/plugin install foresight@foresight
```

Run `/reload-plugins` or restart Claude Code. You now have:

- the `/foresight` skill (listed as `foresight:foresight`)
- the `foresight` MCP server, connected to the published signal database

To update later, run `/plugin marketplace update foresight` and reload.

## Your first session

Type `/foresight`, optionally followed by a topic:

```
/foresight the future of home energy storage
```

The skill asks three things:

1. **Topic**: what future you're exploring. It can be as broad as "the future of education" or as specific as "how AI agents change B2B sales cycles by 2035".
2. **Interaction style**: how much back-and-forth you want (see below).
3. **Mode**: what kind of work (see below). If your prompt makes it obvious ("write me a scenario about…"), it skips the menu and confirms.

The default time horizon is 10 years unless you name another.

## Interaction styles

| Style | Best for |
|---|---|
| **Interactive** | Deep strategic work and workshops. It asks about domain, audience and horizon, and challenges your assumptions at each step. |
| **Guided** | Most uses. Two or three questions, a complete first draft, then refinement. |
| **Auto** | When you know what you want. One pass, with a self-evaluation and an offer to iterate. |
| **Brief** | Short, dense output: a single scenario, a one-page memo, a signal list. |
| **New to this** | First-timers. Plain language, concepts explained as they come up, and help sharpening your question. |
| **Headless** | Automation. No questions at all; everything comes from the prompt. |

## Modes

| Mode | What you get |
|---|---|
| **Signal Scan** | What's changing in a domain, clustered into driving forces |
| **Scenario** | Three or four genuinely different futures built on a 2x2 uncertainty matrix, with day-in-the-life detail |
| **Forecast** | One bold, evidence-based claim with signals, implications, shadow analysis and confidence |
| **Artifact** | A document from the future: news article, product page, policy brief, job listing |
| **Implications** | Second- and third-order consequences of a specific change |
| **Challenge** | Assumption testing, pre-mortem, red team and wildcard injection for a plan or belief |
| **Backcast** | A roadmap from a desired future back to today's first moves |
| **Investment Memo** | A market, technology or company through a futures lens, with scenario exposure |
| **Historical Pattern** | Cycles, analogies and structural patterns that project forward |

Every output traces claims back to sourced signals, balances upside with shadow ("who loses, what gets exploited"), and ends with what you can do differently today.

## Your signal database and dashboard

Signal Scans, Scenarios, Forecasts and Investment Memos read from and write to **your own** signal database, which grows across sessions. It lives outside the plugin folder, so updates never touch it. The skill uses the first of these that applies:

1. a path you name in the prompt, or the `FORESIGHT_SIGNALS_DIR` environment variable
2. `~/.claude/foresight/signals/`
3. `~/.claude/commands/foresight/signals/` (older installs)
4. otherwise it creates `~/.claude/foresight/signals/` from empty templates

After each update the skill runs seven analysis passes: clusters, convergences, accelerations, contradictions, emergences, decays and coverage gaps. It then regenerates **`dashboard.html`** in that folder. Open the file in a browser for a filterable signal table, driver network graph, strength distribution, STEEP+V coverage, insights and timeline.

With the plugin installed, the skill also queries the published database at fore.si as extra evidence. It cites those signals by id and source. Your own findings still go into your local database.

## Connect the signal database to any MCP client

The server is public, read-only and needs no key:

```
https://fore.si/mcp
```

**Claude Code** (without the plugin):

```
claude mcp add foresight --transport http https://fore.si/mcp
```

**Claude Desktop and claude.ai**: Settings → Connectors → Add custom connector, then paste the URL.

**Clients that take a JSON config** (Cursor, Windsurf, VS Code and others):

```json
{
  "mcpServers": {
    "foresight": { "type": "http", "url": "https://fore.si/mcp" }
  }
}
```

The server speaks MCP over Streamable HTTP with JSON responses, and it is stateless. It supports protocol versions 2024-11-05 through 2025-11-25.

## Tools reference

All tools are read-only.

| Tool | What it does | Arguments |
|---|---|---|
| `overview` | Size and shape of the database: totals, last update, strength mix, top domains and tags, recent scans | none |
| `search_signals` | Find signals by free text (every word must match) and filters, ranked by relevance | `query`, `domain`, `strength`, `tag`, `driver`, `since` (YYYY-MM-DD), `limit` (1–50) |
| `get_signal` | One signal in full: source, direction, strength history, upside and shadow implications, drivers, connections | `id` |
| `list_drivers` | Driving forces, strongest first | `category` (social, technological, economic, environmental, political, values) |
| `get_driver` | One driver with its evidence | `id` |
| `get_insights` | Detected patterns: clusters, convergences, accelerations, contradictions, emergences, decays, gaps | `type` |
| `list_scans` | Dated scan reports, newest first | none |
| `get_scan` | One scan report as markdown | `slug` |

Things to ask a connected assistant:

- "What does the foresight database say about humanoid robots? Cite the signals."
- "Which signals about AI agents are accelerating, and what's the shadow side of each?"
- "What coverage gaps does foresight.agt see, and what should I scan next?"
- "Summarize the latest foresight scan."

## What's in the published database

- **Signals**: specific, sourced observations of change. Each has a direction ("From … → To …"), a strength, STEEP+V domains, tags, and both positive and shadow implications.
- **Strength** follows adoption: **early** (fringe, few instances), **emerging** (spreading, noticed by specialists), **accelerating** (rapid growth, mainstream attention beginning), **mainstream** (widely adopted).
- **Drivers**: the forces signals cluster into, rated weak, moderate, strong or dominant.
- **Scans**: dated reports from each research session.

An automated pipeline runs a new scan most days. It prioritizes peer-reviewed research, institutional data and quality journalism over marketing, and requires a verifiable source for every signal. The same research feeds the articles at [foresight.domains/insights](https://foresight.domains/insights/). Signal text summarizes third-party sources: treat it as evidence to weigh, and follow the source link before relying on a claim.

## Verify foresight.agt

`foresight.agt` is a name on AGT Registry v2 (Polygon). Its owner publishes a signed manifest listing the MCP endpoint and capabilities. With the [`agt` plugin](https://github.com/agtnames/agt-plugins) installed, ask Claude to "resolve foresight.agt". `verified: true` means the manifest was signed by the wallet that owns the name on chain. You can also look it up at [agtnames.com/name/foresight](https://agtnames.com/name/foresight).

## Troubleshooting

**The `foresight` MCP server fails to connect.** Run `/mcp` in Claude Code and reconnect it. Check that `https://fore.si/health` returns `"ok": true`. The skill keeps working without the server, using your local database and web research.

**Two `/foresight` commands appear.** You still have the older command install. Move or delete `~/.claude/commands/foresight.md` and `~/.claude/commands/foresight/ref/`. Keep your `signals/` folder, or move it to `~/.claude/foresight/signals/`.

**The dashboard is empty.** It shows your local database. Run a Signal Scan first, or point `FORESIGHT_SIGNALS_DIR` at an existing signal folder.

**I want to report a problem.** Open an issue at [github.com/ds1/foresight-plugin](https://github.com/ds1/foresight-plugin/issues).
