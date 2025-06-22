document.querySelectorAll(".sidebar nav ul li").forEach(menuItem => {
  menuItem.addEventListener("click", function () {
    const targetId = this.getAttribute("data-target");
    const targetSection = document.getElementById(targetId);
    
    if (targetSection) {
      // 부드럽게 스크롤
      targetSection.scrollIntoView({ behavior: "smooth", block: "start" });

      // 메뉴 active 클래스 처리
      document.querySelectorAll(".sidebar nav ul li").forEach(item => {
        item.classList.remove("active");
      });
      this.classList.add("active");
    }
  });
});



document.addEventListener("DOMContentLoaded", () => {
  let selectedBrand = null;
  let topProductsChart;
  let ratingReviewChartInstance;
  let repeatChartInstance;

  // 브랜드 목록 불러오기
  fetch("/brands")
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        const select = document.getElementById("brand-select");
        const MAX_LABEL = 30; // 최대 길이 설정

        data.brands.forEach(brand => {
          const option = document.createElement("option");
          option.value = brand;
          option.textContent = brand.length > MAX_LABEL 
            ? brand.slice(0, MAX_LABEL) + "…" 
            : brand;
          option.title = brand; // 전체 이름은 툴팁으로 제공
          select.appendChild(option);
        });
      }
    });


  // 브랜드 선택 시
  document.getElementById("brand-select").addEventListener("change", async (e) => {
    selectedBrand = e.target.value;

    try {

      const response = await fetch(`/brand/overview?brand=${encodeURIComponent(selectedBrand)}`);
      const data = await response.json();
      
      // KPI
      document.getElementById("product-count").textContent = data.product_count ?? 0;
      document.getElementById("review-count").textContent = data.review_count ?? 0;
      document.getElementById("average-rating").textContent = (data.average_rating ?? 0).toFixed(1);

      // 인기 제품 차트
      const ctx = document.getElementById("top-products-chart").getContext("2d");
      const labels = data.top_products.map(item => item.name);
      const values = data.top_products.map(item => item.review_count);
      if (topProductsChart) topProductsChart.destroy();
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
            barThickness: 30
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: '리뷰 수 기반 Top 10 제품', font: { size: 18 } }
          },
          scales: {
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                font: { size: 10 },
                callback: function(value) {
                  let label = this.getLabelForValue(value);
                  return label.length > 20 ? label.substring(0, 20) + '…' : label;
                }
              }
            },
            y: {
              beginAtZero: true,
              ticks: { stepSize: 100 },
              title: { display: true, text: "리뷰 수" }
            }
          }
        }
      });

      await updateCharts(selectedBrand);
      await renderCategoryCompetitivenessChart(selectedBrand);
      await populateLifecycleProductSelect(selectedBrand);
      await renderRepurchaseCharts(selectedBrand);
      await renderTimeSeriesCharts(selectedBrand);
      await renderCustomerSegmentChart(selectedBrand);
      await renderCustomerDistributionPie(selectedBrand);
      await fetchLowRatingReviews(selectedBrand);
      await fetchWorstProductReviews(selectedBrand);

    
    } catch (error) {
      console.error("브랜드 개요 로드 실패:", error);
    }
  });
  // 제품 선택 시 생애주기 차트 갱신
  document.getElementById("lifecycle-product-select").addEventListener("change", async (e) => {
    const selectedAsin = e.target.value;
    if (selectedAsin && selectedBrand) {
      await renderProductLifecycleChart(selectedAsin, selectedBrand);
    } else {
      console.warn("제품 또는 브랜드가 선택되지 않았습니다.");
    }
});
  // 분석 버튼 이벤트 바인딩
  document.getElementById("llm-low-btn").addEventListener("click", runLLMForLowRating);
  document.getElementById("llm-worst-btn").addEventListener("click", runLLMForWorstProduct);

  async function updateCharts(brand) {
    const ratingReviewRes = await fetch(`/brand/rating-review-chart?brand=${brand}`);
    const ratingReviewData = await ratingReviewRes.json();
    const repeatRes = await fetch(`/brand/repeat-top-products`);
    const repeatData = await repeatRes.json();

    renderRatingReviewChart(ratingReviewData);
    renderRepeatChart(repeatData);
  }

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
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
          barThickness: 25,
          yAxisID: "y1",
        },
        {
          label: "리뷰 수",
          data: reviews,
          backgroundColor: "rgba(255, 99, 132, 0.6)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
          barThickness: 25,
          yAxisID: "y2"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "평점 및 리뷰 수",
          font: { size: 18 }
        },
        legend: { position: "top" }
      },
      scales: {
        x: {
          ticks: {
            font: { size: 10 },
            maxRotation: 45,
            minRotation: 45,
            callback: function (value) {
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
          title: { display: true, text: "재구매 Top 10 제품" ,font: { size: 18 }},
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
// 카테고리별 경쟁력 분석
async function renderCategoryCompetitivenessChart(brand) {
  const res = await fetch(`/brand/category-competitiveness?brand=${encodeURIComponent(brand)}`);
  const data = await res.json();

  const categories = data.map(d => d.category);
  const reviewCounts = data.map(d => d.review_count);
  const avgRatings = data.map(d => d.avg_rating);
  const repeatRates = data.map(d => d.repurchase_rate);

  const ctx = document.getElementById("categoryCompetitivenessChart").getContext("2d");

new Chart(ctx, {
  type: 'bar',
  data: {
    labels: categories,
    datasets: [
      {
        label: '리뷰 수',
        data: reviewCounts,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
        barThickness: 30,
        yAxisID: 'y1',
        categoryPercentage: 0.8
      },
      {
        label: '평균 평점',
        data: avgRatings,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        barThickness: 30,
        yAxisID: 'y2',
        categoryPercentage: 0.8
      },
      {
        label: '재구매율 (%)',
        data: repeatRates,
        backgroundColor: 'rgba(255, 205, 86, 0.6)',
        borderColor: 'rgba(255, 205, 86, 1)',
        borderWidth: 1,
        barThickness: 30,
        yAxisID: 'y3',
        categoryPercentage: 0.8
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: '카테고리별 경쟁력 분석',
        font: { size: 18 }
      },
      legend: {
        position: 'top',
        labels: {
          font: { family: "'Pretendard', 'Spoqa Han Sans Neo', 'Noto Sans KR', sans-serif" }
        }
      }
    },
    scales: {
      x: {
        categoryPercentage: 0.8,  // 기본값 유지 or 약간 조정 가능
        barPercentage: 0.6, 
        ticks: {
          font: {
            family: "'Pretendard', 'Spoqa Han Sans Neo', 'Noto Sans KR', sans-serif",
            size: 10
          },
          callback: function(value) {
            const label = this.getLabelForValue(value);
            return label.length > 20 ? label.slice(0, 20) + '…' : label;
          }
        }
      },
      y1: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: '리뷰 수' },
        beginAtZero: true
      },
      y2: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: '평균 평점' },
        min: 0,
        max: 5,
        grid: { drawOnChartArea: false }
      },
      y3: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: '재구매율 (%)' },
        min: 0,
        max: 100,
        grid: { drawOnChartArea: false }
      }
    }
  }
});
}

