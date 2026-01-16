"""
Rate Limiting Configuration using SlowAPI

This module provides rate limiting for API endpoints to protect against:
- Brute force attacks on auth endpoints
- Abuse of expensive AI endpoints (Gemini API)
- General API abuse

Note: Currently uses in-memory storage which works with a single worker.
For production with multiple workers, configure Redis storage.
"""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def get_user_identifier(request: Request) -> str:
    """
    Get unique identifier for rate limiting.
    Uses user ID from JWT token if authenticated, otherwise falls back to IP.
    """
    # Try to get user ID from Authorization header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from jose import jwt
            from .config import SECRET_KEY, ALGORITHM
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("id")
            if user_id:
                return f"user:{user_id}"
        except Exception:
            pass
    # Fall back to IP address
    return get_remote_address(request)


# Create limiter with user-based key function
# For production with multiple workers, use Redis:
# limiter = Limiter(key_func=get_user_identifier, storage_uri="redis://localhost:6379")
limiter = Limiter(key_func=get_user_identifier)
