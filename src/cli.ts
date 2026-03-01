import * as process from "node:process";
import * as fs from "node:fs";
import yargs from "yargs";
import {hideBin} from "yargs/helpers";

import {type BucketSyncSetting, make, type ObsidianLiveSyncSettings} from "./mod.ts";

yargs()
  .env("OLS")
  .option("database-path", {
    type: "string",
    description: "Path to the local database file",
    required: true,
    coerce: (arg: string) => {
      fs.mkdirSync(arg, {recursive: true});
      return arg;
    },
  })
  .option("remote-type", {
    type: "string",
    choices: ["MINIO"] as const,
    default: "MINIO",
    description: "Remote type",
  })
  .group([
    "remote.access-key",
    "remote.secret-key",
    "remote.bucket",
    "remote.region",
    "remote.endpoint",
    "remote.custom-headers",
    "remote.bucket-prefix",
    "remote.force-path-style"
  ], "Remote bucket options")
  .option("remote.access-key", {
    type: "string",
    description: "The access key to use when connecting to the bucket",
  })
  .option("remote.secret-key", {
    type: "string",
    description: "The secret to use when connecting to the bucket",
  })
  .option("remote.bucket", {
    type: "string",
    description: "The name of bucket to use",
  })
  .option("remote.region", {
    type: "string",
    description: "The region of the bucket",
  })
  .option("remote.endpoint", {
    type: "string",
    description: "The endpoint of the bucket",
  })
  .option("remote.custom-headers", {
    type: "array",
    description: "Custom request headers (e.g. `--remote.custom-headers \"x-some-header: some-value\" \"x-some-header2: some-value2\"`)",
    default: [],
  })
  .option("remote.bucket-prefix", {
    type: "string",
    description: "The prefix to use for the bucket (e.g., \"my-bucket/\", means mostly like a folder)",
    default: "",
  })
  .option("remote.force-path-style", {
    type: "boolean",
    description: "Indicates whether to force path style access",
    default: false,
  })
  .command(
    "sync",
    "Synchronize local database with remote",
    (yargs) => {
    },
    async (argv) => {
      const bucketSyncSettings: BucketSyncSetting = {
        accessKey: argv.remote.accessKey,
        secretKey: argv.remote.secretKey,
        bucket: argv.remote.bucket,
        region: argv.remote.region,
        endpoint: argv.remote.endpoint,
        useCustomRequestHandler: false,
        bucketCustomHeaders: argv.remote.customHeaders,
        bucketPrefix: argv.remote.bucketPrefix,
        forcePathStyle: argv.remote.forcePathStyle,
      };
      const settings: ObsidianLiveSyncSettings = {
        sqliteDatabasePath: argv.databasePath,
        remoteType: argv.remoteType,
        // hashAlg: "xxhash64",
        encrypt: false,
        ...bucketSyncSettings,
      };
      const cli = await make(settings);
      await cli.start();
      await cli.sync();
    }
  )
  .command("export", "Export local database to filesystem", (yargs) => {
    yargs.option("output-path", {
      type: "string",
      description: "Output path for exported files",
      required: true,
    });
  }, async (argv) => {
    const outputPath = argv.outputPath;
    const cli = await make({
      sqliteDatabasePath: argv.databasePath,
    });
    await cli.start();
    await cli.export(outputPath);
  })
  .parse(hideBin(process.argv));
