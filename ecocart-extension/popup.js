// For local testing, use:
const API_BASE_URL = "http://localhost:8080";

// For production, replace 'your-project-id' with your actual GCP project ID:
// const API_BASE_URL = "https://us-central1-YOUR_ACTUAL_PROJECT_ID.cloudfunctions.net";

document.addEventListener("DOMContentLoaded", async () => {
  const loading = document.getElementById("loading");
  const productSection = document.getElementById("product-section");
  const errorSection = document.getElementById("error-section");
  const errorMessage = document.getElementById("error-message");
  const retryBtn = document.getElementById("retry-btn");

  let currentProductData = null;

  // Retry button handler
  retryBtn?.addEventListener("click", () => {
    if (currentProductData) {
      analyzeProduct(currentProductData);
    }
  });

  /**
   * Fetch sustainability data from backend API
   */
  async function fetchSustainabilityData(productData) {
    const response = await fetch(`${API_BASE_URL}/getSustainabilityData`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: productData.name,
        brand: productData.brand,
        category: productData.category,
        price: productData.price,
        url: productData.url,
        source: productData.source,
        description: productData.description
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Analyze product and update UI
   */
  async function analyzeProduct(productData) {
    showLoading();

    try {
      const data = await fetchSustainabilityData(productData);

      if (!data.success) {
        throw new Error(data.error || "Failed to analyze product");
      }

      showProduct({
        name: productData.name,
        carbonFootprint: data.carbonFootprint,
        waterUsage: data.waterUsage,
        sustainabilityScore: data.sustainabilityScore,
        ecoScore: data.ecoScore,
        packagingType: data.packagingType,
        environmentalConcerns: data.environmentalConcerns,
        ecoFeatures: data.ecoFeatures,
        recommendations: data.recommendations,
        alternatives: data.alternatives,
        cached: data.cached,
        aiGenerated: data.aiGenerated
      });

    } catch (error) {
      console.error("API Error:", error);
      showError(`Unable to analyze product: ${error.message}`);
    }
  }

  function showLoading() {
    loading.classList.remove("hidden");
    productSection.classList.add("hidden");
    errorSection.classList.add("hidden");
  }

  function showError(message) {
    loading.classList.add("hidden");
    productSection.classList.add("hidden");
    errorSection.classList.remove("hidden");
    errorMessage.textContent = message;
  }

  function showProduct(data) {
    loading.classList.add("hidden");
    errorSection.classList.add("hidden");
    productSection.classList.remove("hidden");

    // Product name
    document.getElementById("product-name").textContent = data.name || "Unknown Product";

    // Metrics
    document.getElementById("carbon-value").textContent = data.carbonFootprint ?? "--";
    document.getElementById("water-value").textContent = data.waterUsage ?? "--";

    // Eco Score with rating
    const score = data.sustainabilityScore ?? 0;
    const ecoScore = data.ecoScore;
    
    document.getElementById("score-value").textContent = ecoScore?.rating 
      ? `${ecoScore.rating} (${score}/100)` 
      : `${score}/100`;
    document.getElementById("score-fill").style.width = `${score}%`;

    // Score color
    const scoreEl = document.getElementById("score-value");
    scoreEl.classList.remove("score-low", "score-medium", "score-high");
    if (score < 40) scoreEl.classList.add("score-low");
    else if (score < 70) scoreEl.classList.add("score-medium");
    else scoreEl.classList.add("score-high");

    // Render score breakdown if available
    if (ecoScore?.breakdown) {
      renderScoreBreakdown(ecoScore.breakdown);
    }

    // Render eco features and concerns
    renderEcoDetails(data.ecoFeatures, data.environmentalConcerns);

    // Render recommendations
    renderRecommendations(data.recommendations);

    // Alternatives
    renderAlternatives(data.alternatives || []);
  }

  function renderScoreBreakdown(breakdown) {
    const container = document.getElementById("score-breakdown");
    if (!container) return;

    container.innerHTML = `
      <div class="breakdown-item">
        <span>🌍 Carbon</span>
        <div class="mini-bar"><div class="mini-fill" style="width: ${breakdown.carbon.score}%"></div></div>
        <span>${breakdown.carbon.score}</span>
      </div>
      <div class="breakdown-item">
        <span>💧 Water</span>
        <div class="mini-bar"><div class="mini-fill" style="width: ${breakdown.water.score}%"></div></div>
        <span>${breakdown.water.score}</span>
      </div>
      <div class="breakdown-item">
        <span>📦 Packaging</span>
        <div class="mini-bar"><div class="mini-fill" style="width: ${breakdown.packaging.score}%"></div></div>
        <span>${breakdown.packaging.score}</span>
      </div>
    `;
    container.classList.remove("hidden");
  }

  function renderEcoDetails(features, concerns) {
    const container = document.getElementById("eco-details");
    if (!container) return;

    let html = "";

    if (features?.length > 0) {
      html += `<div class="eco-features">
        <h4>✅ Eco Features</h4>
        <ul>${features.map(f => `<li>${f}</li>`).join("")}</ul>
      </div>`;
    }

    if (concerns?.length > 0) {
      html += `<div class="eco-concerns">
        <h4>⚠️ Concerns</h4>
        <ul>${concerns.map(c => `<li>${c}</li>`).join("")}</ul>
      </div>`;
    }

    container.innerHTML = html;
    container.classList.toggle("hidden", !html);
  }

  function renderRecommendations(recommendations) {
    const container = document.getElementById("recommendations");
    if (!container || !recommendations?.length) return;

    container.innerHTML = `
      <h4>💡 Recommendations</h4>
      ${recommendations.map(r => `
        <div class="recommendation-item">
          <strong>${r.area}:</strong> ${r.suggestion}
        </div>
      `).join("")}
    `;
    container.classList.remove("hidden");
  }

  function renderAlternatives(alternatives) {
    const container = document.getElementById("alternatives-list");
    
    if (!alternatives.length) {
      container.innerHTML = '<p class="no-alternatives">No greener alternatives found</p>';
      return;
    }

    container.innerHTML = alternatives.map(alt => `
      <div class="alternative-item" data-url="${alt.url || '#'}">
        <div class="alt-score">${alt.score || '--'}</div>
        <div class="alt-info">
          <div class="alt-name">${alt.name}</div>
          <div class="alt-price">${alt.price || ''}</div>
          ${alt.reason ? `<div class="alt-reason">${alt.reason}</div>` : ''}
        </div>
        <div class="alt-arrow">›</div>
      </div>
    `).join("");

    container.querySelectorAll(".alternative-item").forEach(item => {
      item.addEventListener("click", () => {
        const url = item.dataset.url;
        if (url && url !== '#') {
          chrome.tabs.create({ url });
        }
      });
    });
  }

  // Initialize
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes("amazon") && !tab.url.includes("flipkart")) {
      showError("Please visit an Amazon or Flipkart product page.");
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: "getProductInfo" }, (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        showError("Unable to read product info. Please refresh the page.");
        return;
      }

      currentProductData = response.data;
      analyzeProduct(currentProductData);
    });
  } catch (error) {
    showError(`Error: ${error.message}`);
  }
});
