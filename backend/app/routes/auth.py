from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import TokenResponse, LoginRequest
from app.auth import create_access_token, verify_password

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "district_id": user.district_id, "station_id": user.station_id}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "role": user.role,
        "district_id": user.district_id,
        "station_id": user.station_id
    }

@router.post("/login-json", response_model=TokenResponse)
def login_json(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Allow overwriting role/district for demo testing from UI dropdown if admin
    role = request.role if (user.role == "DGP" and request.role) else user.role
    district_id = request.district_id if (user.role == "DGP" and request.district_id) else user.district_id
    station_id = user.station_id
    
    access_token = create_access_token(
        data={"sub": user.username, "role": role, "district_id": district_id, "station_id": station_id}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "role": role,
        "district_id": district_id,
        "station_id": station_id
    }

