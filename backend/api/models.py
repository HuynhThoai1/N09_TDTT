from django.db import models

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
