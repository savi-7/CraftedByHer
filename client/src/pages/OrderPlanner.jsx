import React, { useState, useEffect, useMemo } from "react";
import { API_BASE } from "../config/api";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function OrderPlanner() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("event"); // "event" or "bulk"
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState({}); // { productId: quantity }
  const [showAllMenu, setShowAllMenu] = useState(false);

  // Event Order Form Fields
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [location, setLocation] = useState("");
  const [numberOfGuests, setNumberOfGuests] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log("Fetching products from:", `${API_BASE}/api/items`);
      
      const response = await fetch(`${API_BASE}/api/items`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Products API response:", data);
      
      const items = Array.isArray(data) ? data : data.products || [];
      console.log("Processed products:", items.length);
      
      if (items.length === 0) {
        console.warn("No products found in response");
        toast.warning("No products available");
      }
      
      setProducts(items);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error(`Failed to load products: ${error.message}`);
      setProducts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Filter products: Only Snacks, Spices, and Powders (no Crafts, no Cakes)
  const filteredProducts = useMemo(() => {
    console.log("Filtering products. Total products:", products.length);
    
    const filtered = products.filter((product) => {
      // Exclude test products
      if (product.title && product.title.toLowerCase().includes("test product")) {
        return false;
      }

      // Exclude Crafts
      if (product.mainCategory === "Crafts") return false;
      if (product.category && typeof product.category === 'string' && product.category.toLowerCase().includes('craft')) {
        return false;
      }

      // Exclude Cakes
      if (product.category === "Cakes" || product.category?.toLowerCase() === "cakes") {
        return false;
      }

      // Include only Snacks, Spices, and Powders
      const allowedCategories = ["Snacks", "Spices", "Powders"];
      
      // Check main category first (Food products)
      if (product.mainCategory === "Food") {
        // If it's Food category, check subcategory
        if (product.category && allowedCategories.includes(product.category)) {
          return true;
        }
        if (product.subCategory && allowedCategories.includes(product.subCategory)) {
          return true;
        }
      }
      
      // Also check direct category match
      if (product.category && allowedCategories.includes(product.category)) {
        return true;
      }

      // Also check subcategory if available
      if (product.subCategory && allowedCategories.includes(product.subCategory)) {
        return true;
      }

      return false;
    });
    
    console.log("Filtered products count:", filtered.length);
    console.log("Sample filtered products:", filtered.slice(0, 3).map(p => ({ title: p.title, category: p.category, mainCategory: p.mainCategory })));
    
    return filtered;
  }, [products]);

  // Get suggested products (first 6)
  const suggestedProducts = useMemo(() => {
    const filtered = filteredProducts.filter((p) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.title?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    });
    return filtered.slice(0, 6);
  }, [filteredProducts, searchQuery]);

  // Get extra products (beyond first 6)
  const extraProducts = useMemo(() => {
    const filtered = filteredProducts.filter((p) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.title?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    });
    return filtered.slice(6);
  }, [filteredProducts, searchQuery]);

  // Get all filtered products for display
  const displayProducts = useMemo(() => {
    const filtered = filteredProducts.filter((p) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.title?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    });
    const result = showAllMenu ? filtered : filtered.slice(0, 6);
    console.log("displayProducts computed:", {
      filteredProductsCount: filteredProducts.length,
      searchQuery,
      showAllMenu,
      resultCount: result.length,
      result: result.slice(0, 3).map(p => ({ title: p.title, id: p._id }))
    });
    return result;
  }, [filteredProducts, searchQuery, showAllMenu]);

  const handleProductSelect = (productId) => {
    setSelectedProducts((prev) => {
      const currentQty = prev[productId] || 0;
      if (currentQty > 0) {
        // Deselect if already selected
        const newState = { ...prev };
        delete newState[productId];
        return newState;
      } else {
        // Select with quantity 1
        return { ...prev, [productId]: 1 };
      }
    });
  };

  const handleQuantityChange = (productId, delta) => {
    setSelectedProducts((prev) => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      if (newQty === 0) {
        const newState = { ...prev };
        delete newState[productId];
        return newState;
      }
      return { ...prev, [productId]: newQty };
    });
  };

  const handleQuantityInput = (productId, value) => {
    const qty = parseInt(value) || 0;
    if (qty <= 0) {
      setSelectedProducts((prev) => {
        const newState = { ...prev };
        delete newState[productId];
        return newState;
      });
    } else {
      setSelectedProducts((prev) => ({ ...prev, [productId]: qty }));
    }
  };

  const handleSubmit = () => {
    // Validate event order fields if in event tab
    if (activeTab === "event") {
      if (!eventType || !eventDate || !deliveryDate || !location || !numberOfGuests) {
        toast.error("Please fill all event details");
        return;
      }
    }

    // Check if at least one product is selected
    const selectedCount = Object.keys(selectedProducts).length;
    if (selectedCount === 0) {
      toast.error("Please select at least one product");
      return;
    }

    // Build cartItems array matching Checkout.jsx expectations
    const cartItems = Object.entries(selectedProducts).map(([productId, quantity]) => {
      const product = products.find((p) => p._id === productId);
      if (!product) return null;

      // Find the first variant (or use default)
      const variant = product.variants && product.variants.length > 0 
        ? product.variants[0] 
        : { price: product.price || 0, weight: product.weight || "N/A" };

      return {
        product: {
          _id: product._id,
          title: product.title,
          image: product.images && product.images.length > 0 ? product.images[0] : product.image,
        },
        variant: {
          _id: variant._id || product._id,
          price: variant.price,
          weight: variant.weight,
        },
        quantity: quantity,
      };
    }).filter(Boolean);

    if (cartItems.length === 0) {
      toast.error("Invalid product selection");
      return;
    }

    // Navigate to checkout with cart items and order context
    navigate("/checkout", {
      state: {
        cartItems,
        fromEventOrder: activeTab === "event",
        fromBulkOrder: activeTab === "bulk",
        eventDetails: activeTab === "event" ? {
          eventType,
          eventDate,
          deliveryDate,
          location,
          numberOfGuests: parseInt(numberOfGuests),
        } : null,
      },
    });
  };

  const selectedProductsList = useMemo(() => {
    return Object.entries(selectedProducts).map(([productId, quantity]) => {
      const product = products.find((p) => p._id === productId);
      if (!product) return null;

      const variant = product.variants && product.variants.length > 0 
        ? product.variants[0] 
        : { price: product.price || 0 };

      return {
        ...product,
        quantity,
        price: variant.price,
      };
    }).filter(Boolean);
  }, [selectedProducts, products]);

  const totalAmount = selectedProductsList.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>Loading products...</h2>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1
            style={{
              color: "#5c4033",
              fontSize: "36px",
              fontWeight: "700",
              marginBottom: "12px",
            }}
          >
            📋 Order Planner
          </h1>
          <p style={{ color: "#666", fontSize: "16px" }}>
            Plan your event or bulk orders with ease
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "32px",
            borderBottom: "2px solid #e0e0e0",
          }}
        >
          <button
            onClick={() => setActiveTab("event")}
            style={{
              padding: "12px 24px",
              background: activeTab === "event" ? "#5c4033" : "transparent",
              color: activeTab === "event" ? "white" : "#666",
              border: "none",
              borderBottom: activeTab === "event" ? "3px solid #5c4033" : "3px solid transparent",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            🎉 Event Order
          </button>
          <button
            onClick={() => setActiveTab("bulk")}
            style={{
              padding: "12px 24px",
              background: activeTab === "bulk" ? "#5c4033" : "transparent",
              color: activeTab === "bulk" ? "white" : "#666",
              border: "none",
              borderBottom: activeTab === "bulk" ? "3px solid #5c4033" : "3px solid transparent",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            📦 Bulk Order
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "24px" }}>
          {/* Main Content */}
          <div>
            {/* Event Order Form */}
            {activeTab === "event" && (
              <div
                style={{
                  background: "white",
                  padding: "24px",
                  borderRadius: "16px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  marginBottom: "24px",
                }}
              >
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "#5c4033",
                    marginBottom: "20px",
                  }}
                >
                  Event Details
                </h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#333",
                        marginBottom: "8px",
                      }}
                    >
                      Event Type *
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                        fontSize: "14px",
                      }}
                    >
                      <option value="">Select Event Type</option>
                      <option value="Wedding">Wedding</option>
                      <option value="Birthday">Birthday</option>
                      <option value="Corporate">Corporate</option>
                      <option value="Baby Shower">Baby Shower</option>
                      <option value="Festival">Festival</option>
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#333",
                        marginBottom: "8px",
                      }}
                    >
                      Event Date *
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#333",
                        marginBottom: "8px",
                      }}
                    >
                      Delivery Date *
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#333",
                        marginBottom: "8px",
                      }}
                    >
                      Number of Guests *
                    </label>
                    <input
                      type="number"
                      value={numberOfGuests}
                      onChange={(e) => setNumberOfGuests(e.target.value)}
                      placeholder="e.g., 50"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#333",
                        marginBottom: "8px",
                      }}
                    >
                      Location *
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Event location address"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "16px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                marginBottom: "24px",
              }}
            >
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  fontSize: "16px",
                }}
              />
            </div>

            {/* Products Grid */}
            <div>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#5c4033",
                  marginBottom: "16px",
                }}
              >
                {activeTab === "event" ? "Suggested Products" : "Available Products"}
              </h2>
              
              {loading && (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <p>Loading products...</p>
                </div>
              )}
              
              {!loading && displayProducts.length === 0 && (
                <div style={{ 
                  textAlign: "center", 
                  padding: "40px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  marginBottom: "20px"
                }}>
                  <p style={{ color: "#666", marginBottom: "8px" }}>
                    {products.length === 0 
                      ? "No products found. Please check your connection." 
                      : `No products match the filter (Snacks, Spices, Powders). Found ${products.length} total products.`}
                  </p>
                  {products.length > 0 && (
                    <p style={{ color: "#999", fontSize: "14px" }}>
                      Debug: Check console for product details.
                    </p>
                  )}
                </div>
              )}
              
              {displayProducts.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "20px",
                    marginBottom: "20px",
                  }}
                >
                  {displayProducts.map((product) => {
                  const isSelected = !!selectedProducts[product._id];
                  const quantity = selectedProducts[product._id] || 0;
                  const variant = product.variants && product.variants.length > 0 
                    ? product.variants[0] 
                    : { price: product.price || 0 };

                  return (
                    <div
                      key={product._id}
                      onClick={() => handleProductSelect(product._id)}
                      style={{
                        background: "white",
                        borderRadius: "12px",
                        padding: "16px",
                        boxShadow: isSelected
                          ? "0 4px 12px rgba(92, 64, 51, 0.3)"
                          : "0 2px 8px rgba(0,0,0,0.1)",
                        cursor: "pointer",
                        border: isSelected ? "2px solid #5c4033" : "2px solid transparent",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "#5c4033";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "transparent";
                          e.currentTarget.style.transform = "translateY(0)";
                        }
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "150px",
                          background: "#f5f5f5",
                          borderRadius: "8px",
                          marginBottom: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0].startsWith('http') ? product.images[0] : `${API_BASE}/uploads/${product.images[0]}`}
                            alt={product.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            onError={(e) => {
                              console.error("Image load error for:", product.images[0]);
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : product.image ? (
                          <img
                            src={product.image.startsWith('http') ? product.image : `${API_BASE}/uploads/${product.image}`}
                            alt={product.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            onError={(e) => {
                              console.error("Image load error for:", product.image);
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <span style={{ fontSize: "48px", display: (product.images && product.images.length > 0) || product.image ? 'none' : 'flex' }}>📦</span>
                      </div>
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#333",
                          marginBottom: "8px",
                        }}
                      >
                        {product.title}
                      </h3>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#666",
                          marginBottom: "12px",
                        }}
                      >
                        ₹{variant.price}
                      </p>

                      {/* Quantity Selector */}
                      {isSelected && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginTop: "12px",
                          }}
                        >
                          <button
                            onClick={() => handleQuantityChange(product._id, -1)}
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "6px",
                              border: "1px solid #ddd",
                              background: "white",
                              cursor: "pointer",
                              fontSize: "18px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={quantity}
                            onChange={(e) =>
                              handleQuantityInput(product._id, e.target.value)
                            }
                            min="1"
                            style={{
                              width: "60px",
                              padding: "6px",
                              borderRadius: "6px",
                              border: "1px solid #ddd",
                              textAlign: "center",
                              fontSize: "14px",
                            }}
                          />
                          <button
                            onClick={() => handleQuantityChange(product._id, 1)}
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "6px",
                              border: "1px solid #ddd",
                              background: "white",
                              cursor: "pointer",
                              fontSize: "18px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              )}

              {/* Show More/Less Button */}
              {extraProducts.length > 0 && (
                <div style={{ textAlign: "center", marginTop: "20px" }}>
                  <button
                    onClick={() => setShowAllMenu(!showAllMenu)}
                    style={{
                      padding: "10px 24px",
                      background: "#5c4033",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    {showAllMenu ? "Show Less" : `View All Menu (${extraProducts.length} more)`}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Selected Items Sidebar */}
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "16px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              height: "fit-content",
              position: "sticky",
              top: "20px",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "#5c4033",
                marginBottom: "20px",
              }}
            >
              Selected Items ({selectedProductsList.length})
            </h2>

            {selectedProductsList.length === 0 ? (
              <p style={{ color: "#666", fontSize: "14px", textAlign: "center" }}>
                No items selected yet
              </p>
            ) : (
              <>
                <div style={{ marginBottom: "20px", maxHeight: "400px", overflowY: "auto" }}>
                  {selectedProductsList.map((item) => (
                    <div
                      key={item._id}
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid #eee",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "8px",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <h4
                            style={{
                              fontSize: "14px",
                              fontWeight: "600",
                              color: "#333",
                              marginBottom: "4px",
                            }}
                          >
                            {item.title}
                          </h4>
                          <p style={{ fontSize: "12px", color: "#666" }}>
                            Qty: {item.quantity} × ₹{item.price}
                          </p>
                        </div>
                        <button
                          onClick={() => handleProductSelect(item._id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#dc3545",
                            cursor: "pointer",
                            fontSize: "18px",
                            padding: "0",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    paddingTop: "16px",
                    borderTop: "2px solid #eee",
                    marginTop: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "#5c4033",
                      marginBottom: "20px",
                    }}
                  >
                    <span>Total:</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handleSubmit}
                    style={{
                      width: "100%",
                      padding: "14px",
                      background: "linear-gradient(135deg, #5c4033 0%, #8b6f47 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "16px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(92, 64, 51, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    Continue to Address
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

