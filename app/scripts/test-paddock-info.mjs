// Regressao de src/lib/paddock-info.ts contra dados REAIS de producao.
//
// Roda o loadPaddockInfo de verdade (compilado) sobre um stub de banco alimentado
// com herd/herd_events/supplement_evals/visual_weight_evals dos piquetes P47, CF4,
// NSA2 - P18 e T34 - P02, mais um caso sintetico de ledger vazio. Foi este teste
// que achou os dois bugs de coorte da v0.8.0 (saldo negativo do ledger e heranca
// atraves de EVOLUCAO).
//
// Como rodar, de app/:
//   npx tsc -p scripts/test-paddock-info.tsconfig.json && node scripts/test-paddock-info.mjs
//
// O tsconfig aponta outDir pra uma pasta temporaria; ajuste o caminho antes de rodar.
// Diagnostico one-off no sentido do docs/ARQUITETURA-E-DADOS.md §4 — nao ha runner
// de testes configurado no projeto.

// Roda o loadPaddockInfo REAL (compilado de src/lib/paddock-info.ts) contra um
// stub de banco alimentado com dados de producao.
const path = require('path');
const Module = require('module');
const BUILD = path.join(__dirname, 'build');

// resolve os aliases '@/...' pro build
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) {
  if (req.startsWith('@/')) req = path.join(BUILD, req.slice(2));
  return origResolve.call(this, req, ...rest);
};

const { loadPaddockInfo } = require(path.join(BUILD, 'lib', 'paddock-info.js'));
const FX = require(path.join(__dirname, 'test-paddock-info.fixtures.json'));

function makeDb(fx) {
  const afterEntry = (rows, entry) => (entry ? rows.filter((r) => r.date >= entry) : rows);
  return {
    async getFirstAsync(sql, params) {
      if (sql.includes('FROM paddocks p JOIN grass_types')) return fx.meta;
      if (sql.includes('COUNT(*) AS n FROM supplement_evals')) {
        return { n: afterEntry(fx.supl, params[1]).length };
      }
      if (sql.includes('FROM rondas WHERE paddock_id')) return fx.rondas;
      const m = sql.match(/FROM (\w+) e JOIN rondas/);
      if (m) return (fx.sit || {})[m[1]] ?? null;
      return null;
    },
    async getAllAsync(sql, params) {
      if (sql.includes('FROM herd\n')) return fx.herd;
      if (sql.includes('FROM herd_events')) return fx.events;
      if (sql.includes('FROM supplement_evals se')) return afterEntry(fx.supl, params[1]);
      if (sql.includes('FROM visual_weight_evals')) {
        return afterEntry(fx.weights.filter((w) => w.category === params[1]), params[2]);
      }
      if (sql.includes('FROM inventory i')) return []; // bombona ja e codigo testado
      return [];
    },
  };
}

const EXPECT = {
  'P47':        { entry: '2026-08-05', days: 17, heads: 13,  arroba: 9.72,  kgDay: 6.923, hCount: 7,   gHead: 989.0, target: 70, ratio: 14.13, restocks: 4, prov: false, gmd: null, gap: null, sit: ['biologico', 'warn'] },
  'CF4':        { entry: '2026-06-01', days: 82, heads: 120, arroba: 19.83, kgDay: null,  hCount: null, gHead: null, target: null, ratio: null, restocks: null, prov: null, gmd: 2.159, gap: 'confinamento', gainArroba: 3.167 },
  'NSA2 - P18': { entry: '2026-08-18', days: 4,  heads: 140, arroba: 15.67, kgDay: 15,    hCount: 140, gHead: 107.1, target: 70, ratio: 1.531, restocks: 2, prov: true, gmd: null, gap: null, sit: ['sanidade', 'danger'] },
  'T34 - P02':  { entry: '2026-08-18', days: 4,  heads: 154, arroba: 15.5,  kgDay: null,  hCount: null, gHead: null, target: null, ratio: null, restocks: null, prov: null, gmd: null, gap: 'poucos_abastecimentos', sit: ['sanidade', 'danger'], sit2: ['cerca', 'warn'] },
  // Gado no herd e ledger vazio: sem data de entrada nao da pra atribuir consumo
  // nem pesagem a ESTE lote, mesmo havendo historico de sobra no piquete.
  'SEM-LEDGER': { entry: null, days: 0, heads: 50, arroba: 18.33, kgDay: null, hCount: null, gHead: null, target: null, ratio: null, restocks: null, prov: null, gmd: null, gap: 'sem_entrada' },
};

