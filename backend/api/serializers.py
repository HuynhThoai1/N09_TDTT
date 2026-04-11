from rest_framework import serializers
from tours.models import POI  

class POISerializer(serializers.ModelSerializer):
    class Meta:
        model = POI
        fields = '__all__'  