// 제품 목록
// async function populateLifecycleProductSelect(brand) {
//   try {
//     const response = await fetch(`/brand/products?brand=${encodeURIComponent(brand)}`);
//     const data = await response.json();
//     const products = data.products;

//     const select = document.getElementById("lifecycle-product-select");
//     if (!select) {
//       console.warn("lifecycle-product-select 요소가 존재하지 않습니다.");
//       return;
//     }

//     select.innerHTML = ""; // 기존 옵션 제거

//     products.forEach(product => {
//       const option = document.createElement("option");
//       option.value = product.asin;
//       option.textContent = product.title;
//       select.appendChild(option);
//     });

//   } catch (error) {
//     console.error("제품 리스트 로드 실패:", error);
//   }
// }
async function populateLifecycleProductSelect(brand) {
  try {
    const response = await fetch(`/brand/products?brand=${encodeURIComponent(brand)}`);
    const data = await response.json();
    const products = data.products;

    const select = document.getElementById("lifecycle-product-select");
    if (!select) {
      console.warn("lifecycle-product-select 요소가 존재하지 않습니다.");
      return;
    }

    select.innerHTML = ""; // 기존 옵션 제거

    const MAX_LABEL = 30;
    products.forEach(product => {
      const option = document.createElement("option");
      option.value = product.asin;
      option.textContent = product.title.length > MAX_LABEL
        ? product.title.slice(0, MAX_LABEL) + "…"
        : product.title;
      option.title = product.title; // 마우스 오버시 툴팁 제공
      select.appendChild(option);
    });

  } catch (error) {
    console.error("제품 리스트 로드 실패:", error);
  }
}

