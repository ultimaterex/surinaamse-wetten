# Surinaamse Wetten

> 🌐 **Live Web Reader & Instant Search**: **[https://ultimaterex.github.io/surinaamse-wetten/](https://ultimaterex.github.io/surinaamse-wetten/)**

A fast, modern digital reader, full-text search engine, and structured statutory corpus for the statutory laws and regulations of the Republic of Suriname.

---

## Overview

**Surinaamse Wetten** provides an open-access digital reader and clean statutory datasets covering Suriname's complete statutory legislation—from the Civil Code (*Burgerlijk Wetboek*) to labor acts, mining decrees, and procedural law.

### Key Capabilities

- **Sub-Millisecond Search**: 100% client-side full-text search across all statutory provisions using an in-memory inverted index (`MiniSearch`).
- **Structured Statutory Hierarchy**: Preserves the complete legal structure (Books, Chapters, Titles, Sections, and Articles).
- **Deep Linking & Citation**: Direct URL anchors (`#/law/<slug>/art-<id>`) with one-click legal citation copy tools.
- **Raw Markdown Corpus**: Clean, normalized Markdown files for offline reading, full-text analysis, and LLM / RAG embeddings.

---

## Repository Structure

```
├── docs/                       # Web application & GitHub Pages deployment
│   ├── index.html              # Modern web reader interface
│   ├── app.js                  # Fast client-side router & search engine
│   ├── style.css               # Legal typography & custom compiled styles
│   └── data/                   # Search indexes and per-law JSON documents
│
├── markdown/                   # Complete raw Markdown statutory corpus
│   ├── README.md               # Catalog of all 41 laws with article counts
│   └── laws/                   # 41 clean individual Markdown law files
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