const near = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= tol;
let fails = 0;
function check(name, ok, got, want) {
  if (!ok) { fails++; console.log(`   FALHOU ${name}: obtido ${got} · esperado ${want}`); }
  else console.log(`   ok ${name} = ${got}`);
}

(async () => {
  for (const [name, fx] of Object.entries(FX)) {
    const e = EXPECT[name];
    console.log(`\n== ${name} ==`);
    const i = await loadPaddockInfo(makeDb(fx), 1);
    check('stub vivo (heads > 0)', i.heads > 0, i.heads, '> 0');
    check('entrada', i.entryDate === e.entry, String(i.entryDate), String(e.entry));
    check('dias', i.daysInPaddock === e.days, i.daysInPaddock, e.days);
    check('cabecas', i.heads === e.heads, i.heads, e.heads);
    check('peso @/cab', near(i.avgArroba, e.arroba, 0.02), i.avgArroba.toFixed(2), e.arroba);
    check('gap consumo', (i.supplementGap ?? null) === e.gap, String(i.supplementGap), String(e.gap));
    if (e.kgDay != null) {
      check('kg/dia', near(i.supplement?.kgPerDay, e.kgDay, 0.01), i.supplement?.kgPerDay?.toFixed(3), e.kgDay);
      check('cabecas contadas', i.supplement?.headsCounted === e.hCount, i.supplement?.headsCounted, e.hCount);
      check('g/cab', near(i.supplement?.gramsPerHeadDay, e.gHead, 0.5), i.supplement?.gramsPerHeadDay?.toFixed(1), e.gHead);
      check('alvo formula', i.supplement?.targetGramsPerHeadDay === e.target, i.supplement?.targetGramsPerHeadDay, e.target);
      check('razao alvo', near(i.supplement?.ratioToTarget, e.ratio, 0.02), i.supplement?.ratioToTarget?.toFixed(3), e.ratio);
      check('n abast', i.supplement?.restockCount === e.restocks, i.supplement?.restockCount, e.restocks);
      check('provisorio', i.supplement?.provisional === e.prov, i.supplement?.provisional, e.prov);
    } else {
      check('sem media', i.supplement === null, String(i.supplement), 'null');
    }
    check('7 linhas de situacao', i.situation.length === 7, i.situation.length, 7);
    if (e.sit) {
      check('1a linha situacao', i.situation[0].key === e.sit[0] && i.situation[0].tone === e.sit[1],
        `${i.situation[0].key}/${i.situation[0].tone}`, e.sit.join('/'));
      if (e.sit2) {
        check('2a linha situacao', i.situation[1].key === e.sit2[0] && i.situation[1].tone === e.sit2[1],
          `${i.situation[1].key}/${i.situation[1].tone}`, e.sit2.join('/'));
      }
    }
    if (e.gmd != null) {
      check('GMD', near(i.gmd?.kgPerDay, e.gmd, 0.01), i.gmd?.kgPerDay?.toFixed(3), e.gmd);
      check('ganho @/cab', near(i.arrobaGainPerHead, e.gainArroba, 0.02), i.arrobaGainPerHead?.toFixed(3), e.gainArroba);
    } else {
      check('sem GMD', i.gmd === null, i.gmd ? i.gmd.category : 'null', 'null');
    }
  }
  console.log(fails === 0 ? '\nTODOS OS CASOS PASSARAM' : `\n${fails} VERIFICACOES FALHARAM`);
  process.exit(fails === 0 ? 0 : 1);
})();
