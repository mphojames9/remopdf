# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import all your routers here at the top
from routers.editor import router as editor_router
from routers.tools import router as tools_router
from routers import resume  # Your new premium resume router

app = FastAPI(
    title="RemoPDF Backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "status": "online",
        "engine": "PyMuPDF backend active"
    }

# Register all routers HERE, before the server starts
app.include_router(editor_router)
app.include_router(tools_router)
app.include_router(resume.router) 

# Start the server (Only ONE instance of this block at the very bottom)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )