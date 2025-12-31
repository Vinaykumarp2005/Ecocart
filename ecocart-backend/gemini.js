require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Debug: Check if API key is loaded
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('WARNING: GEMINI_API_KEY not found in environment variables!');
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Estimate environmental impact using Gemini AI
 */
async function estimateEnvironmentalImpact(productData) {
  if (!apiKey) {
    console.error('Gemini API key not configured');
    return null;
  }

  try {
    // Try different model names in order of preference
    const modelNames = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    let model;
    let lastError;

    for (const modelName of modelNames) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        console.log(`Using Gemini model: ${modelName}`);
        break;
      } catch (e) {
        lastError = e;
        console.log(`Model ${modelName} not available, trying next...`);
      }
    }

    if (!model) {
      throw lastError || new Error('No Gemini model available');
    }

    const prompt = `
You are an environmental sustainability expert. Analyze the following product and estimate its environmental impact.

Product Name: ${productData.name}
Brand: ${productData.brand || 'Unknown'}
Category: ${productData.category || 'Unknown'}
Description: ${productData.description || 'Not provided'}
Price: ${productData.price || 'Unknown'}

Provide REALISTIC estimates based on industry data for:
1. Carbon Footprint (kg CO2 equivalent) - consider manufacturing, transportation, packaging
2. Water Usage (liters) - consider production and raw materials
3. Sustainability Score (0-100) - overall environmental friendliness
4. Key environmental concerns for this product (2-4 concerns)
5. Eco-friendly features if any detected (0-3 features)

Be specific and realistic. For example:
- A smartphone typically has 70-80kg CO2 and 12000+ liters water usage
- A cotton t-shirt typically has 8-10kg CO2 and 2700 liters water
- Electronics generally score 25-40, organic products score 70-90

IMPORTANT: Respond ONLY with a valid JSON object in this exact format, no additional text:
{
  "carbonFootprint": <number>,
  "waterUsage": <number>,
  "sustainabilityScore": <number>,
  "environmentalConcerns": ["<concern1>", "<concern2>"],
  "ecoFeatures": ["<feature1>", "<feature2>"],
  "reasoning": "<brief explanation of estimates>",
  "confidence": "<low|medium|high>"
}
`;

    console.log('Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    console.log('Gemini response received:', text.substring(0, 200) + '...');

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('Parsed Gemini data:', parsed);

    // Validate and sanitize response
    return {
      carbonFootprint: validateNumber(parsed.carbonFootprint, 0, 1000, 20),
      waterUsage: validateNumber(parsed.waterUsage, 0, 100000, 1500),
      sustainabilityScore: validateNumber(parsed.sustainabilityScore, 0, 100, 50),
      environmentalConcerns: Array.isArray(parsed.environmentalConcerns) 
        ? parsed.environmentalConcerns.slice(0, 5) 
        : [],
      ecoFeatures: Array.isArray(parsed.ecoFeatures) 
        ? parsed.ecoFeatures.slice(0, 5) 
        : [],
      reasoning: parsed.reasoning || '',
      confidence: ['low', 'medium', 'high'].includes(parsed.confidence) 
        ? parsed.confidence 
        : 'medium',
      aiGenerated: true
    };

  } catch (error) {
    console.error('Gemini API error:', error.message);
    console.error('Full error:', error);
    return null;
  }
}

/**
 * Get eco-friendly alternatives using Gemini AI
 */
async function suggestAlternatives(productData, currentScore) {
  if (!apiKey) {
    console.error('Gemini API key not configured');
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are a sustainable shopping advisor in India. Suggest 3 more eco-friendly alternatives to this product.

Product: ${productData.name}
Category: ${productData.category || 'General'}
Current Sustainability Score: ${currentScore}/100

For each alternative, provide:
- A realistic product name (real brands available in India preferred)
- Estimated price in INR (realistic market price)
- Sustainability score (must be higher than ${currentScore})
- Brief reason why it's more sustainable

IMPORTANT: Respond ONLY with a valid JSON array, no additional text:
[
  {
    "name": "<product name>",
    "price": "₹<price>",
    "score": <number higher than ${currentScore}>,
    "reason": "<why more sustainable>"
  }
]
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON array in response');
    }

    const alternatives = JSON.parse(jsonMatch[0]);

    return alternatives
      .filter(alt => alt.score > currentScore)
      .slice(0, 3)
      .map(alt => ({
        name: alt.name,
        price: alt.price,
        score: Math.min(alt.score, 100),
        reason: alt.reason,
        url: '#'
      }));

  } catch (error) {
    console.error('Gemini alternatives error:', error.message);
    return [];
  }
}

/**
 * Validate number within range with fallback
 */
function validateNumber(value, min, max, fallback) {
  const num = parseFloat(value);
  if (isNaN(num) || num < min || num > max) {
    return fallback;
  }
  return Math.round(num * 10) / 10;
}

module.exports = {
  estimateEnvironmentalImpact,
  suggestAlternatives
};
