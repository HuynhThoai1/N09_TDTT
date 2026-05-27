import json
import os
from django.core.management.base import BaseCommand
from api.models import PointOfInterest
from api.semantic_search import _get_sbert_model, _get_clip_model

class Command(BaseCommand):
    help = 'Xóa dữ liệu cũ và nạp dữ liệu địa danh từ file JSON, đồng thời tạo Vector AI'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='Đường dẫn tới file JSON dữ liệu')

    def handle(self, *args, **options):
        file_path = options['json_file']
        
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'Không tìm thấy file: {file_path}'))
            return

        # 1. Xóa sạch dữ liệu cũ
        self.stdout.write(self.style.WARNING('Đang xóa dữ liệu cũ...'))
        PointOfInterest.objects.all().delete()

        # 2. Đọc file JSON
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 3. Nạp Model AI để tạo Vector ngay khi nạp
        self.stdout.write('Đang nạp Model AI (SBERT & CLIP)...')
        sbert_model = _get_sbert_model()
        clip_model = _get_clip_model()

        self.stdout.write(f'Bắt đầu nạp {len(data)} địa điểm...')
        
        count = 0
        for item in data:
            try:
                # Tạo object mới hỗ trợ cả hai loại khóa tọa độ và nạp đầy đủ trường
                lat_val = item.get('latitude') if item.get('latitude') is not None else item.get('lat')
                lng_val = item.get('longitude') if item.get('longitude') is not None else item.get('lng')
                
                poi = PointOfInterest(
                    poi_id=item.get('poi_id'),
                    name=item.get('name'),
                    latitude=lat_val,
                    longitude=lng_val,
                    address=item.get('address', ''),
                    category=item.get('category'),
                    description=item.get('description', ''),
                    image=item.get('image', ''),
                    image_list=item.get('image_list', []),
                    rating=item.get('rating', 0.0),
                    user_ratings_total=item.get('reviews') if item.get('reviews') is not None else item.get('user_ratings_total', 0),
                    vector=item.get('vector') # Nhận CLIP vector có sẵn từ JSON
                )

                # Tự động tạo Text Vector (SBERT) nếu chưa có sẵn hoặc cần ghi đè
                if sbert_model and not poi.text_vector:
                    text_context = f"{poi.name} {poi.category} {poi.description}"
                    poi.text_vector = sbert_model.encode(text_context).tolist()
                
                poi.save()
                count += 1
                if count % 10 == 0:
                    self.stdout.write(f'Đã nạp {count}/{len(data)}...')

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Lỗi tại {item.get("name")}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'HOÀN TẤT! Đã nạp thành công {count} địa điểm mới.'))
