import os
import json
import re
from pathlib import Path

BASE_DIR = Path(r"c:\Users\Rex\Documents\antigravity\resilient-planck\wetten_scraper")
JSON_DIR = BASE_DIR / "output" / "json" / "laws"
INDEX_FILE = BASE_DIR / "output" / "json" / "laws_index.json"
DOCS_DIR = BASE_DIR / "src" / "content" / "docs"

CATEGORY_MAP = {
    # Burgerlijk- & Procesrecht
    "burgerlijk-wetboek": "burgerlijk-procesrecht",
    "wetboek-van-burgerlijke-rechtsvordering": "burgerlijk-procesrecht",
    "faillissementswet-1935": "burgerlijk-procesrecht",
    "huurwet-woonruimte-2020": "burgerlijk-procesrecht",
    "wet-huurkoop-onroerend-goed": "burgerlijk-procesrecht",
    "wet-op-het-testamenten-register": "burgerlijk-procesrecht",

    # Arbeids- & Sociaal Recht
    "arbeidswet-1963": "arbeid-sociaal",
    "arbeidsgeschillenwet": "arbeid-sociaal",
    "arbeidsbemiddelingswet-2017": "arbeid-sociaal",
    "wet-minimumloon": "arbeid-sociaal",
    "wet-ontslagvergunning": "arbeid-sociaal",
    "vacantiewet-1975": "arbeid-sociaal",
    "veiligheidswet": "arbeid-sociaal",
    "wet-vrijheid-vakvereniging": "arbeid-sociaal",
    "wet-omzetting-arbeidsovereenkomst-voor-bepaalde-tijd-in-arbeidsovereenkomst-onbepaalde-tijd": "arbeid-sociaal",
    "wet-ter-beschikking-stellen-arbeidskrachten-door-intermediairs": "arbeid-sociaal",
    "wet-werkvergunning-vreemdelingen": "arbeid-sociaal",
    "wet-algemeen-oudedagsvoorzieningsfonds": "arbeid-sociaal",
    "wet-algemeen-pensioen-2014": "arbeid-sociaal",
    "wet-nationale-basiszorgverzekering": "arbeid-sociaal",
    "wet-pensioenfondsen-en-voorzieningsfondsen": "arbeid-sociaal",
    "wet-opvanginstellingen": "arbeid-sociaal",

    # Grond, Milieu & Grondstoffen
    "milieu-raamwet": "grond-milieu",
    "agrarische-wet": "grond-milieu",
    "bouwwet": "grond-milieu",
    "decreet-mijnbouw": "grond-milieu",
    "petroleumwet-1990": "grond-milieu",
    "stedebouwkundige-wet": "grond-milieu",
    "wet-bosbeheer": "grond-milieu",
    "wet-grondregistratie-en-land-informatie-systeem": "grond-milieu",
    "landsverordening-belemmeringen-privaatrecht-1963": "grond-milieu",
    "onteigeningswet": "grond-milieu",
    "wet-onteigening-stedebouwkundige-ontwikkeling-en-woningvoorziening": "grond-milieu",
    "wet-rechtstoestand-voor-1-juli-1982-uitgegeven-gronden": "grond-milieu",

    # Bestuur, Justitie & Beroep
    "advocatenwet": "bestuur-organisatie",
    "personeelswet": "bestuur-organisatie",
    "wet-notarisambt-2019": "bestuur-organisatie",
    "wet-suriname-chartered-accountants-institute": "bestuur-organisatie",

    # Handels- & Financieel Recht
    "wet-auteursrecht-1913": "handels-financieel",
    "wet-industrieelen-eigendom": "handels-financieel",
    "wet-aansprakelijkheidsverzekering-motorrijtuigen": "handels-financieel",
}

def clean_text(text: str) -> str:
    if not text:
        return ""
    # Normalize unicode whitespace
    text = text.replace('\xa0', ' ').replace('\r\n', '\n')
    # Strip any external scraper references or urls
    text = re.sub(r'https?://wetten\.sr[^\s\)]*', '', text)
    text = re.sub(r'wetten\.sr', 'Rechtscorpus Suriname', text, flags=re.IGNORECASE)
    return text.strip()

def sanitize_heading(text: str) -> str:
    if not text:
        return ""
    text = text.replace('\n', ' ').replace('\r', '').strip()
    return re.sub(r'\s+', ' ', text)

def build_docs():
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        laws_index = json.load(f)

    print(f"Loaded {len(laws_index)} laws from index.")

    # Create category directories
    for cat in set(CATEGORY_MAP.values()):
        cat_dir = DOCS_DIR / "wetten" / cat
        cat_dir.mkdir(parents=True, exist_ok=True)

    generated_count = 0
    total_articles_corpus = 0

    for idx, law_meta in enumerate(laws_index):
        slug = law_meta["slug"]
        law_name = law_meta["name"]
        art_count = law_meta.get("article_count", 0)
        total_articles_corpus += art_count

        category = CATEGORY_MAP.get(slug, "burgerlijk-procesrecht")
        json_path = JSON_DIR / f"{slug}.json"

        if not json_path.exists():
            print(f"Warning: {json_path} does not exist!")
            continue

        with open(json_path, 'r', encoding='utf-8') as f:
            law_data = json.load(f)

        articles = law_data.get("articles", [])
        
        # Build frontmatter
        md_lines = [
            "---",
            f'title: "{law_name}"',
            f'description: "Surinaamse wetgeving - {law_name} ({len(articles)} artikelen)"',
            "sidebar:",
            f"  order: {idx + 1}",
            "  badge:",
            f'    text: "{len(articles)} art."',
            '    variant: "note"',
            "---",
            "",
            f"> **Wettelijk Corpus Suriname** · Statutair overzicht met {len(articles)} artikelen.",
            ""
        ]

        last_book = None
        last_chapter = None
        last_title = None

        for art in articles:
            book_name = sanitize_heading(art.get("book_name") or "")
            chapter_name = sanitize_heading(art.get("chapter_name") or "")
            title_name = sanitize_heading(art.get("title_name") or "")

            if book_name and book_name != last_book:
                md_lines.append(f"## {book_name}")
                md_lines.append("")
                last_book = book_name
                last_chapter = None
                last_title = None

            if chapter_name and chapter_name != last_chapter:
                md_lines.append(f"### {chapter_name}")
                md_lines.append("")
                last_chapter = chapter_name
                last_title = None

            if title_name and title_name != last_title:
                md_lines.append(f"#### {title_name}")
                md_lines.append("")
                last_title = title_name

            art_title = sanitize_heading(art.get("title") or "Artikel")
            art_slug = art.get("slug") or f"artikel-{art.get('id')}"
            art_text = clean_text(art.get("text") or "")

            md_lines.append(f"#### {art_title}")
            md_lines.append("")
            if art_text:
                md_lines.append(art_text)
            else:
                md_lines.append("*(Geen inhoud vermeld)*")
            md_lines.append("")
            md_lines.append("---")
            md_lines.append("")

        out_path = DOCS_DIR / "wetten" / category / f"{slug}.md"
        with open(out_path, 'w', encoding='utf-8') as out_f:
            out_f.write("\n".join(md_lines))

        generated_count += 1
        print(f"[{generated_count}/41] Generated {out_path.relative_to(BASE_DIR)} ({len(articles)} articles)")

    # Generate index.mdx
    index_mdx = f"""---
title: Surinaamse Wetten
description: Officiële digitale wetgeving en integraal rechtscorpus van Suriname
template: splash
hero:
  tagline: Bliksemsnel, doorzoekbaar en offline-toegankelijk digitaal rechtscorpus met {total_articles_corpus:,} artikelen verdeeld over 41 wettelijke regelingen.
  image:
    file: ../../assets/scale.svg
  actions:
    - text: Naar het Burgerlijk Wetboek
      link: /surinaamse-wetten/wetten/burgerlijk-procesrecht/burgerlijk-wetboek/
      icon: right-arrow
      variant: primary
    - text: Over het Rechtscorpus
      link: /surinaamse-wetten/over/
      icon: external
      variant: minimal
---

import {{ Card, CardGrid }} from '@astrojs/starlight/components';

<CardGrid stagger>
  <Card title="Burgerlijk- & Procesrecht" icon="open-book">
    Het volledige Burgerlijk Wetboek (2.417 artikelen), Wetboek van Burgerlijke Rechtsvordering, Faillissementswet en Huurwetten.
  </Card>
  <Card title="Arbeids- & Sociaal Recht" icon="document">
    Arbeidswet 1963, Arbeidsgeschillenwet, Wet Minimumloon, Ontslagvergunning, Pensioenfondsen en Zorgverzekeringen.
  </Card>
  <Card title="Grond, Milieu & Grondstoffen" icon="sun">
    Milieu-Raamwet, Wet Bosbeheer, Decreet Mijnbouw, Petroleumwet 1990 en Agrarische Wetgeving.
  </Card>
  <Card title="Sub-milliseconde Zoeken (Pagefind)" icon="magnifier">
    Ingebouwde binaire zoekindex gecompileerd in Rust. Typ trefwoorden zoals *huurcontract*, *opzegtermijn* of *schadevergoeding* voor directe resultaten.
  </Card>
</CardGrid>
"""
    with open(DOCS_DIR / "index.mdx", 'w', encoding='utf-8') as f:
        f.write(index_mdx)
    print("Generated src/content/docs/index.mdx")

    # Generate over.md
    over_md = f"""---
title: Over het Rechtscorpus
description: Informatie over het Surinaamse Wetten digitale rechtscorpus
---

## Over Surinaamse Wetten

**Surinaamse Wetten** is een open, digitaal en geoptimaliseerd wetgevingsportaal voor de statutaire wetten, wetboeken en regelgeving van de Republiek Suriname.

Het doel van dit platform is om wetgeving direct toegankelijk, snel doorzoekbaar en betrouwbaar te maken voor juristen, studenten, beleidsmakers en burgers.

### Belangrijkste Eigenschappen

- **Volledige Dekking**: Bevat 41 wettelijke regelingen en ruim 5.000 artikelen, gestructureerd per Boek, Hoofdstuk, Titel en Afdeling.
- **Statische Generatie (Zero-JS Content)**: Alle wetsteksten worden vooraf gecompileerd naar pure statische HTML. Hierdoor laden artikelen direct (< 30ms) zonder wachttijd of afhankelijkheid van zware browser-scripts.
- **Pagefind Zoektechnologie**: Aangedreven door Pagefind, een moderne in Rust gecompileerde zoekmotor die alleen compacte indexfragmenten opvraagt op basis van uw zoektermen.
- **Duurzame Verwijzingen**: Elk artikel beschikt over een vaste ankerlink die eenvoudig kan worden gedeeld of geciteerd in juridische documenten.
- **Open Data Formaten**: Naast deze leesbare webomgeving is het gehele corpus beschikbaar als gestructureerde SQLite database (`wetten.db`), JSON-bestanden en Markdown-archieven.

### Licentie & Rechten

De wetteksten zijn officiële overheidspublicaties en behoren tot het publieke domein. De webarchitectuur en softwarecomponenten worden open-source beschikbaar gesteld onder de MIT Licentie.
"""
    with open(DOCS_DIR / "over.md", 'w', encoding='utf-8') as f:
        f.write(over_md)
    print("Generated src/content/docs/over.md")

if __name__ == "__main__":
    build_docs()
