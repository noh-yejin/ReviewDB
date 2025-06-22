from backend.db.connection import get_db_connection
from collections import defaultdict
from fastapi import HTTPException
import os
import requests
from dotenv import load_dotenv
from typing import List, Tuple
import re

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

def fetch_brand_list():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL")
    results = cursor.fetchall()
    conn.close()
    return [row[0] for row in results]

def fetch_brand_overview(brand: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. 제품 수
    cursor.execute("SELECT COUNT(*) FROM products WHERE brand = %s", (brand,))
    product_count = cursor.fetchone()[0]

    # 2. 전체 리뷰 수
    cursor.execute("""
        SELECT COUNT(*) 
        FROM reviews R
        JOIN products P ON R.asin = P.asin
        WHERE p.brand = %s
    """, (brand,))
    review_count = cursor.fetchone()[0]

    # 3. 평균 평점
    cursor.execute("""
        SELECT AVG(R.overall) 
        FROM reviews R
        JOIN products P ON R.asin = P.asin
        WHERE P.brand = %s
    """, (brand,))
    average_rating = cursor.fetchone()[0] or 0.0

    # 4. 리뷰 수 기반 인기 제품 Top 10
    cursor.execute("""
        SELECT P.title, COUNT(R.asin) as review_count
        FROM reviews R
        JOIN products p ON R.asin = P.asin
        WHERE P.brand = %s
        GROUP BY P.title
        ORDER BY review_count DESC
        LIMIT 10
    """, (brand,))
    top_products = [{"name": row[0], "review_count": row[1]} for row in cursor.fetchall()]

    conn.close()
    return {
        "product_count": product_count,
        "review_count": review_count,
        "average_rating": average_rating,
        "top_products": top_products
    }

# 평점 평균, 리뷰 수 제품 목록
def fetch_rating_review_by_brand(brand: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT P.title, 
               AVG(R.overall) AS avg_rating, 
               COUNT(*) AS review_count
        FROM reviews R
        JOIN products P ON R.asin = P.asin
        WHERE P.brand = %s
        GROUP BY P.title
        ORDER BY avg_rating DESC
        LIMIT 10
    """, (brand,))
    result = cursor.fetchall()
    conn.close()
    return [
        {"title": row[0], "avg_rating": float(row[1]), "review_count": row[2]}
        for row in result
    ]

# 재구매 제품 Top 10
def fetch_top_repeat_purchases():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        WITH repeat_reviews AS (
            SELECT reviewerID, asin
            FROM reviews
            GROUP BY reviewerID, asin
            HAVING COUNT(*) > 1
        )
        SELECT 
            r.asin,p.title,COUNT(*) AS repeat_purchase_count,
            COUNT(DISTINCT r.reviewerID) AS unique_repeat_users
        FROM reviews r
        JOIN repeat_reviews rr ON r.reviewerID = rr.reviewerID AND r.asin = rr.asin
        JOIN products p ON r.asin = p.asin
        GROUP BY r.asin, p.title
        ORDER BY repeat_purchase_count DESC
        LIMIT 10
    """)
    result = cursor.fetchall()
    conn.close()
    return [
        {"title": row[1], "repeat_purchase_count": row[2], "unique_users": row[3]}
        for row in result
    ]

# 카테고리 분석

def get_category_competitiveness(brand):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
    SELECT p.category,
           COUNT(r.reviewID) AS review_count,
           ROUND(AVG(r.overall), 2) AS avg_rating,
           ROUND(SUM(CASE WHEN r.reviewerID IN (
               SELECT reviewerID
               FROM reviews
               GROUP BY reviewerID, asin
               HAVING COUNT(*) > 1
           ) THEN 1 ELSE 0 END) * 1.0 / COUNT(r.reviewID), 2) AS repurchase_rate
    FROM products p
    JOIN reviews r ON p.asin = r.asin
    WHERE p.brand = %s
    GROUP BY p.category
    ORDER BY review_count DESC;
    """
    cursor.execute(query, (brand,))
    rows = cursor.fetchall()

    result = []
    for row in rows:
        result.append({
            "category": row[0],
            "review_count": int(row[1]),
            "avg_rating": float(row[2]),
            "repurchase_rate": float(row[3])
        })

    cursor.close()
    conn.close()
    return result
# 제품 목록
def get_product_list_by_brand(brand):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
    SELECT DISTINCT asin, title
    FROM products
    WHERE brand = %s
    ORDER BY title;
    """
    cursor.execute(query, (brand,))
    rows = cursor.fetchall()

    result = [{"asin": row[0], "title": row[1]} for row in rows]

    cursor.close()
    conn.close()
    return result

# 제품 생애 주기 분석
def get_product_lifecycle(asin: str, brand: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
    SELECT 
        YEAR(r.reviewTime) AS year,
        MONTH(r.reviewTime) AS month,
        COUNT(*) AS review_count,
        ROUND(AVG(r.overall), 2) AS avg_rating
    FROM products p
    JOIN reviews r ON p.asin = r.asin
    WHERE p.asin = %s AND p.brand = %s
    GROUP BY year, month
    ORDER BY year, month;
    """

    cursor.execute(query, (asin, brand))
    rows = cursor.fetchall()

    result = [
        {"year": row[0], "month": row[1], "review_count": row[2], "avg_rating": row[3]}
        for row in rows
    ]

    cursor.close()
    conn.close()
    return result


# 재구매자 분석
def fetch_repurchase_distribution(brand: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. 재구매자 vs 비재구매자 수
    cursor.execute("""
        WITH brand_reviews AS (
            SELECT reviewerID, r.asin
            FROM reviews r
            JOIN products p ON r.asin = p.asin
            WHERE p.brand = %s
        ),
        repeat_customers AS (
            SELECT reviewerID
            FROM brand_reviews
            GROUP BY reviewerID
            HAVING COUNT(DISTINCT asin) > 1
        )
        SELECT
            CASE
                WHEN reviewerID IN (SELECT reviewerID FROM repeat_customers)
                THEN '재구매자'
                ELSE '비재구매자'
            END AS customer_type,
            COUNT(DISTINCT reviewerID) AS user_count
        FROM brand_reviews
        GROUP BY customer_type;
    """, (brand,))
    repurchase_counts = [{"type": row[0], "count": int(row[1])} for row in cursor.fetchall()]

    # 2. 재구매자 vs 제품 히트맵용 데이터
    cursor.execute("""
        WITH repeat_customers AS (
            SELECT reviewerID
            FROM reviews r
            JOIN products p ON r.asin = p.asin
            WHERE p.brand = %s
            GROUP BY reviewerID
            HAVING COUNT(DISTINCT p.asin) > 1
        )
        SELECT r.reviewerID, p.title, COUNT(*) as review_count
        FROM reviews r
        JOIN products p ON r.asin = p.asin
        WHERE p.brand = %s
        AND r.reviewerID IN (SELECT reviewerID FROM repeat_customers)
        GROUP BY r.reviewerID, p.title
        ORDER BY r.reviewerID, p.title;
    """, (brand, brand))
    heatmap_data = [{"reviewer": row[0], "product": row[1], "count": row[2]} for row in cursor.fetchall()]

    conn.close()
    return {
        "repurchase_distribution": repurchase_counts,
        "heatmap": heatmap_data
    }


# 평점 1점 리뷰
def fetch_low_rating_reviews(brand: str, rating: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.reviewerID, r.reviewText
        FROM reviews r
        JOIN products p ON r.asin = p.asin
        WHERE p.brand = %s AND r.overall = %s
        LIMIT 30
    """, (brand, rating))
    rows = cursor.fetchall()
    conn.close()
    return [{"user_id": r[0], "text": r[1]} for r in rows]

# 1점 리뷰 텍스트만 추출 (LLM 분석용)
def fetch_low_rating_review_texts(brand: str, rating: int = 1) -> List[str]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.reviewText
        FROM reviews r
        JOIN products p ON r.asin = p.asin
        WHERE p.brand = %s AND r.overall = %s
        LIMIT 30
    """, (brand, rating))
    rows = cursor.fetchall()
    conn.close()
    return [r[0] for r in rows]

# 평점 2점 이하 리뷰가 가장 많은 제품 (user_id 포함)
def fetch_worst_reviewed_product(brand: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.title, r.asin, COUNT(*) as cnt
        FROM reviews r
        JOIN products p ON r.asin = p.asin
        WHERE p.brand = %s AND r.overall <= 2
        GROUP BY r.asin, p.title
        ORDER BY cnt DESC
        LIMIT 1
    """, (brand,))
    row = cursor.fetchone()
    if not row:
        return {}
    title, asin, count = row

    # 리뷰 텍스트 + user_id
    cursor.execute("""
        SELECT reviewerID, reviewText FROM reviews
        WHERE asin = %s AND overall <= 2
        ORDER BY overall ASC
        LIMIT 100
    """, (asin,))
    texts = [{"user_id": r[0], "text": r[1]} for r in cursor.fetchall()]
    conn.close()

    return {
        "product": title,
        "asin": asin,
        "review_count": count,
        "reviews": texts
    }
