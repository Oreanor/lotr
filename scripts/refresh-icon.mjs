// Forces Cargo to re-embed the current src-tauri/icons/icon.ico into the exe.
// tauri-build only re-runs (and re-embeds the icon) when tauri.conf.json changes,
// not when icon.ico itself changes. Bumping the conf's mtime triggers the rerun.
import { utimesSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const conf = join(root, 'src-tauri', 'tauri.conf.json');
const now = new Date();
utimesSync(conf, now, now);
console.log('refresh-icon: bumped mtime of', conf);
