#!/usr/bin/env node
/**
 * §32.2's "Copyright header banner in every file, enforced by a CI
 * license-header-check step." Run with `--fix` to insert the header into
 * every `.ts` file under apps/ and libs/ that's missing it; without a flag,
 * it just reports offenders and exits non-zero (used in CI).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIRS = ['apps', 'libs'];
const HEADER = '// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.';
const SHOULD_FIX = process.argv.includes('--fix');

function collectTsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      collectTsFiles(fullPath, out);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      out.push(fullPath);
    }
  }
  return out;
}

const files = TARGET_DIRS.flatMap((dir) => collectTsFiles(path.join(ROOT, dir)));
const missing = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.startsWith(HEADER)) continue;

  missing.push(file);
  if (SHOULD_FIX) {
    fs.writeFileSync(file, `${HEADER}\n${content}`);
  }
}

if (missing.length === 0) {
  console.log(`All ${files.length} files carry the copyright header.`);
  process.exit(0);
}

if (SHOULD_FIX) {
  console.log(`Inserted the copyright header into ${missing.length} file(s).`);
  process.exit(0);
}

console.error(`${missing.length} file(s) are missing the copyright header:`);
missing.forEach((file) => console.error(`  ${path.relative(ROOT, file)}`));
console.error('\nRun `node scripts/check-license-headers.js --fix` to add it.');
process.exit(1);
