# Agent Guide for obsidian-livesync-cli

This document provides essential information for AI agents working on this project.

## Overview
`obsidian-livesync-cli` is a CLI tool for [obsidian-livesync](https://github.com/vrtmrz/obsidian-livesync). Its primary goal is to extract a Vault from remote (S3/MinIO) storage, mainly for importing into tools like [Quartz](https://quartz.jzhao.xyz/) in CI environments such as GitHub Actions.

## Tech Stack
- **Runtime:** [Bun](https://bun.sh/)
- **Language:** TypeScript
- **CLI Framework:** [yargs](https://yargs.js.org/)
- **Storage:** SQLite (local database for synchronization)
- **Environment Manager:** [mise](https://mise.jdx.dev)

## Directory Structure
- `src/`: Core source code.
  - `cli.ts`: Entry point for the CLI. Handles command-line arguments and environment variables via `yargs`.
  - `mod.ts`: Core logic for synchronization and file extraction.
- `vendor/obsidian-livesync/`: The `obsidian-livesync` project included as a **git submodule**. Do not modify files in this directory unless absolutely necessary.
- `build.ts`: Build script for the project.

## Development Constraints & Guidelines
- **fflate Limitation:** Due to [Issue #25860](https://github.com/oven-sh/bun/issues/25860) in Bun, the **asynchronous version of `fflate` does not work**. Always use the **synchronous version**.
- **Bun Preference:** This project was migrated from Deno because of compatibility issues between `obsidian-livesync` and Node.js. Maintain compatibility with Bun.
- **Vendor Policy:** `vendor/obsidian-livesync/` is a git submodule. **Avoid patching or modifying files in `vendor/`** as much as possible. Aim to run the CLI by using other wrappers instead of direct modification. Changes to `vendor/` are only permitted when there is absolutely no other way to achieve the goal.
- **Environment Variables:**
  - Prefix: `OLS_`
  - Mapping: Replace hyphens `-` with underscores `_`, and dots `.` with double underscores `__` (e.g., `--remote.access-key` → `OLS_REMOTE__ACCESS_KEY`).
  - Use `yargs().env("OLS")` for automatic mapping.
- **Task Management:**
  - Use **[mise](https://mise.jdx.dev)** for all tools and general task management.
  - Tasks that directly execute `bun` (e.g., `bun run build.ts`) can be defined in `package.json` scripts.
  - For all other tasks or complex workflows, always use `mise` (see `.mise.toml`).

## Key Concepts
- **Sync:** Fetches metadata and data from remote storage (S3/MinIO) and stores it in a local SQLite database (`.db` directory by default).
- **Export:** Extracts files (Markdown, images, etc.) from the local SQLite database to the local filesystem.

## How to Contribute
1.  **Adding a Command/Option:** Modify `src/cli.ts`. Ensure that new options are documented in both the `README.md` and the `yargs` configuration.
2.  **Updating Logic:** Modify `src/mod.ts`. Ensure that any changes respect the synchronization logic of `obsidian-livesync`.
3.  **Handling `obsidian-livesync`:** If changes are needed in the core sync logic, prioritize using wrappers or overriding behavior without modifying the vendor files. Avoid direct modifications to `vendor/obsidian-livesync/` unless it is an unavoidable case.
