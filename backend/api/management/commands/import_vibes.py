import json
from pathlib import Path
from django.core.management.base import BaseCommand
from api.models import VibeTag


class Command(BaseCommand):
    help = "Import dữ liệu thẻ Vibe từ file JSON vào database"

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Xóa toàn bộ VibeTag cũ trước khi import'
        )
        parser.add_argument(
            'json_file',
            nargs='?',
            default='data/vibe_tags_seed.json',
            help='Đường dẫn tới file JSON (mặc định: data/vibe_tags_seed.json)'
        )

    def handle(self, *args, **options):
        json_path = Path(options['json_file'])

        # Kiểm tra file tồn tại
        if not json_path.exists():
            self.stdout.write(self.style.ERROR(f"❌ Không tìm thấy file: {json_path}"))
            return

        # Xóa data cũ nếu có flag --clear
        if options['clear']:
            count = VibeTag.objects.count()
            VibeTag.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"🗑️  Đã xóa {count} VibeTag cũ"))

        # Đọc file JSON
        with open(json_path, encoding='utf-8') as f:
            data = json.load(f)

        # Import từng thẻ
        created = 0
        skipped = 0
        for item in data:
            tag, is_new = VibeTag.objects.get_or_create(
                label=item['label'],          # Không tạo trùng theo label
                defaults={
                    'category':       item['category'],
                    'prompt_keyword': item['prompt_keyword'],
                    'icon':           item.get('icon', ''),
                }
            )
            if is_new:
                created += 1
                self.stdout.write(f"  ✅ Đã thêm: [{tag.get_category_display()}] {tag.label}")
            else:
                skipped += 1
                self.stdout.write(f"  ⏭️  Bỏ qua (đã tồn tại): {tag.label}")

        self.stdout.write(self.style.SUCCESS(
            f"\n🎉 Hoàn tất! Đã tạo {created} thẻ mới, bỏ qua {skipped} thẻ trùng."
        ))