document.addEventListener("DOMContentLoaded", () => {
  let selectedBrand = null;


  // 1. 브랜드 목록 불러오기
  fetch("/brands")
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        const select = document.getElementById("brand-select");
        data.brands.forEach(brand => {
          const option = document.createElement("option");
          option.value = brand;
          option.textContent = brand;
          select.appendChild(option);
        });
      }
    });

  // 2. 선택된 브랜드 저장
  document.getElementById("brand-select").addEventListener("change", (e) => {
    selectedBrand = e.target.value;
  });

});

let topProductsChart; // 전역 변수로 선언

document.getElementById("brand-select").addEventListener("change", async (e) => {
  const selectedBrand = e.target.value;

  try {
    const response = await fetch(`/brand/overview?brand=${encodeURIComponent(selectedBrand)}`);
    const data = await response.json();

    // KPI 업데이트
    document.getElementById("product-count").textContent = data.product_count ?? 0;
    document.getElementById("review-count").textContent = data.review_count ?? 0;
    document.getElementById("average-rating").textContent = (data.average_rating ?? 0).toFixed(1);

    // Top 5 인기 제품 그래프 업데이트
    const ctx = document.getElementById("top-products-chart").getContext("2d");

    const labels = data.top_products.map(item => item.name);
    const values = data.top_products.map(item => item.review_count);

    if (topProductsChart) topProductsChart.destroy(); // 기존 차트 제거
    topProductsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: '리뷰 수',
          data: values,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          barThickness: 30 // 막대 두께 조절
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // 크기 비율 고정 해제
        plugins: {
          legend: { display: false },
          title: { display: true, text: '리뷰 수 기반 인기 제품 Top 10' }
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 45, // X축 텍스트 회전
              minRotation: 45,
              font: { size: 10 },
              callback: function(value, index) {
                let label = this.getLabelForValue(value);
                return label.length > 20 ? label.substring(0, 20) + '…' : label; // 긴 이름 줄이기
              }
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 100
            },
            title: { display: true, text: "리뷰 수" }

          }
        }
      }
    });
    updateCharts(selectedBrand);
    renderTimeSeriesCharts(selectedBrand);
    renderCustomerSegmentChart(selectedBrand);
    renderCustomerDistributionPie(selectedBrand);

    await fetchLowRatingReviews(selectedBrand);
    await fetchWorstProductReviews(selectedBrand);
    await renderLLMCluster(selectedBrand);


  } catch (error) {
    console.error("브랜드 개요 로드 실패:", error);
  }
});

async function updateCharts(brand) {
  const ratingReviewRes = await fetch(`/brand/rating-review-chart?brand=${brand}`);
  const ratingReviewData = await ratingReviewRes.json();

  const repeatRes = await fetch(`/brand/repeat-top-products`);
  const repeatData = await repeatRes.json();

  renderRatingReviewChart(ratingReviewData);
  renderRepeatChart(repeatData);
}
let ratingReviewChartInstance;
let repeatChartInstance;

function renderRatingReviewChart(data) {
  const titles = data.map(d => d.title);
  const ratings = data.map(d => d.avg_rating);
  const reviews = data.map(d => d.review_count);

  if (ratingReviewChartInstance) ratingReviewChartInstance.destroy();

  const ctx = document.getElementById("ratingReviewChart").getContext("2d");
  ratingReviewChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: titles,
      datasets: [
        {
          label: "평균 평점",
          data: ratings,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          yAxisID: "y1"
        },
        {
          label: "리뷰 수",
          data: reviews,
          backgroundColor: "rgba(255, 99, 132, 0.6)",
          yAxisID: "y2"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: "평점 및 리뷰 수" },
        legend: { position: "top" }
      },
      scales: {
        x: {
          ticks: {
            font: { size: 10 },
            maxRotation: 45,
            minRotation: 45,
            callback: function(value) {
              let label = this.getLabelForValue(value);
              return label.length > 20 ? label.substring(0, 20) + "…" : label;
            }
          }
        },
        y1: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          max: 5,
          title: { display: true, text: "평균 평점" }
        },
        y2: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          title: { display: true, text: "리뷰 수" },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}
document.getElementById("lowRatingSection").classList.add("visible");

// 평점 1점 리뷰 불러오기
async function fetchLowRatingReviews(brand) {
  const res = await fetch(`/brand/low-rating-reviews?brand=${encodeURIComponent(brand)}`);
  const data = await res.json();

  const tbody = document.querySelector("#lowRatingReviewsTable tbody");
  tbody.innerHTML = "";

  data.forEach((review) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${review.user_id}</td><td>${review.text}</td>`;
    tbody.appendChild(row);
  });
}

// 평점 2점 이하 리뷰가 가장 많은 제품
async function fetchWorstProductReviews(brand) {
  const res = await fetch(`/brand/worst-product?brand=${encodeURIComponent(brand)}`);
  const data = await res.json();

  document.getElementById("worstProductName").textContent = data.product ?? "제품 없음";

  const tbody = document.querySelector("#worstProductReviewsTable tbody");
  tbody.innerHTML = "";

  data.reviews.forEach((review) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${review.user_id}</td><td>${review.text}</td>`;
    tbody.appendChild(row);
  });
}




