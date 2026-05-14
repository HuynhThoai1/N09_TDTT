import os
import psycopg2
from urllib.parse import urlparse

# Connect using environment variables like django does
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': os.getenv('DB_NAME', 'n09_tdtt_db'),
#         'USER': os.getenv('DB_USER', 'admin'),
#         'PASSWORD': os.getenv('DB_PASSWORD', 'admin_password'),
#         'HOST': os.getenv('DB_HOST', '127.0.0.1'),
#         'PORT': os.getenv('DB_PORT', '5432'),
#     }
# }

try:
    conn = psycopg2.connect(
        dbname=os.getenv('DB_NAME', 'n09_tdtt_db'),
        user=os.getenv('DB_USER', 'admin'),
        password=os.getenv('DB_PASSWORD', 'admin_password'),
        host=os.getenv('DB_HOST', '127.0.0.1'),
        port=os.getenv('DB_PORT', '5432')
    )
    conn.autocommit = True
    cursor = conn.cursor()
    
    # Try adding the column
    try:
        cursor.execute("ALTER TABLE points_of_interest ADD COLUMN text_vector JSONB;")
        print("Column text_vector added successfully.")
    except psycopg2.errors.DuplicateColumn:
        print("Column text_vector already exists.")
    
    # Fake the django migration
    try:
        cursor.execute("INSERT INTO django_migrations (app, name, applied) VALUES ('api', '0004_pointofinterest_text_vector', NOW());")
        print("Migration recorded.")
    except psycopg2.errors.UniqueViolation:
        print("Migration already recorded.")
        
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals() and conn:
        conn.close()
