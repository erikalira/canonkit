/**
 * Test preload: makes lstat report the paths listed in CANONKIT_TEST_NULLDEV
 * (comma-separated absolute paths) as a character device 1:3 (rdev 259, size 0),
 * the way the Claude Code sandbox's /dev/null bind looks, so the guard wiring can
 * be exercised where bwrap cannot run. Only paths that really exist are faked;
 * everything else is untouched. Loaded as a node argument (see runCli `preload`),
 * never through NODE_OPTIONS.
 */
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";

const marked = () => new Set((process.env.CANONKIT_TEST_NULLDEV ?? "").split(",").filter(Boolean));
const fake = (real) => Object.assign(Object.create(Object.getPrototypeOf(real)), real, {
  rdev: 259, size: 0, isCharacterDevice: () => true, isFile: () => false, isDirectory: () => false, isSymbolicLink: () => false,
});
const wrap = (file, st) => (typeof file === "string" && marked().has(file) ? fake(st) : st);

const lstatSync = fs.lstatSync;
fs.lstatSync = function (file, ...rest) {
  const st = lstatSync.call(this, file, ...rest);
  return st && typeof st === "object" ? wrap(file, st) : st;
};
const lstat = fs.promises.lstat;
fs.promises.lstat = async function (file, ...rest) { return wrap(file, await lstat.call(this, file, ...rest)); };
syncBuiltinESMExports();
