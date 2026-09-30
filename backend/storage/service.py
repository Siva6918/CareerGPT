"""
CareerGPT - Persistent Storage Service
Supports Supabase Private Storage Buckets with Local Disk fallback.
"""
import os
import logging
from typing import Optional, Tuple
from config import settings

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self.provider = settings.storage_provider
        self.supabase_url = settings.supabase_url
        self.supabase_key = settings.supabase_secret_key
        self._supabase_client = None

    @property
    def client(self):
        if self._supabase_client is None and self.supabase_url and self.supabase_key:
            try:
                from supabase import create_client
                self._supabase_client = create_client(self.supabase_url, self.supabase_key)
            except Exception as e:
                logger.error(f"Failed to initialize Supabase storage client: {e}")
        return self._supabase_client

    def upload_file(
        self,
        bucket: str,
        path: str,
        file_bytes: bytes,
        content_type: str = "application/octet-stream"
    ) -> Tuple[bool, str]:
        """
        Upload a file to persistent storage.
        Returns: (success: bool, url_or_path: str)
        """
        # 1. Try Supabase Storage if configured
        if self.provider == "supabase" and self.client:
            try:
                # Ensure bucket exists
                res = self.client.storage.from_(bucket).upload(
                    path=path,
                    file=file_bytes,
                    file_options={"content-type": content_type, "upsert": "true"}
                )
                logger.info(f"Successfully uploaded {path} to Supabase bucket '{bucket}'")
                return True, f"supabase://{bucket}/{path}"
            except Exception as e:
                logger.error(f"Supabase upload error for {bucket}/{path}: {e}")
                # If Supabase fails, fall back to local disk so user is not blocked
        
        # 2. Local fallback storage
        local_dir = os.path.join(settings.upload_dir, bucket)
        os.makedirs(local_dir, exist_ok=True)
        # Create safe local path
        safe_filename = path.replace("/", "_").replace("\\", "_")
        local_path = os.path.join(local_dir, safe_filename)
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        logger.info(f"Stored file locally at {local_path}")
        return True, local_path

    def get_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> Optional[str]:
        """
        Get a secure, short-lived signed URL for a private file in Supabase storage.
        """
        if self.provider == "supabase" and self.client:
            try:
                res = self.client.storage.from_(bucket).create_signed_url(path, expires_in=expires_in)
                if isinstance(res, dict) and "signedURL" in res:
                    return res["signedURL"]
                elif hasattr(res, "signed_url"):
                    return res.signed_url
                return str(res)
            except Exception as e:
                logger.error(f"Failed to generate signed URL for {bucket}/{path}: {e}")
        return None

    def download_file(self, bucket: str, path: str) -> Optional[bytes]:
        """
        Download bytes of a stored file.
        """
        if self.provider == "supabase" and self.client:
            try:
                return self.client.storage.from_(bucket).download(path)
            except Exception as e:
                logger.error(f"Failed to download from Supabase {bucket}/{path}: {e}")

        # Local fallback
        local_dir = os.path.join(settings.upload_dir, bucket)
        safe_filename = path.replace("/", "_").replace("\\", "_")
        local_path = os.path.join(local_dir, safe_filename)
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                return f.read()
        return None


# Global singleton instance
storage_service = StorageService()
