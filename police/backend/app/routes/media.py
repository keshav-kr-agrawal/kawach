from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
import zcatalyst_sdk
import os
import uuid
import tempfile
from typing import Any
from app.database import get_db

router = APIRouter()

def get_stratus_bucket():
    # Provide the bucket name you created in the Catalyst console
    return os.getenv("STRATUS_BUCKET_NAME", "kawachmedia-development")

@router.post("/upload")
async def upload_media(file: UploadFile = File(...), db: Any = Depends(get_db)):
    """Uploads a file to Zoho Stratus Object Storage"""
    try:
        app = zcatalyst_sdk.initialize()
        stratus = app.stratus()
        bucket = stratus.bucket(get_stratus_bucket())
        
        # Generate unique object name
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
        object_name = f"uploads/{uuid.uuid4().hex}.{ext}"
        
        content = await file.read()
        temp_path = os.path.join(tempfile.gettempdir(), file.filename)
        with open(temp_path, "wb") as f:
            f.write(content)
            
        # Upload to Stratus using SDK
        with open(temp_path, "rb") as f:
            bucket.put_object(object_name, f)
            
        os.remove(temp_path)
        
        # Return proxy URL
        base_url = os.getenv("VITE_POLICE_API_URL", "http://localhost:8000")
        
        import base64
        safe_id = base64.urlsafe_b64encode(object_name.encode()).decode()
        
        return {"url": f"{base_url}/media/download/{safe_id}", "file_id": object_name}
        
    except Exception as e:
        print(f"Stratus Upload Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{file_id}")
async def download_media(file_id: str, db: Any = Depends(get_db)):
    """Proxies the media download from Zoho Stratus"""
    try:
        import base64
        try:
            object_name = base64.urlsafe_b64decode(file_id.encode()).decode()
        except:
            object_name = file_id 
            
        app = zcatalyst_sdk.initialize()
        stratus = app.stratus()
        bucket = stratus.bucket(get_stratus_bucket())
        
        temp_path = os.path.join(tempfile.gettempdir(), f"download_{uuid.uuid4().hex}")
        # Download object from Stratus
        bucket.get_object(object_name, temp_path)
        
        def iterfile():
            with open(temp_path, mode="rb") as file_like:
                yield from file_like
            os.remove(temp_path)

        return StreamingResponse(iterfile(), media_type="application/octet-stream")
        
    except Exception as e:
        print(f"Stratus Download Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
