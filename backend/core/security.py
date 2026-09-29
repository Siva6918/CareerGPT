"""
CareerGPT - Core Security and Rate Limiting
"""
import time
from fastapi import Request, HTTPException
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

# Very simple in-memory rate limiter
# Key: IP address + Endpoint -> List of timestamps
RATE_LIMIT_STORE = defaultdict(list)

def rate_limit(requests: int, window: int):
    """
    Dependency to rate limit endpoints.
    Args:
        requests: max requests allowed in the window
        window: time window in seconds
    """
    async def dependency(request: Request):
        client_ip = request.client.host if request.client else "unknown"
        endpoint = request.url.path
        key = f"{client_ip}:{endpoint}"
        
        now = time.time()
        
        # Clean up old requests
        RATE_LIMIT_STORE[key] = [
            timestamp for timestamp in RATE_LIMIT_STORE[key] 
            if timestamp > now - window
        ]
        
        if len(RATE_LIMIT_STORE[key]) >= requests:
            logger.warning(f"Rate limit exceeded for {client_ip} on {endpoint}")
            raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
            
        RATE_LIMIT_STORE[key].append(now)
        
    return dependency

