"""
utils/security.py — Password hashing and verification
"""

from passlib.context import CryptContext

# bcrypt context — cost factor auto-selected
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """
    Hash a plain-text password using bcrypt.

    Args:
        plain_password: Raw password string.

    Returns:
        Bcrypt hash string.
    """
    return pwd_context.hash(plain_password[:72])  # bcrypt max length is 72 bytes


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against a bcrypt hash.

    Args:
        plain_password: Raw password string.
        hashed_password: Stored bcrypt hash.

    Returns:
        True if match, False otherwise.
    """
    return pwd_context.verify(plain_password[:72], hashed_password)
