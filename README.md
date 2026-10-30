# Surinaamse Wetten

> 🌐 **Live Web Reader & Instant Search**: **[https://ultimaterex.github.io/surinaamse-wetten/](https://ultimaterex.github.io/surinaamse-wetten/)**

A fast, modern digital reader, full-text search engine, and structured statutory corpus for the laws and regulations of the Republic of Suriname.

---

## Overview

**Surinaamse Wetten** provides an open-access digital reader and developer-ready datasets covering Suriname's complete statutory legislation—from the Civil Code (*Burgerlijk Wetboek*) to labor acts, mining decrees, and procedural law.

### Key Capabilities

- **Sub-Millisecond Search**: 100% client-side full-text search across all statutory provisions using an in-memory inverted index (`MiniSearch`).
- **Structured Statutory Hierarchy**: Preserves the complete legal structure (Books, Chapters, Titles, Sections, and Articles).
- **Deep Linking & Citation**: Direct URL anchors (`#/law/<slug>/art-<id>`) with one-click legal citation copy tools.
- **Multiple Developer Formats**: Available as an SQLite database (with FTS5 search), clean Markdown files, and normalized JSON.

---

## Repository Structure

```
├── docs/                       # GitHub Pages single-page web application
│   ├── index.html              # Modern dark-mode web reader interface
│   ├── app.js                  # Fast client-side router & search engine
│   ├── style.css               # Legal typography & custom styles
│   └── data/                   # Search indexes and per-law JSON documents
│
├── output/                     # Complete offline datasets
│   ├── wetten.db               # SQLite database with FTS5 full-text search
│   ├── json/                   # Structured JSON files (by law + consolidated)
│   └── markdown/               # Formatted Markdown documents per law
│
└── query_wetten.py             # Terminal CLI lookup & search tool
```

---

## Command-Line Search Tool

The included `query_wetten.py` tool lets you query the entire statutory database directly from your terminal:

```bash
# Full-text search across all legislation
python query_wetten.py "arbeidsovereenkomst"

# Search within a specific law
python query_wetten.py "ontslag" --law "arbeidswet-1963"

# View a specific article by ID
python query_wetten.py --id 19320

# List all available laws
python query_wetten.py --list-laws
```

---

## License

The legal texts of Suriname are official government publications and in the public domain.  
The digital presentation, software, and search tooling are licensed under the [MIT License](LICENSE).
