// Arma la página del visor: three.js y el código del visor en un solo HTML, sin CDN, para que la
// app lo guarde en el teléfono y lo abra sin conexión. Escribe src/generado/html.ts.
// Con `--html <ruta>` también deja el HTML suelto, para probarlo en un navegador.
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

const { outputFiles } = await build({
  entryPoints: [join(raiz, "src/pagina.ts")],
  bundle: true,
  format: "iife",
  minify: true,
  // WKWebView usa el WebKit del sistema; Android, el Chromium del sistema.
  target: ["safari15", "chrome100"],
  write: false,
});
// Dentro de <script>, un "</script" literal cerraría la etiqueta antes de tiempo.
const js = outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<style>
html,body{margin:0;height:100%;overflow:hidden;background:radial-gradient(ellipse at 50% 40%,#fff 0%,#eef2f4 70%,#e3e8eb 100%);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
#escena{position:fixed;inset:0}
canvas{display:block;width:100%;height:100%;touch-action:none;outline:none}
.vista{position:absolute;top:8px;left:8px;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.9);border:1.5px solid #e5e5e5;font:700 12px/1.3 -apple-system,system-ui,sans-serif;color:#5f5f5a;pointer-events:none}
.vista:empty{display:none}
.etiquetas{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.guias{position:absolute;inset:0;width:100%;height:100%;stroke:#6e5a32;stroke-width:1.2;fill:#6e5a32}
.etiqueta{position:absolute;left:0;top:0;padding:1px 7px;border-radius:8px;background:rgba(255,255,255,.92);border:1px solid #d9cba9;font:700 11px/1.4 -apple-system,system-ui,sans-serif;color:#6e5a32;white-space:nowrap;visibility:hidden}
</style>
</head>
<body>
<div id="escena"></div>
<script>${js}</script>
</body>
</html>
`;

const version = createHash("sha256").update(html).digest("hex").slice(0, 12);
// JSON.stringify no escapa U+2028 ni U+2029; algunos analizadores de JS los toman como salto de línea.
const literal = JSON.stringify(html).replace(new RegExp("\\u2028", "g"), "\\u2028").replace(new RegExp("\\u2029", "g"), "\\u2029");
mkdirSync(join(raiz, "src/generado"), { recursive: true });
writeFileSync(
  join(raiz, "src/generado/html.ts"),
  `// Generado por scripts/construir.mjs: no editar.\nexport const VERSION_VISOR = ${JSON.stringify(version)};\nexport const HTML_VISOR = ${literal};\n`,
);

const i = process.argv.indexOf("--html");
if (i > 0) writeFileSync(process.argv[i + 1], html);
console.log(`visor ${version}: ${Math.round(Buffer.byteLength(html) / 1024)} KB`);
