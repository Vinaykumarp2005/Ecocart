/**
 * Demo product database with realistic sustainability values
 * Sources: Various LCA studies, environmental databases
 */
const demoProducts = {
  // ===== PLASTIC PRODUCTS =====
  "plastic water bottle": {
    name: "Plastic Water Bottle (500ml)",
    carbonFootprint: 0.08,
    waterUsage: 1.4,
    sustainabilityScore: 25,
    packagingType: "plastic",
    category: "home",
    environmentalConcerns: [
      "Single-use plastic contributes to ocean pollution",
      "Takes 450+ years to decompose",
      "Petroleum-based manufacturing",
      "Often not recycled properly"
    ],
    ecoFeatures: [],
    reasoning: "Single-use plastic bottles have significant environmental impact due to petroleum extraction, manufacturing emissions, and end-of-life pollution.",
    confidence: "high",
    alternatives: [
      { name: "Stainless Steel Water Bottle", price: "₹599", score: 85, reason: "Reusable for 10+ years, recyclable" },
      { name: "Glass Water Bottle", price: "₹399", score: 78, reason: "100% recyclable, no chemical leaching" },
      { name: "Bamboo Water Bottle", price: "₹799", score: 90, reason: "Biodegradable, sustainable material" }
    ]
  },

  "plastic bag": {
    name: "Plastic Shopping Bag",
    carbonFootprint: 0.04,
    waterUsage: 0.2,
    sustainabilityScore: 15,
    packagingType: "plastic",
    category: "home",
    environmentalConcerns: [
      "Extremely harmful to marine life",
      "Non-biodegradable",
      "Often used for just 12 minutes on average",
      "Breaks into harmful microplastics"
    ],
    ecoFeatures: [],
    reasoning: "Plastic bags are one of the most environmentally damaging single-use items despite low production footprint.",
    confidence: "high",
    alternatives: [
      { name: "Cotton Tote Bag", price: "₹149", score: 75, reason: "Reusable 500+ times" },
      { name: "Jute Shopping Bag", price: "₹99", score: 88, reason: "Biodegradable, durable" },
      { name: "Recycled Plastic Bag", price: "₹49", score: 45, reason: "Made from ocean plastic" }
    ]
  },

  // ===== CLOTHING =====
  "cotton t-shirt": {
    name: "Cotton T-Shirt",
    carbonFootprint: 8.0,
    waterUsage: 2700,
    sustainabilityScore: 45,
    packagingType: "plastic",
    category: "clothing",
    environmentalConcerns: [
      "Conventional cotton uses heavy pesticides",
      "Extremely water-intensive crop",
      "Dyeing process pollutes waterways",
      "Often shipped from distant manufacturing"
    ],
    ecoFeatures: [
      "Natural fiber (biodegradable)",
      "Breathable and durable"
    ],
    reasoning: "Cotton is natural but conventional farming has high environmental impact. A single t-shirt needs 2,700 liters of water.",
    confidence: "high",
    alternatives: [
      { name: "Organic Cotton T-Shirt", price: "₹899", score: 72, reason: "No pesticides, 91% less water" },
      { name: "Hemp T-Shirt", price: "₹1,299", score: 85, reason: "Uses 50% less water than cotton" },
      { name: "Recycled Cotton T-Shirt", price: "₹699", score: 78, reason: "Reduces waste and water use" }
    ]
  },

  "organic cotton t-shirt": {
    name: "Organic Cotton T-Shirt",
    carbonFootprint: 5.5,
    waterUsage: 243,
    sustainabilityScore: 72,
    packagingType: "recycled_cardboard",
    category: "clothing",
    environmentalConcerns: [
      "Still requires significant water",
      "Transportation emissions"
    ],
    ecoFeatures: [
      "No synthetic pesticides or fertilizers",
      "91% less water than conventional cotton",
      "Healthier for farmers",
      "Biodegradable"
    ],
    reasoning: "Organic cotton significantly reduces environmental impact through sustainable farming practices.",
    confidence: "high",
    alternatives: [
      { name: "Hemp T-Shirt", price: "₹1,299", score: 85, reason: "Even lower water footprint" },
      { name: "Tencel T-Shirt", price: "₹1,499", score: 88, reason: "Closed-loop production" }
    ]
  },

  "polyester jacket": {
    name: "Polyester Jacket",
    carbonFootprint: 15.0,
    waterUsage: 62,
    sustainabilityScore: 35,
    packagingType: "plastic",
    category: "clothing",
    environmentalConcerns: [
      "Made from petroleum (non-renewable)",
      "Sheds microplastics when washed",
      "Not biodegradable",
      "Energy-intensive production"
    ],
    ecoFeatures: [
      "Low water usage in production",
      "Durable and long-lasting"
    ],
    reasoning: "Polyester is plastic-based, contributing to microplastic pollution with every wash cycle.",
    confidence: "high",
    alternatives: [
      { name: "Recycled Polyester Jacket", price: "₹2,499", score: 58, reason: "Uses plastic waste, same durability" },
      { name: "Organic Wool Jacket", price: "₹4,999", score: 70, reason: "Natural, biodegradable fiber" },
      { name: "Cork Jacket", price: "₹5,999", score: 82, reason: "Sustainable, renewable material" }
    ]
  },

  // ===== FOOTWEAR =====
  "leather shoes": {
    name: "Leather Shoes",
    carbonFootprint: 30.0,
    waterUsage: 8000,
    sustainabilityScore: 32,
    packagingType: "cardboard",
    category: "clothing",
    environmentalConcerns: [
      "Cattle farming produces methane emissions",
      "Tanning uses toxic chromium chemicals",
      "Extremely water-intensive",
      "Deforestation for cattle grazing"
    ],
    ecoFeatures: [
      "Durable, can last many years",
      "Biodegradable (if untreated)"
    ],
    reasoning: "Leather production has one of the highest environmental footprints in fashion due to livestock emissions and chemical processing.",
    confidence: "high",
    alternatives: [
      { name: "Vegan Leather Shoes (Piñatex)", price: "₹3,999", score: 75, reason: "Made from pineapple leaf fiber" },
      { name: "Recycled Rubber Shoes", price: "₹2,499", score: 70, reason: "Uses recycled tire rubber" },
      { name: "Canvas Sneakers", price: "₹1,299", score: 65, reason: "Lower footprint, vegan" }
    ]
  },

  "rubber flip flops": {
    name: "Rubber Flip Flops",
    carbonFootprint: 2.5,
    waterUsage: 150,
    sustainabilityScore: 40,
    packagingType: "plastic",
    category: "clothing",
    environmentalConcerns: [
      "Synthetic rubber is petroleum-based",
      "Short lifespan increases waste",
      "Not recyclable in most areas"
    ],
    ecoFeatures: [
      "Low production footprint",
      "Lightweight (low shipping emissions)"
    ],
    reasoning: "Cheap flip flops contribute to footwear waste; billions end up in landfills yearly.",
    confidence: "medium",
    alternatives: [
      { name: "Natural Rubber Flip Flops", price: "₹499", score: 62, reason: "Biodegradable natural rubber" },
      { name: "Recycled Ocean Plastic Sandals", price: "₹899", score: 72, reason: "Cleans oceans, durable" },
      { name: "Cork Sandals", price: "₹1,499", score: 80, reason: "Sustainable, comfortable" }
    ]
  },

  // ===== ELECTRONICS =====
  "smartphone": {
    name: "Smartphone",
    carbonFootprint: 70.0,
    waterUsage: 12760,
    sustainabilityScore: 28,
    packagingType: "cardboard",
    category: "electronics",
    environmentalConcerns: [
      "Rare earth mining causes habitat destruction",
      "Short upgrade cycles increase e-waste",
      "Conflict minerals (cobalt, tantalum)",
      "Difficult to recycle"
    ],
    ecoFeatures: [
      "Can replace multiple devices",
      "Enables digital alternatives to paper"
    ],
    reasoning: "Smartphones contain 60+ elements, many from environmentally destructive mining. Average lifespan is only 2-3 years.",
    confidence: "high",
    alternatives: [
      { name: "Fairphone (Modular)", price: "₹45,999", score: 65, reason: "Repairable, ethical materials" },
      { name: "Refurbished iPhone", price: "₹35,999", score: 58, reason: "Extends device lifecycle" },
      { name: "Teracube (4-year warranty)", price: "₹18,999", score: 55, reason: "Built for longevity" }
    ]
  },

  "laptop": {
    name: "Laptop Computer",
    carbonFootprint: 300.0,
    waterUsage: 50000,
    sustainabilityScore: 30,
    packagingType: "cardboard",
    category: "electronics",
    environmentalConcerns: [
      "High energy manufacturing process",
      "Contains hazardous materials",
      "E-waste when disposed",
      "Rare earth element dependency"
    ],
    ecoFeatures: [
      "Long usable lifespan (5-8 years)",
      "Enables remote work (reduces commuting)"
    ],
    reasoning: "Laptops have significant manufacturing footprint but long lifespan helps offset impact if used fully.",
    confidence: "high",
    alternatives: [
      { name: "Refurbished Laptop", price: "₹35,000", score: 55, reason: "Reduces e-waste significantly" },
      { name: "Framework Laptop", price: "₹95,000", score: 62, reason: "Fully modular and repairable" }
    ]
  },

  // ===== FOOD & BEVERAGES =====
  "coffee (per cup)": {
    name: "Coffee (per cup)",
    carbonFootprint: 0.3,
    waterUsage: 140,
    sustainabilityScore: 50,
    packagingType: "paper",
    category: "food",
    environmentalConcerns: [
      "Often grown in deforested areas",
      "Water-intensive crop",
      "Long-distance transportation"
    ],
    ecoFeatures: [
      "Biodegradable waste (grounds)",
      "Supports farming communities"
    ],
    reasoning: "Coffee's impact varies greatly based on farming practices and transportation distance.",
    confidence: "medium",
    alternatives: [
      { name: "Shade-Grown Organic Coffee", price: "₹599/250g", score: 72, reason: "Preserves forest habitat" },
      { name: "Local Herbal Tea", price: "₹199/100g", score: 80, reason: "Locally sourced, lower footprint" }
    ]
  },

  "bottled juice": {
    name: "Bottled Fruit Juice (1L)",
    carbonFootprint: 1.2,
    waterUsage: 200,
    sustainabilityScore: 38,
    packagingType: "plastic",
    category: "food",
    environmentalConcerns: [
      "Plastic bottle waste",
      "Added sugars in most brands",
      "Transportation of heavy liquid"
    ],
    ecoFeatures: [
      "Contains vitamins"
    ],
    reasoning: "Bottled juices combine food processing impact with single-use plastic packaging.",
    confidence: "medium",
    alternatives: [
      { name: "Fresh Squeezed Juice (local)", price: "₹80", score: 75, reason: "No packaging, fresh" },
      { name: "Glass Bottle Juice", price: "₹150", score: 55, reason: "Recyclable packaging" }
    ]
  },

  // ===== HOME & KITCHEN =====
  "plastic toothbrush": {
    name: "Plastic Toothbrush",
    carbonFootprint: 0.05,
    waterUsage: 1.5,
    sustainabilityScore: 22,
    packagingType: "plastic",
    category: "beauty",
    environmentalConcerns: [
      "1 billion toothbrushes discarded yearly in US alone",
      "Takes 400 years to decompose",
      "Nylon bristles are plastic"
    ],
    ecoFeatures: [],
    reasoning: "Plastic toothbrushes are replaced every 3 months, creating massive plastic waste.",
    confidence: "high",
    alternatives: [
      { name: "Bamboo Toothbrush", price: "₹99", score: 82, reason: "Biodegradable handle" },
      { name: "Recycled Plastic Toothbrush", price: "₹129", score: 50, reason: "Made from ocean plastic" },
      { name: "Toothbrush with Replaceable Head", price: "₹299", score: 70, reason: "Reduces plastic by 80%" }
    ]
  },

  "laundry detergent": {
    name: "Laundry Detergent (1L liquid)",
    carbonFootprint: 1.0,
    waterUsage: 50,
    sustainabilityScore: 35,
    packagingType: "plastic",
    category: "home",
    environmentalConcerns: [
      "Contains phosphates harmful to waterways",
      "Plastic packaging",
      "Synthetic fragrances",
      "Heavy to transport (mostly water)"
    ],
    ecoFeatures: [],
    reasoning: "Conventional detergents contain chemicals that persist in water systems.",
    confidence: "medium",
    alternatives: [
      { name: "Detergent Sheets", price: "₹399/60 sheets", score: 78, reason: "Plastic-free, lightweight" },
      { name: "Soap Nuts", price: "₹299/500g", score: 92, reason: "100% natural, compostable" },
      { name: "Eco Detergent Refill", price: "₹249/1L", score: 65, reason: "Reduces packaging waste" }
    ]
  }
};

/**
 * Get demo product data by matching product name
 */
function getDemoProduct(productName) {
  if (!productName) return null;

  const nameLower = productName.toLowerCase().trim();

  // Exact match
  if (demoProducts[nameLower]) {
    return { ...demoProducts[nameLower], isDemo: true };
  }

  // Partial match
  for (const [key, product] of Object.entries(demoProducts)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return { ...product, isDemo: true };
    }
  }

  // Keyword match
  const keywords = nameLower.split(' ');
  for (const [key, product] of Object.entries(demoProducts)) {
    if (keywords.some(kw => kw.length > 3 && key.includes(kw))) {
      return { ...product, isDemo: true };
    }
  }

  return null;
}

/**
 * Get all demo products for testing
 */
function getAllDemoProducts() {
  return Object.entries(demoProducts).map(([key, product]) => ({
    key,
    name: product.name,
    score: product.sustainabilityScore,
    category: product.category
  }));
}

module.exports = {
  demoProducts,
  getDemoProduct,
  getAllDemoProducts
};
