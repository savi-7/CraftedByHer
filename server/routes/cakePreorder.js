const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Product = require("../models/Product");

// Kerala pincode ranges by district (same logic as hubs /check-pincode)
const keralaPincodeMap = {
  Kasaragod: { ranges: [[671121, 671551]] },
  Kannur: { ranges: [[670001, 670120], [670301, 670706], [670731, 670734]] },
  Wayanad: { ranges: [[673571, 673595]] },
  Kozhikode: { ranges: [[673001, 673570]] },
  Malappuram: { ranges: [[676101, 676123], [676301, 676320], [676501, 676553]] },
  Palakkad: { ranges: [[678001, 679593]] },
  Thrissur: { ranges: [[680001, 680733]] },
  Ernakulam: { ranges: [[682001, 683579]] },
  Idukki: { ranges: [[685501, 685620]] },
  Kottayam: { ranges: [[686001, 686651]] },
  // Alappuzha uses 688xxx series; Pathanamthitta uses 689xxx; Kollam uses 690xxx/691xxx
  Alappuzha: { ranges: [[688001, 688999]] },
  Pathanamitta: { ranges: [[689001, 689999]] },
  Kollam: { ranges: [[690001, 691999]] },
  Thiruvananthapuram: { ranges: [[695001, 695615]] },
};

function getDistrictFromPincode(pincode) {
  if (!pincode || !/^[0-9]{6}$/.test(pincode)) return null;
  const pincodeNum = parseInt(pincode, 10);

  for (const [district, data] of Object.entries(keralaPincodeMap)) {
    for (const [start, end] of data.ranges) {
      if (pincodeNum >= start && pincodeNum <= end) {
        return district;
      }
    }
  }

  return null;
}

// POST /api/cakes/check-availability
// Body: { pincode }
router.post("/check-availability", async (req, res) => {
  try {
    const { pincode } = req.body || {};

    if (!pincode) {
      return res.status(400).json({
        success: false,
        available: false,
        message: "Pincode is required",
      });
    }

    if (!/^[0-9]{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: "Please enter a valid 6-digit pincode",
      });
    }

    const district = getDistrictFromPincode(pincode);

    if (!district) {
      return res.json({
        success: false,
        available: false,
        message:
          "No cake sellers available in your area. We currently support Kerala districts only.",
      });
    }

    // Find active sellers whose sellerLocation district matches buyer district.
    const sellerCount = await User.countDocuments({
      role: "seller",
      isActive: true,
      "sellerLocation.district": district,
    });

    if (sellerCount > 0) {
      return res.json({
        success: true,
        available: true,
        message: "Cakes Available Near you",
        district,
        sellerCount,
      });
    }

    return res.json({
      success: true,
      available: false,
      message: "No cake sellers available in your area",
      district,
      sellerCount: 0,
    });
  } catch (error) {
    console.error("Cake preorder availability error:", error);
    return res.status(500).json({
      success: false,
      available: false,
      message: "Error checking cake availability. Please try again.",
    });
  }
});

// GET /api/cakes/available?district=Kottayam — list cakes from sellers in this district
router.get("/available", async (req, res) => {
  try {
    const district = (req.query.district || "").trim();
    if (!district) {
      return res.status(400).json({
        success: false,
        cakes: [],
        message: "District is required (query: district=...)",
      });
    }

    const sellers = await User.find({
      role: "seller",
      isActive: true,
      "sellerLocation.district": district,
    })
      .select("uid")
      .lean();
    const sellerIds = sellers.map((s) => s.uid);

    if (sellerIds.length === 0) {
      return res.json({
        success: true,
        cakes: [],
        district,
        message: "No cake sellers in this district",
      });
    }

    const cakes = await Product.find({
      sellerId: { $in: sellerIds },
      isActive: true,
      approvalStatus: "approved",
      $or: [
        { subCategory: "Cakes" },
        { "category.name": "Cakes" },
        { category: "Cakes" },
        { title: { $regex: /cake/i } },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      cakes,
      district,
    });
  } catch (error) {
    console.error("Cake available list error:", error);
    return res.status(500).json({
      success: false,
      cakes: [],
      message: "Error fetching cakes. Please try again.",
    });
  }
});

module.exports = router;

