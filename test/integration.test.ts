import {$} from "bun";
import {expect, test, afterAll, afterEach, beforeAll, beforeEach, describe} from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

const testBucket = "test-run";
const s3endpoint = "http://localhost:9000";

const remoteSettings = {
  OLS_REMOTE_TYPE: "MINIO",
  OLS_REMOTE__ACCESS_KEY: "rustfs",
  OLS_REMOTE__SECRET_KEY: "rustfs",
  OLS_REMOTE__REGION: "auto",
  OLS_REMOTE__ENDPOINT: s3endpoint,
  OLS_REMOTE__BUCKET_PREFIX: "",
  OLS_REMOTE__FORCE_PATH_STYLE: "true",
};

type TestResource = {
  dir: string;
  dbPath: string;
  exportPath: string;
  bucketName: string;
};

async function setupWorkingDirectory() {
  return tempDir;
}

async function setup(fixtureName: string): Promise<TestResource> {
  const tempDir = fs.mkdtempSync(".var/test-");
  const dbPath = path.join(tempDir, "db");
  const exportPath = path.join(tempDir, "export");
  const bucketName = `${testBucket}-${fixtureName}`;

  await $`s5cmd --endpoint-url ${s3endpoint} mb s3://${bucketName}`;
  await $`s5cmd --endpoint-url ${s3endpoint} sync "test/fixture/${fixtureName}/*" s3://${bucketName}`;

  return {
    dir: tempDir,
    dbPath,
    exportPath,
    bucketName,
  };
}

async function cleanup(resource: TestResource) {
  await $`s5cmd --endpoint-url ${s3endpoint} rm "s3://${resource.bucketName}/*"`;
  await $`s5cmd --endpoint-url ${s3endpoint} rb s3://${resource.bucketName}`;
  fs.rmSync(resource.dir, {recursive: true, force: true});
}

describe("cli", () => {
  let res: TestResource;

  afterEach(async () => {
    if (res) {
      await cleanup(res);
    }
  });

  test("sync", async () => {
    res = await setup("01");

    console.log("# sync");
    await $`bun run dist/cli.js sync`.env({
      ...remoteSettings,
      OLS_DATABASE_PATH: res.dbPath,
      OLS_REMOTE__BUCKET: res.bucketName,
    });

    console.log("# export");
    await $`bun run dist/cli.js export`.env({
      OLS_DATABASE_PATH: res.dbPath,
      OLS_OUTPUT_PATH: res.exportPath,
    });

    console.log("# exported files:");
    const files = await $`ls -l ${res.exportPath}`;
    expect(files.text().split("\n").filter(line => line.trim().length > 0).length).toBeGreaterThan(0);
  });
});
/*
test
- e2e encryption: false
- obfuscate properties: false
- encryption algorithm: V2:AES-256-GCM with HKDF
- server: minio

 */
