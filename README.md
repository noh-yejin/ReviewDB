# Amazon Review Data Analysis Web Interface

## 프로젝트 개요
아마존 리뷰 데이터셋(Grocery & Gourmet Food 2018)을 활용하여 브랜드, 제품, 고객 관점에서 리뷰 데이터를 심층 분석하고 시각화하는 웹 기반 시스템입니다.  
고객의 구매 패턴과 제품 성과, 리뷰 내용의 문제점을 체계적으로 파악하여, 제품 개선과 마케팅 전략 수립에 실질적인 인사이트를 제공합니다.

## 주요 기능
### 1) 브랜드 전반 개요 분석
- 브랜드별 제품 수, 전체 리뷰 수, 평균 평점 제공  
- 브랜드별 전반적인 성과를 한눈에 파악 가능

### 2) 제품 중심 분석
- 리뷰 수 기준 인기 제품 Top 10 시각화  
- 평점 상위 제품과 리뷰 수를 함께 시각화하여 신뢰도 보완  
- 재구매 상위 제품 Top 10 분석  
- 카테고리별 평점, 리뷰 수, 재구매율 비교를 통한 경쟁력 분석  
- 제품 생애 주기 분석: 리뷰 수와 평점 추이로 제품 성과 변화 및 이슈 시점 진단

### 3) 재구매자 분석
- 재구매자와 비재구매자 수 시각화  
- 재구매자와 제품 간 히트맵을 통한 고객 충성도 시각화

### 4) 리뷰 내용 분석
- 평점 1점 리뷰 집중 분석 및 시각화  
- 평점 2점 이하 리뷰가 가장 많은 제품 탐색 및 시각화  
- LLM 기반 텍스트 분석 (LLaMA-3-8B) 적용:  
  - 리뷰 요약 및 불만 유형 분류  
  - 유형별 개선 방안 제시로 제품/서비스 개선에 활용

### 5) 시계열 기반 분석
- 계절별, 월별 리뷰 수 추이 시각화  
- 특정 시점 리뷰 집중 패턴 파악을 통한 마케팅 타이밍 제안

### 6) 고객 유형 분석
- 리뷰 수 기준으로 충성 고객, 우수 고객, 일반 고객으로 세분화  
- 고객 유형별 파이 차트 시각화 제공

## 시스템 구성 및 기술 스택
## 🧩 시스템 구성 및 기술 스택

| 구성 요소       | 기술 및 라이브러리 |
| --------------- | ------------------ |
| 백엔드          | <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white" height="25"/> |
| 데이터베이스    | <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" height="25"/> |
| LLM 분석        | <img src="https://img.shields.io/badge/LLaMA_3_8B-blue?style=for-the-badge" height="25"/> <img src="https://img.shields.io/badge/OpenRouter-AI-111111?style=for-the-badge" height="25"/> |
| 프론트엔드      | <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" height="25"/> <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" height="25"/> <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" height="25"/> |
| 시각화 라이브러리 | <img src="https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white" height="25"/> <img src="https://img.shields.io/badge/Plotly-3F4F75?style=for-the-badge&logo=plotly&logoColor=white" height="25"/> <img src="https://img.shields.io/badge/Matplotlib-3776AB?style=for-the-badge&logo=python&logoColor=white" height="25"/> |



## 설치 및 실행 방법

### 1. 저장소 클론
```
git clone https://github.com/noh-yejin/ReviewDB.git
cd ReviewDB
```

### 2. 가상환경 생성 및 활성화
```
python -m venv env
source env/bin/activate   # Mac/Linux
# 또는
env\Scripts\activate      # Windows
```

### 3. 의존성 설치
```
pip install -r requirements.txt
```

### 4. MySQL 데이터베이스 설정 및 llm 연결
- backend/db/connection.py 파일에 DB 접속 정보 입력
- .env 파일에 API Key 입력

### 5. 데이터 전처리 및 가공
- processing.ipynb 파일 참고
- reviews, products, users 테이블 생성

### 6. FastAPI 서버 실행
```
uvicorn backend.app:app --reload 
```
