import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    print(f"[BOOT] Starting KAWACH Police Backend on 0.0.0.0:{port} (PORT env={os.environ.get('PORT')})", flush=True)
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