# 2점 이하 리뷰가 가장 많은 제품의 리뷰 텍스트만 추출 (LLM 분석용)
def fetch_worst_product_review_texts(brand: str) -> Tuple[str, List[str]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.title, r.asin
        FROM reviews r
        JOIN products p ON r.asin = p.asin
        WHERE p.brand = %s AND r.overall <= 2
        GROUP BY r.asin, p.title
        ORDER BY COUNT(*) DESC
        LIMIT 1
    """, (brand,))
    row = cursor.fetchone()
    if not row:
        return "제품 없음", []

    title, asin = row
    cursor.execute("""
        SELECT reviewText FROM reviews
        WHERE asin = %s AND overall <= 2
        ORDER BY overall ASC
        LIMIT 30
    """, (asin,))
    rows = cursor.fetchall()
    conn.close()
    return title, [r[0] for r in rows]

def parse_llm_output(text: str):
    items = []
    blocks = re.split(r"\n\s*\d+\.\s+", text.strip())[1:]  # 번호 기반 분리
    for block in blocks:
        issue_match = re.search(r"불만 유형:\s*(.+)", block)
        example_match = re.search(r"대표 내용 예시:\s*(.+)", block)
        suggestion_match = re.search(r"개선 제안:\s*(.+)", block)

        if issue_match:
            issue = issue_match.group(1).strip()
            example = example_match.group(1).strip() if example_match else "(예시 없음)"
            suggestion = suggestion_match.group(1).strip() if suggestion_match else "(개선 제안 없음)"
            items.append({
                "type": issue,
                "example": example,
                "suggestion": suggestion
            })

    return items


def render_llm_html(parsed_issues):
    html_blocks = []
    for idx, item in enumerate(parsed_issues, start=1):
        block = f"""
        <div class="issue-block" style="margin-bottom: 24px; padding: 16px; background: #f8f9fb; border-left: 5px solid #2f80ed; border-radius: 8px;">
          <h3 style="margin-bottom: 8px; color: #2f80ed;">{idx}. {item['type']}</h3>
          <p><strong>대표 리뷰:</strong> {item['example']}</p>
          <p><strong>개선 제안:</strong> {item['suggestion']}</p>
        </div>
        """
        html_blocks.append(block)
    return "\n".join(html_blocks)


# 리뷰 낮은 평점 불만 클러스터링 및 개선 제안 프롬프트 생성
def generate_cluster_prompt(reviews: List[str]) -> str:
    review_samples = "\n".join(f"- {r}" for r in reviews[:30])
    return f"""
You are an English-speaking assistant analyzing product reviews.

Your job is:
- Group the reviews into up to 7 distinct complaint types.
- For each type, return:
  1. Complaint Type (e.g., "Taste too bitter")
  2. One representative review (quoted)
  3. Improvement Suggestion (clear and short)

⚠️ Output Format (exactly like this):

Complaint Type: [Short phrase]
Representative Review: "..."
Improvement Suggestion: ...

Customer Reviews:
{review_samples}
"""


# LLM 호출
def call_llama_model(prompt):
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    body = {
        "model": "meta-llama/llama-3-8b-instruct",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7
    }

    response = requests.post(url, headers=headers, json=body)
    if response.status_code != 200:
        raise Exception(f"OpenRouter API 오류: {response.status_code} - {response.text}")

    data = response.json()
    return data["choices"][0]["message"]["content"].strip()


# LLM 클러스터링을 위한 프롬프트 생성
def generate_cluster_prompt(reviews: List[str]):
    joined_reviews = "\n".join(f"- {r}" for r in reviews[:30])
    return f"""
다음은 한 브랜드의 낮은 평점(1~2점) 리뷰입니다. 주요 불만 유형별로 아래 형식을 지켜서 정리해주세요.

[포맷 예시]
1. 불만 유형: 맛이 너무 쓰다
   - 대표 내용 예시: "너무 쓰고 텁텁한 맛이 나요."
   - 개선 제안: 단맛을 추가하거나 블렌딩을 개선해주세요.

[리뷰 목록]
{joined_reviews}

❗ 반드시 각 항목을 위 포맷 그대로 출력해주세요. "불만 유형:", "대표 내용 예시:", "개선 제안:" 을 그대로 사용하세요.
"""

# llm API 호출 함수
def call_llama_model(prompt: str) -> str:
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    body = {
        "model": "meta-llama/llama-3-8b-instruct",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7
    }

    response = requests.post(url, headers=headers, json=body)
    if response.status_code != 200:
        raise Exception(f"OpenRouter API 오류: {response.status_code} - {response.text}")

    data = response.json()
    return data["choices"][0]["message"]["content"].strip()
# 계절별 리뷰 수
def fetch_seasonal_review_count(brand: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            COUNT(CASE WHEN SUBSTR(reviewTime,6,2) BETWEEN 3 and 5 THEN reviewTEXT END) AS '봄',
            COUNT(CASE WHEN SUBSTR(reviewTime,6,2) BETWEEN 6 and 8 THEN reviewTEXT END) AS '여름',
            COUNT(CASE WHEN SUBSTR(reviewTime,6,2) BETWEEN 9 and 11 THEN reviewTEXT END) AS '가을',
            COUNT(CASE WHEN SUBSTR(reviewTime,6,2) IN (1,2,12)  THEN reviewTEXT END) AS '겨울'
        FROM reviews R
        JOIN products P ON R.asin=P.asin
        WHERE P.brand=%s;
    """, (brand,)) 
    row = cursor.fetchone()
    conn.close()


    return {
        "봄": row[0],
        "여름": row[1],
        "가을": row[2],
        "겨울": row[3]
    }
