import json

log_path = r"C:\Users\new\.gemini\antigravity-ide\brain\f80ec7af-313c-4f9b-8564-a5846ab63470\.system_generated\logs\transcript_full.jsonl"
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        if '"type":"TOOL_RESPONSE"' in line and 'logs' in line.lower():
            try:
                data = json.loads(line)
                content = data.get("content", "")
                if "console" in str(content).lower() or "error" in str(content).lower():
                    print("STEP:", data.get("step_index"))
                    print(json.dumps(content, indent=2)[:1000])
                    print("-----------------------------")
            except Exception as e:
                pass
