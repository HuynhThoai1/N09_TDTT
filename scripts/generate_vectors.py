"""
Script offline: Sinh image vectors cho toàn bộ POIs.
Chay mot lan truoc khi khoi dong app.

Usage:
    python scripts/generate_vectors.py

Yeu cau:
    pip install sentence-transformers Pillow
"""

import json
import os
from pathlib import Path

# --- Duong dan ---
ROOT = Path(__file__).parent.parent
POIS_JSON = ROOT / "database" / "pois_auto_v2.json"
IMAGE_BASE = ROOT / "frontend" / "public" / "assets" / "images" / "locations"
OUTPUT_VECTORS = ROOT / "database" / "poi_vectors.json"

def load_model():
    print("[1/3] Loading CLIP model (clip-ViT-B-32)...")
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("clip-ViT-B-32")
    print("     Model loaded OK.")
    return model

def encode_image(model, image_path: Path):
    """Encode mot anh thanh vector 512 chieu."""
    from PIL import Image
    img = Image.open(image_path).convert("RGB")
    # SentenceTransformer CLIP nhan Image object truc tiep
    vector = model.encode(img, normalize_embeddings=True)
    return vector.tolist()

def average_vectors(vectors: list):
    """Tinh trung binh cong cua nhieu vector (centroid)."""
    if not vectors:
        return None
    n = len(vectors)
    length = len(vectors[0])
    avg = [sum(v[i] for v in vectors) / n for i in range(length)]
    # Normalize lai
    norm = sum(x * x for x in avg) ** 0.5
    if norm == 0:
        return avg
    return [x / norm for x in avg]

def generate_all_vectors():
    print("[2/3] Reading POI list...")
    if not POIS_JSON.exists():
        print(f"ERROR: Khong tim thay {POIS_JSON}")
        print("       Hay chay crawl_poi_images.py truoc.")
        return

    with open(POIS_JSON, "r", encoding="utf-8") as f:
        pois = json.load(f)

    model = load_model()

    print(f"[3/3] Processing {len(pois)} POIs...")
    results = []

    for poi in pois:
        poi_id = str(poi.get("id", ""))
        poi_name = poi.get("name", "")
        img_folder = IMAGE_BASE / poi_id

        vectors = []
        if img_folder.exists():
            img_files = sorted([
                f for f in img_folder.iterdir()
                if f.suffix.lower() in (".jpg", ".jpeg", ".png")
            ])[:3]  # Toi da 3 anh

            for img_file in img_files:
                try:
                    vec = encode_image(model, img_file)
                    vectors.append(vec)
                    print(f"   {poi_name[:30]:<30} -> {img_file.name} OK")
                except Exception as e:
                    print(f"   SKIP {img_file.name}: {e}")

        centroid = average_vectors(vectors) if vectors else None

        results.append({
            "poi_id": poi_id,
            "name": poi_name,
            "latitude": poi.get("latitude"),
            "longitude": poi.get("longitude"),
            "image_list": poi.get("image_list", []),
            "image": poi.get("image", ""),
            "category": poi.get("category", ""),
            "vector": centroid,
            "has_vector": centroid is not None,
        })

    with open(OUTPUT_VECTORS, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    has_vec = sum(1 for r in results if r["has_vector"])
    print(f"\nDONE! {has_vec}/{len(results)} POIs co vector.")
    print(f"Output: {OUTPUT_VECTORS}")

if __name__ == "__main__":
    generate_all_vectors()
