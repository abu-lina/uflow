// Builds the service worker with @serwist/cli, and is the ONLY thing that
// implements DISABLE_PWA.
//
// @ducanh2912/next-pwa had a `disable` option, so `DISABLE_PWA=true` meant "emit
// no public/sw.js". @serwist/next's configurator mode has no equivalent: the
// config schema is @serwist/cli's, which knows nothing about Next.js plugins.
// Without this wrapper, DISABLE_PWA would silently stop working and
// scripts/verify-pwa-output.js's `DISABLE_PWA=true` early exit would become a
// lie — it would report success on a build that still shipped a worker.
//
// So the wrapper does both halves of `disable`:
//   1. it does not run `serwist build`, and
//   2. it removes any public/sw.js (and source map) already on disk, so the
//      skip and the artifact agree. `serwist()` rm's swDest itself on every
//      real build, which is the same guarantee in the enabled case.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');

const repoRoot = path.join(__dirname, '..');
const swDest = path.join(repoRoot, 'public', 'sw.js');
const configFile = 'serwist.config.mjs';

if (process.env.DISABLE_PWA === 'true') {
  for (const file of [swDest, `${swDest}.map`]) {
    if (fs.existsSync(file)) {
      fs.rmSync(file, { force: true });
      console.log(`DISABLE_PWA=true: removed stale ${path.relative(repoRoot, file)}.`);
    }
  }
  console.log('DISABLE_PWA=true: skipping service worker build.');
  process.exit(0);
}

// Resolved rather than assumed on PATH: this script is also run from `postbuild`
// and from Docker, and a bare `serwist` only works when npm put node_modules/.bin
// on PATH.
const cli = path.join(path.dirname(require.resolve('@serwist/cli/package.json')), 'cli.js');
const result = spawnSync(process.execPath, [cli, 'build', configFile], {
  cwd: repoRoot,
  stdio: 'inherit',
});

if (result.error) {
  console.error('FAIL: could not run @serwist/cli.');
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
