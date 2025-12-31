require('dotenv').config();

let db = null;
let useFirestore = false;

// In-memory cache for local development
const memoryCache = new Map();

// Try to initialize Firebase, but don't fail if it doesn't work
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_CONFIG) {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    db = admin.firestore();
    useFirestore = true;
    console.log('Firestore initialized successfully');
  } else {
    console.log('No Firebase credentials found, using in-memory cache');
  }
} catch (error) {
  console.log('Firestore initialization skipped:', error.message);
}

const COLLECTION_NAME = 'products';

/**
 * Generate a document ID from product name
 */
function generateProductKey(productName) {
  return productName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100); // Firestore doc ID limit
}

/**
 * Get sustainability data for a product
 */
async function getProductData(productName) {
  const productKey = generateProductKey(productName);

  // Try memory cache first
  if (memoryCache.has(productKey)) {
    const cached = memoryCache.get(productKey);
    const isStale = cached.timestamp && (Date.now() - cached.timestamp) > 7 * 24 * 60 * 60 * 1000;
    return { found: true, stale: isStale, data: cached.data };
  }

  // Try Firestore if available
  if (useFirestore && db) {
    try {
      const docRef = db.collection(COLLECTION_NAME).doc(productKey);
      const doc = await docRef.get();

      if (doc.exists) {
        const data = doc.data();
        const isStale = data.updatedAt && 
          (Date.now() - data.updatedAt.toMillis()) > 7 * 24 * 60 * 60 * 1000;
        
        // Also cache in memory
        memoryCache.set(productKey, { data, timestamp: Date.now() });
        
        return { found: true, stale: isStale, data };
      }
    } catch (error) {
      console.error('Firestore get error:', error.message);
    }
  }

  return { found: false, stale: false, data: null };
}

/**
 * Store sustainability data for a product
 */
async function storeProductData(productName, sustainabilityData) {
  const productKey = generateProductKey(productName);

  const dataToStore = {
    productName,
    productKey,
    ...sustainabilityData,
    timestamp: Date.now()
  };

  // Always store in memory cache
  memoryCache.set(productKey, { data: dataToStore, timestamp: Date.now() });

  // Try to store in Firestore if available
  if (useFirestore && db) {
    try {
      const admin = require('firebase-admin');
      const docRef = db.collection(COLLECTION_NAME).doc(productKey);
      await docRef.set({
        ...dataToStore,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return { success: true, productKey };
    } catch (error) {
      console.error('Firestore store error:', error.message);
    }
  }

  return { success: true, productKey, cached: 'memory' };
}

/**
 * Get greener alternatives from database
 */
async function getGreenerAlternativesFromDB(category, currentScore, limit = 5) {
  // Check memory cache for alternatives
  const alternatives = [];
  
  for (const [key, value] of memoryCache.entries()) {
    const data = value.data;
    if (data.category === category && data.sustainabilityScore > currentScore) {
      alternatives.push({
        name: data.productName,
        price: data.price || 'N/A',
        score: data.sustainabilityScore,
        url: data.url || '#'
      });
    }
  }

  if (alternatives.length > 0) {
    return alternatives.slice(0, limit);
  }

  // Try Firestore if available
  if (useFirestore && db) {
    try {
      const snapshot = await db.collection(COLLECTION_NAME)
        .where('category', '==', category)
        .where('sustainabilityScore', '>', currentScore)
        .orderBy('sustainabilityScore', 'desc')
        .limit(limit)
        .get();

      snapshot.forEach(doc => {
        const data = doc.data();
        alternatives.push({
          name: data.productName,
          price: data.price || 'N/A',
          score: data.sustainabilityScore,
          url: data.url || '#'
        });
      });

      return alternatives;
    } catch (error) {
      console.error('Firestore alternatives query error:', error.message);
    }
  }

  return [];
}

module.exports = {
  generateProductKey,
  getProductData,
  storeProductData,
  getGreenerAlternativesFromDB
};
