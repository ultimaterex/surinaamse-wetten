# Surinaamse Wetten MCP Server

Model Context Protocol (MCP) server providing LLMs (Claude Desktop, Cursor, Antigravity, and AI agents) with direct, authoritative access to the statutory laws and regulations of the Republic of Suriname (41 laws, 5,037 articles).

---

## Capabilities & Tools

1. `search_legislation(query, law_slug?, limit?)`: Full-text search across all 5,037 statutory articles with citation extraction.
2. `get_article(law_slug, article_id_or_number)`: Exact statutory text retrieval with structural hierarchy and citation strings.
3. `get_law_structure(slug)`: Structural breakdown by Books and Chapters.
4. `list_all_laws()`: Complete catalog of all 41 Suriname statutory acts.

---

## Quickstart

### Claude Desktop
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

### Cursor / Antigravity
Add as a stdio MCP server:
- **Command**: `node`
- **Args**: `mcp/index.js`
- **Working Directory**: `<repo-root>`

### Zero Dependencies
Runs on vanilla Node.js 18+ with zero `npm install` required.
Fallback automatically fetches from the verified GitHub repository if executed outside the local directory.
