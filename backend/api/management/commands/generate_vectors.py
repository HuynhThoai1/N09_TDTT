import os
from django.core.management.base import BaseCommand
from django.conf import settings
from api.models import PointOfInterest
from pathlib import Path
import PIL.Image

class Command(BaseCommand):
    help = 'Generate AI vectors for POIs based on their images in the media folder'

    def handle(self, *args, **options):
        # 1. Load CLIP Model
        self.stdout.write("Loading CLIP model (clip-ViT-B-32)...")
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer("clip-ViT-B-32")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to load model: {e}"))
            return

        # 2. Get all POIs
        pois = PointOfInterest.objects.all()
        self.stdout.write(f"Processing {pois.count()} locations...")

        media_root = Path(settings.MEDIA_ROOT)
        
        count = 0
        for poi in pois:
            # Check for images in the image_list
            vectors = []
            
            # image_list contain paths like "media/locations/1/000001.jpg"
            # But settings.MEDIA_URL is "/media/"
            # So we need to resolve the local disk path
            for img_rel_path in poi.image_list:
                if not img_rel_path: continue
                
                # Strip "media/" prefix if it exists to join with media_root correctly
                clean_rel_path = img_rel_path.replace("media/", "").lstrip('/')
                img_path = media_root / clean_rel_path
                
                if img_path.exists():
                    try:
                        img = PIL.Image.open(img_path).convert("RGB")
                        vector = model.encode(img, normalize_embeddings=True)
                        vectors.append(vector)
                        self.stdout.write(f"  - {poi.name}: Encoded {img_path.name}")
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f"  - Error encoding {img_path}: {e}"))
            
            if vectors:
                # Average vectors
                import numpy as np
                avg_vec = np.mean(vectors, axis=0)
                # Normalize
                norm = np.linalg.norm(avg_vec)
                if norm > 0:
                    avg_vec = avg_vec / norm
                
                # Save to DB
                poi.vector = avg_vec.tolist()
                poi.save()
                count += 1
                self.stdout.write(self.style.SUCCESS(f"  [OK] Updated vector for {poi.name}"))
            else:
                self.stdout.write(self.style.WARNING(f"  [SKIP] No images found for {poi.name}"))

        self.stdout.write(self.style.SUCCESS(f"Done! Updated {count} locations."))
