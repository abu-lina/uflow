// [DEBUG-smj1] runtime module-load tracer for issue #554
const Module = require('module');
console.log(`[DEBUG-smj1] tracer attached pid=${process.pid} argv=${process.argv.slice(1).join(' ')}`);
const origLoad = Module._load;
const seen = new Set();
Module._load = function (request, parent, isMain) {
  const m = origLoad.apply(this, arguments);
  try {
    if (/(^|[\\/])(critters|postcss|source-map-js)([\\/]|$)/.test(request)) {
      const key = request;
      if (!seen.has(key)) {
        seen.add(key);
        console.log(`[DEBUG-smj1] LOADED "${request}" <- ${parent && parent.filename}`);
      }
      if (request === 'source-map-js' && m && typeof m.SourceMapConsumer === 'function') {
        for (const k of ['SourceMapConsumer', 'SourceMapGenerator']) {
          const O = m[k];
          if (typeof O !== 'function' || O.__smjWrapped) continue;
          const P = new Proxy(O, {
            construct(t, a, nt) {
              console.log(`[DEBUG-smj1] CONSTRUCT ${k} indexed=${!!(a[0] && a[0].sections)}`);
              return Reflect.construct(t, a, nt);
            },
          });
          P.__smjWrapped = true;
          try { m[k] = P; } catch {}
        }
      }
    }
  } catch {}
  return m;
};
const dump = () => console.log('[DEBUG-smj1] seen:', JSON.stringify([...seen]));
process.on('exit', dump);
process.on('SIGUSR2', dump);
setInterval(dump, 20000).unref();
