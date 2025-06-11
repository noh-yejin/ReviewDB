import mysql.connector
from mysql.connector import Error

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host="127.0.0.1",     
            user="root",
            password="root1234",
            database="final_project"
        )
        if connection.is_connected():
            print("MySQL 연결 성공")
            return connection
    except Error as e:
        print(f"MySQL 연결 실패: {e}")
        return None
