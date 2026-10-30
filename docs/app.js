/**
 * Surinaamse Wetten - Single Page Application
 * Ultra-fast client-side reader and in-memory full-text search engine.
 */

// SVG Icon constants to avoid expensive dynamic DOM traversals across thousands of articles
const ICONS = {
  link: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  copy: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  arrowRight: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
};

// Global State
const state = {
  laws: [],
  currentLawSlug: null,
  currentLawData: null,
  lawCache: {}, // In-memory cache: slug -> lawData
  searchIndex: null,
  miniSearch: null,
  isSearchLoaded: false,
  isSearchLoading: false,
  activeSearchQuery: '',
};

// DOM Elements
const el = {
  globalSearchInput: document.getElementById('global-search-input'),
  lawFilterInput: document.getElementById('law-filter-input'),
  lawsList: document.getElementById('laws-list'),
  lawsCountBadge: document.getElementById('laws-count-badge'),
  catalogCountLabel: document.getElementById('catalog-count-label'),
  homeLawsGrid: document.getElementById('home-laws-grid'),
  sidebar: document.getElementById('sidebar'),
  sidebarOverlay: document.getElementById('sidebar-overlay'),
  mobileMenuBtn: document.getElementById('mobile-menu-btn'),
  themeToggle: document.getElementById('theme-toggle'),
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message'),
  loadingSpinner: document.getElementById('loading-spinner'),
  
  // Views
  homeView: document.getElementById('home-view'),
  lawView: document.getElementById('law-view'),
  searchView: document.getElementById('search-view'),
  aboutView: document.getElementById('about-view'),

  // Reader elements
  readerBreadcrumb: document.getElementById('reader-breadcrumb'),
  readerLawTitle: document.getElementById('reader-law-title'),
  readerArticlesCount: document.getElementById('reader-articles-count'),
  readerSlugBadge: document.getElementById('reader-slug-badge'),
  readerArticlesContainer: document.getElementById('reader-articles-container'),
  readerTocDrawer: document.getElementById('reader-toc-drawer'),
  readerTocToggle: document.getElementById('reader-toc-toggle'),
  readerTocClose: document.getElementById('reader-toc-close'),
  readerTocLinks: document.getElementById('reader-toc-links'),

  // Search View elements
  searchSummaryText: document.getElementById('search-summary-text'),
  searchLawFilter: document.getElementById('search-law-filter'),
  searchResultsList: document.getElementById('search-results-list'),
};

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupEventListeners();
  await loadLawsIndex();
  handleRouting();
  window.addEventListener('hashchange', handleRouting);
  
  // Background load search index after initial render
  setTimeout(() => {
    loadSearchIndex();
  }, 400);
});

// -------------------------------------------------------------
// Theme Management (Default Dark)
// -------------------------------------------------------------
function initTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  if (window.lucide) lucide.createIcons();
}

// -------------------------------------------------------------
// Data Fetching
// -------------------------------------------------------------
async function loadLawsIndex() {
  try {
    const res = await fetch('data/laws_index.json');
    if (!res.ok) throw new Error('Failed to load laws index');
    state.laws = await res.json();

    renderSidebarLaws(state.laws);
    renderHomeLawsGrid(state.laws);
    populateSearchLawFilter(state.laws);

    const countText = `${state.laws.length} Laws`;
    if (el.lawsCountBadge) el.lawsCountBadge.textContent = countText;
    if (el.catalogCountLabel) el.catalogCountLabel.textContent = `${state.laws.length} available legislation acts`;
  } catch (err) {
    console.error('Error loading laws index:', err);
    if (el.lawsList) {
      el.lawsList.innerHTML = `<div class="p-4 text-xs text-rose-400">Failed to load laws. Please refresh.</div>`;
    }
  }
}

async function loadSearchIndex() {
  if (state.isSearchLoaded || state.isSearchLoading) return;
  state.isSearchLoading = true;

  try {
    const res = await fetch('data/search_index.json');
    if (!res.ok) throw new Error('Failed to fetch search index');
    const items = await res.json();

    state.miniSearch = new MiniSearch({
      fields: ['title', 'chapter', 'law_name', 'text'],
      storeFields: ['id', 'title', 'slug', 'law_slug', 'law_name', 'chapter', 'text'],
      searchOptions: {
        boost: { title: 3, chapter: 1.5, law_name: 2, text: 1 },
        fuzzy: 0.2,
        prefix: true,
      }
    });

    state.miniSearch.addAll(items);
    state.isSearchLoaded = true;
    console.log(`[Search] MiniSearch ready with ${items.length} indexed provisions.`);
    
    // If search view is currently visible, execute search immediately
    if (state.activeSearchQuery && !el.searchView.classList.contains('hidden')) {
      executeSearch(state.activeSearchQuery);
    }
  } catch (err) {
    console.warn('Search index initialization failed:', err);
  } finally {
    state.isSearchLoading = false;
  }
}

