from django.core.management.base import BaseCommand
from tours.models import Node, Edge, POI

class Command(BaseCommand):
    help = "Load mock data into database"

    def handle(self, *args, **kwargs):

        # Xóa dữ liệu cũ
        Node.objects.all().delete()
        Edge.objects.all().delete()
        POI.objects.all().delete()

        # Tạo Node
        node1 = Node.objects.create(name="Gate", latitude=10.762, longitude=106.682)
        node2 = Node.objects.create(name="Library", latitude=10.763, longitude=106.683)

        # Tạo Edge
        Edge.objects.create(
            from_node=node1,
            to_node=node2,
            distance=120
        )

        # Tạo POI
        POI.objects.create(
            name="Coffee Shop",
            node=node1,
            description="Nice place to drink coffee",
            category="Cafe"
        )

        self.stdout.write(self.style.SUCCESS("Mock data loaded successfully!"))