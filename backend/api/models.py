from django.db import models
<<<<<<< develop_Vu
from .share_utils import generate_share_id
=======
from django.conf import settings
>>>>>>> main

class PointOfInterest(models.Model):
    poi_id = models.CharField(max_length=100, unique=True, db_index=True, null=True, blank=True)
    name = models.CharField(max_length=255, db_index=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    address = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    image = models.CharField(max_length=500, blank=True, null=True)
    image_list = models.JSONField(default=list, blank=True)
    
    # Vector AI (CLIP) de tim kiem thong minh
    # Luu dang JSON cho linh hoat, co the convert sang pgvector sau nay
    vector = models.JSONField(null=True, blank=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'points_of_interest'
        verbose_name = 'Địa danh'
        verbose_name_plural = 'Danh sách địa danh'
<<<<<<< develop_Vu
class SharedRoute(models.Model):
    share_id = models.CharField(max_length=20, unique=True, db_index=True, default=generate_share_id, editable=False)
    route_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    view_count = models.IntegerField(default=0)
    creator_ip = models.CharField(max_length=45, blank=True, null=True)

    def __str__(self):
        return f"Route {self.share_id}"

    class Meta:
        db_table = 'shared_routes'
        verbose_name = 'Đường dẫn chia sẻ'
        verbose_name_plural = 'Danh sách đường dẫn chia sẻ'
        ordering = ['-created_at']
=======

class VibeTag(models.Model):
    CATEGORY_CHOICES = [
        ('khong_gian',  '🌿 Không gian'),
        ('am_thuc',     '🍜 Ẩm thực'),
        ('van_hoa',     '🏛️ Văn hóa & Lịch sử'),
        ('hoat_dong',   '🏃 Hoạt động'),
        ('thoi_gian',   '🕐 Thời điểm'),
    ]

    category        = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    label           = models.CharField(max_length=100)   # Hiển thị cho người dùng
    prompt_keyword  = models.TextField()                 # Bí mật nối vào AI prompt
    icon            = models.CharField(max_length=10, blank=True)  # Emoji icon

    class Meta:
        ordering = ['category', 'label']
        verbose_name = 'Thẻ Vibe'

    def __str__(self):
        return f"[{self.get_category_display()}] {self.label}"


# ── 2. Profile người dùng ─────────────────────────────────────────────
class UserProfile(models.Model):
    user  = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    vibes = models.ManyToManyField(VibeTag, blank=True)

    class Meta:
        verbose_name = 'Hồ sơ người dùng'

    def __str__(self):
        return f"Profile của {self.user.username}"

    def get_prompt_context(self):
        keywords = self.vibes.values_list('prompt_keyword', flat=True)
        if not keywords:
            return ""
        return "Ưu tiên: " + ", ".join(keywords)
>>>>>>> main
