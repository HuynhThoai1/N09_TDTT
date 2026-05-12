import sqlite3

try:
    conn = sqlite3.connect('db.sqlite3')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE points_of_interest ADD COLUMN text_vector TEXT;")
    conn.commit()
    print("Column text_vector added successfully.")
except Exception as e:
    print(f"Error: {e}")
finally:
    if conn:
        conn.close()
