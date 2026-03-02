const loadSqliteBindings = () => {
  const os = process.platform;
  const arch = process.arch;
  const platform = `${os}-${arch}`;

  switch (platform) {
    case "linux-x64":
      return require("../../build/assets/node_sqlite3-linux-x64.node");
    case "linux-arm64":
      return require("../../build/assets/node_sqlite3-linux-arm64.node");
    case "win32-x64":
      return require("../../build/assets/node_sqlite3-win32-x64.node");
    case "win32-ia32":
      return require("../../build/assets/node_sqlite3-win32-ia32.node");
    case "darwin-x64":
      return require("../../build/assets/node_sqlite3-darwin-x64.node");
    case "darwin-arm64":
      return require("../../build/assets/node_sqlite3-darwin-arm64.node");
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
};

module.exports = loadSqliteBindings;
