import os
import json
import requests
from django.core.management.base import BaseCommand
from django.conf import settings
from api.models import PointOfInterest
from icrawler.builtin import BingImageCrawler

class Command(BaseCommand):
    help = 'Crawl POIs from OSM, download images to media, and save directly to Database'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=50, help='Number of POIs to crawl')

    def handle(self, *args, **options):
        limit = options['limit']
        bbox = "10.760,106.685,10.785,106.710" # Quận 1
        
        self.stdout.write("--- 1. Tìm kiếm địa điểm từ OpenStreetMap... ---")
        overpass_url = "http://overpass-api.de/api/interpreter"
        overpass_query = f"""
        [out:json][timeout:25];
        area["name"="Quận 1"]->.searchArea;
        (
          node["tourism"~"attraction|museum|viewpoint|gallery|art_centre"](area.searchArea);
          node["amenity"~"place_of_worship|theatre|cinema|arts_centre"](area.searchArea);
          node["historic"~"monument|memorial"](area.searchArea);
          node["leisure"~"park|garden"](area.searchArea);
          node["shop"="mall"](area.searchArea);
          node["amenity"~"cafe|restaurant"](area.searchArea);
        );
        out body {limit};
        """
        
        try:
            resp = requests.get(overpass_url, params={'data': overpass_query})
            data = resp.json()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Lỗi truy vấn OSM: {e}"))
            return

        elements = data.get('elements', [])
        self.stdout.write(f"Tìm thấy {len(elements)} địa điểm.")

        media_root = settings.MEDIA_ROOT
        locations_dir = os.path.join(media_root, 'locations')
        os.makedirs(locations_dir, exist_ok=True)

        count = 0
        for idx, el in enumerate(elements):
            name = el.get('tags', {}).get('name')
            if not name: continue

            poi_id = f"osm_{el.get('id')}"
            self.stdout.write(f"\n>> Đang xử lý: {name}")

            # 2. Download Images
            save_path = os.path.join(locations_dir, poi_id)
            os.makedirs(save_path, exist_ok=True)
            
            try:
                crawler = BingImageCrawler(storage={'root_dir': save_path}, log_level=50)
                crawler.crawl(keyword=f"{name} Sài Gòn Quận 1", max_num=3)
                
                files = sorted([f for f in os.listdir(save_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
                
                # Build relative media paths
                img_list = [f"media/locations/{poi_id}/{f}" for f in files]
                main_img = img_list[0] if img_list else ""

                # 3. Save to DB
                poi, created = PointOfInterest.objects.update_or_create(
                    poi_id=poi_id,
                    defaults={
                        'name': name,
                        'latitude': el.get('lat'),
                        'longitude': el.get('lon'),
                        'category': el.get('tags', {}).get('amenity') or el.get('tags', {}).get('tourism') or "Place",
                        'image': main_img,
                        'image_list': img_list,
                        'address': el.get('tags', {}).get('addr:full') or "Quận 1, Hồ Chí Minh"
                    }
                )
                
                if created: count += 1
                self.stdout.write(self.style.SUCCESS(f" [OK] Đã lưu {name} vào Database."))
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f" Lỗi khi xử lý {name}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"\n✅ Hoàn thành! Đã thêm mới {count} địa điểm vào Database."))