// LLM 클러스터링 실행
async function runLLM() {
  const brand = getSelectedBrand();
  const res = await fetch(`/brand/llm-cluster?brand=${encodeURIComponent(brand)}`, {
    method: "POST"
  });
  const data = await res.json();
  const rawText = data.result;

  const container = document.getElementById("llmResult");
  container.innerHTML = "";

  const blocks = rawText.split(/\n\s*\*\*[\d]+\.\s*/).slice(1);
  const table = document.createElement("table");
  table.classList.add("review-table");

  table.innerHTML = `
    <thead>
      <tr>
        <th>불만 유형</th>
        <th>대표 리뷰</th>
        <th>개선 제안</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  blocks.forEach(block => {
    const titleMatch = block.match(/^(.+?)\*\*/);
    const reviewMatch = block.match(/Representative review: ["“](.+?)["”]/);
    const suggestionsMatch = block.match(/\* Suggestions:\n([\s\S]+)/);

    const title = titleMatch ? titleMatch[1].trim() : "N/A";
    const review = reviewMatch ? reviewMatch[1].trim() : "없음";
    const suggestions = suggestionsMatch ? suggestionsMatch[1].trim().replace(/\n\+ /g, "<br>• ") : "없음";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${title}</strong></td>
      <td>${review}</td>
      <td>${suggestions}</td>
    `;
    tbody.appendChild(row);
  });

  container.appendChild(table);
}


function renderRepeatChart(data) {
  const titles = data.map(d => d.title);
  const counts = data.map(d => d.repeat_purchase_count);

  if (repeatChartInstance) repeatChartInstance.destroy();

  const ctx = document.getElementById("repeatChart").getContext("2d");
  repeatChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: titles,
      datasets: [{
        label: "재구매 수",
        data: counts,
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
        barThickness: 30
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: "재구매 Top 10 제품" },
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: {
            font: { size: 10 },
            maxRotation: 45,
            minRotation: 45,
            callback: function(value) {
              let label = this.getLabelForValue(value);
              return label.length > 20 ? label.substring(0, 20) + "…" : label;
            }
          }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "재구매 횟수" }
        }
      }
    }
  });
}


async function renderTimeSeriesCharts(brand) {
  // 계절별 리뷰
  const seasonalRes = await fetch(`/brand/seasonal-review?brand=${encodeURIComponent(brand)}`);
  const seasonalData = await seasonalRes.json();

  const seasonalCtx = document.getElementById("seasonalReviewChart").getContext("2d");
  new Chart(seasonalCtx, {
    type: 'bar',
    data: {
      labels: ["봄", "여름", "가을", "겨울"],
      datasets: [{
        label: "계절별 리뷰 수",
        data: [seasonalData.봄, seasonalData.여름, seasonalData.가을, seasonalData.겨울],
        backgroundColor: "rgba(153, 102, 255, 0.6)",
        barThickness: 60
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: "계절별 리뷰 수" },
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  // 월별 리뷰
  const monthlyRes = await fetch(`/brand/monthly-review?brand=${encodeURIComponent(brand)}`);
  const monthlyData = await monthlyRes.json();

  const months = monthlyData.map(d => `${d.month}월`);
  const counts = monthlyData.map(d => d.review_count);

  const monthlyCtx = document.getElementById("monthlyReviewChart").getContext("2d");
  new Chart(monthlyCtx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: "월별 리뷰 수",
        data: counts,
        fill: false,
        borderColor: "rgba(255, 159, 64, 1)",
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: "월별 리뷰 수" }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// 평점 1점 리뷰 



// llm 실행 (불만 유형 클러스터링 & 개선점 도출)
async function runLLM() {
  const brand = getSelectedBrand();
  const res = await fetch(`/brand/llm-cluster?brand=${encodeURIComponent(brand)}`, {
    method: "POST"
  });
  const data = await res.json();
  document.getElementById("llmResult").textContent = data.result;
}


// 고객 세그먼트 차트 렌더링
async function renderCustomerSegmentChart(brand) {
  const res = await fetch(`/brand/customer-distribution?brand=${encodeURIComponent(brand)}`);
  const data = await res.json();

  const allSegments = ['충성 고객', '우수 고객', '일반 고객'];
  const values = allSegments.map(seg => {
    const item = data.find(d => d.segment === seg);
    return item ? item.count : 0;
  });

  const ctx = document.getElementById("customerSegmentChart").getContext("2d");
  if (window.customerSegmentChartInstance) {
    window.customerSegmentChartInstance.destroy();
  }

  window.customerSegmentChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: allSegments,
      datasets: [{
        label: "고객 수",
        data: values,
        backgroundColor: "rgba(30, 107, 231, 0.6)",
        barThickness: 60 // 막대 두께 조절
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: "고객 유형 분포" },
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}


// 고객 유형 비율(파이 차트) 렌더링

async function renderCustomerDistributionPie(brand) {
  try {
    const res = await fetch(`/brand/customer-distribution?brand=${encodeURIComponent(brand)}`);
    if (!res.ok) throw new Error(`API 응답 실패: ${res.status}`);
    const data = await res.json();

    const labels = data.map(d => d.segment);
    const values = data.map(d => d.count);

    const ctx = document.getElementById("customerPieChart").getContext("2d");
    if (window.customerPieChartInstance) window.customerPieChartInstance.destroy();

    window.customerPieChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          label: '고객 유형 비율',
          data: values,
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(75, 192, 192, 0.6)'
          ]
        }]
      },
      options: {
        layout: {
          padding: 10
        },
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: "고객 유형 비율" }
        }
      }
    });
  } catch (err) {
    console.error("파이차트 로딩 에러:", err);
  }
}

