(function() {
  console.log("EcoCart: Content script loaded");

  // API Configuration
  const API_BASE_URL = "http://localhost:8080"; // Change to your Cloud Function URL for production
  // const API_BASE_URL = "https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net";

  function getAmazonProductInfo() {
    // Product Title - multiple fallback selectors
    const title = 
      document.getElementById("productTitle")?.innerText?.trim() ||
      document.querySelector("#title span")?.innerText?.trim() ||
      document.querySelector("h1.a-size-large")?.innerText?.trim() ||
      document.querySelector("[data-feature-name='title']")?.innerText?.trim() ||
      document.querySelector(".product-title-word-break")?.innerText?.trim();

    // Price - multiple fallback selectors for different page layouts
    const price = 
      document.querySelector(".a-price .a-offscreen")?.innerText?.trim() ||
      document.querySelector(".a-price-whole")?.innerText?.trim() ||
      document.querySelector("#priceblock_ourprice")?.innerText?.trim() ||
      document.querySelector("#priceblock_dealprice")?.innerText?.trim() ||
      document.querySelector("#priceblock_saleprice")?.innerText?.trim() ||
      document.querySelector(".a-color-price")?.innerText?.trim() ||
      document.querySelector("#corePrice_feature_div .a-offscreen")?.innerText?.trim() ||
      document.querySelector("#corePriceDisplay_desktop_feature_div .a-offscreen")?.innerText?.trim() ||
      document.querySelector("[data-feature-name='priceInsideBuyBox'] .a-offscreen")?.innerText?.trim();

    // Brand - multiple fallback selectors
    const brand = 
      document.getElementById("bylineInfo")?.innerText
        ?.replace("Visit the ", "")
        ?.replace(" Store", "")
        ?.replace("Brand: ", "")
        ?.trim() ||
      document.querySelector("#brand")?.innerText?.trim() ||
      document.querySelector("a#bylineInfo")?.innerText?.trim() ||
      document.querySelector("#productOverview_feature_div tr:first-child td.a-span9 span")?.innerText?.trim() ||
      document.querySelector("[data-feature-name='brandLogo'] img")?.alt?.trim();

    // Category - from breadcrumbs
    const categoryBreadcrumbs = document.querySelectorAll(
      "#wayfinding-breadcrumbs_feature_div ul li span.a-list-item a"
    );
    const category = categoryBreadcrumbs.length > 0
      ? Array.from(categoryBreadcrumbs)
          .map(el => el.innerText.trim())
          .filter(text => text.length > 0)
          .join(" > ")
      : document.querySelector(".a-breadcrumb")?.innerText?.trim() ||
        document.querySelector("#nav-subnav")?.getAttribute("data-category") ||
        "";

    // Description - from bullet points and product description
    const bulletPoints = Array.from(
      document.querySelectorAll("#feature-bullets ul li:not(.aok-hidden) span.a-list-item")
    ).map(el => el.innerText.trim()).filter(text => text.length > 0);

    const productDescription = 
      document.getElementById("productDescription")?.innerText?.trim() ||
      document.querySelector("#productDescription_feature_div")?.innerText?.trim() ||
      "";

    const description = [
      ...bulletPoints,
      productDescription
    ].join(". ").substring(0, 1500);

    // Additional info - images, ratings, etc.
    const imageUrl = 
      document.getElementById("landingImage")?.src ||
      document.querySelector("#imgTagWrapperId img")?.src ||
      document.querySelector("#main-image-container img")?.src;

    const rating = 
      document.querySelector("#acrPopover")?.title?.trim() ||
      document.querySelector(".a-icon-star span.a-icon-alt")?.innerText?.trim();

    const reviewCount = 
      document.getElementById("acrCustomerReviewText")?.innerText?.trim() ||
      document.querySelector("#acrCustomerReviewLink span")?.innerText?.trim();

    // ASIN from URL or page
    const asinMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    const asin = asinMatch?.[1] || 
      document.querySelector("[data-asin]")?.getAttribute("data-asin");

    return {
      name: title,
      price,
      brand,
      category,
      description,
      imageUrl,
      rating,
      reviewCount,
      asin,
      platform: "amazon"
    };
  }

  function getFlipkartProductInfo() {
    return {
      name: document.querySelector("h1 span")?.innerText?.trim() ||
            document.querySelector(".B_NuCI")?.innerText?.trim(),
      price: document.querySelector("div._30jeq3")?.innerText?.trim() ||
             document.querySelector("div._30jeq3._16Jk6d")?.innerText?.trim(),
      brand: document.querySelector("span._2J4LW6")?.innerText?.trim() ||
             document.querySelector("h1 span")?.innerText?.split(" ")[0]?.trim(),
      category: Array.from(document.querySelectorAll("div._1MR4o5 a"))
                     .map(el => el.innerText.trim())
                     .filter(text => text.length > 0)
                     .join(" > ") ||
                Array.from(document.querySelectorAll("._2whKao a"))
                     .map(el => el.innerText.trim())
                     .join(" > "),
      description: document.querySelector("div._1mXcCf")?.innerText?.trim() ||
                   Array.from(document.querySelectorAll("div._2418kt li"))
                        .map(el => el.innerText.trim())
                        .join(". ")
                        .substring(0, 1000)
    };
  }

  function getProductInfo() {
    const hostname = window.location.hostname;
    let productData = { 
      source: hostname,
      url: window.location.href
    };

    if (hostname.includes("amazon")) {
      productData = { ...productData, ...getAmazonProductInfo() };
    } else if (hostname.includes("flipkart")) {
      productData = { ...productData, ...getFlipkartProductInfo() };
    }

    return productData;
  }

  /**
   * Create and inject the floating EcoCart panel
   */
  function injectEcoCartPanel() {
    // Remove existing panel if any
    const existingPanel = document.getElementById('ecocart-panel');
    if (existingPanel) existingPanel.remove();

    const panel = document.createElement('div');
    panel.id = 'ecocart-panel';
    panel.innerHTML = `
      <div class="ecocart-header">
        <span class="ecocart-logo">🌱 EcoCart</span>
        <button class="ecocart-close" id="ecocart-close">×</button>
      </div>
      
      <div class="ecocart-content" id="ecocart-content">
        <div class="ecocart-loading" id="ecocart-loading">
          <div class="ecocart-spinner"></div>
          <p>Analyzing sustainability...</p>
        </div>
        
        <div class="ecocart-data hidden" id="ecocart-data">
          <div class="ecocart-score-section">
            <div class="ecocart-score-circle" id="ecocart-score-circle">
              <span class="score-value" id="ecocart-score-value">--</span>
              <span class="score-label">Eco Score</span>
            </div>
            <div class="ecocart-rating" id="ecocart-rating">--</div>
          </div>
          
          <div class="ecocart-metrics">
            <div class="ecocart-metric">
              <div class="metric-icon">🌍</div>
              <div class="metric-info">
                <span class="metric-value" id="ecocart-carbon">
                  <span class="skeleton-loader"></span>
                </span>
                <span class="metric-label">kg CO₂</span>
              </div>
            </div>
            
            <div class="ecocart-metric">
              <div class="metric-icon">💧</div>
              <div class="metric-info">
                <span class="metric-value" id="ecocart-water">
                  <span class="skeleton-loader"></span>
                </span>
                <span class="metric-label">liters</span>
              </div>
            </div>
            
            <div class="ecocart-metric">
              <div class="metric-icon">📦</div>
              <div class="metric-info">
                <span class="metric-value" id="ecocart-packaging">
                  <span class="skeleton-loader"></span>
                </span>
                <span class="metric-label">packaging</span>
              </div>
            </div>
          </div>
          
          <div class="ecocart-concerns hidden" id="ecocart-concerns">
            <h4>⚠️ Environmental Concerns</h4>
            <ul id="ecocart-concerns-list"></ul>
          </div>
          
          <div class="ecocart-features hidden" id="ecocart-features">
            <h4>✅ Eco Features</h4>
            <ul id="ecocart-features-list"></ul>
          </div>
          
          <div class="ecocart-alternatives" id="ecocart-alternatives">
            <h4>🌿 Greener Alternatives</h4>
            <div class="alternatives-list" id="ecocart-alternatives-list">
              <div class="skeleton-card"></div>
              <div class="skeleton-card"></div>
            </div>
          </div>
        </div>
        
        <div class="ecocart-error hidden" id="ecocart-error">
          <div class="error-icon">⚠️</div>
          <p id="ecocart-error-message">Unable to analyze product</p>
          <button class="ecocart-retry" id="ecocart-retry">Try Again</button>
        </div>
      </div>
      
      <div class="ecocart-footer">
        <span>Powered by AI</span>
      </div>
    `;

    document.body.appendChild(panel);

    // Add event listeners
    document.getElementById('ecocart-close').addEventListener('click', () => {
      panel.classList.add('ecocart-minimized');
    });

    document.getElementById('ecocart-retry')?.addEventListener('click', () => {
      fetchAndDisplaySustainabilityData();
    });

    // Add minimize toggle
    panel.addEventListener('click', (e) => {
      if (panel.classList.contains('ecocart-minimized') && e.target.closest('.ecocart-header')) {
        panel.classList.remove('ecocart-minimized');
      }
    });

    return panel;
  }

  /**
   * Update panel with sustainability data
   */
  function updatePanelWithData(data) {
    const loading = document.getElementById('ecocart-loading');
    const dataSection = document.getElementById('ecocart-data');
    const errorSection = document.getElementById('ecocart-error');

    loading.classList.add('hidden');
    errorSection.classList.add('hidden');
    dataSection.classList.remove('hidden');

    // Update score
    const score = data.sustainabilityScore || data.ecoScore?.totalScore || 0;
    const scoreCircle = document.getElementById('ecocart-score-circle');
    document.getElementById('ecocart-score-value').textContent = score;
    
    // Set score color
    scoreCircle.className = 'ecocart-score-circle';
    if (score >= 70) scoreCircle.classList.add('score-high');
    else if (score >= 40) scoreCircle.classList.add('score-medium');
    else scoreCircle.classList.add('score-low');

    // Update rating
    const rating = data.ecoScore?.rating || getScoreRating(score);
    document.getElementById('ecocart-rating').textContent = `${rating} - ${getScoreLabel(score)}`;

    // Update metrics
    document.getElementById('ecocart-carbon').textContent = data.carbonFootprint ?? '--';
    document.getElementById('ecocart-water').textContent = data.waterUsage ?? '--';
    document.getElementById('ecocart-packaging').textContent = data.packagingType || 'Unknown';

    // Update concerns
    if (data.environmentalConcerns?.length > 0) {
      const concernsSection = document.getElementById('ecocart-concerns');
      const concernsList = document.getElementById('ecocart-concerns-list');
      concernsList.innerHTML = data.environmentalConcerns.map(c => `<li>${c}</li>`).join('');
      concernsSection.classList.remove('hidden');
    }

    // Update features
    if (data.ecoFeatures?.length > 0) {
      const featuresSection = document.getElementById('ecocart-features');
      const featuresList = document.getElementById('ecocart-features-list');
      featuresList.innerHTML = data.ecoFeatures.map(f => `<li>${f}</li>`).join('');
      featuresSection.classList.remove('hidden');
    }

    // Update alternatives
    const alternativesList = document.getElementById('ecocart-alternatives-list');
    if (data.alternatives?.length > 0) {
      alternativesList.innerHTML = data.alternatives.map(alt => `
        <div class="alternative-card" data-url="${alt.url || '#'}">
          <div class="alt-score-badge">${alt.score}</div>
          <div class="alt-details">
            <div class="alt-name">${alt.name}</div>
            <div class="alt-price">${alt.price || ''}</div>
            ${alt.reason ? `<div class="alt-reason">${alt.reason}</div>` : ''}
          </div>
        </div>
      `).join('');

      // Add click handlers
      alternativesList.querySelectorAll('.alternative-card').forEach(card => {
        card.addEventListener('click', () => {
          const url = card.dataset.url;
          if (url && url !== '#') window.open(url, '_blank');
        });
      });
    } else {
      alternativesList.innerHTML = '<p class="no-alternatives">No alternatives found</p>';
    }
  }

  /**
   * Show error in panel
   */
  function showPanelError(message) {
    const loading = document.getElementById('ecocart-loading');
    const dataSection = document.getElementById('ecocart-data');
    const errorSection = document.getElementById('ecocart-error');

    loading.classList.add('hidden');
    dataSection.classList.add('hidden');
    errorSection.classList.remove('hidden');
    document.getElementById('ecocart-error-message').textContent = message;
  }

  /**
   * Get score rating letter
   */
  function getScoreRating(score) {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'E';
  }

  /**
   * Get score label
   */
  function getScoreLabel(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    if (score >= 20) return 'Below Average';
    return 'Poor';
  }

  /**
   * Fetch sustainability data from Google Cloud Function
   * @param {Object} productData - Extracted product information
   * @returns {Promise<Object>} - Sustainability data from API
   */
  async function fetchSustainabilityData(productData) {
    try {
      const response = await fetch(`${API_BASE_URL}/getSustainabilityData`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
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
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "API returned unsuccessful response");
      }

      return {
        success: true,
        carbonFootprint: data.carbonFootprint,
        waterUsage: data.waterUsage,
        sustainabilityScore: data.sustainabilityScore,
        ecoScore: data.ecoScore,
        packagingType: data.packagingType,
        environmentalConcerns: data.environmentalConcerns || [],
        ecoFeatures: data.ecoFeatures || [],
        recommendations: data.recommendations || [],
        alternatives: data.alternatives || [],
        cached: data.cached,
        aiGenerated: data.aiGenerated
      };

    } catch (error) {
      console.error("EcoCart: API fetch error:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch with retry logic for reliability
   */
  async function fetchWithRetry(productData, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`EcoCart: Fetching sustainability data (attempt ${attempt}/${maxRetries})`);
        const result = await fetchSustainabilityData(productData);
        
        if (result.success) {
          console.log("EcoCart: Successfully fetched sustainability data", result);
          return result;
        }
        
        lastError = new Error(result.error);
      } catch (error) {
        lastError = error;
        console.warn(`EcoCart: Attempt ${attempt} failed:`, error.message);
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    return {
      success: false,
      error: lastError?.message || "Failed after multiple attempts"
    };
  }

  /**
   * Main function to fetch and display sustainability data
   */
  async function analyzeProduct() {
    const productInfo = getProductInfo();
    
    if (!productInfo.name) {
      console.warn("EcoCart: Could not extract product name");
      return null;
    }

    console.log("EcoCart: Analyzing product:", productInfo.name);
    
    // Fetch sustainability data from Cloud Function
    const sustainabilityData = await fetchWithRetry(productInfo);
    
    if (sustainabilityData.success) {
      // Store in chrome storage for popup access
      chrome.storage.local.set({ 
        currentProduct: productInfo,
        sustainabilityData: sustainabilityData 
      });

      // Update the floating panel if it exists
      if (typeof updatePanelWithData === 'function') {
        updatePanelWithData(sustainabilityData);
      }

      return sustainabilityData;
    } else {
      console.error("EcoCart: Failed to fetch sustainability data:", sustainabilityData.error);
      
      if (typeof showPanelError === 'function') {
        showPanelError(sustainabilityData.error);
      }

      return null;
    }
  }

  /**
   * Updated fetchAndDisplaySustainabilityData to use direct fetch
   */
  async function fetchAndDisplaySustainabilityData() {
    const productInfo = getProductInfo();
    
    if (!productInfo.name) {
      showPanelError('Could not detect product information');
      return;
    }

    try {
      const result = await fetchWithRetry(productInfo);
      
      if (result.success) {
        updatePanelWithData(result);
      } else {
        showPanelError(result.error || 'Failed to fetch sustainability data');
      }
    } catch (error) {
      console.error("EcoCart: Error in fetchAndDisplaySustainabilityData:", error);
      showPanelError('Error analyzing product');
    }
  }

  // Initialize
  function init() {
    // Only inject on product pages
    const isProductPage = 
      window.location.hostname.includes('amazon') && window.location.pathname.includes('/dp/') ||
      window.location.hostname.includes('flipkart');

    if (isProductPage) {
      // Wait for page to load
      setTimeout(() => {
        injectEcoCartPanel();
        fetchAndDisplaySustainabilityData();
      }, 1500);
    }
  }

  // Store product data
  const productInfo = getProductInfo();
  chrome.storage.local.set({ currentProduct: productInfo });

  // Listen for requests from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getProductInfo") {
      sendResponse({ success: true, data: getProductInfo() });
    }
    return true;
  });

  console.log("EcoCart: Product data extracted", productInfo);

  // Initialize panel
  init();
})();
