import json

log_path = r"C:\Users\new\.gemini\antigravity-ide\brain\f80ec7af-313c-4f9b-8564-a5846ab63470\.system_generated\logs\transcript_full.jsonl"
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        # Search for console logs or errors in the system response
        if data.get("source") == "SYSTEM" and "logs" in str(data.get("content", "")).lower():
            print("FOUND LOG ENTRY:")
            print(str(data.get("content"))[:2000])
            print("---")
        elif "error" in str(data.get("content", "")).lower() and data.get("source") == "SYSTEM":
            print("FOUND ERROR ENTRY:")
            print(str(data.get("content"))[:1000])
            print("---")
