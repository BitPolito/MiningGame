import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';

function cssFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.isFile() && entry.name.endsWith('.css') ? [path] : [];
  });
}

const files = cssFiles('src');
let failed = false;
for (const file of files) {
  try {
    postcss.parse(readFileSync(file, 'utf8'), { from: file });
  } catch (error) {
    console.error(error.message);
    failed = true;
  }
}
if (failed) process.exitCode = 1;
else console.log('Checked ' + files.length + ' CSS files.');
