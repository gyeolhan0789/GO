import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const generatedNotice = '<!-- GENERATED FILE. Edit agent-skills/... instead. -->\n\n';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'agent-skills');
const targets = [
  ['Codex', path.join(root, '.agents', 'skills')],
  ['Claude Code', path.join(root, '.claude', 'skills')],
];

async function filesIn(directory, relative = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async entry => {
      const nextRelative = path.join(relative, entry.name);
      const nextPath = path.join(directory, entry.name);
      return entry.isDirectory() ? filesIn(nextPath, nextRelative) : [nextRelative];
    }),
  );
  return paths.flat().sort();
}

function expectedContents(relativePath, sourceContents) {
  return path.basename(relativePath) === 'SKILL.md'
    ? `${generatedNotice}${sourceContents}`
    : sourceContents;
}

let valid = true;
const sourceFiles = await filesIn(source);

for (const [name, target] of targets) {
  let targetFiles;
  try {
    targetFiles = await filesIn(target);
  } catch {
    console.error(`${name} skills directory is missing: ${target}`);
    valid = false;
    continue;
  }

  if (JSON.stringify(targetFiles) !== JSON.stringify(sourceFiles)) {
    console.error(`${name} skill file set is out of sync.`);
    valid = false;
    continue;
  }

  for (const relativePath of sourceFiles) {
    const [sourceContents, targetContents] = await Promise.all([
      readFile(path.join(source, relativePath), 'utf8'),
      readFile(path.join(target, relativePath), 'utf8'),
    ]);
    if (targetContents !== expectedContents(relativePath, sourceContents)) {
      console.error(`${name} skill is stale: ${relativePath}`);
      valid = false;
    }
  }
}

if (!valid) process.exitCode = 1;
else console.log('Codex and Claude Code skills are synchronized.');
