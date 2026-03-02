# obsidian-livesync-cli

> [!WARNING]
> This is a work in progress.

`obsidian-livesync-cli` is a CLI tool
for [obsidian-livesync](https://github.com/vrtmrz/obsidian-livesync).
Its primary goal is to extract a Vault from a remote (S3/MinIO) storage, mainly
for importing into tools like [Quartz](https://quartz.jzhao.xyz/) in CI
environments such as GitHub Actions.

## Key Features and Limitations

### What it can do

- Synchronize from a remote (currently S3/MinIO only) to a local database (
  SQLite).
- Extract files from the local database to the filesystem.

### What it cannot do (Future Work)

- Synchronization and decryption of encrypted Vaults.
- Uploading to remote (one-way synchronization only).
- Support for remote types other than S3 (e.g., CouchDB).

## Setup

This project uses [Bun](https://bun.sh/) and [mise](https://mise.jdx.dev).

1. Install [mise](https://mise.jdx.dev).
2. Run `mise install` to set up the necessary runtime (Bun).

## Usage

### 1. Synchronize from remote (sync)

Synchronizes remote Vault data to a local SQLite database.

```bash
# Setting environment variables (Recommended)
export OLS_REMOTE__ACCESS_KEY=<your access key>
export OLS_REMOTE__SECRET_KEY=<your secret key>
export OLS_REMOTE__BUCKET=<your bucket name>
export OLS_REMOTE__REGION=<your region>
export OLS_REMOTE__ENDPOINT=<your endpoint>

# Run synchronization
bun run cli sync --database-path .db
```

> [!TIP]
> By caching the `.db` directory in GitHub Actions, you can efficiently fetch
> only the differences.

### 2. Extract files (export)

Extracts files (Markdown, etc.) from the synchronized database.

```bash
bun run cli export --database-path .db --output-path ./vault
```

## Configuration

Settings can be specified via command-line arguments or environment variables.

### Environment Variables

For environment variables, use the `OLS_` prefix, replace hyphens `-` with
underscores `_`, and dots `.` with double underscores `__`.
Example: `--remote.access-key` → `OLS_REMOTE__ACCESS_KEY`

### Key Options

| Option                | Environment Variable     | Description                                          |
|:----------------------|:-------------------------|:-----------------------------------------------------|
| `--database-path`     | `OLS_DATABASE_PATH`      | Destination for the local SQLite database (Required) |
| `--remote.access-key` | `OLS_REMOTE__ACCESS_KEY` | S3 access key                                        |
| `--remote.secret-key` | `OLS_REMOTE__SECRET_KEY` | S3 secret key                                        |
| `--remote.bucket`     | `OLS_REMOTE__BUCKET`     | Bucket name                                          |
| `--remote.region`     | `OLS_REMOTE__REGION`     | Region name                                          |
| `--remote.endpoint`   | `OLS_REMOTE__ENDPOINT`   | Endpoint for S3-compatible storage                   |

Detailed options can be checked with `bun run cli --help`.

## Background and Notes

- **Adoption of Bun:** Initially, I attempted development with Deno, but due to
  compatibility issues between `obsidian-livesync` and Node.js that required
  many patches, I migrated to Bun.
- **fflate limitation:** Due
  to [Issue #25860](https://github.com/oven-sh/bun/issues/25860) in Bun, the
  asynchronous version of `fflate` does not work, so the synchronous version is
  used.

## TODO

- [ ] Create a GitHub Action for extraction.
