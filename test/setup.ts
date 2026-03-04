import {$} from "bun";
import {beforeAll, afterAll, beforeEach, afterEach} from "bun:test";

let s3server: Bun.Subprocess;

beforeAll(async () => {
  await $`mise run build`;
  // s3server = Bun.spawn(["mise", "run", "s3:serve"]);
});

afterAll(async () => {
  // s3server.kill()
});
