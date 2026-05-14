import os
import psycopg2
import json
from sentence_transformers import SentenceTransformer

def run():
    print("Loading SBERT model...")
    sbert_model = SentenceTransformer("keepitreal/vietnamese-sbert")
    print("Model loaded.")

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
        
        cursor.execute("SELECT id, name, category, description FROM points_of_interest;")
        rows = cursor.fetchall()
        print(f"Found {len(rows)} POIs to index.")
        
        count = 0
        for row in rows:
            poi_id, name, category, description = row
            text = f"{name or ''} {category or ''} {description or ''}"
            
            # encode to list
            vector = sbert_model.encode(text).tolist()
            
            # update db
            cursor.execute(
                "UPDATE points_of_interest SET text_vector = %s WHERE id = %s",
                (json.dumps(vector), poi_id)
            )
            count += 1
            if count % 10 == 0:
                print(f"Indexed {count}/{len(rows)} POIs...")
                
        print(f"Successfully re-indexed {count} POIs.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == '__main__':
    run()
