import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Helper function to check product expiry status
function getProductStatus(product) {
  // Check if product is active
  if (product.isActive === false) {
    return { status: 'inactive', label: '✗ Inactive', color: '#721c24', bg: '#f8d7da' };
  }
  
  // Check expiry date
  if (product.expiryDate) {
    const expiryDate = new Date(product.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate cutoff date (10 days before expiry)
    const cutoffDate = new Date(expiryDate);
    cutoffDate.setDate(cutoffDate.getDate() - 10);
    cutoffDate.setHours(0, 0, 0, 0);
    
    // Check if expired
    if (today > expiryDate) {
      return { status: 'expired', label: '⚠ Expired', color: '#721c24', bg: '#f8d7da' };
    }
    
    // Check if within 10 days of expiry
    if (today > cutoffDate) {
      return { status: 'near-expiry', label: '⚠ Near Expiry', color: '#856404', bg: '#fff3cd' };
    }
  }
  
  // Product is active and not expired
  return { status: 'active', label: '✓ Active', color: 'var(--brand, #8b5e34)', bg: 'linear-gradient(135deg, var(--accent-soft, #f3e7dc) 0%, #f8f2ea 100%)' };
}

export default function SellerDetails() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    const fetchSellerDetails = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) {
          navigate("/login");
          return;
        }

        await user.reload();
        const token = await user.getIdToken(true);

        // Try to get seller from location state first
        if (location.state?.seller) {
          setSeller(location.state.seller);
          if (location.state.products) {
            setProducts(location.state.products);
            setLoading(false);
            return;
          }
        }

        // Fetch seller details
        const sellerRes = await fetch(`${API_BASE}/api/seller/applications?status=approved`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (sellerRes.ok) {
          const sellerData = await sellerRes.json();
          const foundSeller = sellerData.applications?.find(s => s._id === sellerId);
          if (foundSeller) {
            setSeller(foundSeller);
          }
        }

        // Fetch products
        const productsRes = await fetch(`${API_BASE}/api/admin/products`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (productsRes.ok) {
          const allProducts = await productsRes.json();
          const sellerProducts = Array.isArray(allProducts)
            ? allProducts.filter(p => {
                if (p.title && p.title.toLowerCase().includes("test product")) return false;
                return p.sellerEmail === seller?.email ||
                       p.sellerId === seller?.userId ||
                       (p.seller && (p.seller.email === seller?.email || p.seller.uid === seller?.userId));
              })
            : [];
          setProducts(sellerProducts);
        }
      } catch (err) {
        console.error("Error fetching seller details:", err);
        toast.error("Failed to load seller details");
      } finally {
        setLoading(false);
      }
    };

    fetchSellerDetails();
  }, [sellerId, navigate, location.state]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #f7f3ed)"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "48px",
            height: "48px",
            border: "4px solid var(--accent-soft, #f3e7dc)",
            borderTop: "4px solid var(--brand, #8b5e34)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto"
          }}></div>
          <p style={{ marginTop: "16px", color: "var(--text-muted, #7b6457)" }}>Loading seller details...</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #f7f3ed)"
      }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "var(--text, #3f2d23)" }}>Seller not found</h2>
          <button
            onClick={() => navigate("/admin")}
            style={{
              marginTop: "16px",
              padding: "12px 24px",
              background: "var(--brand, #8b5e34)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600"
            }}
          >
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg, #f7f3ed)",
      padding: "24px",
      fontFamily: "var(--body-font, 'Poppins', sans-serif)"
    }}>
      {/* Header */}
      <div style={{
        background: "var(--surface, #ffffff)",
        borderRadius: "16px",
        padding: "24px",
        marginBottom: "24px",
        border: "1px solid var(--border, #ead9c9)",
        boxShadow: "var(--shadow, 0 10px 24px rgba(63,45,35,.10))"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => navigate("/admin")}
              style={{
                padding: "8px 16px",
                background: "var(--brand, #8b5e34)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600"
              }}
            >
              ← Back
            </button>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--brand, #8b5e34) 0%, var(--brand-strong, #6f4518) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "32px",
              fontWeight: "700",
              fontFamily: "var(--title-font, 'Playfair Display', serif)"
            }}>
              {seller.businessName?.charAt(0)?.toUpperCase() || seller.email?.charAt(0)?.toUpperCase() || "S"}
            </div>
            <div>
              <h1 style={{
                margin: "0 0 4px 0",
                color: "var(--brand-strong, #6f4518)",
                fontSize: "28px",
                fontFamily: "var(--title-font, 'Playfair Display', serif)",
                fontWeight: "700"
              }}>
                {seller.businessName || seller.userInfo?.name || "Seller"}
              </h1>
              <p style={{ margin: 0, fontSize: "16px", color: "var(--text-muted, #7b6457)" }}>
                {seller.email || seller.userInfo?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Seller Info Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          paddingTop: "20px",
          borderTop: "1px solid var(--border, #ead9c9)"
        }}>
          <div>
            <p style={{
              margin: "0 0 8px 0",
              fontSize: "12px",
              color: "var(--text-muted, #7b6457)",
              textTransform: "uppercase",
              fontWeight: "600",
              letterSpacing: "0.5px"
            }}>
              Phone
            </p>
            <p style={{ margin: 0, fontSize: "16px", color: "var(--text, #3f2d23)", fontWeight: "600" }}>
              {seller.phone || seller.userInfo?.phone || "N/A"}
            </p>
          </div>
          <div>
            <p style={{
              margin: "0 0 8px 0",
              fontSize: "12px",
              color: "var(--text-muted, #7b6457)",
              textTransform: "uppercase",
              fontWeight: "600",
              letterSpacing: "0.5px"
            }}>
              Total Products
            </p>
            <p style={{ margin: 0, fontSize: "16px", color: "var(--brand, #8b5e34)", fontWeight: "700" }}>
              {products.length} {products.length === 1 ? 'Product' : 'Products'}
            </p>
          </div>
          <div>
            <p style={{
              margin: "0 0 8px 0",
              fontSize: "12px",
              color: "var(--text-muted, #7b6457)",
              textTransform: "uppercase",
              fontWeight: "600",
              letterSpacing: "0.5px"
            }}>
              Approved Date
            </p>
            <p style={{ margin: 0, fontSize: "16px", color: "var(--text, #3f2d23)", fontWeight: "600" }}>
              {seller.approvedAt
                ? new Date(seller.approvedAt).toLocaleDateString('en-IN')
                : seller.updatedAt
                ? new Date(seller.updatedAt).toLocaleDateString('en-IN')
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div style={{
        background: "var(--surface, #ffffff)",
        borderRadius: "16px",
        padding: "24px",
        border: "1px solid var(--border, #ead9c9)",
        boxShadow: "var(--shadow, 0 10px 24px rgba(63,45,35,.10))"
      }}>
        <h2 style={{
          margin: "0 0 24px 0",
          color: "var(--brand, #8b5e34)",
          fontSize: "24px",
          fontFamily: "var(--title-font, 'Playfair Display', serif)",
          fontWeight: "700"
        }}>
          Products ({products.length})
        </h2>

        {products.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--text-muted, #7b6457)"
          }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>📦</div>
            <p style={{ fontSize: "18px", fontWeight: "500", marginBottom: "8px", color: "var(--text, #3f2d23)" }}>
              No products found
            </p>
            <p style={{ fontSize: "14px" }}>
              This seller hasn't added any products yet.
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px"
          }}>
            {products.map((product) => {
              const productStatus = getProductStatus(product);
              return (
                <div
                  key={product._id}
                  onClick={() => {
                    setSelectedProduct(product);
                    setShowProductModal(true);
                  }}
                  style={{
                    background: "var(--surface, #ffffff)",
                    borderRadius: "14px",
                    padding: "0",
                    border: "2px solid var(--border, #ead9c9)",
                    overflow: "hidden",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 12px rgba(63, 45, 35, 0.08)",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.boxShadow = "0 12px 24px rgba(63, 45, 35, 0.2)";
                    e.currentTarget.style.borderColor = "var(--brand, #8b5e34)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(63, 45, 35, 0.08)";
                    e.currentTarget.style.borderColor = "var(--border, #ead9c9)";
                  }}
                >
                  {/* Product Image */}
                  <div style={{
                    width: "100%",
                    height: "200px",
                    background: "var(--accent-soft, #f3e7dc)",
                    position: "relative",
                    overflow: "hidden"
                  }}>
                    {(() => {
                      const imageUrl = product.image
                        ? `${API_BASE}/uploads/${product.image}`
                        : product.img
                        ? `${API_BASE}/uploads/${product.img}`
                        : null;

                      return imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.title || "Product"}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                            const parent = e.target.parentElement;
                            if (parent && !parent.querySelector('.fallback-icon')) {
                              const fallback = document.createElement('div');
                              fallback.className = 'fallback-icon';
                              fallback.style.cssText = 'display: flex; align-items: center; justify-content: center; height: 100%; font-size: 48px; color: var(--text-muted, #7b6457);';
                              fallback.textContent = '📦';
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          fontSize: "64px",
                          color: "var(--text-muted, #7b6457)"
                        }}>
                          📦
                        </div>
                      );
                    })()}
                  </div>

                  {/* Product Info */}
                  <div style={{ padding: "16px" }}>
                    <h3 style={{
                      margin: "0 0 8px 0",
                      color: "var(--text, #3f2d23)",
                      fontSize: "18px",
                      fontWeight: "700",
                      fontFamily: "var(--title-font, 'Playfair Display', serif)",
                      lineHeight: "1.3"
                    }}>
                      {product.title}
                    </h3>

                    {product.description && (
                      <p style={{
                        margin: "0 0 12px 0",
                        fontSize: "13px",
                        color: "var(--text-muted, #7b6457)",
                        lineHeight: "1.5",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}>
                        {product.description}
                      </p>
                    )}

                    {/* Product Details */}
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      marginBottom: "12px",
                      paddingTop: "12px",
                      borderTop: "1px solid var(--border, #ead9c9)"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted, #7b6457)" }}>Price:</span>
                        <span style={{
                          fontSize: "18px",
                          fontWeight: "700",
                          color: "var(--brand, #8b5e34)",
                          fontFamily: "var(--title-font, 'Playfair Display', serif)"
                        }}>
                          {(() => {
                            let price = 0;
                            if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
                              const prices = product.variants
                                .map(v => Number(v.price) || 0)
                                .filter(p => p > 0);
                              if (prices.length > 0) {
                                price = Math.min(...prices);
                              }
                            } else if (product.price) {
                              price = Number(product.price) || 0;
                            }
                            return price > 0 ? `₹${price.toLocaleString("en-IN")}` : "₹0";
                          })()}
                        </span>
                      </div>

                      {product.expiryDate && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", color: "var(--text-muted, #7b6457)" }}>Expiry Date:</span>
                          <span style={{ fontSize: "13px", color: "var(--text, #3f2d23)", fontWeight: "600" }}>
                            {new Date(product.expiryDate).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted, #7b6457)" }}>Stock:</span>
                        <span style={{ fontSize: "13px", color: "var(--text, #3f2d23)", fontWeight: "600" }}>
                          {product.stock || 0} units
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <span style={{
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "700",
                        background: productStatus.bg,
                        color: productStatus.color,
                        border: `1px solid ${productStatus.color === 'var(--brand, #8b5e34)' ? 'var(--border, #ead9c9)' : productStatus.color}`
                      }}>
                        {productStatus.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {showProductModal && selectedProduct && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}
        onClick={() => setShowProductModal(false)}
        >
          <div style={{
            background: "var(--surface, #ffffff)",
            borderRadius: "16px",
            padding: "24px",
            maxWidth: "600px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "20px" }}>
              <h2 style={{
                margin: 0,
                color: "var(--brand-strong, #6f4518)",
                fontSize: "24px",
                fontFamily: "var(--title-font, 'Playfair Display', serif)",
                fontWeight: "700"
              }}>
                {selectedProduct.title}
              </h2>
              <button
                onClick={() => setShowProductModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "var(--text-muted, #7b6457)"
                }}
              >
                ×
              </button>
            </div>

            {/* Product Image */}
            {(() => {
              const imageUrl = selectedProduct.image
                ? `${API_BASE}/uploads/${selectedProduct.image}`
                : selectedProduct.img
                ? `${API_BASE}/uploads/${selectedProduct.img}`
                : null;

              return imageUrl ? (
                <img
                  src={imageUrl}
                  alt={selectedProduct.title}
                  style={{
                    width: "100%",
                    maxHeight: "300px",
                    objectFit: "cover",
                    borderRadius: "12px",
                    marginBottom: "20px"
                  }}
                />
              ) : null;
            })()}

            {/* Product Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {selectedProduct.description && (
                <div>
                  <h4 style={{ fontSize: "14px", color: "var(--text-muted, #7b6457)", marginBottom: "4px" }}>Description</h4>
                  <p style={{ margin: 0, color: "var(--text, #3f2d23)", lineHeight: "1.6" }}>
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              <div>
                <h4 style={{ fontSize: "14px", color: "var(--text-muted, #7b6457)", marginBottom: "4px" }}>Category</h4>
                <p style={{ margin: 0, color: "var(--text, #3f2d23)" }}>
                  {selectedProduct.mainCategory && selectedProduct.subCategory
                    ? `${selectedProduct.mainCategory} > ${selectedProduct.subCategory}`
                    : selectedProduct.subCategory || selectedProduct.category?.name || selectedProduct.category || "Uncategorized"}
                </p>
              </div>

              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "14px", color: "var(--text-muted, #7b6457)", marginBottom: "8px" }}>Variants</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedProduct.variants.map((variant, idx) => (
                      <div key={idx} style={{
                        padding: "12px",
                        background: "var(--accent-soft, #f3e7dc)",
                        borderRadius: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span style={{ color: "var(--text, #3f2d23)", fontWeight: "600" }}>{variant.weight}</span>
                        <span style={{ color: "var(--brand, #8b5e34)", fontWeight: "700" }}>₹{variant.price.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                <div>
                  <h4 style={{ fontSize: "14px", color: "var(--text-muted, #7b6457)", marginBottom: "4px" }}>Stock</h4>
                  <p style={{ margin: 0, color: "var(--text, #3f2d23)", fontWeight: "600" }}>
                    {selectedProduct.stock || 0} units
                  </p>
                </div>
                {selectedProduct.expiryDate && (
                  <div>
                    <h4 style={{ fontSize: "14px", color: "var(--text-muted, #7b6457)", marginBottom: "4px" }}>Expiry Date</h4>
                    <p style={{ margin: 0, color: "var(--text, #3f2d23)", fontWeight: "600" }}>
                      {new Date(selectedProduct.expiryDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <h4 style={{ fontSize: "14px", color: "var(--text-muted, #7b6457)", marginBottom: "4px" }}>Status</h4>
                {(() => {
                  const productStatus = getProductStatus(selectedProduct);
                  return (
                    <span style={{
                      padding: "8px 16px",
                      borderRadius: "20px",
                      fontSize: "14px",
                      fontWeight: "700",
                      background: productStatus.bg,
                      color: productStatus.color,
                      border: `1px solid ${productStatus.color === 'var(--brand, #8b5e34)' ? 'var(--border, #ead9c9)' : productStatus.color}`
                    }}>
                      {productStatus.label}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

