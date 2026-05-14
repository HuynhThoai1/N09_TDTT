from django.core.management.base import BaseCommand
from api.models import PointOfInterest
from api.semantic_search import _get_sbert_model
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Re-index text vectors for all POIs using SBERT'

    def handle(self, *args, **kwargs):
        sbert_model = _get_sbert_model()
        if not sbert_model:
            self.stdout.write(self.style.ERROR('SBERT model could not be loaded.'))
            return

        pois = PointOfInterest.objects.all()
        total = pois.count()
        self.stdout.write(self.style.SUCCESS(f'Found {total} POIs to re-index.'))

        count = 0
        for poi in pois:
            # Create a rich text representation for the POI
            text = f"{poi.name} {poi.category or ''} {poi.description or ''}"
            
            try:
                # encode returns a numpy array, we need to convert to list for JSONField
                vector = sbert_model.encode(text).tolist()
                poi.text_vector = vector
                poi.save()
                count += 1
                if count % 10 == 0:
                    self.stdout.write(f'Indexed {count}/{total} POIs...')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error indexing POI {poi.id}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'Successfully re-indexed {count} POIs.'))
