(function() {
  console.log("EcoCart: Content script loaded");

  const API_BASE_URL = "http://localhost:8080";
  // const API_BASE_URL = "https://us-central1-deft-strata-482910-u9.cloudfunctions.net";

  function getAmazonProductInfo() {
    const title = 
      document.getElementById("productTitle")?.innerText?.trim() ||
      document.querySelector("#title span")?.innerText?.trim() ||
      document.querySelector("h1.a-size-large")?.innerText?.trim();

    const price = 
      document.querySelector(".a-price .a-offscreen")?.innerText?.trim() ||
      document.querySelector(".a-price-whole")?.innerText?.trim() ||
      document.querySelector("#priceblock_ourprice")?.innerText?.trim() ||
      document.querySelector("#corePrice_feature_div .a-offscreen")?.innerText?.trim();

    const brand = 
      document.getElementById("bylineInfo")?.innerText
        ?.replace("Visit the ", "")
        ?.replace(" Store", "")
        ?.replace("Brand: ", "")
        ?.trim() ||
      document.querySelector("#brand")?.innerText?.trim();

    const categoryBreadcrumbs = document.querySelectorAll(
      "#wayfinding-breadcrumbs_feature_div ul li span.a-list-item a"
    );
    const category = categoryBreadcrumbs.length > 0
      ? Array.from(categoryBreadcrumbs).map(el => el.innerText.trim()).filter(t => t).join(" > ")
      : "";

    const bulletPoints = Array.from(
      document.querySelectorAll("#feature-bullets ul li:not(.aok-hidden) span.a-list-item")
    ).map(el => el.innerText.trim()).filter(t => t);

    const description = bulletPoints.join(". ").substring(0, 1500);

    return { name: title, price, brand, category, description, platform: "amazon" };
  }

  function getFlipkartProductInfo() {
    return {
      name: document.querySelector("h1 span")?.innerText?.trim() ||
            document.querySelector(".B_NuCI")?.innerText?.trim(),
      price: document.querySelector("div._30jeq3")?.innerText?.trim(),
      brand: document.querySelector("span._2J4LW6")?.innerText?.trim(),
      category: Array.from(document.querySelectorAll("div._1MR4o5 a"))
                     .map(el => el.innerText.trim()).join(" > "),
      description: document.querySelector("div._1mXcCf")?.innerText?.trim() || "",
      platform: "flipkart"
    };
  }

  function getProductInfo() {
    const hostname = window.location.hostname;
    let productData = { source: hostname, url: window.location.href };

    if (hostname.includes("amazon")) {
      productData = { ...productData, ...getAmazonProductInfo() };
    } else if (hostname.includes("flipkart")) {
      productData = { ...productData, ...getFlipkartProductInfo() };
    }
    return productData;
  }

  function isProductPage() {
    const url = window.location.href;
    const hostname = window.location.hostname;
    
    if (hostname.includes("amazon")) {
      return url.includes("/dp/") || url.includes("/gp/product/");
    }
    if (hostname.includes("flipkart")) {
      return url.includes("/p/") || document.querySelector("._30jeq3") !== null;
    }
    return false;
  }

  function injectEcoCartWidget() {
    if (document.getElementById('ecocart-widget')) return;

    // Find insertion point
    const insertionPoints = [
      '#title_feature_div',
      '#titleSection', 
      '#centerCol > #title',
      '#dp-container #title',
      '.B_NuCI' // Flipkart
    ];

    let targetElement = null;
    for (const selector of insertionPoints) {
      targetElement = document.querySelector(selector);
      if (targetElement) break;
    }

    if (!targetElement) {
      console.warn('EcoCart: Could not find insertion point');
      return null;
    }

    const widget = document.createElement('div');
    widget.id = 'ecocart-widget';
    widget.innerHTML = `
      <div class="ecocart-container">
        <div class="ecocart-header">
          <div class="ecocart-brand">
            <span class="ecocart-icon">🌿</span>
            <span class="ecocart-title">EcoCart</span>
          </div>
          <span class="ecocart-tagline">Shop sustainably</span>
        </div>
        
        <div class="ecocart-body">
          <div class="ecocart-loading" id="ecocart-loading">
            <div class="ecocart-spinner"></div>
            <span>Analyzing environmental impact...</span>
          </div>
          
          <div class="ecocart-content hidden" id="ecocart-content">
            <div class="ecocart-product-name" id="ecocart-product-name"></div>
            
            <div class="ecocart-metrics-row">
              <div class="ecocart-metric-card">
                <div class="metric-icon">🌍</div>
                <div class="metric-value" id="ecocart-carbon">--</div>
                <div class="metric-label">Carbon Footprint</div>
                <div class="metric-unit">kg CO₂</div>
              </div>
              
              <div class="ecocart-metric-card">
                <div class="metric-icon">💧</div>
                <div class="metric-value" id="ecocart-water">--</div>
                <div class="metric-label">Water Usage</div>
                <div class="metric-unit">liters</div>
              </div>
              
              <div class="ecocart-metric-card packaging-card">
                <div class="metric-icon">📦</div>
                <div class="metric-value" id="ecocart-packaging">--</div>
                <div class="metric-label">PACKAGING</div>
              </div>
            </div>
            
            <div class="ecocart-score-section">
              <div class="score-header">
                <span>Sustainability Score</span>
                <span class="score-value" id="ecocart-score-text">C (50/100)</span>
              </div>
              <div class="score-bar-container">
                <div class="score-bar">
                  <div class="score-fill" id="ecocart-score-fill"></div>
                </div>
                <div class="score-labels">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
              </div>
            </div>
            
            <div class="ecocart-breakdown" id="ecocart-breakdown">
              <div class="breakdown-item">
                <span class="breakdown-icon">🌍</span>
                <span class="breakdown-label">Carbon</span>
                <div class="breakdown-bar"><div class="breakdown-fill" id="carbon-fill"></div></div>
                <span class="breakdown-value" id="carbon-score">50</span>
              </div>
              <div class="breakdown-item">
                <span class="breakdown-icon">💧</span>
                <span class="breakdown-label">Water</span>
                <div class="breakdown-bar"><div class="breakdown-fill" id="water-fill"></div></div>
                <span class="breakdown-value" id="water-score">50</span>
              </div>
              <div class="breakdown-item">
                <span class="breakdown-icon">📦</span>
                <span class="breakdown-label">Packaging</span>
                <div class="breakdown-bar"><div class="breakdown-fill" id="packaging-fill"></div></div>
                <span class="breakdown-value" id="packaging-score">50</span>
              </div>
            </div>

            <div class="ecocart-features hidden" id="ecocart-features">
              <h4>✅ Eco Features</h4>
              <div class="features-list" id="ecocart-features-list"></div>
            </div>

            <div class="ecocart-concerns hidden" id="ecocart-concerns">
              <h4>⚠️ Environmental Concerns</h4>
              <div class="concerns-list" id="ecocart-concerns-list"></div>
            </div>
            
            <div class="ecocart-alternatives">
              <h4>🌿 Greener Alternatives</h4>
              <div class="alternatives-list" id="ecocart-alternatives-list">
                <div class="no-alternatives">Looking for alternatives...</div>
              </div>
            </div>
          </div>
          
          <div class="ecocart-error hidden" id="ecocart-error">
            <span class="error-icon">⚠️</span>
            <span class="error-text">Unable to analyze this product</span>
            <button class="ecocart-retry-btn" id="ecocart-retry">Try Again</button>
          </div>
        </div>
      </div>
    `;

    targetElement.parentNode.insertBefore(widget, targetElement.nextSibling);

    document.getElementById('ecocart-retry')?.addEventListener('click', () => {
      document.getElementById('ecocart-loading').classList.remove('hidden');
      document.getElementById('ecocart-error').classList.add('hidden');
      fetchAndDisplayData();
    });

    return widget;
  }

  function updateWidgetWithData(data, productName) {
    const loading = document.getElementById('ecocart-loading');
    const content = document.getElementById('ecocart-content');
    const error = document.getElementById('ecocart-error');

    if (!loading || !content) return;

    loading.classList.add('hidden');
    error.classList.add('hidden');
    content.classList.remove('hidden');

    // Product name
    document.getElementById('ecocart-product-name').textContent = productName || 'Product';

    // Metrics
    document.getElementById('ecocart-carbon').textContent = data.carbonFootprint ?? '--';
    document.getElementById('ecocart-water').textContent = data.waterUsage ?? '--';
    document.getElementById('ecocart-packaging').textContent = data.packagingType || 'unknown';

    // Score
    const score = data.sustainabilityScore || data.ecoScore?.totalScore || 50;
    const rating = getScoreRating(score);
    document.getElementById('ecocart-score-text').textContent = `${rating} (${score}/100)`;
    document.getElementById('ecocart-score-fill').style.width = `${score}%`;

    // Breakdown
    const breakdown = data.ecoScore?.breakdown;
    if (breakdown) {
      document.getElementById('carbon-fill').style.width = `${breakdown.carbon?.score || 50}%`;
      document.getElementById('carbon-score').textContent = breakdown.carbon?.score || 50;
      document.getElementById('water-fill').style.width = `${breakdown.water?.score || 50}%`;
      document.getElementById('water-score').textContent = breakdown.water?.score || 50;
      document.getElementById('packaging-fill').style.width = `${breakdown.packaging?.score || 50}%`;
      document.getElementById('packaging-score').textContent = breakdown.packaging?.score || 50;
    }

    // Eco features
    if (data.ecoFeatures?.length > 0) {
      const featuresSection = document.getElementById('ecocart-features');
      const featuresList = document.getElementById('ecocart-features-list');
      featuresList.innerHTML = data.ecoFeatures.map(f => `<span class="feature-tag">✓ ${f}</span>`).join('');
      featuresSection.classList.remove('hidden');
    }

    // Concerns
    if (data.environmentalConcerns?.length > 0) {
      const concernsSection = document.getElementById('ecocart-concerns');
      const concernsList = document.getElementById('ecocart-concerns-list');
      concernsList.innerHTML = data.environmentalConcerns.map(c => `<span class="concern-tag">• ${c}</span>`).join('');
      concernsSection.classList.remove('hidden');
    }

    // Alternatives
    const alternativesList = document.getElementById('ecocart-alternatives-list');
    if (data.alternatives?.length > 0) {
      alternativesList.innerHTML = data.alternatives.map(alt => `
        <div class="alternative-item" data-url="${alt.url || '#'}">
          <div class="alt-score">${alt.score || '--'}</div>
          <div class="alt-info">
            <div class="alt-name">${alt.name}</div>
            <div class="alt-price">${alt.price || ''}</div>
            ${alt.reason ? `<div class="alt-reason">${alt.reason}</div>` : ''}
          </div>
          <div class="alt-arrow">›</div>
        </div>
      `).join('');

      alternativesList.querySelectorAll('.alternative-item').forEach(item => {
        item.addEventListener('click', () => {
          const url = item.dataset.url;
          if (url && url !== '#') window.open(url, '_blank');
        });
      });
    } else {
      alternativesList.innerHTML = '<div class="no-alternatives">No greener alternatives found</div>';
    }
  }

  function showWidgetError() {
    const loading = document.getElementById('ecocart-loading');
    const content = document.getElementById('ecocart-content');
    const error = document.getElementById('ecocart-error');

    if (loading) loading.classList.add('hidden');
    if (content) content.classList.add('hidden');
    if (error) error.classList.remove('hidden');
  }

  function getScoreRating(score) {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'E';
  }

  async function fetchSustainabilityData(productData) {
    const response = await fetch(`${API_BASE_URL}/getSustainabilityData`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "API error");
    return data;
  }

  async function fetchAndDisplayData() {
    const productInfo = getProductInfo();
    
    if (!productInfo.name) {
      showWidgetError();
      return;
    }

    try {
      const data = await fetchSustainabilityData(productInfo);
      updateWidgetWithData(data, productInfo.name);
    } catch (error) {
      console.error("EcoCart: API error:", error);
      showWidgetError();
    }
  }

  function init() {
    if (!isProductPage()) {
      console.log("EcoCart: Not a product page, skipping");
      return;
    }

    // Wait for page to fully load
    setTimeout(() => {
      console.log("EcoCart: Injecting widget");
      injectEcoCartWidget();
      fetchAndDisplayData();
    }, 1500);
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also handle SPA navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(init, 1500);
    }
  }).observe(document.body, { subtree: true, childList: true });
})();
