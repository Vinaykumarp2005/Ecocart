const admin = require('firebase-admin');

// Initialize Firebase Admin (uses default credentials in Cloud Functions)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
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
 * Get sustainability data for a product from Firestore
 */
async function getProductData(productName) {
  try {
    const productKey = generateProductKey(productName);
    const docRef = db.collection(COLLECTION_NAME).doc(productKey);
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data();
      // Check if data is stale (older than 7 days)
      const isStale = data.updatedAt && 
        (Date.now() - data.updatedAt.toMillis()) > 7 * 24 * 60 * 60 * 1000;
      
      return {
        found: true,
        stale: isStale,
        data
      };
    }

    return { found: false, stale: false, data: null };
  } catch (error) {
    console.error('Firestore get error:', error);
    return { found: false, stale: false, data: null, error: error.message };
  }
}

/**
 * Store sustainability data for a product in Firestore
 */
async function storeProductData(productName, sustainabilityData) {
  try {
    const productKey = generateProductKey(productName);
    const docRef = db.collection(COLLECTION_NAME).doc(productKey);

    const dataToStore = {
      productName,
      productKey,
      ...sustainabilityData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await docRef.set(dataToStore, { merge: true });

    return { success: true, productKey };
  } catch (error) {
    console.error('Firestore store error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update existing product data in Firestore
 */
async function updateProductData(productName, updates) {
  try {
    const productKey = generateProductKey(productName);
    const docRef = db.collection(COLLECTION_NAME).doc(productKey);

    await docRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Firestore update error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all products in a category
 */
async function getProductsByCategory(category, limit = 10) {
  try {
    const snapshot = await db.collection(COLLECTION_NAME)
      .where('category', '==', category)
      .orderBy('sustainabilityScore', 'desc')
      .limit(limit)
      .get();

    const products = [];
    snapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));

    return { success: true, products };
  } catch (error) {
    console.error('Firestore query error:', error);
    return { success: false, products: [], error: error.message };
  }
}

/**
 * Get greener alternatives from Firestore
 */
async function getGreenerAlternativesFromDB(category, currentScore, limit = 5) {
  try {
    const snapshot = await db.collection(COLLECTION_NAME)
      .where('category', '==', category)
      .where('sustainabilityScore', '>', currentScore)
      .orderBy('sustainabilityScore', 'desc')
      .limit(limit)
      .get();

    const alternatives = [];
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
    console.error('Firestore alternatives query error:', error);
    return [];
  }
}

module.exports = {
  generateProductKey,
  getProductData,
  storeProductData,
  updateProductData,
  getProductsByCategory,
  getGreenerAlternativesFromDB
};
