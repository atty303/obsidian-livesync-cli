import openDatabase from "websql";
import setGlobalVars from 'indexeddbshim';

global.window = globalThis;
setGlobalVars(globalThis, {
  win: {openDatabase},
  checkOrigin: false,
  databaseBasePath: "scratch",
});
shimIndexedDB.__setConfig(
  {
    checkOrigin: false,
    databaseBasePath: "scratch",
  });

// shimIndexedDB.__useShim();
// globalThis.indexedDB = shimIndexedDB;


// import setGlobalVars from 'indexeddbshim';
//
// setGlobalVars(global, {
//   checkOrigin: false,
//   databaseBasePath: "scratch",
// });

import IDBPouch from "pouchdb-adapter-idb";

PouchDB.plugin(IDBPouch);

// import "fake-indexeddb/auto";

import {ServiceContext} from "obsidian-livesync/lib/src/services/base/ServiceBase.ts";
import PouchDB from "pouchdb-core";
import {HeadlessServiceHub} from "obsidian-livesync/lib/src/services/HeadlessServices.ts";
import {
  HeadlessDatabaseService
} from "obsidian-livesync/lib/src/services/implements/headless/HeadlessDatabaseService.ts";
import {
  ObsidianLiveSyncSettings,
} from "obsidian-livesync/lib/src/common/types.ts";
import {OpenKeyValueDatabase} from "obsidian-livesync/common/KeyValueDB.ts";
import {LiveSyncLocalDB} from "obsidian-livesync/lib/src/pouchdb/LiveSyncLocalDB.ts";
import {
  LiveSyncJournalReplicator, LiveSyncJournalReplicatorEnv
} from "obsidian-livesync/lib/src/replication/journal/LiveSyncJournalReplicator.ts";


export type {ObsidianLiveSyncSettings};

export interface LiveSyncCli {
  start(): Promise<void>
}

class CliCore implements LiveSyncJournalReplicatorEnv, LiveSyncCli {
  replicationStat: ReactiveSource<ReplicationStat>;
  localDatabase: LiveSyncLocalDB;

  constructor(public services: ServiceHub, public kvDB: KeyValueDatabase, private _settings: ObsidianLiveSyncSettings) {
    this.localDatabase = new LiveSyncLocalDB(_settings.url, this);
  }

  get simpleStore(): SimpleStore<any, any> {
    return this.kvDB as SimpleStore<CheckPointInfo>;
  }

  getSettings(): RemoteDBSettings & BucketSyncSetting & Pick<ObsidianLiveSyncSettings, "remoteType"> {
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
    await this.services.database.openDatabase({
      databaseEvents: this.services.databaseEvents,
      replicator: this.services.replicator,
    });
    // await core.localDatabase.initializeDatabase();
    await this.services.appLifecycle.onLoaded();
    await this.services.appLifecycle.onReady();

    console.log("Replication started");
    // await hub.replication.markUnlocked();
    const r = await this.services.replicator.getActiveReplicator().openReplication(this.getSettings(), false, true, true);
    console.log(r);
    for await (const doc of this.services.database.localDatabase.findAllDocs()) {
      console.log(doc.path);
      // const body = await this.services.database.localDatabase.getDBEntry(doc.path);
      // if (body !== false) {
      //   console.log(body);
      // }
    }  // hub.replicator.getActiveReplicator().replicateAllFromServer(conf);
  }
}


export async function make(settings: ObsidianLiveSyncSettings): Promise<CliCore> {
  const context = new ServiceContext();

  const hub = new HeadlessServiceHub(context, {
    database: class HeadlessDatabaseServiceExt<T extends ServiceContext> extends HeadlessDatabaseService<T> {
      override createPouchDBInstance<T extends object>(
        name?: string,
        _options?: PouchDB.Configuration.DatabaseConfiguration
      ): PouchDB.Database<T> {
        // const storage = new level.ClassicLevel();
        console.log(PouchDB.adapters);
        const db = new PouchDB(name, {
          adapter: "idb",
          // db: storage,
        });
        console.log(db.adapter);
        return db;
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
  hub.databaseEvents.initialiseDatabase.setHandler(async (showingNotice: boolean = false,
                                                          reopenDatabase = true,
                                                          ignoreSuspending: boolean = false): Promise<boolean> => {
    hub.appLifecycle.resetIsReady();
    if (!await hub.database.openDatabase({
      replicator: hub.replicator,
      databaseEvents: hub.databaseEvents,
    })) {
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
  });

  return core;
}
