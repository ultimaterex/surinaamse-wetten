#!/usr/bin/env node

/**
 * Surinaamse Wetten MCP Server (Model Context Protocol)
 * 
 * Provides AI agents, Claude Desktop, Cursor, and Antigravity with direct,
 * verifiable access to the complete statutory laws of Suriname (41 laws, 5,037 provisions).
 * 
 * Protocol: MCP 2024-11-05 (stdio JSON-RPC)
 * Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const BASE_DATA_PATH = path.resolve(__dirname, '../docs/data');
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/ultimaterex/surinaamse-wetten/main/docs/data';

let memoryCache = {
  laws: null,
  searchIndex: null,
  lawsData: {}
};

async function loadDataFile(relPath) {
  const localFile = path.join(BASE_DATA_PATH, relPath);
  if (fs.existsSync(localFile)) {
    try {
      return JSON.parse(fs.readFileSync(localFile, 'utf8'));
    } catch (e) {
      console.error(`Error parsing local ${relPath}:`, e);
    }
  }

  // Fallback to GitHub raw
  try {
    const res = await fetch(`${GITHUB_RAW_BASE}/${relPath}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error(`Error fetching remote ${relPath}:`, e);
  }
  return null;
}

async function getLawsIndex() {
  if (!memoryCache.laws) {
    memoryCache.laws = await loadDataFile('laws_index.json') || [];
  }
  return memoryCache.laws;
}

async function getSearchIndex() {
  if (!memoryCache.searchIndex) {
    memoryCache.searchIndex = await loadDataFile('search_index.json') || [];
  }
  return memoryCache.searchIndex;
}

async function getLawContent(slug) {
  if (!memoryCache.lawsData[slug]) {
    const data = await loadDataFile(`laws/${slug}.json`);
    if (data) memoryCache.lawsData[slug] = data;
  }
  return memoryCache.lawsData[slug];
}

// -------------------------------------------------------------
// MCP Tools & Handlers
// -------------------------------------------------------------
const TOOLS = [
  {
    name: "list_all_laws",
    description: "Lists all 41 statutory laws, civil codes, and regulations of Suriname with their slugs and article counts.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "search_legislation",
    description: "Performs full-text search across 5,037 articles of Suriname statutory law. Returns matching articles with exact citations and relevant excerpts.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search keywords or legal terms (e.g. 'arbeidsovereenkomst', 'ontslag', 'huurprijs', 'auteursrecht')"
        },
        law_slug: {
          type: "string",
          description: "Optional: filter results to a specific law slug (e.g. 'burgerlijk-wetboek', 'arbeidswet-1963')"
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 5, max: 20)"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get_law_structure",
    description: "Returns the structural outline of a Suriname law (Books, Chapters, Titles, and provision counts).",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "The law slug (e.g. 'burgerlijk-wetboek', 'arbeidsgeschillenwet')"
        }
      },
      required: ["slug"]
    }
  },
  {
    name: "get_article",
    description: "Fetches the full, exact statutory text of a specific article in a Suriname law, including structural context and official citation format.",
    inputSchema: {
      type: "object",
      properties: {
        law_slug: {
          type: "string",
          description: "The slug of the law (e.g. 'burgerlijk-wetboek')"
        },
        article_id_or_number: {
          type: "string",
          description: "Article ID number or label (e.g. '1613x', '1', '1401')"
        }
      },
      required: ["law_slug", "article_id_or_number"]
    }
  }
];

const PROMPTS = [
  {
    name: "legal_consultation",
    description: "Guides legal reasoning under Suriname statutory law with explicit citations to Suriname codes.",
    arguments: [
      {
        name: "topic",
        description: "The legal question, situation, or topic to research under Suriname law",
        required: true
      }
    ]
  }
];

async function handleToolCall(name, args) {
  if (name === "list_all_laws") {
    const laws = await getLawsIndex();
    const formatted = laws.map((l, i) => `${i + 1}. **${l.name}** (slug: \`${l.slug}\`, ${l.article_count} articles)`).join('\n');
    return {
      content: [
        {
          type: "text",
          text: `### Statutory Laws of Suriname (${laws.length} Total):\n\n${formatted}\n\n*Online Reader: https://ultimaterex.github.io/surinaamse-wetten/*`
        }
      ]
    };
  }

  if (name === "search_legislation") {
    const query = (args.query || '').toLowerCase().trim();
    const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 20);
    const filterSlug = args.law_slug ? args.law_slug.toLowerCase().trim() : null;

    if (!query) {
      return { content: [{ type: "text", text: "Please provide a valid search query." }] };
    }

    const items = await getSearchIndex();
    const terms = query.split(/\s+/).filter(t => t.length > 1);

    // Simple robust keyword score matching
    const scored = [];
    for (const item of items) {
      if (filterSlug && item.law_slug !== filterSlug) continue;

      const title = (item.title || '').toLowerCase();
      const text = (item.text || '').toLowerCase();
      let score = 0;

      for (const t of terms) {
        if (title.includes(t)) score += 10;
        const matches = (text.match(new RegExp(t, 'g')) || []).length;
        score += matches;
      }

      if (score > 0) {
        scored.push({ item, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);

    if (top.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No matching articles found for query: "${args.query}"${filterSlug ? ` in law ${filterSlug}` : ''}.`
          }
        ]
      };
    }

    const resultsText = top.map(({ item }, i) => {
      let excerpt = item.text.replace(/\s+/g, ' ');
      if (excerpt.length > 300) excerpt = excerpt.substring(0, 300) + '...';

      return `### ${i + 1}. ${item.title} — ${item.law_name}\n` +
             `- **Chapter:** ${item.chapter || 'Algemeen'}\n` +
             `- **Citation:** ${item.title}, ${item.law_name} (Suriname)\n` +
             `- **URL Anchor:** https://ultimaterex.github.io/surinaamse-wetten/#/law/${item.law_slug}/art-${item.id}\n` +
             `> ${excerpt}\n`;
    }).join('\n');

    return {
      content: [
        {
          type: "text",
          text: `Found ${top.length} relevant provision(s) for "${args.query}":\n\n${resultsText}`
        }
      ]
    };
  }

  if (name === "get_law_structure") {
    const slug = (args.slug || '').toLowerCase().trim();
    const data = await getLawContent(slug);

    if (!data) {
      return { content: [{ type: "text", text: `Law not found for slug: "${args.slug}". Use list_all_laws to find valid slugs.` }] };
    }

    const books = new Set();
    const chapters = new Set();
    data.articles.forEach(a => {
      if (a.book_name) books.add(a.book_name);
      if (a.chapter_name) chapters.add(a.chapter_name);
    });

    return {
      content: [
        {
          type: "text",
          text: `## Structure of ${data.law_info.name}\n` +
                `- **Slug:** \`${data.law_info.slug}\`\n` +
                `- **Total Articles:** ${data.articles.length}\n` +
                (books.size > 0 ? `\n### Books (${books.size}):\n` + Array.from(books).map(b => `- ${b}`).join('\n') : '') +
                (chapters.size > 0 ? `\n### Chapters (${chapters.size}):\n` + Array.from(chapters).map(c => `- ${c}`).join('\n') : '') +
                `\n\n*View online: https://ultimaterex.github.io/surinaamse-wetten/#/law/${data.law_info.slug}*`
        }
      ]
    };
  }

  if (name === "get_article") {
    const slug = (args.law_slug || '').toLowerCase().trim();
    const rawTarget = (args.article_id_or_number || '').toLowerCase().replace(/^(artikel|art\.?)\s*/i, '').trim();

    const data = await getLawContent(slug);
    if (!data) {
      return { content: [{ type: "text", text: `Law with slug "${args.law_slug}" not found.` }] };
    }

    // Match either by ID or article title/number
    const found = data.articles.find(a => {
      if (String(a.id) === rawTarget) return true;
      const titleClean = (a.title || '').toLowerCase().replace(/^(artikel|art\.?)\s*/i, '').trim();
      return titleClean === rawTarget;
    });

    if (!found) {
      return {
        content: [
          {
            type: "text",
            text: `Article "${args.article_id_or_number}" not found in ${data.law_info.name}.`
          }
        ]
      };
    }

    const breadcrumbs = [found.book_name, found.chapter_name, found.title_name].filter(Boolean).join(' > ');

    return {
      content: [
        {
          type: "text",
          text: `## ${found.title} — ${data.law_info.name} (Suriname)\n\n` +
                (breadcrumbs ? `**Hierarchy:** ${breadcrumbs}\n\n` : '') +
                `**Citation:** ${found.title}, ${data.law_info.name} (Suriname)\n` +
                `**Permanent Link:** https://ultimaterex.github.io/surinaamse-wetten/#/law/${data.law_info.slug}/art-${found.id}\n\n` +
                `---\n\n` +
                `${found.text}\n`
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

// -------------------------------------------------------------
// stdio JSON-RPC 2.0 Server Loop
// -------------------------------------------------------------
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function sendResponse(id, result, error = null) {
  const msg = {
    jsonrpc: "2.0",
    id: id
  };
  if (error) {
    msg.error = error;
  } else {
    msg.result = result;
  }
  process.stdout.write(JSON.stringify(msg) + '\n');
}

rl.on('line', async (line) => {
  if (!line.trim()) return;

  let req;
  try {
    req = JSON.parse(line);
  } catch (err) {
    sendResponse(null, null, { code: -32700, message: "Parse error" });
    return;
  }

  const { id, method, params } = req;

  // Handle notifications (no id)
  if (id === undefined || id === null) {
    if (method === 'notifications/initialized') {
      // Ready to accept commands
    }
    return;
  }

  try {
    switch (method) {
      case 'initialize':
        sendResponse(id, {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
            prompts: {}
          },
          serverInfo: {
            name: "surinaamse-wetten-mcp",
            version: "1.0.0"
          }
        });
        break;

      case 'tools/list':
        sendResponse(id, { tools: TOOLS });
        break;

      case 'tools/call':
        const toolResult = await handleToolCall(params.name, params.arguments || {});
        sendResponse(id, toolResult);
        break;

      case 'prompts/list':
        sendResponse(id, { prompts: PROMPTS });
        break;

      case 'prompts/get':
        if (params.name === 'legal_consultation') {
          const topic = params.arguments && params.arguments.topic ? params.arguments.topic : 'Suriname law';
          sendResponse(id, {
            description: `Legal consultation for topic: ${topic}`,
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Please analyze the following legal situation strictly according to the statutory laws and civil codes of the Republic of Suriname:\n\n"${topic}"\n\nInstructions:\n1. Use the 'search_legislation' and 'get_article' tools to find the relevant Suriname statutes.\n2. Cite specific articles (e.g. 'Art. 1613x BW', 'Art. 6 Ontslagvergunning').\n3. Explain the statutory requirements and provide clear legal conclusions.`
                }
              }
            ]
          });
        } else {
          sendResponse(id, null, { code: -32601, message: "Prompt not found" });
        }
        break;

      case 'ping':
        sendResponse(id, {});
        break;

      default:
        sendResponse(id, null, { code: -32601, message: `Method not supported: ${method}` });
        break;
    }
  } catch (err) {
    sendResponse(id, null, { code: -32603, message: err.message || "Internal error" });
  }
});
