from rest_framework import serializers
from django.conf import settings
from .models import PointOfInterest, VibeTag, UserProfile

# ── 1. Serializer cho từng thẻ sở thích ──────────────────────────────
class VibeTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = VibeTag
        fields = ['id', 'category', 'label']
        # Không expose prompt_keyword ra ngoài — giữ bí mật với frontend

# ── 2. Serializer để ĐỌC thông tin profile (GET) ─────────────────────
class UserProfileSerializer(serializers.ModelSerializer):
    vibes = VibeTagSerializer(many=True, read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['username', 'vibes']

# ── 3. Serializer để LƯU lựa chọn vibe của người dùng (POST) ─────────
class UserVibeUpdateSerializer(serializers.Serializer):
    vibe_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=5  # Tối đa 5 thẻ như yêu cầu
    )

    def validate_vibe_ids(self, value):
        # Kiểm tra tất cả ID có tồn tại trong DB không
        existing_ids = set(VibeTag.objects.filter(id__in=value).values_list('id', flat=True))
        invalid = set(value) - existing_ids
        if invalid:
            raise serializers.ValidationError(f"Các thẻ không hợp lệ: {invalid}")
        return value

    def save(self, user):
        vibe_ids = self.validated_data['vibe_ids']
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.vibes.set(vibe_ids)  # Ghi đè toàn bộ lựa chọn cũ
        profile.save()
        return profile

class POISerializer(serializers.ModelSerializer):
    class Meta:
        model = PointOfInterest
        fields = '__all__'