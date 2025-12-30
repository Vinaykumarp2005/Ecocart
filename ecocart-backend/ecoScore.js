/**
 * Scoring weights (must sum to 1.0)
 */
const WEIGHTS = {
  carbon: 0.45,      // 45% - Carbon footprint impact
  water: 0.30,       // 30% - Water usage impact
  packaging: 0.25    // 25% - Packaging impact
};

/**
 * Reference benchmarks by category (industry averages)
 */
const CATEGORY_BENCHMARKS = {
  electronics: { carbon: 50, water: 5000, packaging: 3 },
  clothing: { carbon: 20, water: 2700, packaging: 2 },
  furniture: { carbon: 80, water: 3000, packaging: 4 },
  beauty: { carbon: 5, water: 500, packaging: 3 },
  food: { carbon: 3, water: 1000, packaging: 2 },
  toys: { carbon: 10, water: 800, packaging: 3 },
  sports: { carbon: 15, water: 1200, packaging: 2 },
  home: { carbon: 25, water: 1500, packaging: 3 },
  default: { carbon: 20, water: 1500, packaging: 2.5 }
};

/**
 * Packaging type scores (1-5, lower is better)
 */
const PACKAGING_SCORES = {
  'plastic': 5,
  'mixed_plastic': 4.5,
  'styrofoam': 5,
  'cardboard': 2,
  'recycled_cardboard': 1.5,
  'paper': 1.5,
  'biodegradable': 1,
  'minimal': 1,
  'glass': 2.5,
  'metal': 3,
  'compostable': 1,
  'unknown': 3
};

/**
 * Calculate comprehensive Eco Score
 * @param {Object} params - Input parameters
 * @param {number} params.carbonFootprint - Carbon footprint in kg CO2
 * @param {number} params.waterUsage - Water usage in liters
 * @param {string|number} params.packaging - Packaging type or score (1-5)
 * @param {string} params.category - Product category
 * @returns {Object} Eco score breakdown
 */
function calculateEcoScore({ carbonFootprint, waterUsage, packaging, category = 'default' }) {
  const benchmark = CATEGORY_BENCHMARKS[category] || CATEGORY_BENCHMARKS.default;

  // Calculate individual scores (0-100, higher is better)
  const carbonScore = calculateCarbonScore(carbonFootprint, benchmark.carbon);
  const waterScore = calculateWaterScore(waterUsage, benchmark.water);
  const packagingScore = calculatePackagingScore(packaging, benchmark.packaging);

  // Calculate weighted total score
  const totalScore = Math.round(
    (carbonScore * WEIGHTS.carbon) +
    (waterScore * WEIGHTS.water) +
    (packagingScore * WEIGHTS.packaging)
  );

  // Determine rating and label
  const { rating, label, color } = getScoreRating(totalScore);

  return {
    totalScore,
    rating,
    label,
    color,
    breakdown: {
      carbon: {
        score: carbonScore,
        weight: WEIGHTS.carbon,
        weighted: Math.round(carbonScore * WEIGHTS.carbon),
        value: carbonFootprint,
        unit: 'kg CO₂',
        benchmark: benchmark.carbon
      },
      water: {
        score: waterScore,
        weight: WEIGHTS.water,
        weighted: Math.round(waterScore * WEIGHTS.water),
        value: waterUsage,
        unit: 'liters',
        benchmark: benchmark.water
      },
      packaging: {
        score: packagingScore,
        weight: WEIGHTS.packaging,
        weighted: Math.round(packagingScore * WEIGHTS.packaging),
        value: typeof packaging === 'string' ? packaging : `${packaging}/5`,
        unit: 'impact rating',
        benchmark: benchmark.packaging
      }
    },
    recommendations: generateRecommendations(carbonScore, waterScore, packagingScore)
  };
}

/**
 * Calculate carbon footprint score (0-100)
 * Uses logarithmic scale for better distribution
 */
