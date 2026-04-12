from sentence_transformers import SentenceTransformer

_MODEL = None
_MODEL_NAME = 'keepitreal/vietnamese-sbert'


def _get_model():
    """Load embedding model lazily to avoid slowing down app startup."""
    global _MODEL
    if _MODEL is None:
        _MODEL = SentenceTransformer(_MODEL_NAME)
    return _MODEL


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
