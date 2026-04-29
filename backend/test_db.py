import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import PointOfInterest
from api.goong_service import goong_distance_matrix

def test():
    print("--- KIỂM TRA HỆ THỐNG ---")
    
    # 1. Kiểm tra DB
    count = PointOfInterest.objects.count()
    print(f"1. Số lượng địa điểm trong CSDL: {count}")
    
    # Kiểm tra Vector AI
    poi_with_vector = PointOfInterest.objects.exclude(vector__isnull=True).exclude(vector='').count()
    print(f"   -> Số lượng địa điểm có Vector AI: {poi_with_vector}")
    
    if poi_with_vector == 0:
        print("   !!! CẢNH BÁO: Dữ liệu của bạn chưa có Vector AI. Tìm kiếm thông minh sẽ không hoạt động.")
    
    # 2. Kiểm tra Goong API Key
    print("2. Kiểm tra Goong API Key...")
    test_coords = "10.7769,106.7009|10.7731,106.7003"
    res = goong_distance_matrix(test_coords, test_coords)
    if res and "rows" in res:
        print("   -> OK: Goong API Key hoạt động tốt!")
    else:
        print(f"   -> LỖI: Goong API Key không trả về dữ liệu! ({res})")

if __name__ == "__main__":
    test()
