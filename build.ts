import path from "node:path";

const externals = [
  "crypto",
  "sqlite3",
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

const patchVendorCompressPlugin: BunPlugin = {
  name: "patch-vendor-compress",
  setup(builder) {
    builder.onLoad({filter: /vendor\/obsidian-livesync\/src\/lib\/src\/pouchdb\/compress\.ts$/}, async (args) => {
      const original = await Bun.file(args.path).text();

      let patched = original;

      patched = patched.replace(
        /export const wrappedInflate = wrapFflateFunc<Uint8Array<ArrayBuffer>, fflate.AsyncInflateOptions>\(fflate.inflate\);/,
        "export const wrappedInflate = fflate.inflateSync;",
      );

      patched = patched.replace(
        /export const wrappedDeflate = wrapFflateFunc<Uint8Array<ArrayBuffer>, fflate.AsyncDeflateOptions>\(fflate.deflate\);/,
        "export const wrappedDeflate = fflate.deflateSync;",
      );

      if (patched === original) {
        console.error(`[patch-vendor-compress] pattern not matched: ${args.path}`);
      } else {
        console.error(`[patch-vendor-compress] patched: ${args.path}`);
      }

      return {
        contents: patched,
        loader: "ts",
      };
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
    patchVendorCompressPlugin,
  ],
});
