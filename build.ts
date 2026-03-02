import pkg from "./package.json" with {type: "json"};
import {mkdir, copyFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {$} from "bun";

const SQLITE_RELEASE_TAG = "v5.1.7";

async function downloadAndExtractSqlite(platform: string, dest: string) {
  const destFile = `${dest}/node_sqlite3-${platform}.node`;
  if (await Bun.file(destFile).exists()) {
    return;
  }

  const assetName = `sqlite3-${SQLITE_RELEASE_TAG}-napi-v6-${platform}.tar.gz`;
  const url = `https://github.com/TryGhost/node-sqlite3/releases/download/${SQLITE_RELEASE_TAG}/${assetName}`;

  console.log(`Downloading ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  const tempDir = join(tmpdir(), `sqlite3-temp-${platform}-${Date.now()}`);
  await mkdir(tempDir, {recursive: true});
  const tarPath = join(tempDir, assetName);
  await Bun.write(tarPath, arrayBuffer);

  console.log(`Extracting ${assetName}...`);
  try {
    const {exitCode} = await $`tar -xzf ${tarPath} -C ${tempDir}`;
    if (exitCode !== 0) {
      throw new Error(`tar command failed with exit code ${exitCode}`);
    }

    // node_sqlite3.node を探す
    const nodeFile = (await $`find ${tempDir} -name node_sqlite3.node`.text()).trim();

    if (nodeFile) {
      await mkdir(dest, {recursive: true});
      await copyFile(nodeFile, destFile);
      console.log(`Saved to ${destFile}`);
    } else {
      throw new Error(`node_sqlite3.node not found in ${assetName}`);
    }
  } finally {
    // ワークディレクトリのクリーンアップ
    await rm(tempDir, {recursive: true, force: true});
  }
}

async function ensureSqliteBinaries() {
  const SQLITE_BIN_DEST_DIR = `${import.meta.dir}/build/assets`;
  const platforms = [
    "linux-x64",
    "linux-arm64",
    "win32-x64",
    "win32-ia32",
    "darwin-x64",
    "darwin-arm64",
  ];

  await mkdir(SQLITE_BIN_DEST_DIR, {recursive: true});

  for (const platform of platforms) {
    await downloadAndExtractSqlite(platform, SQLITE_BIN_DEST_DIR);
  }
}

await ensureSqliteBinaries();

const externals = [
  "crypto",
];

const mockWorkerPlugin: BunPlugin = {
  name: "mock-worker",
  setup(build) {
    // bgWorker.tsへのインポートをbgWorker.mock.tsに置換
    build.onResolve({filter: /bgWorker\.ts$/}, (args) => {
      if (args.path === "@lib/worker/bgWorker.ts") {
        return {
          path: `${import.meta.dir}/vendor/obsidian-livesync/src/lib/src/worker/bgWorker.mock.ts`,
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
      }

      return {
        contents: patched,
        loader: "ts",
      };
    });
  },
};

const replaceSqliteBindingsPlugin: BunPlugin = {
  name: "replace-sqlite-bindings",
  setup(builder) {
    builder.onResolve({filter: /^bindings$/}, (args) => {
      return {path: `${import.meta.dir}/src/bindings/bindings.js`};
    });
  },
};

const compile = Bun.argv.includes("--compile");

const result = await Bun.build({
  entrypoints: ["src/cli.ts"],
  outdir: "dist",
  external: externals,
  target: "bun",
  define: {
    "MANIFEST_VERSION": `"${pkg.version}"`,
  },
  compile: compile ? {
    outfile: "obsidian-livesync-cli"
  } : undefined,
  plugins: [
    mockWorkerPlugin,
    patchVendorCompressPlugin,
    replaceSqliteBindingsPlugin,
  ],
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  throw new Error("Bun.build failed");
}
