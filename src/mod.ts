import setGlobalVars from "indexeddbshim";
import openDatabase from "websql";
import {defaultLoggerEnv} from "octagonal-wheels/common/logger";
import {
  BucketSyncSetting,
  EntryTypes,
  LOG_LEVEL_VERBOSE,
  ObsidianLiveSyncSettings,
} from "obsidian-livesync/lib/src/common/types.ts";
import PouchDB from "pouchdb-core";
import IDBPouch from "pouchdb-adapter-idb";
import * as path from "node:path";
import * as fs from "node:fs";
import {ServiceContext} from "obsidian-livesync/lib/src/services/base/ServiceBase.ts";
import {HeadlessServiceHub} from "obsidian-livesync/lib/src/services/HeadlessServices.ts";
import {
  HeadlessDatabaseService,
} from "obsidian-livesync/lib/src/services/implements/headless/HeadlessDatabaseService.ts";
import {OpenKeyValueDatabase} from "obsidian-livesync/common/KeyValueDB.ts";
import {LiveSyncLocalDB} from "obsidian-livesync/lib/src/pouchdb/LiveSyncLocalDB.ts";
import {
  LiveSyncJournalReplicator,
  LiveSyncJournalReplicatorEnv,
} from "obsidian-livesync/lib/src/replication/journal/LiveSyncJournalReplicator.ts";

setGlobalVars(globalThis, {
  win: {openDatabase},
  checkOrigin: false,
});

defaultLoggerEnv.minLogLevel = LOG_LEVEL_VERBOSE;

PouchDB.plugin(IDBPouch);

export type {BucketSyncSetting, ObsidianLiveSyncSettings};

export interface LiveSyncCli {
  start(): Promise<void>;

  sync(): Promise<void>;
}

class CliCore implements LiveSyncJournalReplicatorEnv, LiveSyncCli {
  replicationStat: ReactiveSource<ReplicationStat>;
  localDatabase: LiveSyncLocalDB;

  constructor(
    public services: ServiceHub,
    public kvDB: KeyValueDatabase,
    private _settings: ObsidianLiveSyncSettings,
  ) {
    this.localDatabase = new LiveSyncLocalDB("local", this);
  }

  get simpleStore(): SimpleStore<any, any> {
    return this.kvDB as SimpleStore<CheckPointInfo>;
  }

  getSettings():
  & RemoteDBSettings
    & BucketSyncSetting
    & Pick<ObsidianLiveSyncSettings, "remoteType"> {
    return this._settings;
  }

  getDatabase() {
    return this.localDatabase.localDatabase;
  }

  async start() {
    await this.services.appLifecycle.onInitialise();
    // await this.services.setting.loadSettings();
    await this.services.appLifecycle.onSettingLoaded();

    await this.services.databaseEvents.initialiseDatabase(false, false);
    await this.services.appLifecycle.onFirstInitialise();
    // await this.services.database.openDatabase({
    //   databaseEvents: this.services.databaseEvents,
    //   replicator: this.services.replicator,
    // });
    // await core.localDatabase.initializeDatabase();
    await this.services.appLifecycle.onLoaded();
    await this.services.appLifecycle.onReady();

    // await hub.replication.markUnlocked();
  }

  async sync() {
    const replicator = this.services.replicator.getActiveReplicator();
    if (!replicator) {
      throw new Error("No replicator found");
    }
    await replicator.openReplication(this.getSettings(), false, true, false);

    console.log(`remoteLocked=${replicator.remoteLocked}, remoteLockedAndDeviceNotAccepted=${replicator.remoteLockedAndDeviceNotAccepted}, remoteCleaned=${replicator.remoteCleaned}`);

    await replicator.replicateAllFromServer(this.getSettings());
    replicator.closeReplication();
  }

  async export(outputPath: string) {
    const db: LiveSyncLocalDB | null = this.services.database.localDatabase;
    if (!db) {
      throw new Error("No local database found");
    }

    fs.mkdirSync(outputPath, {recursive: true});

    for await (const doc of db.findAllDocs()) {
      const entry = await db.getDBEntry(doc.path);
      if (entry === false) {
        console.log(`Failed to get entry for ${doc.path}`);
        continue;
      }
      if (entry.deleted) {
        console.log(`Skip deleted entry: ${entry.path}`);
        continue;
      }
      if (
        entry.type === EntryTypes["NOTE_PLAIN"] ||
        entry.type === EntryTypes["NOTE_BINARY"]
      ) {
        const filePath = path.join(outputPath, entry.path);
        const dir = path.dirname(filePath);
        fs.mkdirSync(dir, {recursive: true});
        let content: Buffer | string;
        if (entry.type === EntryTypes["NOTE_BINARY"]) {
          content = Buffer.concat(
            entry.data.map((d) => Buffer.from(d, "base64")),
          );
        } else {
          content = entry.data.join("");
        }
        fs.writeFileSync(filePath, content);
        fs.utimesSync(filePath, new Date(entry.mtime), new Date(entry.mtime));
        console.log(`Exported: ${filePath}`);
      } else {
        console.log(`Skip non-note entry: ${entry.path}`);
      }
    }
  }
}

export async function make(
  settings: ObsidianLiveSyncSettings & {
    sqliteDatabasePath: string;
  },
): Promise<CliCore> {
  shimIndexedDB.__setConfig(
    {
      databaseBasePath: settings.sqliteDatabasePath,
    },
  );

  const context = new ServiceContext();

  const hub = new HeadlessServiceHub(context, {
    database: class HeadlessDatabaseServiceExt<T extends ServiceContext>
      extends HeadlessDatabaseService<T> {
      override createPouchDBInstance<T extends object>(
        name?: string,
        _options?: PouchDB.Configuration.DatabaseConfiguration,
      ): PouchDB.Database<T> {
        return new PouchDB(name, {
          adapter: "idb",
        });
      }
    },
  });

  const kvDB = await OpenKeyValueDatabase("cli");

  const core = new CliCore(hub, kvDB, settings);

  hub.setting.settings = settings;
  hub.API.getSystemVaultName.setHandler(() => {
    return "cli";
  });
  hub.API.addLog.setHandler((message: any, level?: number, key?: string) => {
    console.log(`[CLI] ${key}: ${message}`);
  });
  hub.replicator.getNewReplicator.addHandler(() => {
    return Promise.resolve(new LiveSyncJournalReplicator(core));
  });
  hub.databaseEvents.initialiseDatabase.setHandler(
    async (
      showingNotice: boolean = false,
      reopenDatabase = true,
      ignoreSuspending: boolean = false,
    ): Promise<boolean> => {
      hub.appLifecycle.resetIsReady();
      if (
        !await hub.database.openDatabase({
          replicator: hub.replicator,
          databaseEvents: hub.databaseEvents,
        })
      ) {
        hub.appLifecycle.resetIsReady();
        return false;
      }
      if (hub.database.localDatabase.isReady) {
        // await hub.vault.scanVault(showingNotice, ignoreSuspending);
      }
      if (!(await hub.databaseEvents.onDatabaseInitialised(showingNotice))) {
        // this.logDetectedError(ERR_INITIALISATION_FAILED, LOG_LEVEL_NOTICE);
        return false;
      }
      hub.appLifecycle.markIsReady();
      // await hub.fileProcessing.commitPendingFileEvents();
      return true;
    },
  );

  return core;
}
