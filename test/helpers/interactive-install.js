/**
 * Runs `main()` in this process with the environment of a CLI test, so a test
 * can answer the install's questions through the menu prompt (a spawned CLI
 * has no terminal and never asks). Output is captured;
 * HOME, PATH, TERM and the working directory are restored afterwards.
 */
import path from "node:path";
import { main } from "../../bin/cli.js";

const KEYS = ["HOME", "USERPROFILE", "XDG_CONFIG_HOME", "PATH", "TERM", "NVM_DIR", "GIT_CONFIG_GLOBAL", "GIT_CONFIG_NOSYSTEM", "CLAUDE_PROJECT_DIR", "CLAUDE_CONFIG_DIR"];

export async function runMain(args, { home, cwd, env = {}, interactive = true, prompt, securityAnswer, confirmAction, choose } = {}) {
  const previousCwd = process.cwd();
  const previous = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  const output = [], questions = [];
  const log = console.log, error = console.error;
  process.chdir(cwd);
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.XDG_CONFIG_HOME = path.join(home, ".config");
  process.env.GIT_CONFIG_GLOBAL = path.join(home, "gitconfig");
  process.env.GIT_CONFIG_NOSYSTEM = "1";
  process.env.TERM = "xterm";
  delete process.env.NVM_DIR;
  delete process.env.CLAUDE_PROJECT_DIR;
  delete process.env.CLAUDE_CONFIG_DIR;
  Object.assign(process.env, env);
  console.log = (...values) => output.push(values.join(" "));
  console.error = (...values) => output.push(values.join(" "));
  try {
    const status = await main([...args, "--verbose"], {
      interactive,
      prompt: prompt && (async (question) => { questions.push(question); return prompt(question); }),
      securityAnswer,
      confirmAction,
      choose,
    });
    return { status, out: output.join("\n"), questions };
  } finally {
    process.chdir(previousCwd);
    for (const key of KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    console.log = log;
    console.error = error;
  }
}
