from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from firebase_admin import auth, credentials, initialize_app
from django.contrib.auth.models import User
import os
from django.conf import settings

# Khởi tạo Firebase Admin một lần duy nhất
import firebase_admin

# Sử dụng module gốc để kiểm tra danh sách ứng dụng đã khởi tạo
if not firebase_admin._apps:
    cred = credentials.Certificate(os.path.join(settings.BASE_DIR, 'serviceAccountKey.json'))
    initialize_app(cred)

class FirebaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None # Không có token thì bỏ qua, để DRF xử lý tiếp

        id_token = auth_header.split(' ').pop()

        try:
            # Nhờ Firebase kiểm tra token
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token.get('uid')
            email = decoded_token.get('email')
        except Exception as e:
            raise AuthenticationFailed(f'Token Firebase không hợp lệ hoặc đã hết hạn: {str(e)}')

        # Nếu hợp lệ, tìm hoặc tạo User trong database Postgres của mình
        user, created = User.objects.get_or_create(username=uid, defaults={'email': email})
        
        # DRF yêu cầu trả về tuple (user, auth)
        return (user, None)