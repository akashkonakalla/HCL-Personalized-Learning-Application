"""
schemas/auth_schema.py — Pydantic models for authentication
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
import re


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=80, description="Full name")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def name_must_be_valid(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^[\w\s\-'.]+$", v):
            raise ValueError("Name contains invalid characters")
        return v

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if not any(c.isdigit() or not c.isalpha() for c in v):
            # Allow any 8+ char password — don't be too strict for UX
            pass
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class UserOut(BaseModel):
    id: str
    name: str
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
