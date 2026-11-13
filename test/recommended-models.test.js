import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { renderChangeRows, rowText } from "../bin/change-rows.js";
import { applyRecommendedChoices, compareVersions, resolveRecommended } from "../bin/recommended-models.js";

const model = (id, efforts = ["low", "medium", "high"]) => ({ id, efforts });
const catalog = (harness, models, status = "discovered") => ({ version: 1, harnesses: { [harness]: { status, models } } });

describe("shared change rows", () => {
  test("mixed security block collapses only matching rows and stays within 78 columns at 80 columns", () => {
    const actual = renderChangeRows([
      { label: "security", current: "true", marker: "=", recommended: "true" },
      { label: "sandbox.enabled", current: "false", marker: "->", recommended: "true" },
      { label: "permissions.blockReadsOutsideWorkingDirectories", current: null, marker: "+", recommended: "true" },
    ], { label: "security", security: true, legend: true, limit: 80 });
    assert.equal(actual, [
      "= already recommended; -> replaced; + added; ! no recommendation",
      "security already recommended                     1 rows     =  unchanged",
      "sandbox.enabled                                  false      ->  true",
      "permissions.blockReadsOutsideWorkingDirectories  (not set)  +  true",
    ].join("\n"));
    assert.ok(actual.split("\n").every((line) => line.length <= 78));
  });

  test("an all-matching block becomes one equals line", () => {
    const actual = renderChangeRows([
      { label: "deep", current: "opus/medium", marker: "=", recommended: "opus/medium" },
      { label: "standard", current: "sonnet/medium", marker: "=", recommended: "sonnet/medium" },
    ], { label: "models", legend: true, limit: 80 });
    assert.equal(actual, "= already recommended; -> replaced; + added; ! no recommendation\nmodels  2 rows  =  already recommended");
  });

  test("the longest security key is kept intact in the padded row", () => {
    const actual = rowText({ label: "permissions.blockReadsOutsideWorkingDirectories", current: null, marker: "+", recommended: "true" }, { limit: 80 });
    assert.equal(actual, "permissions.blockReadsOutsideWorkingDirectories  (not set)  +  true");
    assert.ok(actual.length <= 78);
  });

  test("non-terminal rows are one line with no column padding", () => {
    const actual = renderChangeRows([
      { label: "deep", current: "opus", marker: "->", recommended: "sonnet" },
      { label: "light", current: null, marker: "+", recommended: "haiku" },
    ], { padded: false, legend: false });
    assert.equal(actual, "deep  opus  ->  sonnet\nlight  (not set)  +  haiku");
  });

  test("un-padded action rows budget the prefix while preserving marker and recommendation", () => {
    const prefix = "Applying project security: ";
    const actual = rowText({ label: "permissions.blockReadsOutsideWorkingDirectories", current: null, marker: "+", recommended: "true" }, {
      padded: false, limit: 78 - prefix.length,
    });
    assert.ok(`${prefix}${actual}`.length <= 78);
    assert.match(actual, /\s\+\s+true$/);
    assert.match(actual, /^permissions\.blockReadsOutsid\.\.\.\s+\(not set\)\s+\+\s+true$/u);
  });

  test("a missing Codex tier prints a reason row within 78 columns at 80 columns", () => {
    const actual = rowText({ label: "light", current: null, marker: "!", recommended: null, reason: "no discovered model matches tier terra" }, { limit: 80 });
    assert.equal(actual, "light  (not set)  !  (not set) (no discovered model matches tier terra)");
    assert.ok(actual.length <= 78);
  });
});

describe("recommended model resolution", () => {
  test("Recommended Claude levels use discovered aliases and efforts", () => {
    const result = resolveRecommended(catalog("claude", [model("opus", ["low", "medium"]), model("sonnet", ["low", "medium"]), model("haiku", ["low", "medium"])]), "claude");
    assert.deepEqual(result.choices, {
      deep: { model: "opus", effort: "medium" },
      standard: { model: "sonnet", effort: "medium" },
      light: { model: "haiku", effort: "low" },
    });
    assert.deepEqual(result.unset, []);
  });

  test("Recommended value not discovered is reported and left unset", () => {
    const result = resolveRecommended(catalog("claude", [model("sonnet"), model("haiku")]), "claude");
    assert.equal(result.choices.deep, undefined);
    assert.match(result.unset.find((item) => item.level === "deep").reason, /opus was not discovered/);
  });

  test("Codex tiers resolve independently across mixed versions and compare numerically", () => {
    const result = resolveRecommended(catalog("codex", [
      model("gpt-6-sol"), model("gpt-6.1-sol"), model("gpt-6-luna"), model("gpt-6.1-terra"), model("gpt-5.9-terra"),
      model("gpt-99-sol-mini"), model("gpt-7-luna-preview"),
    ]), "codex");
    assert.deepEqual(result.choices, {
      deep: { model: "gpt-6.1-sol", effort: "medium" },
      standard: { model: "gpt-6-luna", effort: "medium" },
      light: { model: "gpt-6.1-terra", effort: "low" },
    });
    assert.equal(compareVersions("6.10", "6.9") > 0, true);
  });

  test("a missing Codex tier is reported without selecting a suffixed id", () => {
    const result = resolveRecommended(catalog("codex", [model("gpt-6-sol"), model("gpt-6-luna"), model("gpt-8-terra-mini")]), "codex");
    assert.equal(result.choices.light, undefined);
    assert.match(result.unset.find((item) => item.level === "light").reason, /tier terra/);
  });

  test("an unsupported recommended effort is left unset while its Codex model remains", () => {
    const result = resolveRecommended(catalog("codex", [model("gpt-6-sol"), model("gpt-6-luna"), model("gpt-6-terra", ["medium", "high"])]), "codex");
    assert.deepEqual(result.choices.light, { model: "gpt-6-terra" });
    assert.match(result.unset.find((item) => item.level === "light").reason, /effort low was not reported/);
  });

  test("applying choices replaces only levels and keeps agent overrides", () => {
    const existing = { version: 1, note: "retained", harnesses: { claude: {
      levels: { deep: { model: "fable" }, standard: { model: "opus", effort: "high" } },
      agents: { quinn: { effort: "xhigh" } },
    } } };
    const recommendation = resolveRecommended(catalog("claude", [model("opus", ["medium"]), model("sonnet", ["medium"]), model("haiku", ["low"])]), "claude");
    applyRecommendedChoices(existing, recommendation);
    assert.equal(existing.note, "retained");
    assert.deepEqual(existing.harnesses.claude.levels, recommendation.choices);
    assert.deepEqual(existing.harnesses.claude.agents, { quinn: { effort: "xhigh" } });
  });

  test("applying partial recommendations preserves saved unresolved levels", () => {
    const existing = { version: 1, harnesses: { claude: {
      levels: {
        deep: { model: "old-opus", effort: "high" },
        standard: { model: "saved-sonnet", effort: "low" },
        light: { model: "saved-haiku", effort: "low" },
      },
    } } };
    const recommendation = resolveRecommended(catalog("claude", [model("opus", ["medium"])]), "claude");
    applyRecommendedChoices(existing, recommendation);
    assert.deepEqual(existing.harnesses.claude.levels, {
      deep: { model: "opus", effort: "medium" },
      standard: { model: "saved-sonnet", effort: "low" },
      light: { model: "saved-haiku", effort: "low" },
    });
  });
});
