import './home.css';

const basePath = import.meta.env.BASE_URL;
const deckGrid = document.getElementById('deckGrid');
const template = document.getElementById('deckCardTemplate');
const searchInput = document.getElementById('searchInput');
const clientSelect = document.getElementById('clientSelect');
const statusSelect = document.getElementById('statusSelect');

let decks = [];

function deckUrl(path) {
  const cleanPath = String(path || '').replace(/^\/+/, '');
  return new URL(cleanPath, window.location.origin + basePath).toString();
}

function normalize(text) {
  return String(text || '').trim().toLowerCase();
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }
  return date.toISOString().slice(0, 10);
}

function renderClients(deckItems) {
  const clients = [...new Set(deckItems.map((deck) => deck.client))].filter(Boolean).sort();
  for (const client of clients) {
    const option = document.createElement('option');
    option.value = client;
    option.textContent = client;
    clientSelect.appendChild(option);
  }
}

function currentFilters() {
  return {
    keyword: normalize(searchInput.value),
    client: clientSelect.value,
    status: statusSelect.value,
  };
}

function filterDecks(deckItems, filters) {
  return deckItems.filter((deck) => {
    if (filters.client !== 'all' && deck.client !== filters.client) {
      return false;
    }
    if (filters.status !== 'all' && normalize(deck.status) !== normalize(filters.status)) {
      return false;
    }
    if (!filters.keyword) {
      return true;
    }

    const haystack = [deck.title, deck.client, deck.slug, ...(deck.tags || [])].join(' ').toLowerCase();
    return haystack.includes(filters.keyword);
  });
}

function renderDecks(deckItems) {
  deckGrid.innerHTML = '';

  if (!deckItems.length) {
    const empty = document.createElement('article');
    empty.className = 'deck-empty';
    empty.textContent = '目前沒有符合條件的簡報。你可以新增 deck 後更新 decks.json。';
    deckGrid.appendChild(empty);
    return;
  }

  for (const deck of deckItems) {
    const node = template.content.cloneNode(true);
    const card = node.querySelector('.deck-card');
    const meta = node.querySelector('.deck-card__meta');
    const status = node.querySelector('.deck-card__status');
    const title = node.querySelector('.deck-card__title');
    const tags = node.querySelector('.deck-card__tags');
    const link = node.querySelector('.deck-card__link');

    meta.textContent = `${deck.client} · ${formatDate(deck.date)}`;
    title.textContent = deck.title;
    tags.textContent = (deck.tags || []).join(' · ');

    const normalizedStatus = normalize(deck.status || 'active');
    status.textContent = normalizedStatus.toUpperCase();
    status.classList.remove('deck-card__status--archived', 'deck-card__status--draft');
    if (normalizedStatus === 'archived') {
      status.classList.add('deck-card__status--archived');
    } else if (normalizedStatus === 'draft') {
      status.classList.add('deck-card__status--draft');
    }

    link.href = deckUrl(deck.path);
    link.setAttribute('aria-label', `開啟簡報：${deck.title}`);

    card.dataset.deckId = deck.id;
    deckGrid.appendChild(node);
  }
}

function applyFilters() {
  const filtered = filterDecks(decks, currentFilters());
  renderDecks(filtered);
}

async function init() {
  const response = await fetch(`${basePath}data/decks.json`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to load deck index: ${response.status}`);
  }

  const loaded = await response.json();
  decks = [...loaded].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  renderClients(decks);
  applyFilters();
}

searchInput.addEventListener('input', applyFilters);
clientSelect.addEventListener('change', applyFilters);
statusSelect.addEventListener('change', applyFilters);

init().catch((error) => {
  deckGrid.innerHTML = '';
  const fallback = document.createElement('article');
  fallback.className = 'deck-empty';
  fallback.textContent = `載入簡報索引失敗：${error.message}`;
  deckGrid.appendChild(fallback);
});
