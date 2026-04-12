from django.contrib import admin
from .models import PointOfInterest

from django.utils.html import format_html

@admin.register(PointOfInterest)
class PointOfInterestAdmin(admin.ModelAdmin):
    list_display = ('image_tag', 'name', 'category', 'poi_id', 'image_count', 'has_vector')
    search_fields = ('name', 'category', 'poi_id')
    list_filter = ('category',)
    ordering = ('name',)

    def image_count(self, obj):
        return len(obj.image_list) if obj.image_list else 0
    image_count.short_description = 'Số ảnh'

    def has_vector(self, obj):
        return "✅ Có" if obj.vector else "❌ Không"
    has_vector.short_description = 'AI Vector'

    def image_tag(self, obj):
        if obj.image:
            # Tạo tag HTML để hiển thị ảnh nhỏ
            full_url = f"http://localhost:8000/{obj.image.lstrip('/')}"
            return format_html('<img src="{}" style="width: 50px; height: 45px; object-fit: cover; border-radius: 4px;" />', full_url)
        return "No Image"
    image_tag.short_description = 'Preview'
