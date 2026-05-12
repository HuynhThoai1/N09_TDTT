import os
from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        # Chỉ chạy khi server thực sự start (tránh chạy 2 lần khi dùng auto-reload)
        if os.environ.get('RUN_MAIN') == 'true':
            import threading
            def load_models():
                print("[AI-Startup] Đang tiền nạp các model AI (CLIP & SBERT)...")
                try:
                    from .ai_services import _get_model as _ai_get_model
                    from .semantic_search import _get_clip_model, _get_sbert_model
                    _ai_get_model()      # Load SBERT
                    _get_clip_model() # Load CLIP
                    _get_sbert_model() # Load SBERT cho Search
                    print("[AI-Startup] Đã nạp xong tất cả model AI. Sẵn sàng phục vụ!")
                except Exception as e:
                    print(f"[AI-Startup] Lỗi khi nạp model: {e}")

            # Chạy trong thread riêng để không block quá trình start server
            threading.Thread(target=load_models, daemon=True).start()