// 제품 생애 주기 분석
async function renderProductLifecycleChart(asin, brand) {
  const res = await fetch(`/product/lifecycle?asin=${encodeURIComponent(asin)}&brand=${encodeURIComponent(brand)}`);
  const data = await res.json();

  if (!data || data.length === 0) {
    alert("해당 제품은 리뷰가 없어 분석할 수 없습니다.");
    return;
  }

  const months = data.map(d => `${d.year}-${String(d.month).padStart(2, '0')}`);
  const reviewCounts = data.map(d => d.review_count);
  const avgRatings = data.map(d => d.avg_rating);

  const ctx = document.getElementById("productLifecycleChart").getContext("2d");
  if (window.lifecycleChartInstance) window.lifecycleChartInstance.destroy();
  window.lifecycleChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        { label: "리뷰 수", data: reviewCounts, borderColor: '#add826', yAxisID: 'y1', tension: 0.3 },
        { label: "평균 평점", data: avgRatings, borderColor: '#4682b4', yAxisID: 'y2', tension: 0.3 }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "제품 생애 주기 분석",
          font: { size: 18 }
        }
      },
      scales: {
        y1: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: '리뷰 수' },
          beginAtZero: true,
          suggestedMax: Math.max(...reviewCounts) + 10  

        },
        y2: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: '평점' },
          min: 0, max: 5.5,
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}



//재구매자 분석
async function renderRepurchaseCharts(brand) {
  const res = await fetch(`/brand/repurchase-distribution?brand=${encodeURIComponent(brand)}`);
  const data = await res.json();

  // 막대 그래프
  const ctxBar = document.getElementById("repurchaseBarChart")?.getContext("2d");
  if (!ctxBar) {
    console.error("repurchaseBarChart element not found.");
    return;
  }

new Chart(ctxBar, {
  type: 'bar',
  data: {
    labels: data.repurchase_distribution.map(d => d.type),
    datasets: [{
      label: "고객 수",
      data: data.repurchase_distribution.map(d => d.count),
      backgroundColor: ['rgba(0, 0, 128, 0.6)', 'rgba(135, 206, 235, 0.6)'],
      borderColor: ['rgba(0, 0, 128, 1)', 'rgba(135, 206, 235, 1)'],
      borderWidth: 1,
      barThickness: 50
    }]
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "재구매자 수 vs 비재구매자 수",
        font: { size: 18 }
      },
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "고객 수"
        }
      }
    }
  }
});
  
  // 히트맵 (Plotly는 div를 참조)
  const heatmapDiv = document.getElementById("repurchaseHeatmapChart");
  if (!heatmapDiv) {
    console.error("repurchaseHeatmapChart div not found.");
    return;
  }

  const reviewers = [...new Set(data.heatmap.map(d => d.reviewer))];
  const products = [...new Set(data.heatmap.map(d => d.product))];

  // 최대 label 길이 제한
  const maxLabelLength = 20;
  const shortenedProducts = products.map(label =>
    label.length > maxLabelLength ? label.slice(0, maxLabelLength) + '…' : label
  );

  // z 값 매트릭스 생성
  const z = reviewers.map(reviewer =>
    products.map(product => {
      const entry = data.heatmap.find(d => d.reviewer === reviewer && d.product === product);
      return entry ? entry.count : 0;
    })
  );

  Plotly.newPlot("repurchaseHeatmapChart", [{
    z: z,
    x: products,
    y: reviewers,
    type: 'heatmap',
    colorscale: [
      [0, '#1e2a47'], // 연한 파랑 (0일 때)
      [1, '#f0f8ff']  // 진한 파랑 (최댓값일 때)
    ],
    width: 1000,
    height: 700,
    reversescale: true,
    zmin: 0,
    zmax: 5,
    colorbar: {
    thickness: 15,
    len: 0.7,
    x: 1.05,
    y: 0.5
  }
  }], {

    title: { 
      display: true, 
      text:"재구매자 vs 제품 히트맵" ,
      font: { size: 18 }},
    font: {
      family: "'Pretendard', 'Spoqa Han Sans Neo', 'Noto Sans KR', sans-serif"
    },
    margin: {
      t: 40,
      l: 150,
      b: 40
    },
    xaxis: {
      tickangle: -45,
      tickfont: { size: 10 },
      tickvals: products.map((_, i) => i).filter(i => i % 3 === 0),
      ticktext: shortenedProducts.filter((_, i) => i % 3 === 0),
      automargin: true
    },
    yaxis: {
      title: {
        text: "재구매자",   // 축 제목
        font: {
          size: 14,
          color: "#1e2a47"
        },
        standoff: 20 
      },
    tickfont: {
    size: 10  
    },
      automargin: true
    }
  });

}



