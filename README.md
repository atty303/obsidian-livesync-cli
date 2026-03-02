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

## Installation

Download the latest binary for your architecture from
the [GitHub Releases](https://github.com/atty303/obsidian-livesync-cli/releases).

```bash
# Example: Linux (x64)
curl -L -O https://github.com/atty303/obsidian-livesync-cli/releases/latest/download/obsidian-livesync-cli-linux-x64
chmod +x obsidian-livesync-cli-linux-x64
mv obsidian-livesync-cli-linux-x64 obsidian-livesync-cli
```

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
./obsidian-livesync-cli sync --database-path .db
```

> [!TIP]
> By caching the `.db` directory in GitHub Actions, you can efficiently fetch
> only the differences.

### 2. Extract files (export)

Extracts files (Markdown, etc.) from the synchronized database.

```bash
./obsidian-livesync-cli export --database-path .db --output-path ./vault
```

## Configuration

Settings can be specified via command-line arguments or environment variables.

### Environment Variables

For environment variables, use the `OLS_` prefix, replace hyphens `-` with
underscores `_`, and dots `.` with double underscores `__`.
Example: `--remote.access-key` → `OLS_REMOTE__ACCESS_KEY`

### Key Options

| Option                      | Environment Variable           | Description                                          |
|:----------------------------|:-------------------------------|:-----------------------------------------------------|
| `--database-path`           | `OLS_DATABASE_PATH`            | Destination for the local SQLite database (Required) |
| `--remote.access-key`       | `OLS_REMOTE__ACCESS_KEY`       | S3 access key                                        |
| `--remote.secret-key`       | `OLS_REMOTE__SECRET_KEY`       | S3 secret key                                        |
| `--remote.bucket`           | `OLS_REMOTE__BUCKET`           | Bucket name                                          |
| `--remote.region`           | `OLS_REMOTE__REGION`           | Region name                                          |
| `--remote.endpoint`         | `OLS_REMOTE__ENDPOINT`         | Endpoint for S3-compatible storage                   |
| `--remote.force-path-style` | `OLS_REMOTE__FORCE_PATH_STYLE` | Force path style access (true/false)                 |

Detailed options can be checked with `./obsidian-livesync-cli --help`.

### Use Cloudflare R2 as a remote storage

Cloudflare R2 is a popular S3-compatible storage service. But it needs a
specific configuration to work with `obsidian-livesync-cli`.

1. Create a new bucket
2. Create Account API Token

- Permissions: `Object Read & Write`
- Specify bucket(s): `my-vault-bucket`
- TTL: `Your choice`
- Client IP Address Filtering: `Your choice`

3. Use the token as environment variables:

- **Access Key ID** as `OLS_REMOTE__ACCESS_KEY`
- **Secret Access Key** as `OLS_REMOTE__SECRET_KEY`
- **Use jurisdiction-specific endpoints for S3 clients** as
  `OLS_REMOTE__ENDPOINT`

4. Set additional environment variables:

- `OLS_REMOTE__BUCKET` = `my-vault-bucket`
- `OLS_REMOTE__REGION` = `us-east-1`
- `OLS_REMOTE__FORCE_PATH_STYLE` = `true`

## GitHub Actions

You can use the official GitHub Action to sync and export your Vault in CI
environments.

### `actions/export`

This action performs both `sync` and `export` in a single step. It automatically
downloads the appropriate binary for the runner's OS and architecture.

```yaml
- name: Export Vault
  uses: atty303/obsidian-livesync-cli/actions/export@main
  with:
    # Path to the local SQLite database (default: .db)
    database-path: .db
    # Path to the output directory (default: ./vault)
    output-path: ./vault
    # S3 configuration (can be omitted if env vars are set)
    remote-access-key: ${{ secrets.OLS_ACCESS_KEY }}
    remote-secret-key: ${{ secrets.OLS_SECRET_KEY }}
    remote-bucket: my-vault-bucket
    remote-region: ap-northeast-1
    remote-endpoint: https://s3.amazonaws.com
    # Force path style access (default: false)
    remote-force-path-style: true
```

#### Inputs

| Input                     | Description                                       | Default   | Required |
|:--------------------------|:--------------------------------------------------|:----------|:---------|
| `database-path`           | Path to the local SQLite database                 | `.db`     | Yes      |
| `output-path`             | Path to the output directory                      | `./vault` | Yes      |
| `remote-access-key`       | S3 access key                                     | -         | No       |
| `remote-secret-key`       | S3 secret key                                     | -         | No       |
| `remote-bucket`           | S3 bucket name                                    | -         | No       |
| `remote-region`           | S3 region name                                    | -         | No       |
| `remote-endpoint`         | S3 endpoint URL                                   | -         | No       |
| `remote-force-path-style` | Force path style access                           | `false`   | No       |
| `version`                 | Version of obsidian-livesync-cli (e.g., `v0.1.0`) | `latest`  | Yes      |

#### Example with Caching

To speed up the sync process, it is recommended to cache the database file.

```yaml
- name: Cache database
  uses: actions/cache@v4
  with:
    path: .db
    key: ${{ runner.os }}-ols-db-${{ github.run_id }}
    restore-keys: |
      ${{ runner.os }}-ols-db-

- name: Export Vault
  uses: atty303/obsidian-livesync-cli/actions/export@main
  with:
    remote-access-key: ${{ secrets.OLS_ACCESS_KEY }}
    remote-secret-key: ${{ secrets.OLS_SECRET_KEY }}
    remote-bucket: ${{ secrets.OLS_BUCKET }}
    remote-region: ap-northeast-1
    remote-endpoint: ${{ secrets.OLS_ENDPOINT }}
```

## Development

This project uses [Bun](https://bun.sh/) and [mise](https://mise.jdx.dev).
**mise** is used for toolchain and task management.

1. Install [mise](https://mise.jdx.dev).
2. Run `mise install` to set up the necessary runtime (Bun).
3. Use `mise run <task>` for common development tasks:

- `mise run build`: Build for development.
- `mise run build --compile`: Build standalone binary for supported
  architecture.
- `bun run cli`: Run CLI directly from source.

## Background and Notes

- **Adoption of Bun:** Initially, I attempted development with Deno, but due to
  compatibility issues between `obsidian-livesync` and Node.js that required
  many patches, I migrated to Bun.
- **fflate limitation:** Due
  to [Issue #25860](https://github.com/oven-sh/bun/issues/25860) in Bun, the
  asynchronous version of `fflate` does not work, so the synchronous version is
  used.
