from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(
    title="AI Assistant API",
    description="A simple AI Assistant",
    version="0.1.0"
)

@app.get("/health")
async def health():
    return JSONResponse(
        status_code=200,
        content={"status": "healthy"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)