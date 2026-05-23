const DEFAULT_TTL_HOURS = 8;
const STORAGE_PREFIX = 'deck-auth:';

function normalizePath(value) {
  let path = String(value || '').trim();
  path = path.replace(/^https?:\/\/[^/]+/i, '');
  path = path.replace(/^\/+/, '');
  path = path.replace(/index\.html$/i, '');
  if (!path.endsWith('/')) {
    path += '/';
  }
  return path;
}

function detectBasePath() {
  const pathname = window.location.pathname;
  const deckAnchor = pathname.indexOf('/decks/');
  if (deckAnchor === -1) {
    return '/';
  }
  return pathname.slice(0, deckAnchor + 1);
}

function urlFromBase(basePath, relativePath) {
  return new URL(relativePath, window.location.origin + basePath).toString();
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} (${url})`);
  }
  return response.json();
}

function mountGateStyles() {
  if (document.getElementById('deck-auth-style')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'deck-auth-style';
  style.textContent = `
    body.deck-auth-locked .reveal,
    body.deck-auth-locked .deck-back {
      visibility: hidden;
    }

    .deck-auth-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: grid;
      place-items: center;
      background: linear-gradient(130deg, #0d1b2a 0%, #1b263b 100%);
      font-family: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
      color: #102a43;
      padding: 16px;
    }

    .deck-auth-card {
      width: min(520px, 96vw);
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 22px 60px rgba(0, 0, 0, 0.28);
      border: 1px solid #d9e2ec;
      padding: 28px 24px 22px;
    }

    .deck-auth-kicker {
      margin: 0 0 8px;
      color: #486581;
      font-size: 13px;
      letter-spacing: 0.02em;
    }

    .deck-auth-title {
      margin: 0 0 10px;
      font-size: 22px;
      color: #102a43;
    }

    .deck-auth-desc {
      margin: 0 0 14px;
      font-size: 14px;
      color: #334e68;
      line-height: 1.55;
    }

    .deck-auth-hint {
      margin: 0 0 16px;
      background: #f0f4f8;
      border: 1px solid #d9e2ec;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      color: #243b53;
    }

    .deck-auth-form {
      display: grid;
      gap: 10px;
    }

    .deck-auth-label {
      font-size: 14px;
      font-weight: 600;
      color: #243b53;
    }

    .deck-auth-input {
      width: 100%;
      border: 1px solid #bcccdc;
      border-radius: 8px;
      padding: 11px 12px;
      font-size: 15px;
      outline: none;
    }

    .deck-auth-input:focus {
      border-color: #486581;
      box-shadow: 0 0 0 3px rgba(72, 101, 129, 0.15);
    }

    .deck-auth-submit {
      border: 0;
      border-radius: 8px;
      padding: 11px 14px;
      background: #1f3c88;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }

    .deck-auth-submit[disabled] {
      opacity: 0.7;
      cursor: wait;
    }

    .deck-auth-error {
      min-height: 1.3em;
      margin: 0;
      color: #b42318;
      font-size: 13px;
    }
  `;

  document.head.appendChild(style);
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((value) => value.toString(16).padStart(2, '0')).join('');
}

function getSessionKey(deckId) {
  return `${STORAGE_PREFIX}${deckId}`;
}

function getStoredSession(deckId) {
  const raw = sessionStorage.getItem(getSessionKey(deckId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredSession(deckId, payload) {
  sessionStorage.setItem(getSessionKey(deckId), JSON.stringify(payload));
}

function isSessionValid(deck, configEntry, ttlHours) {
  const saved = getStoredSession(deck.id);
  if (!saved) {
    return false;
  }

  if (saved.authKey !== deck.auth.key) {
    return false;
  }

  if (saved.configUpdatedAt !== String(configEntry.updatedAt || '')) {
    return false;
  }

  const ttlMs = ttlHours * 60 * 60 * 1000;
  return Date.now() - Number(saved.verifiedAt || 0) < ttlMs;
}

function renderFatalGate(message) {
  mountGateStyles();
  document.body.classList.add('deck-auth-locked');
  document.body.insertAdjacentHTML(
    'beforeend',
    `<div class="deck-auth-overlay">
      <section class="deck-auth-card" role="alert">
        <p class="deck-auth-kicker">Access Blocked</p>
        <h1 class="deck-auth-title">無法載入此簡報</h1>
        <p class="deck-auth-desc">${message}</p>
      </section>
    </div>`,
  );
}

function promptForPassword({ deckTitle, hint }) {
  mountGateStyles();
  document.body.classList.add('deck-auth-locked');

  const overlay = document.createElement('div');
  overlay.className = 'deck-auth-overlay';
  overlay.innerHTML = `
    <section class="deck-auth-card" aria-labelledby="deck-auth-title">
      <p class="deck-auth-kicker">Protected Deck</p>
      <h1 class="deck-auth-title" id="deck-auth-title">${deckTitle}</h1>
      <p class="deck-auth-desc">此簡報受密碼保護。請輸入授權密碼後繼續。</p>
      ${hint ? `<p class="deck-auth-hint">${hint}</p>` : ''}
      <form class="deck-auth-form" novalidate>
        <label class="deck-auth-label" for="deck-auth-input">存取密碼</label>
        <input class="deck-auth-input" id="deck-auth-input" type="password" autocomplete="current-password" required />
        <button class="deck-auth-submit" type="submit">進入簡報</button>
        <p class="deck-auth-error" aria-live="polite"></p>
      </form>
    </section>
  `;

  document.body.appendChild(overlay);

  return {
    overlay,
    input: overlay.querySelector('.deck-auth-input'),
    form: overlay.querySelector('.deck-auth-form'),
    button: overlay.querySelector('.deck-auth-submit'),
    error: overlay.querySelector('.deck-auth-error'),
  };
}

export async function ensureDeckAccess() {
  const basePath = detectBasePath();

  let decks;
  try {
    decks = await fetchJson(urlFromBase(basePath, 'data/decks.json'));
  } catch (error) {
    renderFatalGate(`讀取簡報索引失敗：${error.message}`);
    throw error;
  }

  const currentDeckPath = normalizePath(window.location.pathname.slice(basePath.length));
  const deck = decks.find((item) => normalizePath(item.path) === currentDeckPath);

  if (!deck) {
    const error = new Error(`Deck metadata not found for path "${currentDeckPath}"`);
    renderFatalGate('此頁面未註冊於 decks.json，已拒絕載入。');
    throw error;
  }

  if (!deck.auth || deck.auth.required !== true) {
    return deck;
  }

  let authConfig;
  try {
    authConfig = await fetchJson(urlFromBase(basePath, 'data/auth-config.json'));
  } catch (error) {
    renderFatalGate(`讀取密碼設定失敗：${error.message}`);
    throw error;
  }

  const configEntry = authConfig?.passwords?.[deck.auth.key];
  if (!configEntry || !configEntry.hash) {
    const error = new Error(`Missing auth config for key "${deck.auth.key}"`);
    renderFatalGate('找不到此頁的密碼設定，請聯絡管理者。');
    throw error;
  }

  const ttlHours = Number(authConfig?.session?.ttlHours || DEFAULT_TTL_HOURS);
  if (isSessionValid(deck, configEntry, ttlHours)) {
    return deck;
  }

  const ui = promptForPassword({
    deckTitle: deck.title || deck.slug || deck.id,
    hint: configEntry.hint || '',
  });
  ui.input.focus();

  await new Promise((resolve) => {
    ui.form.addEventListener('submit', async (event) => {
      event.preventDefault();
      ui.button.disabled = true;
      ui.error.textContent = '';

      try {
        const candidate = ui.input.value;
        const digest = await sha256Hex(candidate);
        if (digest.toLowerCase() !== String(configEntry.hash).toLowerCase()) {
          ui.error.textContent = '密碼錯誤，請再試一次。';
          ui.input.focus();
          ui.input.select();
          return;
        }

        setStoredSession(deck.id, {
          authKey: deck.auth.key,
          configUpdatedAt: String(configEntry.updatedAt || ''),
          verifiedAt: Date.now(),
        });

        resolve();
      } finally {
        ui.button.disabled = false;
      }
    });
  });

  ui.overlay.remove();
  document.body.classList.remove('deck-auth-locked');
  return deck;
}
