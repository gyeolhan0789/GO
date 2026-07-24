import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const generatedNotice = '<!-- GENERATED FILE. Edit agent-skills/... instead. -->\n\n';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'agent-skills');
const targets = [
  path.join(root, '.agents', 'skills'),
  path.join(root, '.claude', 'skills'),
];

async function findSkillFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return findSkillFiles(entryPath);
      return entry.name === 'SKILL.md' ? [entryPath] : [];
    }),
  );
  return files.flat();
}

if (!(await stat(source)).isDirectory()) {
  throw new Error(`Canonical skills directory not found: ${source}`);
}

for (const target of targets) {
  await rm(target, { recursive: true, force: true });
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });

  for (const skillFile of await findSkillFiles(target)) {
    const contents = await readFile(skillFile, 'utf8');
    await writeFile(skillFile, `${generatedNotice}${contents}`, 'utf8');
  }
}

console.log('Synced canonical agent skills to Codex and Claude Code directories.');
