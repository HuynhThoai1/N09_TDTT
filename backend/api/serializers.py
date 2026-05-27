from rest_framework import serializers
from django.conf import settings
from .models import PointOfInterest, VibeTag, UserProfile
from rest_framework import serializers
from .models import UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['username', 'phone', 'birth_year']

# Serializer cho từng thẻ sở thích 
class VibeTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = VibeTag
        fields = ['id', 'category', 'label']

# Serializer để ĐỌC thông tin profile (GET) 
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['phone', 'birth_date', 'vibes'] 
        depth = 1 
    def to_internal_value(self, data):
        # Sao chép và chuyển đổi chuỗi rỗng thành None cho birth_date trước khi validate
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'birth_date' in data and data['birth_date'] == '':
            data['birth_date'] = None
        return super().to_internal_value(data)

    def validate_birth_date(self, value):
        if value == "" or value is None:
            return None
        return value

# Serializer để LƯU lựa chọn vibe của người dùng (POST) 
class UserVibeUpdateSerializer(serializers.Serializer):
    vibe_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=5  
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
        profile.vibes.set(vibe_ids)
        profile.save()
        return profile

class POISerializer(serializers.ModelSerializer):
    class Meta:
        model = PointOfInterest
        fields = '__all__'