function renderLLMResult(rawText, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  const entries = rawText.split(/\n\s*\n/); // 빈 줄 기준 분리

  entries.forEach(entry => {
    const html = `<div class="issue-block" style="margin-bottom: 16px; padding: 12px; background: #f8f9fb; border-left: 4px solid #2f80ed; border-radius: 6px;">
      <pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.5;">${entry.trim()}</pre>
    </div>`;
    container.innerHTML += html;
  });

  if (container.innerHTML.trim() === "") {
    container.innerHTML = "<p style='color:#999'>LLM 응답을 불러오지 못했습니다.</p>";
  }
}


  async function fetchLowRatingReviews(brand) {
    const res = await fetch(`/brand/low-rating-reviews?brand=${encodeURIComponent(brand)}`);
    const data = await res.json();
    const tbody = document.querySelector("#lowRatingReviewsTable tbody");
    tbody.innerHTML = "";
    data.forEach(review => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${review.user_id}</td><td>${review.text}</td>`;
      tbody.appendChild(row);
    });
  }

  async function fetchWorstProductReviews(brand) {
    const res = await fetch(`/brand/worst-product?brand=${encodeURIComponent(brand)}`);
    const data = await res.json();
    document.getElementById("worstProductName").textContent = data.product ?? "제품 없음";
    const tbody = document.querySelector("#worstProductReviewsTable tbody");
    tbody.innerHTML = "";
    data.reviews.forEach(review => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${review.user_id}</td><td>${review.text}</td>`;
      tbody.appendChild(row);
    });
  }

  async function runLLMForLowRating() {
    const brand = getSelectedBrand();
    const res = await fetch(`/brand/llm-low-rating?brand=${encodeURIComponent(brand)}`, { method: "POST" });
    const data = await res.json();
    renderLLMResult(data.result, "llmLowRatingResult");
  }


  async function runLLMForWorstProduct() {
    const brand = getSelectedBrand();
    const res = await fetch(`/brand/llm-worst-product?brand=${encodeURIComponent(brand)}`, { method: "POST" });
    const data = await res.json();
    renderLLMResult(data.result, "llmWorstProductResult");
  }

// 계절별 리뷰 수
  async function renderTimeSeriesCharts(brand) {
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
          borderColor: "rgba(153, 102, 255, 1)",
          borderWidth: 1,
          barThickness: 50
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: "계절별 리뷰 수", font: { size: 18 } },
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

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
          title: { display: true, text: "월별 리뷰 수", font: { size: 18 } }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  async function renderCustomerSegmentChart(brand) {
    const res = await fetch(`/brand/customer-distribution?brand=${encodeURIComponent(brand)}`);
    const data = await res.json();
    const allSegments = ['충성 고객', '우수 고객', '일반 고객'];
    const values = allSegments.map(seg => {
      const item = data.find(d => d.segment === seg);
      return item ? item.count : 0;
    });

    const ctx = document.getElementById("customerSegmentChart").getContext("2d");
    if (window.customerSegmentChartInstance) window.customerSegmentChartInstance.destroy();
    window.customerSegmentChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: allSegments,
        datasets: [{
          label: "고객 수",
          data: values,
          backgroundColor: "rgba(30, 107, 231, 0.6)",
          borderColor: "rgba(30, 107, 231, 1)",
          borderWidth: 1,
          barThickness: 50
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "고객 유형 분포",
            font: { size: 18 }
          },
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "고객 수" }
          }
        }
      }
    });
  }


  async function renderCustomerDistributionPie(brand) {
    const res = await fetch(`/brand/customer-distribution?brand=${encodeURIComponent(brand)}`);
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
        layout: { padding: 10 },
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: "고객 유형 비율",font: { size: 18 } }
        }
      }
    });
  }
});
