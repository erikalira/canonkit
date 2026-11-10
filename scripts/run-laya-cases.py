"""Runner for Laya MCP eval suite.
Reads plan cases (from evals/laya-plan.json or custom plan),
executes them against laya.mcp.server tools, and writes audit json.
"""
import os
import sys
import json
import time

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS", "1")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

import laya.mcp.server as s
from mcp.server.mcpserver.exceptions import ToolError as McpToolError

TOOL_MAP = {
    "laya_status": lambda args: s.laya_status_tool(),
    "laya_route": lambda args: s.laya_route_tool(**args),
    "laya_predict": lambda args: s.laya_predict_tool(**args),
    "laya_predict_batch": lambda args: s.laya_predict_batch_tool(**args),
    "laya_route_batch": lambda args: s.laya_route_batch_tool(**args),
    "laya_shortlist": lambda args: s.laya_shortlist_tool(**args),
    "laya_tournament": lambda args: s.laya_tournament_tool(**args),
    "laya_preset": lambda args: s.laya_preset_tool(**args),
    "laya_decide": lambda args: s.laya_decide_tool(**args),
    "laya_predict_long": lambda args: s.laya_predict_long_tool(**args),
}

def load_plan(plan_path):
    # Try utf-8 then utf-16
    try:
        with open(plan_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (UnicodeDecodeError, json.JSONDecodeError):
        with open(plan_path, "r", encoding="utf-16") as f:
            return json.load(f)

def run_suite(plan, out_audit_path):
    print(f"Ensuring router (preloading models)...")
    t0 = time.time()
    s._ensure_router()
    print(f"Router ready in {time.time() - t0:.2f}s")

    records = []
    cases = plan["cases"]
    total = len(cases)

    for i, c in enumerate(cases, 1):
        cid = c["id"]
        tool_name = c["tool"]
        args = c.get("args", {})
        print(f"[{i}/{total}] Running {cid} ({tool_name})...")

        fn = TOOL_MAP.get(tool_name)
        if not fn:
            records.append({
                "id": cid,
                "tool": tool_name,
                "status": "UNAVAILABLE",
                "error": f"Tool {tool_name} not found in runner map",
            })
            continue

        try:
            raw_result = fn(args)
            result = json.loads(raw_result)
            records.append({
                "id": cid,
                "tool": tool_name,
                "status": "CALLED",
                "result": result,
            })
        except McpToolError as exc:
            err_text = str(exc)
            try:
                err_data = json.loads(err_text)
                err_msg = err_data.get("message", err_text)
            except Exception:
                err_msg = err_text
            records.append({
                "id": cid,
                "tool": tool_name,
                "status": "FAILED",
                "error": err_msg,
            })
        except Exception as exc:
            records.append({
                "id": cid,
                "tool": tool_name,
                "status": "FAILED",
                "error": str(exc),
            })

    # Environment block from laya_status
    status_raw = s.laya_status_tool()
    status_data = json.loads(status_raw)
    pkg = status_data.get("package_versions", {})
    environment = {
        "laya": pkg.get("laya", "unknown"),
        "torch": pkg.get("torch", "unknown"),
        "device": status_data.get("device", "cpu"),
        "checkpoints": status_data.get("loaded", []),
    }

    audit = {
        "suite_version": 1,
        "environment": environment,
        "records": records,
    }

    with open(out_audit_path, "w", encoding="utf-8") as f:
        json.dump(audit, f, indent=2, ensure_ascii=False)
    print(f"Audit written to {out_audit_path} ({len(records)} records)")

if __name__ == "__main__":
    plan_file = sys.argv[1] if len(sys.argv) > 1 else "evals/laya-plan.json"
    audit_file = sys.argv[2] if len(sys.argv) > 2 else "evals/audits/laya-audit-2026-11-09-rerun.json"
    p = load_plan(plan_file)
    run_suite(p, audit_file)
