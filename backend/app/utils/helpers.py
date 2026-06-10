import os
import uuid
import logging
from datetime import date, datetime, timedelta
from pathlib import Path
from app.config import settings

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


def get_nearest_past_saturday(d: date = None) -> date:
    d = d or date.today()
    days_since_saturday = (d.weekday() - 5) % 7
    return d - timedelta(days=days_since_saturday)


def get_upload_path(dept_code: str, weekend_date: date) -> Path:
    year = str(weekend_date.year)
    date_str = weekend_date.strftime("%Y-%m-%d")
    path = Path(settings.UPLOAD_DIR) / "departments" / dept_code / year / date_str
    path.mkdir(parents=True, exist_ok=True)
    return path


def generate_filename(original: str) -> str:
    ext = Path(original).suffix.lower()
    return f"{uuid.uuid4().hex}{ext}"


def validate_image_file(content_type: str, filename: str, size: int) -> None:
    ext = Path(filename).suffix.lower()
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024

    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError(f"Content type not allowed: {content_type}")
    if size > max_bytes:
        raise ValueError(f"File too large. Max size: {settings.MAX_FILE_SIZE_MB}MB")


def format_file_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
