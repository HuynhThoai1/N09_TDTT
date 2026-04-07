from django.db import models

class Node(models.Model):
    name = models.CharField(max_length=100)
    latitude = models.FloatField()
    longitude = models.FloatField()

    def __str__(self):
        return self.name


class Edge(models.Model):
    from_node = models.ForeignKey(
        Node,
        related_name="edges_from",
        on_delete=models.CASCADE
    )

    to_node = models.ForeignKey(
        Node,
        related_name="edges_to",
        on_delete=models.CASCADE
    )

    distance = models.FloatField()

    def __str__(self):
        return f"{self.from_node} -> {self.to_node}"


class POI(models.Model):
    name = models.CharField(max_length=100)

    node = models.ForeignKey(
        Node,
        related_name="pois",
        on_delete=models.CASCADE
    )

    description = models.TextField(blank=True)
    category = models.CharField(max_length=50)

    def __str__(self):
        return self.name