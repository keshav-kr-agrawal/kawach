from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.database import get_db
from app.schemas import TokenResponse, LoginRequest
from app.auth import create_access_token, verify_password
from app.zcql_utils import zcql_rows

router = APIRouter()


def _find_employee(db, username: str) -> dict | None:
    """Employee is Zoho's prescribed personnel table (replaces the old
    standalone User model) — username/hashed_password/role are KAWACH AI
    extension fields tacked onto it (see models.py). Escapes the single
    quote ZCQL uses as a string delimiter before interpolating, since this
    runs unauthenticated (login) and username is fully attacker-controlled."""
    safe_username = username.replace("'", "''")
    rows = zcql_rows(db, "Employee", f"SELECT * FROM Employee WHERE username = '{safe_username}'")
    return rows[0] if rows else None


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    user = _find_employee(db, form_data.username)
    if not user or not user.get("hashed_password") or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    district_id = user.get("DistrictID")
    station_id = user.get("UnitID")
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"], "district_id": district_id, "station_id": station_id}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user["username"],
        "role": user["role"],
        "district_id": district_id,
        "station_id": station_id
    }

@router.post("/login-json", response_model=TokenResponse)
def login_json(request: LoginRequest, db=Depends(get_db)):
    user = _find_employee(db, request.username)
    if not user or not user.get("hashed_password") or not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    # Allow overwriting role/district for demo testing from UI dropdown if admin
    role = request.role if (user["role"] == "DGP" and request.role) else user["role"]
    district_id = request.district_id if (user["role"] == "DGP" and request.district_id) else user.get("DistrictID")
    station_id = user.get("UnitID")

    access_token = create_access_token(
        data={"sub": user["username"], "role": role, "district_id": district_id, "station_id": station_id}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user["username"],
        "role": role,
        "district_id": district_id,
        "station_id": station_id
    }

