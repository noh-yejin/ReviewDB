from backend.db.connection import get_db_connection
from backend.db.queries import get_review_summary

def fetch_review_summary():
    conn = get_db_connection()
    if conn is None:
        return None, "DB 연결 실패"

    cursor = conn.cursor(dictionary=True)
    try:
        head, total = get_review_summary(cursor)
        return {"head": head, "total_reviews": total}, None
    finally:
        cursor.close()
        conn.close()
