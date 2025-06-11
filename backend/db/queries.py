def get_review_summary(cursor):
    cursor.execute("SELECT * FROM Reviews LIMIT 5")
    head = cursor.fetchall()

    cursor.execute("SELECT COUNT(*) AS total FROM Reviews")
    total = cursor.fetchone()["total"]

    return head, total

