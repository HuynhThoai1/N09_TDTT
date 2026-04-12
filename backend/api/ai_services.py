from io import BytesIO
from PIL import Image
from sentence_transformers import SentenceTransformer

_MODEL = None
_MODEL_NAME = 'keepitreal/vietnamese-sbert'
_IMAGE_MODEL = None
_IMAGE_MODEL_NAME = 'clip-ViT-B-32'


def _get_model():
    global _MODEL
    if _MODEL is None:
        _MODEL = SentenceTransformer(_MODEL_NAME)
    return _MODEL


def _get_image_model():
    global _IMAGE_MODEL
    if _IMAGE_MODEL is None:
        _IMAGE_MODEL = SentenceTransformer(_IMAGE_MODEL_NAME)
    return _IMAGE_MODEL


def generate_vector(text: str) -> list:
    """Nhận vào 1 đoạn text và trả về mảng vector (list of floats)."""
    cleaned = (text or '').strip()
    if not cleaned:
        raise ValueError('Text input is empty.')
    
    # Cắt văn bản quá dài để tránh tràn RAM (OOM) hoặc làm treo server
    if len(cleaned) > 2000:
        cleaned = cleaned[:2000]

    try:
        vector = _get_model().encode(cleaned)
    except Exception as exc:
        raise RuntimeError(f'Embedding model is not available: {exc}') from exc

    return vector.tolist()


def generate_image_vector(image_bytes: bytes) -> list:
    """Nhận bytes ảnh và trả về mảng vector embedding (list of floats)."""
    if not image_bytes:
        raise ValueError('Image input is empty.')

    try:
        image = Image.open(BytesIO(image_bytes)).convert('RGB')
    except Exception as exc:
        raise ValueError(f'Invalid image file: {exc}') from exc

    try:
        vector = _get_image_model().encode(image)
    except Exception as exc:
        raise RuntimeError(f'Image embedding model is not available: {exc}') from exc

    return vector.tolist()
