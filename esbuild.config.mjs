import esbuild from "esbuild";
import inlineWorkerPlugin from "esbuild-plugin-inline-worker";
import sveltePlugin from "esbuild-svelte";

const externals = [
  "obsidian",
  "electron",
  "crypto",
  "@codemirror/autocomplete",
  "@codemirror/collab",
  "@codemirror/commands",
  "@codemirror/language",
  "@codemirror/lint",
  "@codemirror/search",
  "@codemirror/state",
  "@codemirror/view",
  "@lezer/common",
  "@lezer/highlight",
  "@lezer/lr",
  "sqlite3"
];

await esbuild.build({
  entryPoints: ["src/main.ts"],
  mainFields: ["svelte", "browser", "module", "main"],
  conditions: ["svelte", "browser"],
  bundle: true,
  outfile: "dist/cli.js",
  external: externals,
  platform: "node",
  define: {
    "MANIFEST_VERSION": '"0.0.0"',
  },
  plugins: [
    inlineWorkerPlugin({
      external: externals,
      treeShaking: true,
    }),
    sveltePlugin(),
  ],
  logLevel: "info",
})
  .catch(() => process.exit(1));
