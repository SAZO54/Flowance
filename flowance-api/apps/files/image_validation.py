"""Synchronous validation and original-image storage adapter."""

from __future__ import annotations

import hashlib
import warnings
from dataclasses import dataclass
from pathlib import Path

from django.core.files.storage import default_storage
from PIL import Image, UnidentifiedImageError

from apps.common.exceptions import FlowanceError

MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_DIMENSION = 4096
MAX_PIXELS = 16_777_216
CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
FORMAT_EXTENSIONS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}
INPUT_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


class PayloadTooLargeError(FlowanceError):
    code = "PAYLOAD_TOO_LARGE"
    default_message = "画像ファイルは5MB以下にしてください。"
    status_code = 413


class UnsupportedImageTypeError(FlowanceError):
    code = "UNSUPPORTED_MEDIA_TYPE"
    default_message = "JPEG、PNG、WebP画像を指定してください。"
    status_code = 415


class ImageProcessingError(FlowanceError):
    code = "IMAGE_PROCESSING_FAILED"
    default_message = "画像を読み取れません。"
    status_code = 422


class ImageDimensionTooLargeError(FlowanceError):
    code = "IMAGE_DIMENSION_TOO_LARGE"
    default_message = "画像の縦横または総ピクセル数が上限を超えています。"
    status_code = 422


@dataclass(frozen=True, slots=True)
class ValidatedImage:
    extension: str
    content_type: str
    size: int
    checksum: str
    width: int
    height: int


def validate_image(upload) -> ValidatedImage:
    size = upload.size
    if size > MAX_FILE_SIZE:
        raise PayloadTooLargeError()
    if upload.content_type not in CONTENT_TYPES:
        raise UnsupportedImageTypeError()
    if Path(upload.name).suffix.lower() not in INPUT_EXTENSIONS:
        raise UnsupportedImageTypeError()

    try:
        upload.seek(0)
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(upload) as image:
                image_format = image.format
                width, height = image.size
                if getattr(image, "is_animated", False):
                    raise UnsupportedImageTypeError()
                image.verify()
    except UnsupportedImageTypeError:
        raise
    except (
        UnidentifiedImageError,
        OSError,
        SyntaxError,
        Image.DecompressionBombError,
    ) as exc:
        raise ImageProcessingError() from exc
    except Image.DecompressionBombWarning as exc:
        raise ImageDimensionTooLargeError() from exc

    if image_format not in FORMAT_EXTENSIONS:
        raise UnsupportedImageTypeError()
    if width > MAX_DIMENSION or height > MAX_DIMENSION or width * height > MAX_PIXELS:
        raise ImageDimensionTooLargeError()

    upload.seek(0)
    checksum = hashlib.sha256()
    for chunk in upload.chunks():
        checksum.update(chunk)
    upload.seek(0)
    return ValidatedImage(
        extension=FORMAT_EXTENSIONS[image_format],
        content_type=upload.content_type,
        size=size,
        checksum=checksum.hexdigest(),
        width=width,
        height=height,
    )


def save_original(upload, object_key: str) -> str:
    upload.seek(0)
    return default_storage.save(object_key, upload)
