# Amazon Review Data Analysis Web Interface
<p align="center">
<img width="750" alt="Image" src="https://github.com/user-attachments/assets/104c71cd-5b77-4c9a-b8fe-a51cf12bc8da" />
</p>

## 프로젝트 개요
아마존 리뷰 데이터셋(Grocery & Gourmet Food 2018)을 활용하여 브랜드, 제품, 고객 관점에서 리뷰 데이터를 심층 분석하고 시각화하는 웹 기반 시스템입니다.  
고객의 구매 패턴과 제품 성과, 리뷰 내용의 문제점을 체계적으로 파악하여, 제품 개선과 마케팅 전략 수립에 실질적인 인사이트를 제공합니다.

## 주요 기능

### 1) 브랜드 전반 개요 분석
- 브랜드별 제품 수, 전체 리뷰 수, 평균 평점 제공  
- 브랜드별 전반적인 성과를 한눈에 파악 가능

### 2) 제품 중심 분석
- 리뷰 수 기준 인기 제품 Top 10 시각화 & 평점 상위 제품과 리뷰 수 시각화

  <p align="center">
  <img width="390" alt="Image" src="https://github.com/user-attachments/assets/836e3b19-1903-4653-94d5-2c648e8e3737" />
  <img width="390" alt="Image" src="https://github.com/user-attachments/assets/22e9a788-d18b-4faf-b57a-dc43d535b49c" />
  </p>

- 재구매 상위 제품 Top 10 분석 & 카테고리별 평점, 리뷰 수, 재구매율 비교를 통한 경쟁력 분석

  <p align="center">
  <img width="390" alt="Image" src="https://github.com/user-attachments/assets/5110511b-bace-4288-8ac4-16dc16dc7b17" />
  <img width="390" alt="Image" src="https://github.com/user-attachments/assets/936dde40-86d8-4e0b-8c87-bb7e24538b6f" />
  </p>
  
- 제품 생애 주기 분석: 리뷰 수와 평점 추이로 제품 성과 변화 및 이슈 시점 진단

  <p align="center">
  <img width="400" alt="Image" src="https://github.com/user-attachments/assets/acb0a004-cbbc-4fbe-9d0b-6f4a133df190" />
  </p>

### 3) 재구매자 분석
- 재구매자와 비재구매자 수 시각화 & 재구매자와 제품 간 히트맵을 통한 고객 충성도 시각화

  <p align="center">
  <img width="390" alt="Image" src="https://github.com/user-attachments/assets/6767510e-a698-429c-8d4f-ad4b63f852d9" />
  <img width="390" alt="Image" src="https://github.com/user-attachments/assets/d7d26338-e355-4e1d-aa24-674c9391e89d" />
  </p>

### 4) 리뷰 내용 분석
- 평점 1점 리뷰 집중 분석 및 시각화 & LLM을 통한 분석 결과
  
  <p align="center">
  <img width="390" alt="Image" src="https://github.com/user-attachments/assets/6d8d8487-f4ea-44f6-979a-de40a21f54de" />
  <img width="390" alt="Image" src="https://github.com/user-attachments/assets/768b5593-307a-41bf-82eb-3c3f2b8aa959" />
  </p>
  
- 평점 2점 이하 리뷰가 가장 많은 제품 탐색 및 시각화 & LLM을 통한 분석 결과
  <p align="center">
  <img width="390" alt="Image" src="https://github.com/user-attachments/assets/96957e21-f729-43bd-949f-e56fdb03ec15" />
  <img width="390" alt="Image" src="https://github.com/user-attachments/assets/6b093090-f36b-4ac3-8c3c-253accd3b17e" />
  </p>
  
### 5) 시계열 기반 분석
- 계절별, 월별 리뷰 수 추이 시각화
  
  <p align="center">
  <img width="390" alt="Image" src="https://github.com/user-attachments/assets/20bc5934-25fa-4bfa-9415-a95c96ba7568" />
  <img width="390" alt="Image" src="https://github.com/user-attachments/assets/dd12ad89-a248-41f8-bd6a-008adca39ea3" />
  </p>
  
### 6) 고객 유형 분석
- 리뷰 수 기준으로 충성 고객, 우수 고객, 일반 고객으로 세분화
  
  <p align="center">
  <img width="390" alt="Image" src="https://github.com/user-attachments/assets/bf4b997a-1fd8-4312-b855-c14860fd684c" />
  <img width="390" alt="Image" src="https://github.com/user-attachments/assets/6ee85cc8-ddef-4c5f-b128-fa752a49b8c9" />
  </p>
  

## 시스템 구성 및 기술 스택

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

### 4. MySQL 데이터베이스 설정 및 LLM 연결
- backend/db/connection.py 파일에 DB 접속 정보 입력
- .env 파일에 API Key 입력

### 5. 데이터 전처리 및 가공
- processing.ipynb 파일 참고
- reviews, products, users 테이블 생성

### 6. FastAPI 서버 실행
```
uvicorn backend.app:app --reload 
```
