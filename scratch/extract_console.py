import json
import sys

log_path = r"C:\Users\new\.gemini\antigravity-ide\brain\f80ec7af-313c-4f9b-8564-a5846ab63470\.system_generated\logs\transcript_full.jsonl"
out_path = r"C:\Users\new\OneDrive\Documents\solarflow-manager-main\solarflow-manager-main\scratch\console_output.txt"

with open(log_path, 'r', encoding='utf-8') as f, open(out_path, 'w', encoding='utf-8') as out:
    for line in f:
        data = json.loads(line)
        if "capture_browser_console_logs" in line:
            out.write("STEP INDEX: " + str(data.get("step_index")) + "\n")
            out.write(json.dumps(data, indent=2) + "\n")
            out.write("=========================================\n")
print("Done extracting to scratch/console_output.txt")
