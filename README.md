# obsidian-livesync-cli

> [!WARNING]
> This is a work in progress.

This is a CLI for obsidian-livesync.

It is created to extract obsidian-livesync vaults in GitHub Actions for Quartz.

## Limitations

- Only file extraction from the vault is supported.
- Only S3 is supported for remote.
- Encryption and other features are not yet supported.

## Usage

1. Ensure [mise](https://jdx.mise.dev) is installed.
2. Run `mise install`.
3. Run CLI with `bun run cli -- sync ...`.

### Syncing

```
Synchronize local database with remote

Remote bucket options
  --remote.access-key        The access key to use when connecting to the bucket
                                                                        [string]
  --remote.secret-key        The secret to use when connecting to the bucket
                                                                        [string]
  --remote.bucket            The name of bucket to use                  [string]
  --remote.region            The region of the bucket                   [string]
  --remote.endpoint          The endpoint of the bucket                 [string]
  --remote.custom-headers    Custom request headers (e.g.
                             `--remote.custom-headers "x-some-header:
                             some-value" "x-some-header2: some-value2"`)
                                                           [array] [default: []]
  --remote.bucket-prefix     The prefix to use for the bucket (e.g.,
                             "my-bucket/", means mostly like a folder)
                                                          [string] [default: ""]
  --remote.force-path-style  Indicates whether to force path style access
                                                      [boolean] [default: false]

Options:
  --help           Show help                                           [boolean]
  --version        Show version number                                 [boolean]
  --database-path  Path to the local database directory      [string] [required]
  --remote-type    Remote type    [string] [choices: "MINIO"] [default: "MINIO"]
```

- Options can also be specified via environment variables. Use the `OLS_`
  prefix, replace `-` with `_`, and `.` with `__`.
  - Example: `--remote.access-key` -> `OLS_REMOTE__ACCESS_KEY`
- By caching `--database-path` in GitHub Actions, you can fetch only the
  increments.

Example:

```bash
export OLS_REMOTE__ACCESS_KEY=<your access key>
export OLS_REMOTE__SECRET_KEY=<your secret key>
export OLS_REMOTE__BUCKET=<your bucket name>
export OLS_REMOTE__REGION=<your region>

bun run cli sync --database-path .db
```

### Exporting

```
Export local database to filesystem

Options:
  --help           Show help                                           [boolean]
  --version        Show version number                                 [boolean]
  --database-path  Path to the local database directory      [string] [required]
  --output-path    Output path for exported files            [string] [required]
```

Example:

```bash
bun run cli export --database-path .db --output-path vault
```

## Notes

- Initially, I tried to run it with Deno, but due to incompatibilities with
  Node, multiple patches to obsidian-livesync were required, so I switched to
  Bun.
- Due to Bun
  Issue [oven-sh/bun#25860](https://github.com/oven-sh/bun/issues/25860), the
  async version of fflate does not work.

## TODO

- [ ] Add the single-file executable. (How to bundle sqlite3 native module?)
- [ ] Add a GitHub Action for exporting.
