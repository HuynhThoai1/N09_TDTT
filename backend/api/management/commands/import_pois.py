import json
import os
from django.core.management.base import BaseCommand
from api.models import PointOfInterest

class Command(BaseCommand):
    help = 'Import POI data from a JSON file (standardized format from Colab)'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='Path to the JSON file')
        parser.add_argument('--clear', action='store_true', help='Clear all existing POIs before importing')

    def handle(self, *args, **options):
        json_file = options['json_file']
        clear_existing = options['clear']

        if not os.path.exists(json_file):
            self.stdout.write(self.style.ERROR(f'File {json_file} does not exist.'))
            return

        if clear_existing:
            self.stdout.write(self.style.WARNING('Clearing all existing PointOfInterest records...'))
            PointOfInterest.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Done clearing.'))

        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.stdout.write(f'Importing {len(data)} locations...')
        
        count = 0
        for item in data:
            # Chuyển đổi đường dẫn ảnh từ Colab (/assets/images/...) sang Backend (media/...)
            def fix_path(p):
                if not p: return p
                return p.replace("/assets/images/", "media/")

            poi, created = PointOfInterest.objects.update_or_create(
                poi_id=item.get('poi_id') or item.get('id'),
                defaults={
                    'name': item.get('name'),
                    'latitude': item.get('latitude'),
                    'longitude': item.get('longitude'),
                    'address': item.get('address'),
                    'category': item.get('category'),
                    'description': item.get('description'),
                    'image': fix_path(item.get('image')),
                    'image_list': [fix_path(p) for p in item.get('image_list', [])],
                    'vector': item.get('vector'),
                }
            )
            if created:
                count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully imported {count} new locations ({len(data)} total).'))
