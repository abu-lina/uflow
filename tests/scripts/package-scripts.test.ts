import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));

describe('package.json scripts', () => {
  it('has no test:ui script (@vitest/ui is not installed)', () => {
    expect(pkg.scripts['test:ui']).toBeUndefined();
  });
});

describe('CI and validate agree on format:check (#613)', () => {
  const ciYml = readFileSync(join(process.cwd(), '.github/workflows/ci.yml'), 'utf8');

  it('CI lint job runs format:check', () => {
    expect(ciYml).toContain('npm run format:check');
  });

  it('validate script includes format:check', () => {
    expect(pkg.scripts.validate).toContain('format:check');
  });

  it('.prettierignore covers directories nobody formats today', () => {
    const ignoreFile = readFileSync(join(process.cwd(), '.prettierignore'), 'utf8');
    const requiredIgnores = ['agent-output/', 'docs/', 'tests/performance/', 'tools/', '.devin/'];
    for (const dir of requiredIgnores) {
      expect(ignoreFile).toContain(dir);
    }
  });
});
