from database.connection import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE roadmap_nodes ADD COLUMN state VARCHAR DEFAULT 'LOCKED';"))
        conn.commit()
        print("Column added successfully.")
    except Exception as e:
        print(f"Error: {e}")
