from fastapi import FastAPI, Request, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from backend.services.brand_service import (
    fetch_brand_list, fetch_brand_overview, 
    fetch_rating_review_by_brand,
    fetch_top_repeat_purchases,
    fetch_seasonal_review_count, fetch_monthly_review_count,
    fetch_customer_segment_classify,fetch_customer_distribution,
    fetch_worst_reviewed_product,fetch_low_rating_reviews,
    generate_cluster_prompt, call_llama_model,
    fetch_low_rating_review_texts, fetch_worst_product_review_texts, 
    parse_llm_output, render_llm_html,fetch_repurchase_distribution,
    get_category_competitiveness,get_product_lifecycle
)


app = FastAPI()

# 정적 파일 (CSS, JS)을 각각 연결
app.mount("/css", StaticFiles(directory="frontend/css"), name="css")
app.mount("/js", StaticFiles(directory="frontend/js"), name="js")

# HTML 템플릿 경로 설정
templates = Jinja2Templates(directory="frontend/html")


# HTML 페이지 요청 처리
@app.get("/", response_class=HTMLResponse)
def serve_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# 브랜드 목록 API
@app.get("/brands")
def get_brands():
    brands = fetch_brand_list()
    return {"status": "success", "brands": brands}


# 모델 정의
class BrandRequest(BaseModel):
    brand: str
@app.get("/brand/overview")
def brand_overview(brand: str = Query(...)):
    return fetch_brand_overview(brand)

# 평점 평균 top 5 제품 & 리뷰 수  
@app.get("/brand/rating-review-chart")
def get_brand_rating_review_chart(brand: str = Query(...)):
    return fetch_rating_review_by_brand(brand)

# 재구매 제품 Top 10
@app.get("/brand/repeat-top-products")
def get_top_repeat_products():
    return fetch_top_repeat_purchases()

# 카테고리별 경쟁력 분석
@app.get("/brand/category-competitiveness")
async def category_competitiveness(brand: str = Query(...)):
    result = get_category_competitiveness(brand)
    return JSONResponse(content=result)

# 브랜드의 제품 목록
@app.get("/brand/products")
def get_products_by_brand(brand: str):
    from backend.services.brand_service import get_product_list_by_brand
    products = get_product_list_by_brand(brand)
    return JSONResponse(content={"products": products})

# 제품 생애 주기 분석
@app.get("/product/lifecycle")
async def product_lifecycle(asin: str = Query(...), brand: str = Query(...)):
    result = get_product_lifecycle(asin, brand)
    return JSONResponse(content=result)

# 재구매자 분석
@app.get("/brand/repurchase-distribution")
def get_repurchase_distribution(brand: str = Query(...)):
    return fetch_repurchase_distribution(brand)

# 계절별 리뷰 수
@app.get("/brand/seasonal-review")
def get_seasonal_review(brand: str = Query(...)):
    return fetch_seasonal_review_count(brand)

# 월별 리뷰 수
@app.get("/brand/monthly-review")
def get_monthly_review(brand: str = Query(...)):
    return fetch_monthly_review_count(brand)

# 평점 1점 리뷰
@app.get("/brand/low-rating-reviews")
def get_low_rating_reviews(brand: str = Query(...), rating: int = Query(1)):
    return fetch_low_rating_reviews(brand, rating)

# 평점 2점 이하 리뷰가 가장 많은 제품
@app.get("/brand/worst-product")
def get_product_with_most_low_reviews(brand: str = Query(...)):
    return fetch_worst_reviewed_product(brand)

# 평점 1점 리뷰 텍스트

@app.post("/brand/llm-low-rating")
def llm_cluster_for_brand(brand: str = Query(...)):
    reviews = fetch_low_rating_review_texts(brand)
    if not reviews:
        return {"result": "리뷰가 없습니다."}

    prompt = generate_cluster_prompt(reviews)
    raw = call_llama_model(prompt)

    try:
        parsed = parse_llm_output(raw)
        html = render_llm_html(parsed)
        return {"result": html}
    except Exception as e:
        return {"result": "⚠️ LLM 응답을 파싱할 수 없습니다. 응답 포맷을 확인해주세요."}

# 평점 2점 이하 리뷰가 가장 많은 제품 리뷰 텍스트
@app.post("/brand/llm-worst-product")
def llm_worst_product(brand: str = Query(...)):
    title, reviews = fetch_worst_product_review_texts(brand)
    if not reviews:
        return {"product": title, "result": "해당 제품에 리뷰가 부족합니다."}
    prompt = generate_cluster_prompt(reviews)
    result = call_llama_model(prompt)
    return {
        "product": title,
        "result": result
    }

# 리뷰 수 기반 고객 분류 요약 (충성 고객, 우수 고객, 일반 고객)
@app.get("/brand/customer-segment-classify")
def customer_segment_classify(brand: str = Query(...)):
    return fetch_customer_segment_classify(brand)
# 고객 분포 파이차트 분석
@app.get("/brand/customer-distribution")
def get_customer_distribution(brand: str = Query(...)):
    return fetch_customer_distribution(brand)
