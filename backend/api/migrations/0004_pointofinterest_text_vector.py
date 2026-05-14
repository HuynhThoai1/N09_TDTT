# Generated manually
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_merge_0002_sharedroute_0002_vibetag_userprofile'),
    ]

    operations = [
        migrations.AddField(
            model_name='pointofinterest',
            name='text_vector',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
