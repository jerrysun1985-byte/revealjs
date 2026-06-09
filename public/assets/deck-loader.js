import { ensureDeckAccess } from './auth-gate.js';
import Reveal from '../vendor/revealjs/dist/reveal.mjs';
import Markdown from '../vendor/revealjs/dist/plugin/markdown.mjs';

await ensureDeckAccess();

const deck = new Reveal({
  hash: true,
  slideNumber: 'c/t',
  plugins: [Markdown],
});

await deck.initialize();
