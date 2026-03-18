const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Utility function to check if product is buyable based on expiry date
// Product is BUYABLE if Current Date ≤ (Expiry Date − 10 days)
// Product becomes NON-BUYABLE if Current Date > (Expiry Date − 10 days)
function isProductBuyable(product) {
  if (!product.expiryDate) {
    // If no expiry date, consider it buyable (for backward compatibility)
    return true;
  }
  
  const expiryDate = new Date(product.expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Calculate cutoff date (10 days before expiry)
  const cutoffDate = new Date(expiryDate);
  cutoffDate.setDate(cutoffDate.getDate() - 10);
  cutoffDate.setHours(0, 0, 0, 0);
  
  // Product is buyable if today is on or before the cutoff date
  return today <= cutoffDate;
}

// Utility function to check if product should be visible to customers
// Customers should NOT see products that are expired or within 10 days of expiry
// Returns true if product should be visible to customers, false otherwise
function isProductVisibleToCustomers(product) {
  if (!product.expiryDate) {
    // If no expiry date, product is visible (for backward compatibility)
    return true;
  }
  
  const expiryDate = new Date(product.expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Calculate cutoff date (10 days before expiry)
  const cutoffDate = new Date(expiryDate);
  cutoffDate.setDate(cutoffDate.getDate() - 10);
  cutoffDate.setHours(0, 0, 0, 0);
  
  // Product is visible to customers if today is on or before the cutoff date
  // This means customers won't see products that are within 10 days of expiry or already expired
  return today <= cutoffDate;
}

// Helper function to add buyable status to product
function addBuyableStatus(product) {
  const buyable = isProductBuyable(product);
  return {
    ...product,
    isBuyable: buyable
  };
}

// Get products directly from database (only active AND approved products for public)
router.get("/", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    // First, get all approved sellers
    const approvedSellers = await db.collection("sellerapplications")
      .find({ status: "approved" })
      .toArray();
    const approvedSellerIds = approvedSellers.map(s => s.userId);
    
    // Only show products that are:
    // 1. Active (isActive is true or undefined for old products)
    // 2. Approved (approvalStatus is "approved" or undefined for old products)
    // OR from approved sellers (even if pending)
    const products = await db.collection("products").find({
      $and: [
        {
          $or: [
            { isActive: true },
            { isActive: { $exists: false } } // Include old products without isActive field
          ]
        },
        {
          $or: [
            { approvalStatus: "approved" },
            { approvalStatus: { $exists: false } }, // Include old products without approvalStatus field
            // Include pending products from approved sellers
            { 
              approvalStatus: "pending",
              sellerId: { $in: approvedSellerIds }
            }
          ]
        }
      ]
    }).sort({ createdAt: -1 }).toArray();
    
    // Filter out expired/near-expiry products for customers
    // Customers should NOT see products that are within 10 days of expiry or already expired
    const visibleProducts = products.filter(isProductVisibleToCustomers);
    
    // Add buyable status to each product
    const productsWithBuyableStatus = visibleProducts.map(addBuyableStatus);
    
    console.log(`Public API: Found ${products.length} active products, ${visibleProducts.length} visible to customers (excluding expired/near-expiry)`);
    res.json(productsWithBuyableStatus);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get single product (only if active AND approved, or from approved seller)
router.get("/:id", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    // First, get all approved sellers
    const approvedSellers = await db.collection("sellerapplications")
      .find({ status: "approved" })
      .toArray();
    const approvedSellerIds = approvedSellers.map(s => s.userId);
    
    const product = await db.collection("products").findOne({ 
      _id: new mongoose.Types.ObjectId(req.params.id),
      $and: [
        {
          $or: [
            { isActive: true },
            { isActive: { $exists: false } } // Include old products without isActive field
          ]
        },
        {
          $or: [
            { approvalStatus: "approved" },
            { approvalStatus: { $exists: false } }, // Include old products without approvalStatus field
            // Include pending products from approved sellers
            { 
              approvalStatus: "pending",
              sellerId: { $in: approvedSellerIds }
            }
          ]
        }
      ]
    });
    
    if (!product) {
      return res.status(404).json({ error: "Product not found or has been disabled" });
    }
    
    // Check if product should be visible to customers (not expired/near-expiry)
    // Customers should NOT see products that are within 10 days of expiry or already expired
    if (!isProductVisibleToCustomers(product)) {
      return res.status(404).json({ error: "Product not found or has been disabled" });
    }
    
    // Add buyable status to product
    const productWithBuyableStatus = addBuyableStatus(product);
    
    res.json(productWithBuyableStatus);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ error: err.message });
  }
});

// Utility endpoint to auto-approve existing pending products from approved sellers
router.post("/auto-approve-seller-products", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    // Get all approved sellers
    const approvedSellers = await db.collection("sellerapplications")
      .find({ status: "approved" })
      .toArray();
    const approvedSellerIds = approvedSellers.map(s => s.userId);
    
    if (approvedSellerIds.length === 0) {
      return res.json({ 
        success: true, 
        message: "No approved sellers found",
        updated: 0 
      });
    }
    
    // Update pending products from approved sellers
    const result = await db.collection("products").updateMany(
      {
        approvalStatus: "pending",
        sellerId: { $in: approvedSellerIds }
      },
      {
        $set: {
          approvalStatus: "approved",
          approvedBy: "system",
          approvedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`Auto-approved ${result.modifiedCount} pending products from approved sellers`);
    
    res.json({
      success: true,
      message: `Auto-approved ${result.modifiedCount} products from approved sellers`,
      updated: result.modifiedCount
    });
  } catch (err) {
    console.error("Error auto-approving products:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;