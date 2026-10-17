import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../..', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('foreman label edits (#710)', () => {
  it('remote-writes table says label edits prompt the owner on every call and are not auto-allowed', () => {
    const row = read('docs/agents/foreman.md')
      .split('\n')
      .find((line) => line.startsWith('| `gh issue edit --add-label`'));

    expect(row).toMatch(/prompts? the owner on every call/i);
    expect(row).toMatch(/not auto-allowed/i);
  });

  it('step 1 says the foreman names the issue and label in chat before the label edit', () => {
    const foreman = read('docs/agents/foreman.md');
    const step1 = foreman.slice(foreman.indexOf('## 1. Pick issues'), foreman.indexOf('## 2. Propose'));

    expect(step1).toMatch(/names? the issue and (the )?label in chat before running the label edit/i);
  });

  it('leaves the other table rows and the foreman config unchanged', () => {
    const foreman = read('docs/agents/foreman.md');

    expect(foreman).toMatch(/\| `gh pr review`\s+\| Step 5, post the merged review findings\.\s+\|/);
    expect(foreman).toMatch(/\| `gh issue create`\s+\| Step 1, split an issue into sub-issues\.\s+\|/);
    expect(read('.devin/foreman.json')).not.toContain('Exec(gh issue edit');
  });
});
