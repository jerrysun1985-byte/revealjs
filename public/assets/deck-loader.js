import { ensureDeckAccess } from './auth-gate.js';

await ensureDeckAccess();

async function loadLegacyScript(relativePath) {
  const src = new URL(relativePath, import.meta.url);
  await new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src.href}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src.href}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = src.href;
    script.async = false;
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        resolve();
      },
      { once: true },
    );
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src.href}`)), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

await loadLegacyScript('../vendor/revealjs/dist/reveal.js');
await loadLegacyScript('../vendor/revealjs/dist/plugin/markdown.js');

const deck = new window.Reveal({
  hash: true,
  slideNumber: 'c/t',
  plugins: [window.RevealMarkdown],
});

await deck.initialize();
