import fs from 'fs/promises';
import path from 'path';

const root = path.resolve('src');

function isTsFile(f) {
  return f.endsWith('.ts') || f.endsWith('.tsx');
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full);
    else if (e.isFile() && isTsFile(e.name)) {
      await fixFile(full);
    }
  }
}

async function fixFile(filePath) {
  let src = await fs.readFile(filePath, 'utf8');
  const original = src;

  // Replace non-breaking spaces and other odd unicode whitespace with normal space
  src = src.replace(/\u00A0/g, ' ');
  // Remove zero width space and zero width no-break space
  src = src.replace(/\u200B|\uFEFF|\u200C|\u200D/g, '');
  // Replace weird ideographic spaces
  src = src.replace(/\u3000/g, ' ');

  if (src !== original) {
    await fs.writeFile(filePath, src, 'utf8');
    console.log('Fixed whitespace in', filePath);
  }
}

(async () => {
  try {
    await walk(root);
    console.log('Whitespace normalization complete.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
