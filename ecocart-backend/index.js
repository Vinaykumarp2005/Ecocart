const functions = require('@google-cloud/functions-framework');
const { 
  getProductData, 
  storeProductData, 
  getGreenerAlternativesFromDB 
} = require('./firestore');
const { 
  estimateEnvironmentalImpact, 
  suggestAlternatives 
} = require('./gemini');
const {
  calculateEcoScore,
  detectPackagingType
} = require('./ecoScore');
const {
  getDemoProduct,
  getAllDemoProducts
} = require('./demoData');

// Product category sustainability baselines (example data)
const categoryBaselines = {
  "electronics": { carbon: 50, water: 5000, baseScore: 40 },
  "clothing": { carbon: 20, water: 2700, baseScore: 50 },
  "furniture": { carbon: 80, water: 3000, baseScore: 45 },
  "beauty": { carbon: 5, water: 500, baseScore: 55 },
  "food": { carbon: 3, water: 1000, baseScore: 60 },
  "toys": { carbon: 10, water: 800, baseScore: 50 },
  "sports": { carbon: 15, water: 1200, baseScore: 55 },
  "home": { carbon: 25, water: 1500, baseScore: 50 },
  "default": { carbon: 20, water: 1500, baseScore: 50 }
};

// Eco-friendly brand modifiers
const ecoBrands = {
  "patagonia": 1.4,
  "the body shop": 1.3,
  "lush": 1.3,
  "seventh generation": 1.4,
  "ecover": 1.35,
  "tentree": 1.4,
  "allbirds": 1.35
};

functions.http('getSustainabilityData', async (req, res) => {
  // CORS headers - must be set for ALL responses
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // GET request returns list of demo products
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'EcoCart Sustainability API',
      demoProducts: getAllDemoProducts()
    });
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const { name, brand, category, price, url, source, description } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Product name is required' });
      return;
    }

    // Check for demo product first
    const demoProduct = getDemoProduct(name);
    if (demoProduct) {
      console.log('Returning demo data for:', name);
      
      // Calculate eco score for demo product
      const ecoScore = calculateEcoScore({
        carbonFootprint: demoProduct.carbonFootprint,
        waterUsage: demoProduct.waterUsage,
        packaging: demoProduct.packagingType,
        category: demoProduct.category
      });

      return res.status(200).json({
        success: true,
        cached: false,
        isDemo: true,
        product: demoProduct.name,
        carbonFootprint: demoProduct.carbonFootprint,
        waterUsage: demoProduct.waterUsage,
        sustainabilityScore: demoProduct.sustainabilityScore,
        ecoScore,
        packagingType: demoProduct.packagingType,
        environmentalConcerns: demoProduct.environmentalConcerns,
        ecoFeatures: demoProduct.ecoFeatures,
        reasoning: demoProduct.reasoning,
        confidence: demoProduct.confidence,
        recommendations: ecoScore.recommendations,
        alternatives: demoProduct.alternatives
      });
    }

    // Check Firestore cache first
    const cachedData = await getProductData(name);
    
    if (cachedData.found && !cachedData.stale) {
      console.log('Returning cached data for:', name);
      const data = cachedData.data;
      
      return res.status(200).json({
        success: true,
        cached: true,
        product: name,
        ...formatResponse(data)
      });
    }

    // Use Gemini AI for estimation
    let sustainabilityData = await estimateEnvironmentalImpact({
      name,
      brand,
      category,
      price,
      description
    });

    // Fallback to rule-based calculation if Gemini fails
    if (!sustainabilityData) {
      console.log('Gemini failed, using fallback calculation');
      sustainabilityData = calculateSustainability({
        name,
        brand,
        category,
        price,
        url,
        source
      });
      sustainabilityData.aiGenerated = false;
      sustainabilityData.environmentalConcerns = [];
      sustainabilityData.ecoFeatures = [];
    }

    // Detect packaging from description
    const packagingType = detectPackagingType(description);

    // Calculate comprehensive Eco Score
    const detectedCategory = detectCategory(name, category);
    const ecoScore = calculateEcoScore({
      carbonFootprint: sustainabilityData.carbonFootprint,
      waterUsage: sustainabilityData.waterUsage,
      packaging: packagingType,
      category: detectedCategory
    });

    // Get alternatives
    let alternatives = await suggestAlternatives(
      { name, category: detectedCategory },
      ecoScore.totalScore
    );

    if (alternatives.length === 0) {
      alternatives = await getGreenerAlternativesFromDB(
        detectedCategory,
        ecoScore.totalScore
      );
    }

    if (alternatives.length === 0) {
      alternatives = getMockAlternatives(detectedCategory, ecoScore.totalScore);
    }

    // Prepare data for storage and response
    const fullData = {
      ...sustainabilityData,
      ecoScore,
      brand,
      category: detectedCategory,
      packagingType,
      price,
      url,
      source,
      description,
      alternatives
    };

    // Store in Firestore
    await storeProductData(name, fullData);

    res.status(200).json({
      success: true,
      cached: false,
      aiGenerated: sustainabilityData.aiGenerated,
      product: name,
      ...formatResponse(fullData)
    });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Format response data consistently
 */
