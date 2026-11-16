/** Recommended per-harness choices. These names stay in each vendor's catalog. */
const NEEDS = ["deep", "standard", "light"];
const PRESETS = {
  claude: {
    deep: { model: "opus", effort: "medium" },
    standard: { model: "sonnet", effort: "medium" },
    light: { model: "haiku", effort: "low" },
  },
  codex: {
    deep: { tier: "sol", effort: "medium" },
    standard: { tier: "luna", effort: "medium" },
    light: { tier: "terra", effort: "low" },
  },
};

function compareVersions(a, b) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const delta = (left[i] ?? 0) - (right[i] ?? 0);
    if (delta) return delta;
  }
  return 0;
}

function codexTiers(models) {
  const found = { sol: [], luna: [], terra: [] };
  for (const model of models ?? []) {
    const match = /^gpt-(\d+(?:\.\d+)*?)-(sol|luna|terra)$/.exec(model?.id ?? "");
    if (!match) continue;
    found[match[2]].push({ ...model, version: match[1] });
  }
  const out = {};
  for (const [tier, items] of Object.entries(found)) {
    items.sort((a, b) => compareVersions(b.version, a.version) || a.id.localeCompare(b.id));
    if (items.length) out[tier] = items[0];
  }
  return out;
}

function resolveRecommended(catalog, harness) {
  if (!Object.hasOwn(PRESETS, harness)) throw new Error(`no recommended model preset for ${harness}`);
  const record = catalog?.harnesses?.[harness];
  const models = record?.status === "discovered" && Array.isArray(record.models) ? record.models : [];
  const byId = new Map(models.map((model) => [model.id, model]));
  const tiers = harness === "codex" ? codexTiers(models) : null;
  const choices = {};
  const unset = [];

  for (const need of NEEDS) {
    const preset = PRESETS[harness][need];
    const model = harness === "codex" ? tiers[preset.tier] : byId.get(preset.model);
    if (!model) {
      const reason = record?.status === "discovered"
        ? harness === "codex" ? `no discovered model matches tier ${preset.tier}` : `recommended model ${preset.model} was not discovered`
        : `model discovery is ${record?.status ?? "unknown"}${record?.reason ? `: ${record.reason}` : ""}`;
      unset.push({ level: need, reason });
      continue;
    }
    const entry = { model: model.id };
    if (model.efforts?.includes(preset.effort)) entry.effort = preset.effort;
    else unset.push({ level: need, field: "effort", reason: `recommended effort ${preset.effort} was not reported for ${model.id}` });
    choices[need] = entry;
  }

  return { harness, choices, unset };
}

/** Apply resolved levels while retaining unresolved choices and agent overrides. */
function applyRecommendedChoices(document, recommendation) {
  const { harness, choices } = recommendation;
  const data = document;
  data.harnesses ??= {};
  const current = data.harnesses[harness] ?? {};
  const next = { ...current };
  const levels = { ...(current.levels ?? {}), ...structuredClone(choices ?? {}) };
  if (Object.keys(levels).length) next.levels = levels;
  else delete next.levels;
  if (Object.keys(next).length) data.harnesses[harness] = next;
  else delete data.harnesses[harness];
  return data;
}

function applyRecommendedForHarness(document, catalog, harness) {
  return applyRecommendedChoices(document, resolveRecommended(catalog, harness));
}

export { NEEDS, PRESETS, compareVersions, codexTiers, resolveRecommended, applyRecommendedChoices, applyRecommendedForHarness };
