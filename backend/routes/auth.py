"""
routes/auth.py — Authentication endpoints
POST /auth/register
POST /auth/login
"""

from fastapi import APIRouter, HTTPException, status

from schemas.auth_schema import RegisterRequest, LoginRequest, TokenResponse, UserOut
from utils.supabase_client import get_supabase
from utils.security import hash_password, verify_password
from utils.jwt_handler import create_access_token

router = APIRouter()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user"
)
async def register(payload: RegisterRequest):
    """
    Create a new user account.

    - Validates email uniqueness
    - Hashes password with bcrypt
    - Returns JWT access token
    """
    db = get_supabase()

    # Check if email already exists
    existing = (
        db.table("users")
          .select("id")
          .eq("email", payload.email.lower())
          .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )

    # Hash password
    password_hash = hash_password(payload.password)

    # Insert user
    result = (
        db.table("users")
          .insert({
              "name":          payload.name.strip(),
              "email":         payload.email.lower(),
              "password_hash": password_hash
          })
          .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create account. Please try again."
        )

    user = result.data[0]

    # Issue token
    token = create_access_token(data={"sub": str(user["id"])})

    return TokenResponse(
        access_token=token,
        user=UserOut(id=str(user["id"]), name=user["name"], email=user["email"])
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email and password"
)
async def login(payload: LoginRequest):
    """
    Authenticate a user.

    - Verifies email and password
    - Returns JWT access token
    """
    db = get_supabase()

    # Fetch user by email
    result = (
        db.table("users")
          .select("id, name, email, password_hash")
          .eq("email", payload.email.lower())
          .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    user = result.data[0]

    # Verify password
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Issue token
    token = create_access_token(data={"sub": str(user["id"])})

    return TokenResponse(
        access_token=token,
        user=UserOut(id=str(user["id"]), name=user["name"], email=user["email"])
    )
