import * as process from "node:process";
import {make, ObsidianLiveSyncSettings} from "./mod.ts";

import {defaultLoggerEnv} from "octagonal-wheels/common/logger";
import {LOG_LEVEL_VERBOSE} from "obsidian-livesync/lib/src/common/types.ts";

defaultLoggerEnv.minLogLevel = LOG_LEVEL_VERBOSE;

async function main() {
  const settings: ObsidianLiveSyncSettings = {
    remoteType: "MINIO",
    region: "us-east-1",
    endpoint: process.env.ENDPOINT,
    accessKey: process.env.ACCESS_KEY,
    secretKey: process.env.SECRET_KEY,
    bucketPrefix: "",
    bucketCustomHeaders: [],
  };
  const cli = await make(settings);
  await cli.start();
}

main();