function calculateCarbonScore(carbonFootprint, benchmark) {
  if (!carbonFootprint || carbonFootprint <= 0) return 50; // Unknown

  // Ratio of actual to benchmark (lower is better)
  const ratio = carbonFootprint / benchmark;

  // Convert to score using inverse logarithmic scale
  // ratio < 1 means better than benchmark (score > 50)
  // ratio > 1 means worse than benchmark (score < 50)
  let score;
  if (ratio <= 0.2) {
    score = 100;
  } else if (ratio <= 0.5) {
    score = 80 + (0.5 - ratio) * 66.67;
  } else if (ratio <= 1) {
    score = 50 + (1 - ratio) * 60;
  } else if (ratio <= 2) {
    score = 25 + (2 - ratio) * 25;
  } else {
    score = Math.max(0, 25 - (ratio - 2) * 10);
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Calculate water usage score (0-100)
 */
function calculateWaterScore(waterUsage, benchmark) {
  if (!waterUsage || waterUsage <= 0) return 50; // Unknown

  const ratio = waterUsage / benchmark;

  let score;
  if (ratio <= 0.2) {
    score = 100;
  } else if (ratio <= 0.5) {
    score = 80 + (0.5 - ratio) * 66.67;
  } else if (ratio <= 1) {
    score = 50 + (1 - ratio) * 60;
  } else if (ratio <= 2) {
    score = 25 + (2 - ratio) * 25;
  } else {
    score = Math.max(0, 25 - (ratio - 2) * 10);
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Calculate packaging score (0-100)
 */
function calculatePackagingScore(packaging, benchmark) {
  let packagingValue;

  if (typeof packaging === 'string') {
    packagingValue = PACKAGING_SCORES[packaging.toLowerCase()] || PACKAGING_SCORES.unknown;
  } else if (typeof packaging === 'number') {
    packagingValue = Math.min(5, Math.max(1, packaging));
  } else {
    packagingValue = PACKAGING_SCORES.unknown;
  }

  // Convert 1-5 scale to 0-100 (1 = 100, 5 = 0)
  const score = ((5 - packagingValue) / 4) * 100;

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Get rating label and color based on score
 */
function getScoreRating(score) {
  if (score >= 80) {
    return { rating: 'A', label: 'Excellent', color: '#22c55e' };
  } else if (score >= 60) {
    return { rating: 'B', label: 'Good', color: '#84cc16' };
  } else if (score >= 40) {
    return { rating: 'C', label: 'Average', color: '#eab308' };
  } else if (score >= 20) {
    return { rating: 'D', label: 'Below Average', color: '#f97316' };
  } else {
    return { rating: 'E', label: 'Poor', color: '#ef4444' };
  }
}

/**
 * Generate improvement recommendations
 */
function generateRecommendations(carbonScore, waterScore, packagingScore) {
  const recommendations = [];

  if (carbonScore < 50) {
    recommendations.push({
      area: 'Carbon Footprint',
      suggestion: 'Look for locally manufactured alternatives to reduce transportation emissions.'
    });
  }

  if (waterScore < 50) {
    recommendations.push({
      area: 'Water Usage',
      suggestion: 'Consider products made with water-efficient manufacturing processes.'
    });
  }

  if (packagingScore < 50) {
    recommendations.push({
      area: 'Packaging',
      suggestion: 'Choose products with minimal or recyclable packaging.'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      area: 'Great Choice',
      suggestion: 'This product has good environmental credentials!'
    });
  }

  return recommendations;
}

/**
 * Detect packaging type from product description
 */
function detectPackagingType(description) {
  if (!description) return 'unknown';
  
  const descLower = description.toLowerCase();
  
  const packagingKeywords = {
    'biodegradable': ['biodegradable', 'bio-degradable', 'compostable'],
    'recycled_cardboard': ['recycled cardboard', 'recycled packaging', 'eco packaging'],
    'cardboard': ['cardboard', 'carton', 'paper box'],
    'minimal': ['minimal packaging', 'no plastic', 'plastic-free', 'zero waste'],
    'paper': ['paper packaging', 'paper wrapped'],
    'plastic': ['plastic packaging', 'plastic wrap', 'blister pack'],
    'glass': ['glass container', 'glass bottle', 'glass jar']
  };

  for (const [type, keywords] of Object.entries(packagingKeywords)) {
    if (keywords.some(kw => descLower.includes(kw))) {
      return type;
    }
  }

  return 'unknown';
}

module.exports = {
  calculateEcoScore,
  calculateCarbonScore,
  calculateWaterScore,
  calculatePackagingScore,
  detectPackagingType,
  WEIGHTS,
  CATEGORY_BENCHMARKS,
  PACKAGING_SCORES
};
