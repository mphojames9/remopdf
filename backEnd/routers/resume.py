from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from utils.pdf_generator import create_resume_pdf

router = APIRouter(prefix="/api/resume", tags=["resume"])

class ExportData(BaseModel):
    html_content: str  # We now accept the paginated HTML from React

@router.post("/download")
async def download_resume(data: ExportData):
    try:
        # Pass the HTML string directly to the generator
        file_path = create_resume_pdf(data.html_content) 
        
        return FileResponse(
            path=file_path, 
            filename="Remo_Premium_Resume.pdf", 
            media_type='application/pdf'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))