// -------------------------------------------------------------
// UI Rendering - Sidebar & Catalog
// -------------------------------------------------------------
function renderSidebarLaws(laws, filterText = '') {
  if (!el.lawsList) return;

  const filtered = filterText
    ? laws.filter(l => l.name.toLowerCase().includes(filterText.toLowerCase()))
    : laws;

  if (filtered.length === 0) {
    el.lawsList.innerHTML = `<div class="p-4 text-xs text-slate-500 text-center">No laws match your filter.</div>`;
    return;
  }

  el.lawsList.innerHTML = filtered.map(l => {
    const isActive = state.currentLawSlug === l.slug;
    return `
      <a 
        href="#/law/${l.slug}" 
        class="law-nav-item block px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between group ${
          isActive 
            ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-semibold' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }"
        data-slug="${l.slug}"
      >
        <span class="truncate pr-2">${escapeHtml(l.name)}</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
          isActive 
            ? 'bg-indigo-800 text-indigo-200' 
            : 'bg-slate-800/80 text-slate-500 group-hover:text-slate-300'
        }">
          ${l.article_count}
        </span>
      </a>
    `;
  }).join('');
}

function renderHomeLawsGrid(laws) {
  if (!el.homeLawsGrid) return;

  el.homeLawsGrid.innerHTML = laws.map(l => {
    return `
      <a 
        href="#/law/${l.slug}" 
        class="group block p-5 bg-[#111827] border border-slate-800/80 rounded-xl hover:border-indigo-500/80 hover:bg-[#151e32] transition-all shadow-sm"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1 flex-1">
            <h3 class="text-sm font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
              ${escapeHtml(l.name)}
            </h3>
            <p class="text-xs text-slate-500 font-mono">${escapeHtml(l.slug)}</p>
          </div>
          <span class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-950 border border-indigo-800/60 text-indigo-300 shrink-0">
            ${l.article_count} arts
          </span>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 group-hover:text-slate-300">
          <span>Read legislation</span>
          <span class="group-hover:translate-x-1 transition-transform inline-flex">${ICONS.arrowRight}</span>
        </div>
      </a>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function populateSearchLawFilter(laws) {
  if (!el.searchLawFilter) return;
  const options = ['<option value="">All Laws</option>'];
  laws.forEach(l => {
    options.push(`<option value="${l.slug}">${escapeHtml(l.name)} (${l.article_count})</option>`);
  });
  el.searchLawFilter.innerHTML = options.join('');
}

// -------------------------------------------------------------
// Law Reader View (High Performance)
// -------------------------------------------------------------
async function openLaw(slug, targetArticleId = null) {
  const isSameLaw = state.currentLawSlug === slug && state.currentLawData;
  state.currentLawSlug = slug;
  renderSidebarLaws(state.laws, el.lawFilterInput.value);
  closeSidebar();

  showView('law');

  // If already loaded and same law, jump immediately without re-rendering!
  if (isSameLaw) {
    if (targetArticleId) {
      scrollToArticle(targetArticleId);
    } else {
      document.getElementById('main-content').scrollTop = 0;
    }
    return;
  }

  // Check in-memory cache
  let data = state.lawCache[slug];
  if (!data) {
    setLoading(true);
    try {
      const res = await fetch(`data/laws/${slug}.json`);
      if (!res.ok) throw new Error('Law not found');
      data = await res.json();
      state.lawCache[slug] = data; // Cache in memory
    } catch (err) {
      console.error('Error opening law:', err);
      el.readerArticlesContainer.innerHTML = `
        <div class="p-8 text-center bg-[#111827] rounded-xl border border-rose-900/50 text-rose-400">
          Failed to load law content. Please return to the <a href="#/" class="underline font-semibold">catalog</a>.
        </div>
      `;
      setLoading(false);
      return;
    }
  }

  state.currentLawData = data;
  renderLawReader(data);
  setLoading(false);

  if (targetArticleId) {
    requestAnimationFrame(() => {
      scrollToArticle(targetArticleId);
    });
  } else {
    document.getElementById('main-content').scrollTop = 0;
  }
}

function renderLawReader(data) {
  const meta = data.law_info;
  const articles = data.articles;

  el.readerBreadcrumb.textContent = meta.name;
  el.readerLawTitle.textContent = meta.name;
  el.readerArticlesCount.textContent = `${articles.length} Articles`;
  el.readerSlugBadge.textContent = meta.slug;

  // Build Table of Contents
  const tocItems = [];
  let currentBook = null;
  let currentChapter = null;

  articles.forEach(art => {
    if (art.book_name && art.book_name !== currentBook) {
      currentBook = art.book_name;
      tocItems.push({ type: 'book', name: currentBook, id: `art-${art.id}` });
    }
    if (art.chapter_name && art.chapter_name !== currentChapter) {
      currentChapter = art.chapter_name;
      tocItems.push({ type: 'chapter', name: currentChapter, id: `art-${art.id}` });
    }
  });

  if (tocItems.length > 0) {
    el.readerTocLinks.innerHTML = tocItems.map(item => `
      <a 
        href="#/law/${meta.slug}/${item.id}" 
        class="block py-1 hover:text-indigo-400 truncate transition-colors ${item.type === 'book' ? 'font-bold pl-0 text-slate-200' : 'pl-3 text-slate-400'}"
      >
        ${escapeHtml(item.name)}
      </a>
    `).join('');
  } else {
    el.readerTocLinks.innerHTML = `<div class="p-2 text-slate-500">Sequential articles without sub-chapters.</div>`;
  }

  // Fast string assembly without DOM reflows
  let lastBook = null;
  let lastChapter = null;
  let lastTitle = null;
  let lastSection = null;

  const htmlChunks = [];

  for (let i = 0; i < articles.length; i++) {
    const art = articles[i];

    if (art.book_name && art.book_name !== lastBook) {
      htmlChunks.push(`
        <div class="pt-6 pb-2 border-b border-slate-700">
          <span class="text-xs uppercase font-bold tracking-wider text-indigo-400">Book</span>
          <h2 class="text-xl font-bold text-white mt-0.5">${escapeHtml(art.book_name)}</h2>
        </div>
      `);
      lastBook = art.book_name;
    }

    if (art.chapter_name && art.chapter_name !== lastChapter) {
      htmlChunks.push(`
        <div class="pt-4 pb-1">
          <span class="text-[11px] uppercase font-semibold tracking-wider text-slate-500">Chapter</span>
          <h3 class="text-base font-bold text-slate-200">${escapeHtml(art.chapter_name)}</h3>
        </div>
      `);
      lastChapter = art.chapter_name;
    }

    if (art.title_name && art.title_name !== lastTitle) {
      htmlChunks.push(`
        <h4 class="text-sm font-semibold text-slate-300 italic pt-2">${escapeHtml(art.title_name)}</h4>
      `);
      lastTitle = art.title_name;
    }

    if (art.afdeling_name && art.afdeling_name !== lastSection) {
      htmlChunks.push(`
        <h5 class="text-xs font-semibold text-slate-400 uppercase pt-2 tracking-wide">${escapeHtml(art.afdeling_name)}</h5>
      `);
      lastSection = art.afdeling_name;
    }

    const formattedText = formatLegalText(art.text);

    // Article Card with instant inline SVG icons
    htmlChunks.push(`
      <article 
        id="art-${art.id}" 
        class="article-card bg-[#111827] border border-slate-800/80 rounded-xl p-6 sm:p-7 shadow-sm transition-all"
        data-article-id="${art.id}"
      >
        <div class="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold text-indigo-400">§</span>
            <h4 class="text-base font-bold text-white">${escapeHtml(art.title)}</h4>
          </div>
          
          <div class="flex items-center gap-1">
            <button 
              class="copy-link-btn p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors" 
              title="Copy link to article"
              data-link="#/law/${meta.slug}/art-${art.id}"
            >
              ${ICONS.link}
            </button>
            <button 
              class="copy-text-btn p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors" 
              title="Copy text & citation"
              data-text="${encodeURIComponent(art.text)}"
              data-cite="${encodeURIComponent(`${art.title}, ${meta.name} (Suriname)`)}"
            >
              ${ICONS.copy}
            </button>
          </div>
        </div>

        <div class="legal-text text-slate-200 pt-4 leading-relaxed">
          ${formattedText}
        </div>
      </article>
    `);
  }

  el.readerArticlesContainer.innerHTML = htmlChunks.join('');
  attachArticleActions();
}

const REGEX_LIST_DASH = /\n- /g;
const REGEX_LIST_NUMS = /\n([0-9]+\.|\([a-z]\)|[a-z]\.)\s+/g;

function formatLegalText(rawText) {
  if (!rawText) return '<p class="italic text-slate-500">Geen tekst beschikbaar.</p>';

  const paragraphs = rawText.split(/\n{2,}/);
  const out = [];
  for (let i = 0; i < paragraphs.length; i++) {
    let clean = escapeHtml(paragraphs[i].trim());
    clean = clean.replace(REGEX_LIST_DASH, '<br/>&bull; ');
    clean = clean.replace(REGEX_LIST_NUMS, '<br/><span class="font-semibold text-slate-100">$1</span> ');
    out.push(`<p class="mb-3">${clean}</p>`);
  }
  return out.join('');
}

function attachArticleActions() {
  document.querySelectorAll('.copy-link-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const relative = btn.getAttribute('data-link');
      const fullUrl = `${window.location.origin}${window.location.pathname}${relative}`;
      navigator.clipboard.writeText(fullUrl);
      showToast('Article link copied to clipboard');
    });
  });

  document.querySelectorAll('.copy-text-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const text = decodeURIComponent(btn.getAttribute('data-text'));
      const cite = decodeURIComponent(btn.getAttribute('data-cite'));
      navigator.clipboard.writeText(`${cite}\n\n${text}`);
      showToast('Article text & citation copied');
    });
  });
}

function scrollToArticle(targetId) {
  const target = document.getElementById(targetId);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('targeted-article');
    setTimeout(() => {
      target.classList.remove('targeted-article');
    }, 2800);
  }
}

// -------------------------------------------------------------
// Search Engine & Search View
// -------------------------------------------------------------
async function openSearch(query) {
  state.activeSearchQuery = query;
  if (el.globalSearchInput.value !== query) {
    el.globalSearchInput.value = query;
  }

  showView('search');

  if (!state.isSearchLoaded) {
    setLoading(true);
    await loadSearchIndex();
    setLoading(false);
  }

  executeSearch(query);
}

function executeSearch(query) {
  if (!state.miniSearch || !query.trim()) {
    el.searchResultsList.innerHTML = `<div class="p-8 text-center text-slate-500">Enter a search query above.</div>`;
    return;
  }

  const lawFilter = el.searchLawFilter.value;
  const results = state.miniSearch.search(query, {
    filter: lawFilter ? (result) => result.law_slug === lawFilter : undefined
  });

  const displayResults = results.slice(0, 40);
  el.searchSummaryText.textContent = `Found ${results.length} result${results.length === 1 ? '' : 's'} for "${query}"${lawFilter ? ` within selected law` : ''}`;

  if (displayResults.length === 0) {
    el.searchResultsList.innerHTML = `
      <div class="p-12 text-center bg-[#111827] rounded-xl border border-slate-800 space-y-2">
        <h3 class="text-sm font-semibold text-slate-300">No matching legal provisions found</h3>
        <p class="text-xs text-slate-500">Try adjusting your query terms or clear the law filter.</p>
      </div>
    `;
    return;
  }

  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);

  el.searchResultsList.innerHTML = displayResults.map(res => {
    const snippet = buildHighlightedSnippet(res.text, queryTerms);
    return `
      <div class="p-5 bg-[#111827] border border-slate-800/80 rounded-xl hover:border-indigo-500/80 hover:bg-[#141d30] transition-all space-y-2 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span class="font-semibold text-indigo-400">${escapeHtml(res.law_name)}</span>
          <span class="text-slate-500 font-mono text-[11px]">${escapeHtml(res.chapter || '')}</span>
        </div>

        <h3 class="text-base font-bold text-white">
          <a href="#/law/${res.law_slug}/art-${res.id}" class="hover:text-indigo-400 transition-colors">
            ${escapeHtml(res.title)}
          </a>
        </h3>

        <div class="text-xs text-slate-300 leading-relaxed font-serif bg-slate-900/60 p-3.5 rounded-lg border border-slate-800/60">
          ${snippet}
        </div>

        <div class="pt-1 flex items-center justify-end">
          <a href="#/law/${res.law_slug}/art-${res.id}" class="text-xs font-medium text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
            Read in context <span class="inline-flex">${ICONS.arrowRight}</span>
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function buildHighlightedSnippet(text, terms) {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ');

  let firstIdx = -1;
  for (let i = 0; i < terms.length; i++) {
    const idx = clean.toLowerCase().indexOf(terms[i]);
    if (idx !== -1 && (firstIdx === -1 || idx < firstIdx)) {
      firstIdx = idx;
    }
  }

  let start = 0;
  if (firstIdx > 50) {
    start = firstIdx - 50;
  }
  let excerpt = clean.substring(start, start + 280);
  if (start > 0) excerpt = '...' + excerpt;
  if (start + 280 < clean.length) excerpt = excerpt + '...';

  let escaped = escapeHtml(excerpt);
  for (let i = 0; i < terms.length; i++) {
    const reg = new RegExp(`(${escapeRegex(terms[i])})`, 'gi');
    escaped = escaped.replace(reg, '<mark class="search-highlight">$1</mark>');
  }

  return escaped;
}

// -------------------------------------------------------------
// Router & State Transitions
// -------------------------------------------------------------
function handleRouting() {
  const hash = window.location.hash || '#/';
  
  if (hash === '#/' || hash === '#' || hash === '') {
    showView('home');
    state.currentLawSlug = null;
    renderSidebarLaws(state.laws, el.lawFilterInput.value);
  } else if (hash.startsWith('#/law/')) {
    const parts = hash.replace('#/law/', '').split('/');
    const slug = parts[0];
    const targetArticle = parts[1] || null;
    openLaw(slug, targetArticle);
  } else if (hash.startsWith('#/search')) {
    const urlParams = new URLSearchParams(hash.split('?')[1] || '');
    const q = urlParams.get('q') || '';
    openSearch(q);
  } else if (hash === '#/about') {
    showView('about');
  }
}

function showView(viewName) {
  el.homeView.classList.add('hidden');
  el.lawView.classList.add('hidden');
  el.searchView.classList.add('hidden');
  el.aboutView.classList.add('hidden');

  if (viewName === 'home') el.homeView.classList.remove('hidden');
  if (viewName === 'law') el.lawView.classList.remove('hidden');
  if (viewName === 'search') el.searchView.classList.remove('hidden');
  if (viewName === 'about') el.aboutView.classList.remove('hidden');

  document.getElementById('main-content').scrollTop = 0;
}

function setLoading(isLoading) {
  if (isLoading) {
    el.loadingSpinner.classList.remove('hidden');
  } else {
    el.loadingSpinner.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// Event Handlers
// -------------------------------------------------------------
function setupEventListeners() {
  let searchTimeout = null;
  el.globalSearchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (val) {
        window.location.hash = `#/search?q=${encodeURIComponent(val)}`;
      }
    }, 200);
  });

  el.globalSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = el.globalSearchInput.value.trim();
      if (val) {
        window.location.hash = `#/search?q=${encodeURIComponent(val)}`;
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if ((e.key === '/' && document.activeElement !== el.globalSearchInput && document.activeElement !== el.lawFilterInput) ||
        (e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) {
      e.preventDefault();
      el.globalSearchInput.focus();
      el.globalSearchInput.select();
    }
  });

  el.searchLawFilter.addEventListener('change', () => {
    if (state.activeSearchQuery) {
      executeSearch(state.activeSearchQuery);
    }
  });

  el.lawFilterInput.addEventListener('input', (e) => {
    renderSidebarLaws(state.laws, e.target.value);
  });

  document.querySelectorAll('#quick-search-tags button').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-search');
      window.location.hash = `#/search?q=${encodeURIComponent(q)}`;
    });
  });

  el.themeToggle.addEventListener('click', toggleTheme);
  el.mobileMenuBtn.addEventListener('click', toggleSidebar);
  el.sidebarOverlay.addEventListener('click', closeSidebar);

  el.readerTocToggle.addEventListener('click', () => {
    el.readerTocDrawer.classList.toggle('hidden');
  });
  el.readerTocClose.addEventListener('click', () => {
    el.readerTocDrawer.classList.add('hidden');
  });
}

function toggleSidebar() {
  const isHidden = el.sidebar.classList.contains('-translate-x-full');
  if (isHidden) {
    el.sidebar.classList.remove('-translate-x-full');
    el.sidebarOverlay.classList.remove('hidden');
  } else {
    closeSidebar();
  }
}

function closeSidebar() {
  el.sidebar.classList.add('-translate-x-full');
  el.sidebarOverlay.classList.add('hidden');
}

function showToast(msg) {
  el.toastMessage.textContent = msg;
  el.toast.classList.remove('translate-y-24', 'opacity-0');
  setTimeout(() => {
    el.toast.classList.add('translate-y-24', 'opacity-0');
  }, 2200);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
