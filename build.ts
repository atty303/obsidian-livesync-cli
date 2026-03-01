import path from "node:path";

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

const mockWorkerPlugin: BunPlugin = {
  name: "mock-worker",
  setup(build) {
    // bgWorker.tsへのインポートをbgWorker.mock.tsに置換
    build.onResolve({filter: /bgWorker\.ts$/}, (args) => {
      if (args.path === "@lib/worker/bgWorker.ts") {
        return {
          path: path.join(__dirname, "vendor/obsidian-livesync/src/lib/src/worker/bgWorker.mock.ts"),
        };
      }
    });
  },
};

await Bun.build({
  entrypoints: ["src/main.ts"],
  outfile: "dist/cli.js",
  external: externals,
  platform: "node",
  define: {
    "MANIFEST_VERSION": '"0.0.0"',
  },
  plugins: [
    mockWorkerPlugin,
    // inlineWorkerPlugin({
    //   external: externals,
    //   treeShaking: true,
    // }),
    // sveltePlugin(),
  ],
});
