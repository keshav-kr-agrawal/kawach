from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas import TokenResponse, LoginRequest
from app.auth import create_access_token, get_password_hash, verify_password

router = APIRouter()

# Mock users for Datathon Demo Day
MOCK_USERS = {
    "admin": {
        "password_hash": get_password_hash("admin123"),
        "role": "State Admin",
        "district_id": None
    },
    "district": {
        "password_hash": get_password_hash("district123"),
        "role": "District Head",
        "district_id": 1  # Bengaluru Urban
    },
    "officer": {
        "password_hash": get_password_hash("officer123"),
        "role": "Field Officer",
        "district_id": 1  # Bengaluru Urban
    }
}

@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = MOCK_USERS.get(form_data.username)
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Simple role logic (or read from custom fields in OAuth2 form)
    # We can pass the role in the client scope/client_id, but here we read it directly from the mock database
    access_token = create_access_token(
        data={"sub": form_data.username, "role": user["role"], "district_id": user["district_id"]}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": form_data.username,
        "role": user["role"],
        "district_id": user["district_id"]
    }

@router.post("/login-json", response_model=TokenResponse)
def login_json(request: LoginRequest):
    user = MOCK_USERS.get(request.username)
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token = create_access_token(
        data={"sub": request.username, "role": request.role, "district_id": request.district_id or user["district_id"]}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": request.username,
        "role": request.role,
        "district_id": request.district_id or user["district_id"]
    }
