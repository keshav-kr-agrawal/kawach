from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
import zcatalyst_sdk
import os
import tempfile
from typing import Any
from app.database import get_db

router = APIRouter()

@router.post("/upload")
async def upload_media(file: UploadFile = File(...), db: Any = Depends(get_db)):
    """Uploads a file to Zoho Catalyst File Store"""
    if not db:
        raise HTTPException(status_code=500, detail="Catalyst Data Store not initialized")

    folder_id = os.getenv("ZOHO_FOLDER_ID")
    if not folder_id:
        raise HTTPException(status_code=500, detail="ZOHO_FOLDER_ID environment variable is missing")

    try:
        app = zcatalyst_sdk.initialize()
        filestore = app.filestore()
        folder = filestore.folder(folder_id)

        content = await file.read()
        
        # Write to temporary file for SDK upload
        temp_path = os.path.join(tempfile.gettempdir(), file.filename)
        with open(temp_path, "wb") as f:
            f.write(content)
            
        uploaded_file = folder.upload_file(temp_path)
        os.remove(temp_path)
        
        file_id = uploaded_file.get('id')
        
        # Return a proxy URL to fetch the file through our backend
        # This guarantees it works even if the Zoho folder isn't fully public
        base_url = os.getenv("VITE_POLICE_API_URL", "http://localhost:8000")
        return {"url": f"{base_url}/media/download/{file_id}", "file_id": file_id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{file_id}")
async def download_media(file_id: str, db: Any = Depends(get_db)):
    """Proxies the media download from Zoho Catalyst File Store"""
    if not db:
        raise HTTPException(status_code=500, detail="Catalyst Data Store not initialized")

    folder_id = os.getenv("ZOHO_FOLDER_ID")
    if not folder_id:
        raise HTTPException(status_code=500, detail="ZOHO_FOLDER_ID environment variable is missing")

    try:
        app = zcatalyst_sdk.initialize()
        filestore = app.filestore()
        folder = filestore.folder(folder_id)
        file_obj = folder.file(file_id)
        
        # Download file to a temp path
        temp_path = os.path.join(tempfile.gettempdir(), f"download_{file_id}")
        file_obj.download(temp_path)
        
        def iterfile():
            with open(temp_path, mode="rb") as file_like:
                yield from file_like
            os.remove(temp_path)

        return StreamingResponse(iterfile(), media_type="application/octet-stream")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
