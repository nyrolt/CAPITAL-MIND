import uvicorn
from app.config import settings

if __name__ == "__main__":
    print("[*] Starting CapitalMind FastAPI Server")
    print(f"[*] AUTH_MODE: {settings.AUTH_MODE.upper()}")
    print("[*] Listening on http://localhost:8000")
    print("[*] OpenAPI Documentation: http://localhost:8000/docs")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)

