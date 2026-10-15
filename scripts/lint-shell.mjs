import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['scripts/lane.sh', 'scripts/lane'];
const followSources = files.some((file) => resolve(file) === resolve('scripts/lane.sh'));
const specialVariables = new Set(['path', 'status', 'cdpath', 'fpath', 'manpath']);
const readOptionsWithValues = new Set(['-d', '-i', '-k', '-n', '-N', '-p', '-t', '-u']);
let failed = false;

const uncomment = (line) => {
  let quote = '';
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '\\' && quote !== "'") {
      index += 1;
    } else if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '#' && (index === 0 || /\s/.test(line[index - 1]))) {
      return line.slice(0, index);
    }
  }
  return line;
};

const bindings = (line) => {
  const found = new Set();
  const declaration = line.match(/^\s*(?:local|typeset|declare|readonly)\s+(.+)$/);
  if (declaration) {
    for (const word of declaration[1].trim().split(/\s+/)) {
      const variable = word.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:=|$)/)?.[1];
      if (variable && specialVariables.has(variable)) found.add(variable);
    }
  }

  const read = line.match(/(?:^|\s)(?:IFS=[^\s]*\s+)?read(?:\s+|$)(.*)$/);
  if (read) {
    const words = read[1].trim().split(/\s+/).filter(Boolean);
    for (let index = 0; index < words.length; index += 1) {
      const word = words[index].replace(/^['"]|['"]$/g, '').replace(/[;|&]+$/, '');
      if (readOptionsWithValues.has(word)) {
        index += 1;
      } else if (!word.startsWith('-')) {
        const variable = word.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:\[.*\])?$/)?.[1];
        if (variable && specialVariables.has(variable)) found.add(variable);
      }
    }
  }

  const loop = line.match(/(?:^|[;&|])\s*for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\b/);
  if (loop && specialVariables.has(loop[1])) found.add(loop[1]);

  const assignment = line.match(
    /^\s*(?:(?:[A-Za-z_][A-Za-z0-9_]*=[^\s;]*)\s+)*(path|status|cdpath|fpath|manpath)=/,
  );
  if (assignment) found.add(assignment[1]);
  return found;
};

const run = (command, args, file) => {
  const result = spawnSync(command, [...args, file], { encoding: 'utf8' });
  if (result.error) {
    console.error(`${command}: ${result.error.message}`);
    failed = true;
    return;
  }
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) failed = true;
};

for (const input of files) {
  const file = resolve(input);
  run('bash', ['-n'], file);
  run('zsh', ['-n'], file);
  run('shellcheck', ['--shell=bash', ...(followSources ? ['-x'] : [])], file);

  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch (error) {
    console.error(`${file}: ${error.message}`);
    failed = true;
    continue;
  }

  source.split('\n').forEach((rawLine, index) => {
    for (const variable of bindings(uncomment(rawLine))) {
      console.error(
        `${file}:${index + 1}: error: zsh special parameter '${variable}' must not be assigned`,
      );
      failed = true;
    }
  });
}

process.exitCode = failed ? 1 : 0;