# 월별 리뷰 수
def fetch_monthly_review_count(brand: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            MONTH(reviewTime) AS month,
            COUNT(*) AS review_count
        FROM reviews R
        JOIN products P ON R.asin = P.asin
        WHERE P.brand = %s
        GROUP BY MONTH(reviewTime)
        ORDER BY month
    """, (brand,))
    rows = cursor.fetchall()
    conn.close()
    return [
        {"month": row[0], "review_count": row[1]}
        for row in rows
    ]

# 리뷰 수 기반 고객 분류 요약 (충성 고객, 우수 고객, 일반 고객)
from collections import defaultdict
from fastapi import HTTPException

def fetch_customer_segment_classify(brand: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT grouped.reviewerID, grouped.review_count,
        CASE 
            WHEN grouped.review_count >= 10 THEN '충성 고객'
            WHEN grouped.review_count BETWEEN 2 AND 9 THEN '우수 고객'
            ELSE '일반 고객'
        END AS segment
        FROM (
        SELECT r.reviewerID, COUNT(*) AS review_count
        FROM reviews r
        JOIN products p ON r.asin = p.asin
        WHERE p.brand = %s
        GROUP BY r.reviewerID
        ) AS grouped
    """, (brand,))
    rows = cursor.fetchall()
    conn.close()

    # 세그먼트별로 고객 수만 집계
    segment_count = defaultdict(int)
    for _, _, segment in rows:
        segment_count[segment] += 1

    # 항상 네 개 세그먼트를 포함해서 반환 (없는 것도 0으로 처리)
    all_segments = ['충성 고객', '우수 고객', '일반 고객']
    result = [{"segment": seg, "count": segment_count.get(seg, 0)} for seg in all_segments]

    return result


# 세그먼트별 고객 분포
def fetch_customer_distribution(brand: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT grouped.reviewerID, grouped.review_count,
            CASE 
                WHEN grouped.review_count >= 10 THEN '충성 고객'
                WHEN grouped.review_count BETWEEN 2 AND 9 THEN '우수 고객'
                ELSE '일반 고객'
            END AS segment
            FROM (
            SELECT r.reviewerID, COUNT(*) AS review_count
            FROM reviews r
            JOIN products p ON r.asin = p.asin
            WHERE p.brand = %s
            GROUP BY r.reviewerID
            ) AS grouped
        """, (brand,))
        rows = cursor.fetchall() or []

        all_segments = ['충성 고객', '우수 고객', '일반 고객']
        result = {seg: 0 for seg in all_segments}
        for _, _, segment in rows:
            result[segment] += 1

        return [{"segment": seg, "count": result[seg]} for seg in all_segments]

    except Exception as e:
        import traceback
        print("에러 발생:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="내부 서버 오류")

    finally:
        conn.close()
