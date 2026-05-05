from django.db import migrations, models
from api.share_utils import generate_share_id


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='SharedRoute',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('share_id', models.CharField(default=generate_share_id, db_index=True, editable=False, max_length=20, unique=True)),
                ('route_data', models.JSONField()),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('view_count', models.IntegerField(default=0)),
                ('creator_ip', models.CharField(blank=True, max_length=45, null=True)),
            ],
            options={
                'db_table': 'shared_routes',
                'verbose_name': 'Đường dẫn chia sẻ',
                'verbose_name_plural': 'Danh sách đường dẫn chia sẻ',
                'ordering': ['-created_at'],
            },
        ),
    ]
