import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown';

import 'reveal.js/reveal.css';
import 'reveal.js/theme/black.css';

const deck = new Reveal({
  hash: true,
  plugins: [Markdown],
});

deck.initialize();
