import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

export async function buildDemo() {
  const [data, stylesheet, preferences, template] = await Promise.all(
    [
      "public/registry/demo.json",
      "public/styles.css",
      "public/preferences.js",
      "public/index.html",
    ].map((path) => readFile(resolve(root, path), "utf8")),
  );
  const dataUrl = JSON.stringify("data:application/json;charset=utf-8," + encodeURIComponent(data));
  const bundle = await build({
    absWorkingDir: root,
    entryPoints: ["public/registry/app.js"],
    bundle: true,
    write: false,
    format: "iife",
    plugins: [
      {
        name: "embed-demo-data",
        setup(builder) {
          builder.onLoad({ filter: /\/registry\/app\.js$/ }, async ({ path }) => {
            const app = await readFile(path, "utf8");
            const endpoint = '"/registry/demo.json"';
            if (!app.includes(endpoint)) throw new Error("Demo data endpoint not found");
            return { contents: app.replace(endpoint, () => dataUrl), loader: "js" };
          });
        },
      },
    ],
  });
  const script = bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
  const html = template
    .replace('<link rel="stylesheet" href="/styles.css" />', () => `<style>${stylesheet}</style>`)
    .replace('<script src="/preferences.js" defer></script>', "")
    .replace('<script type="module" src="/registry/app.js"></script>', "")
    .replace(/<a class="button quiet" href="\/cdn-cgi\/access\/logout">Вийти<\/a>/, "")
    .replace(
      "</body>",
      () => `
      <script>${preferences}</script>
      <script>if (!location.hash) history.replaceState(null, "", "#electricity");</script>
      <script>${script}</script>
      </body>`,
    );
  if (/<script[^>]+src=|<link[^>]+stylesheet/.test(html)) {
    throw new Error("Standalone demo has external resources");
  }
  return html;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const output = resolve(process.argv[2] ?? "dist/cooperative-demo.html");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, await buildDemo());
}
