/**
 * Test preload: makes /proc/self/mounts read as the text in CANONKIT_TEST_MOUNTS,
 * so a CLI run on any Linux box sees a fake Windows drive (a tmpdir). Loaded as
 * a node argument (see runCli `preload`), never through NODE_OPTIONS.
 */
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";

const real = fs.readFileSync;
fs.readFileSync = function (file, ...rest) {
  if (file === "/proc/self/mounts" && process.env.CANONKIT_TEST_MOUNTS !== undefined) return process.env.CANONKIT_TEST_MOUNTS;
  return real.call(this, file, ...rest);
};
syncBuiltinESMExports();
