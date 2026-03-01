import path from "node:path";

const externals = [
  // "crypto",
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
  entrypoints: ["src/cli.ts"],
  outdir: "dist",
  external: externals,
  target: "node",
  format: "cjs",
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
