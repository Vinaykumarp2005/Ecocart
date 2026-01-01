require('dotenv').config();

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

console.log('Environment check:');
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set (length: ' + process.env.GEMINI_API_KEY.length + ')' : 'NOT SET');
console.log('- GOOGLE_CLOUD_PROJECT:', process.env.GOOGLE_CLOUD_PROJECT || 'NOT SET');

// === In-memory cache to reduce API calls ===
const productCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache TTL

function getCachedProduct(productName) {
  const key = productName?.toLowerCase().trim();
  if (!key) return null;
  
  const cached = productCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('✓ Cache hit for:', productName);
    return cached.data;
  }
  return null;
}

function setCachedProduct(productName, data) {
  const key = productName?.toLowerCase().trim();
  if (!key) return;
  
  productCache.set(key, {
    data,
    timestamp: Date.now()
  });
  console.log('✓ Cached product:', productName);
}

// Product category sustainability baselines (based on industry research)
const categoryBaselines = {
  "electronics": { carbon: 70, water: 12000, baseScore: 35, concerns: ["E-waste disposal", "Rare earth mining", "High energy manufacturing"] },
  "clothing": { carbon: 15, water: 2700, baseScore: 45, concerns: ["Textile waste", "Water-intensive production", "Synthetic fiber pollution"] },
  "furniture": { carbon: 90, water: 3500, baseScore: 40, concerns: ["Deforestation risk", "VOC emissions", "Long-distance shipping"] },
  "carpets": { carbon: 45, water: 2800, baseScore: 42, concerns: ["Synthetic fiber production", "Chemical treatments", "Non-biodegradable materials"] },
  "beauty": { carbon: 8, water: 600, baseScore: 50, concerns: ["Plastic packaging", "Chemical ingredients", "Animal testing"] },
  "food": { carbon: 5, water: 1200, baseScore: 55, concerns: ["Food miles", "Packaging waste", "Agricultural impact"] },
  "toys": { carbon: 12, water: 900, baseScore: 45, concerns: ["Plastic content", "Short lifespan", "Battery waste"] },
  "sports": { carbon: 18, water: 1400, baseScore: 48, concerns: ["Synthetic materials", "Manufacturing emissions", "Durability concerns"] },
  "home": { carbon: 30, water: 1800, baseScore: 45, concerns: ["Manufacturing impact", "Packaging waste", "Material sourcing"] },
  "default": { carbon: 25, water: 1500, baseScore: 45, concerns: ["Manufacturing impact", "Transportation emissions", "End-of-life disposal"] }
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
  // CORS headers - MUST be first
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.set('Access-Control-Max-Age', '3600');

  // Handle preflight
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

    console.log('\n========================================');
    console.log('Processing product:', name);
    console.log('Brand:', brand);
    console.log('Category:', category);
    console.log('========================================\n');

    // Check in-memory cache first (fastest)
    const cachedResult = getCachedProduct(name);
    if (cachedResult) {
      return res.status(200).json({
        success: true,
        cached: true,
        cacheType: 'memory',
        ...cachedResult
      });
    }

    // Check for demo product first
    const demoProduct = getDemoProduct(name);
    if (demoProduct) {
      console.log('✓ Returning demo data for:', name);
      
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

    // Check cache
    const cachedData = await getProductData(name);
    
    if (cachedData.found && !cachedData.stale) {
      console.log('✓ Returning cached data for:', name);
      const data = cachedData.data;
      
      return res.status(200).json({
        success: true,
        cached: true,
        product: name,
        ...formatResponse(data)
      });
    }

    // Use Gemini AI for estimation
    console.log('→ Calling Gemini AI for:', name);
    let geminiSuccess = false;
    let sustainabilityData = await estimateEnvironmentalImpact({
      name,
      brand,
      category,
      price,
      description
    });

    if (sustainabilityData) {
      console.log('✓ Gemini returned data:', JSON.stringify(sustainabilityData, null, 2));
      geminiSuccess = true;
    } else {
      console.log('✗ Gemini failed, using fallback calculation');
      sustainabilityData = calculateSustainability({
        name,
        brand,
        category,
        price,
        url,
        source
      });
      sustainabilityData.aiGenerated = false;
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

    // Get alternatives - only call Gemini if first call succeeded (quota not exhausted)
    let alternatives = [];
    if (geminiSuccess) {
      alternatives = await suggestAlternatives(
        { name, category: detectedCategory },
        ecoScore.totalScore
      );
    }

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

    // Prepare response
    const responseData = {
      product: name,
      ...formatResponse(fullData)
    };

    // Cache the result in memory
    setCachedProduct(name, responseData);

    res.status(200).json({
      success: true,
      cached: false,
      aiGenerated: sustainabilityData.aiGenerated !== false,
      ...responseData
    });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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

  // Base calculations with some randomization for realism
  const variance = 0.15; // 15% variance
  let carbonFootprint = baseline.carbon * (1 + (Math.random() - 0.5) * variance);
  let waterUsage = baseline.water * (1 + (Math.random() - 0.5) * variance);
  let score = baseline.baseScore;

  // Environmental concerns from baseline
  let environmentalConcerns = [...(baseline.concerns || [])];
  let ecoFeatures = [];

  // Adjust based on price (higher price often means better quality/durability)
  const numericPrice = parsePrice(price);
  if (numericPrice > 0) {
    const priceModifier = Math.min(numericPrice / 1000, 0.2);
    score += priceModifier * 10;
    if (numericPrice > 2000) {
      ecoFeatures.push('Premium quality (better durability)');
    }
  }

  // Eco-brand bonus
  const brandLower = (brand || '').toLowerCase();
  if (ecoBrands[brandLower]) {
    score *= ecoBrands[brandLower];
    carbonFootprint *= 0.7;
    waterUsage *= 0.75;
    ecoFeatures.push('Eco-certified brand');
    environmentalConcerns = environmentalConcerns.slice(0, 1); // Reduce concerns for eco brands
  }

  // Check for eco-keywords in product name
  const ecoKeywordMap = {
    'organic': 'Organic materials',
    'sustainable': 'Sustainable production',
    'eco': 'Eco-friendly design',
    'recycled': 'Made from recycled materials',
    'biodegradable': 'Biodegradable materials',
    'natural': 'Natural materials',
    'bamboo': 'Sustainable bamboo',
    'hemp': 'Eco-friendly hemp',
    'jute': 'Natural jute fiber',
    'cotton': 'Cotton material'
  };
  
  const nameLower = name.toLowerCase();
  let ecoKeywordCount = 0;
  
  for (const [keyword, feature] of Object.entries(ecoKeywordMap)) {
    if (nameLower.includes(keyword)) {
      ecoKeywordCount++;
      if (ecoFeatures.length < 3) {
        ecoFeatures.push(feature);
      }
    }
  }
  
  if (ecoKeywordCount > 0) {
    score += ecoKeywordCount * 8;
    carbonFootprint *= (1 - ecoKeywordCount * 0.1);
    waterUsage *= (1 - ecoKeywordCount * 0.08);
  }

  // Add specific concerns based on product characteristics
  if (nameLower.includes('synthetic') || nameLower.includes('polyester') || nameLower.includes('nylon')) {
    environmentalConcerns.unshift('Synthetic materials from petroleum');
    score -= 5;
  }
  if (nameLower.includes('thick') || nameLower.includes('heavy')) {
    carbonFootprint *= 1.2;
    waterUsage *= 1.15;
  }

  // Cap score at 100 and minimum at 15
  score = Math.max(15, Math.min(Math.round(score), 100));
  carbonFootprint = Math.round(carbonFootprint * 10) / 10;
  waterUsage = Math.round(waterUsage);

  return {
    carbonFootprint,
    waterUsage,
    sustainabilityScore: score,
    environmentalConcerns: environmentalConcerns.slice(0, 3),
    ecoFeatures: ecoFeatures.slice(0, 3),
    reasoning: `Estimated based on ${detectedCategory} category averages and product characteristics. ${ecoKeywordCount > 0 ? 'Eco-friendly keywords detected.' : ''} ${ecoBrands[brandLower] ? 'Recognized eco-brand.' : ''}`.trim(),
    confidence: ecoKeywordCount > 0 || ecoBrands[brandLower] ? 'medium' : 'low',
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

  // Check for carpets/rugs first (more specific)
  if (/carpet|rug|mat|shag|runner|doormat/.test(combined)) {
    return 'carpets';
  }
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

// Real eco-friendly alternatives database by category
const ecoAlternativesDB = {
  carpets: [
    { name: "Jute Natural Fiber Area Rug - Handwoven", price: "₹2,499", score: 82, reason: "Made from 100% natural jute fiber, biodegradable" },
    { name: "Recycled Cotton Dhurrie Rug", price: "₹1,899", score: 78, reason: "Made from recycled cotton, handcrafted in India" },
    { name: "Bamboo Silk Eco Carpet - 5x7 ft", price: "₹3,299", score: 85, reason: "Sustainable bamboo silk, low water footprint" },
    { name: "Organic Cotton Hand-Tufted Rug", price: "₹2,799", score: 80, reason: "GOTS certified organic cotton, natural dyes" },
    { name: "Seagrass Natural Fiber Mat", price: "₹1,599", score: 75, reason: "Renewable seagrass, naturally hypoallergenic" }
  ],
  electronics: [
    { name: "Fairphone 5 - Modular Smartphone", price: "₹54,999", score: 78, reason: "Modular design, repairable, fair-trade materials" },
    { name: "Framework Laptop 13", price: "₹89,999", score: 82, reason: "Fully upgradeable and repairable laptop" },
    { name: "Anker Solar Power Bank 25000mAh", price: "₹3,499", score: 72, reason: "Solar-powered charging, reduces grid dependency" },
    { name: "House of Marley Positive Vibration Headphones", price: "₹4,999", score: 75, reason: "FSC certified wood, recycled aluminum" },
    { name: "Nimble Eco-Friendly Phone Case", price: "₹1,299", score: 70, reason: "Made from plant-based materials, plastic-free" }
  ],
  clothing: [
    { name: "Organic Cotton T-Shirt - Solids", price: "₹799", score: 80, reason: "100% GOTS certified organic cotton" },
    { name: "Hemp Blend Casual Shirt", price: "₹1,499", score: 85, reason: "Hemp requires 50% less water than cotton" },
    { name: "Recycled Polyester Track Pants", price: "₹1,299", score: 72, reason: "Made from recycled plastic bottles" },
    { name: "Bamboo Fiber Socks (Pack of 3)", price: "₹599", score: 78, reason: "Bamboo is naturally antibacterial and sustainable" },
    { name: "Tencel Lyocell Dress", price: "₹2,199", score: 82, reason: "Made from sustainably sourced wood pulp" }
  ],
  furniture: [
    { name: "Reclaimed Wood Coffee Table", price: "₹8,999", score: 85, reason: "Made from reclaimed/salvaged wood" },
    { name: "Bamboo Bookshelf - 4 Tier", price: "₹4,499", score: 82, reason: "Fast-growing bamboo, FSC certified" },
    { name: "Recycled Plastic Outdoor Chair", price: "₹3,299", score: 78, reason: "Made from ocean-bound recycled plastic" },
    { name: "Cork & Wood Side Table", price: "₹5,999", score: 80, reason: "Sustainable cork, renewable resource" },
    { name: "Rattan Cane Chair - Handmade", price: "₹6,499", score: 83, reason: "Natural rattan, supports traditional crafts" }
  ],
  beauty: [
    { name: "Forest Essentials Organic Face Wash", price: "₹1,175", score: 80, reason: "Ayurvedic, natural ingredients, recyclable packaging" },
    { name: "Plum Goodness Shampoo Bar", price: "₹350", score: 85, reason: "Zero plastic, vegan, cruelty-free" },
    { name: "Juicy Chemistry Cold-Pressed Oil", price: "₹699", score: 82, reason: "Organic certified, glass packaging" },
    { name: "Bare Necessities Bamboo Toothbrush", price: "₹149", score: 88, reason: "Biodegradable bamboo handle" },
    { name: "Ruby's Organics Lipstick", price: "₹950", score: 78, reason: "Vegan, chemical-free, recyclable tube" }
  ],
  food: [
    { name: "Organic India Green Tea - 25 Bags", price: "₹199", score: 85, reason: "Certified organic, sustainable farming" },
    { name: "Two Brothers Organic A2 Ghee 500ml", price: "₹899", score: 82, reason: "Grass-fed, traditional bilona method" },
    { name: "Conscious Food Organic Rice 1kg", price: "₹180", score: 80, reason: "Pesticide-free, supports small farmers" },
    { name: "Natures Path Organic Granola", price: "₹599", score: 78, reason: "USDA organic, non-GMO verified" },
    { name: "Praakritik Organic Honey 500g", price: "₹450", score: 83, reason: "Raw, unprocessed, forest-sourced" }
  ],
  toys: [
    { name: "Shumee Wooden Building Blocks", price: "₹899", score: 85, reason: "Non-toxic wood, child-safe paints" },
    { name: "Ariro Wooden Stacking Toy", price: "₹649", score: 82, reason: "Handcrafted, natural wood finish" },
    { name: "Plan Toys Sustainable Dollhouse", price: "₹4,999", score: 88, reason: "Rubberwood from expired trees, non-toxic" },
    { name: "Skola Toys Wooden Puzzle Set", price: "₹599", score: 80, reason: "Educational, made from sustainable wood" },
    { name: "Maya Organic Wooden Rattle", price: "₹399", score: 83, reason: "Hand-turned wood, vegetable dyes" }
  ],
  sports: [
    { name: "Nivia Simbolo Eco Football", price: "₹799", score: 75, reason: "Made with recycled materials" },
    { name: "Yoga Mat - Natural Rubber Cork", price: "₹2,499", score: 85, reason: "100% natural rubber, cork surface" },
    { name: "Bamboo Cricket Bat - Kashmir Willow", price: "₹1,999", score: 78, reason: "Sustainable bamboo handle" },
    { name: "Organic Cotton Yoga Pants", price: "₹1,299", score: 80, reason: "GOTS certified organic cotton" },
    { name: "Recycled Rubber Resistance Bands", price: "₹499", score: 72, reason: "Made from recycled tire rubber" }
  ],
  home: [
    { name: "Terracotta Water Bottle 1L", price: "₹399", score: 82, reason: "Natural clay, keeps water cool" },
    { name: "Bamboo Kitchen Utensil Set", price: "₹699", score: 85, reason: "Sustainable bamboo, plastic-free" },
    { name: "Coconut Bowl Set (Pack of 2)", price: "₹549", score: 80, reason: "Upcycled coconut shells" },
    { name: "Beeswax Food Wraps - 3 Pack", price: "₹599", score: 88, reason: "Reusable, replaces plastic wrap" },
    { name: "Jute Storage Basket Set", price: "₹899", score: 78, reason: "Natural jute, handwoven" }
  ],
  default: [
    { name: "Eco-Friendly Alternative", price: "₹999", score: 75, reason: "Made with sustainable materials" },
    { name: "Green Choice Product", price: "₹1,299", score: 78, reason: "Lower environmental footprint" },
    { name: "Sustainable Option", price: "₹1,499", score: 80, reason: "Ethically sourced and produced" }
  ]
};

function getMockAlternatives(category, currentScore) {
  const categoryAlternatives = ecoAlternativesDB[category] || ecoAlternativesDB.default;
  
  // Filter alternatives that have a higher score than current product
  // and return top 3
  return categoryAlternatives
    .filter(alt => alt.score > currentScore)
    .sort((a, b) => a.score - b.score)  // Sort by score ascending (show closest better options first)
    .slice(0, 3)
    .map(alt => ({
      ...alt,
      url: "#"  // Could be replaced with actual search URLs
    }));
}
