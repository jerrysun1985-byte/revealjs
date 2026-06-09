import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const sourceDir = join(projectRoot, 'node_modules', 'reveal.js', 'dist');
const targetDir = join(projectRoot, 'public', 'vendor', 'revealjs', 'dist');

await rm(join(projectRoot, 'public', 'vendor', 'revealjs'), {
  recursive: true,
  force: true,
});

await mkdir(targetDir, { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });

console.log(`Synced reveal.js assets to ${targetDir}`);
