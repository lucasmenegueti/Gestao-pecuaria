// Harness "Testar sem login" (ver CLAUDE.md): roda módulos reais de src/lib em Node puro.
//   node --experimental-strip-types --import ./scripts/register-hooks.mjs <script.ts>
// (a) neutraliza `import 'server-only'`; (b) resolve imports relativos/absolutos sem extensão (.ts).
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'server-only') return { url: 'data:text/javascript,', shortCircuit: true };
    if ((specifier.startsWith('.') || specifier.startsWith('/')) && !/\.[cm]?[jt]s$/.test(specifier)) {
      try {
        return next(`${specifier}.ts`, context);
      } catch {
        /* cai no padrão */
      }
    }
    return next(specifier, context);
  },
});
