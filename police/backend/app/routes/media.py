from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
import boto3
import os
import uuid
import tempfile
from typing import Any
from app.database import get_db

router = APIRouter()

def get_stratus_client():
    access_key = os.getenv("STRATUS_ACCESS_KEY")
    secret_key = os.getenv("STRATUS_SECRET_KEY")
    # Default to the domain provided by the user if not set
    endpoint_url = os.getenv("STRATUS_ENDPOINT_URL", "https://kawachmedia-development.zohostratus.in")
    
    if not access_key or not secret_key:
        raise HTTPException(status_code=500, detail="STRATUS_ACCESS_KEY or STRATUS_SECRET_KEY is missing")
        
    return boto3.client(
        's3',
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        endpoint_url=endpoint_url
    )

def get_stratus_bucket():
    # If the endpoint URL already includes the bucket in Zoho Stratus (e.g. Virtual Hosted),
    # the bucket name might just be empty or extracted from the env.
    return os.getenv("STRATUS_BUCKET_NAME", "kawachmedia-development")

@router.post("/upload")
async def upload_media(file: UploadFile = File(...), db: Any = Depends(get_db)):
    """Uploads a file to Zoho Stratus Object Storage"""
    try:
        s3_client = get_stratus_client()
        bucket = get_stratus_bucket()
        
        # Generate unique object name
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
        object_name = f"uploads/{uuid.uuid4().hex}.{ext}"
        
        # Read file contents and save to temp
        content = await file.read()
        temp_path = os.path.join(tempfile.gettempdir(), file.filename)
        with open(temp_path, "wb") as f:
            f.write(content)
            
        # Upload to Stratus
        s3_client.upload_file(temp_path, bucket, object_name)
        os.remove(temp_path)
        
        # Stratus objects can be public or private. We return the proxy URL.
        base_url = os.getenv("VITE_POLICE_API_URL", "http://localhost:8000")
        
        # Base64 encode the object name so it's safe in the URL path
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
        # Decode the safe object name
        try:
            object_name = base64.urlsafe_b64decode(file_id.encode()).decode()
        except:
            object_name = file_id # fallback if it wasn't encoded (old files)
            
        s3_client = get_stratus_client()
        bucket = get_stratus_bucket()
        
        # Download file to a temp path
        temp_path = os.path.join(tempfile.gettempdir(), f"download_{uuid.uuid4().hex}")
        s3_client.download_file(bucket, object_name, temp_path)
        
        def iterfile():
            with open(temp_path, mode="rb") as file_like:
                yield from file_like
            os.remove(temp_path)

        return StreamingResponse(iterfile(), media_type="application/octet-stream")
        
    except Exception as e:
        print(f"Stratus Download Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