function formatResponse(data) {
  return {
    carbonFootprint: data.carbonFootprint,
    waterUsage: data.waterUsage,
    sustainabilityScore: data.ecoScore?.totalScore || data.sustainabilityScore,
    ecoScore: data.ecoScore,
    packagingType: data.packagingType,
    environmentalConcerns: data.environmentalConcerns || [],
    ecoFeatures: data.ecoFeatures || [],
    reasoning: data.reasoning,
    confidence: data.confidence,
    recommendations: data.ecoScore?.recommendations || [],
    alternatives: data.alternatives || []
  };
}

function calculateSustainability({ name, brand, category, price }) {
  // Detect category from product name or provided category
  const detectedCategory = detectCategory(name, category);
  const baseline = categoryBaselines[detectedCategory] || categoryBaselines.default;

  // Base calculations
  let carbonFootprint = baseline.carbon;
  let waterUsage = baseline.water;
  let score = baseline.baseScore;

  // Adjust based on price (higher price often means better quality/durability)
  const numericPrice = parsePrice(price);
  if (numericPrice > 0) {
    const priceModifier = Math.min(numericPrice / 1000, 0.2);
    score += priceModifier * 10;
  }

  // Eco-brand bonus
  const brandLower = (brand || '').toLowerCase();
  if (ecoBrands[brandLower]) {
    score *= ecoBrands[brandLower];
    carbonFootprint *= 0.7;
    waterUsage *= 0.75;
  }

  // Check for eco-keywords in product name
  const ecoKeywords = ['organic', 'sustainable', 'eco', 'recycled', 'biodegradable', 'natural'];
  const nameLower = name.toLowerCase();
  const ecoKeywordCount = ecoKeywords.filter(kw => nameLower.includes(kw)).length;
  
  if (ecoKeywordCount > 0) {
    score += ecoKeywordCount * 8;
    carbonFootprint *= (1 - ecoKeywordCount * 0.1);
    waterUsage *= (1 - ecoKeywordCount * 0.08);
  }

  // Cap score at 100
  score = Math.min(Math.round(score), 100);
  carbonFootprint = Math.round(carbonFootprint * 10) / 10;
  waterUsage = Math.round(waterUsage);

  return {
    carbonFootprint,
    waterUsage,
    sustainabilityScore: score,
    breakdown: {
      category: detectedCategory,
      ecoKeywordsFound: ecoKeywordCount,
      isEcoBrand: !!ecoBrands[brandLower]
    }
  };
}

function detectCategory(name, providedCategory) {
  const nameLower = (name || '').toLowerCase();
  const categoryLower = (providedCategory || '').toLowerCase();
  const combined = `${nameLower} ${categoryLower}`;

  if (/phone|laptop|tablet|computer|headphone|speaker|tv|camera|electronic/.test(combined)) {
    return 'electronics';
  }
  if (/shirt|dress|pant|jeans|jacket|shoe|clothing|apparel|wear/.test(combined)) {
    return 'clothing';
  }
  if (/chair|table|sofa|bed|desk|furniture/.test(combined)) {
    return 'furniture';
  }
  if (/cream|lotion|makeup|cosmetic|skincare|beauty|shampoo/.test(combined)) {
    return 'beauty';
  }
  if (/food|snack|drink|beverage|grocery/.test(combined)) {
    return 'food';
  }
  if (/toy|game|puzzle/.test(combined)) {
    return 'toys';
  }
  if (/fitness|yoga|sports|exercise|gym/.test(combined)) {
    return 'sports';
  }
  if (/home|kitchen|decor|appliance/.test(combined)) {
    return 'home';
  }

  return 'default';
}

function parsePrice(price) {
  if (!price) return 0;
  const cleaned = price.replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
}

function getMockAlternatives(category, currentScore) {
  return [
    {
      name: `Eco-Friendly ${category} Alternative`,
      price: "₹1,299",
      score: Math.min(currentScore + 20, 95),
      url: "#"
    },
    {
      name: `Sustainable ${category} Option`,
      price: "₹1,599",
      score: Math.min(currentScore + 30, 98),
      url: "#"
    }
  ].filter(alt => alt.score > currentScore);
}
