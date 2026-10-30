# Surinaamse Wetten

> 🌐 **Live Web Reader & Instant Search**: **[https://ultimaterex.github.io/surinaamse-wetten/](https://ultimaterex.github.io/surinaamse-wetten/)**  
> 🤖 **AI Discovery Standard**: **[`llms.txt`](https://ultimaterex.github.io/surinaamse-wetten/llms.txt)** & **[`llms-full.txt`](https://ultimaterex.github.io/surinaamse-wetten/llms-full.txt)**

A fast, AI-native digital reader, Model Context Protocol (MCP) server, full-text search engine, and structured statutory corpus for the statutory legislation of the Republic of Suriname (41 laws, 5,037 articles).

---

## Overview

**Surinaamse Wetten** provides open access, developer-ready datasets, and agentic integrations covering Suriname's complete statutory legislation—from the Civil Code (*Burgerlijk Wetboek*) to labor acts, mining decrees, and procedural law.

### Key Capabilities

- **Sub-Millisecond Search**: 100% client-side full-text search across all statutory provisions using an in-memory inverted index (`MiniSearch`).
- **Model Context Protocol (MCP) Server**: Zero-dependency stdio MCP server for Claude Desktop, Cursor, and Antigravity.
- **AI Agent & LLM Discovery**: Native [`llms.txt`](https://ultimaterex.github.io/surinaamse-wetten/llms.txt), `robots.txt` AI allowances, and Schema.org `Legislation` structured data for search discovery.
- **One-Click AI Context Copy**: Formats provisions into citation-anchored markdown ready for single-turn reasoning in ChatGPT or Claude.
- **Raw Markdown Corpus**: Clean, normalized Markdown files for offline reading, full-text analysis, and RAG / embedding ingestion.

---

## Model Context Protocol (MCP)

Integrate Suriname statutory law directly into **Claude Desktop**, **Cursor**, or **Antigravity** using the included zero-dependency MCP server:

### Claude Desktop Configuration
Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "surinaamse-wetten": {
      "command": "node",
      "args": ["<path-to-repo>/mcp/index.js"]
    }
  }
}
```

### Available MCP Tools
- `search_legislation(query, law_slug?, limit?)`: Semantic keyword search across all 5,037 statutory articles with exact citations.
- `get_article(law_slug, article_id_or_number)`: Exact statutory text retrieval with structural hierarchy.
- `get_law_structure(slug)`: Structural breakdown by Books and Chapters.
- `list_all_laws()`: Complete catalog of all 41 Suriname statutory acts.

---

## Repository Structure

```
├── docs/                       # Web application & GitHub Pages deployment
│   ├── index.html              # Modern web reader interface & Schema.org metadata
│   ├── app.js                  # Client-side router & search engine
│   ├── style.css               # Legal typography & custom compiled styles
│   ├── llms.txt                # AI/LLM discovery manifest
│   ├── llms-full.txt           # Complete topic index for LLMs
│   ├── robots.txt              # Explicit crawler allowances for AI agents
│   ├── sitemap.xml             # XML sitemap covering all laws
│   └── data/                   # Search indexes and per-law JSON documents
│
├── markdown/                   # Complete raw Markdown statutory corpus
│   ├── README.md               # Catalog of all 41 laws with article counts
│   └── laws/                   # 41 clean individual Markdown law files
│
├── mcp/                        # Model Context Protocol (MCP) server
│   ├── index.js                # stdio JSON-RPC MCP server
│   ├── package.json            # Package metadata
│   └── README.md               # MCP quickstart guide
│
└── package.json                # CSS build tooling
```

---

## Raw Markdown Corpus

The complete legislation is available in the [`markdown/laws`](./markdown/laws) folder. Each file includes full statutory headings and provisions, ready for:
- Direct offline reading in any Markdown reader
- Local `grep`, `ripgrep`, or full-text indexing
- Document ingestion for RAG and semantic search pipelines

---

## License

The legal texts of Suriname are official government publications and in the public domain.  
The digital presentation, software, and search tooling are licensed under the [MIT License](LICENSE).
