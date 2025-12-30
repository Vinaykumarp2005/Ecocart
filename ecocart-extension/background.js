const API_BASE_URL = "http://localhost:8080"; // Change to your Cloud Function URL for production
// const API_BASE_URL = "https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchSustainabilityData") {
    fetchSustainabilityFromAPI(request.productData)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === "fetchAPI") {
    fetch(request.url, {
      method: request.method || "GET",
      headers: request.headers || { "Content-Type": "application/json" },
      body: request.body ? JSON.stringify(request.body) : undefined
    })
      .then(response => response.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  return true;
});

/**
 * Fetch sustainability data from Cloud Function API
 */
async function fetchSustainabilityFromAPI(productData) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

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
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "API returned error");
    }

    return {
      carbonFootprint: data.carbonFootprint,
      waterUsage: data.waterUsage,
      sustainabilityScore: data.sustainabilityScore,
      ecoScore: data.ecoScore,
      packagingType: data.packagingType,
      environmentalConcerns: data.environmentalConcerns || [],
      ecoFeatures: data.ecoFeatures || [],
      recommendations: data.recommendations || [],
      alternatives: data.alternatives || [],
      reasoning: data.reasoning,
      confidence: data.confidence,
      cached: data.cached,
      aiGenerated: data.aiGenerated
    };

  } catch (error) {
    clearTimeout(timeout);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    
    throw error;
  }
}
