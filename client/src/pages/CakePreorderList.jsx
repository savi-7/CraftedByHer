import React, { useState, useEffect } from "react";
import { API_BASE } from "../config/api";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
export default function CakePreorderList() {
  const navigate = useNavigate();
  const location = useLocation();
  const district = location.state?.district || new URLSearchParams(location.search).get("district") || "";
  const [cakes, setCakes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!district) {
      toast.error("Please check pincode from a cake product page first.");
      navigate("/products");
      return;
    }
    const fetchCakes = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/cakes/available?district=${encodeURIComponent(district)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.cakes)) {
          setCakes(data.cakes);
        } else {
          setCakes([]);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load cakes");
        setCakes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCakes();
  }, [district, navigate]);

  const getPrice = (cake) => {
    if (cake.variants && cake.variants.length > 0) {
      const prices = cake.variants.map((v) => v.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return min === max ? `₹${min}` : `₹${min} - ₹${max}`;
    }
    return cake.price != null ? `₹${cake.price}` : "Price on request";
  };

  const getImageUrl = (cake) => {
    const img = cake.image || cake.img;
    if (!img) return "/images/placeholder.png";
    if (img.startsWith("http")) return img;
    return `${API_BASE}/uploads/${img}`;
  };

  const handleSelectCake = (cake) => {
    navigate("/cakes/preorder/customize", {
      state: { cake, district },
    });
  };

  if (!district) return null;

  return (
    <div className="product-details-container" style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ marginBottom: "24px" }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="product-breadcrumb-button"
          style={{ marginBottom: "8px" }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: "24px", color: "#5c4033", margin: "0 0 4px 0" }}>
          🎂 Cakes available in {district}
        </h1>
        <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
          Select a cake to customize and preorder
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px" }}>
          <div className="product-details-spinner" style={{ margin: "0 auto 16px" }} />
          <p>Loading cakes...</p>
        </div>
      ) : cakes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px", background: "#f9f9f9", borderRadius: "12px" }}>
          <p style={{ color: "#666", marginBottom: "16px" }}>No cakes listed in this district yet.</p>
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="product-button-primary"
          >
            Browse products
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px" }}>
          {cakes.map((cake) => (
            <div
              key={cake._id}
              onClick={() => handleSelectCake(cake)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleSelectCake(cake)}
              style={{
                background: "#fff",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                border: "1px solid #eee",
              }}
            >
              <div style={{ height: "200px", overflow: "hidden", background: "#f5f5f5" }}>
                <img
                  src={getImageUrl(cake)}
                  alt={cake.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { e.target.src = "/images/placeholder.png"; }}
                />
              </div>
              <div style={{ padding: "16px" }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#333" }}>{cake.title}</h3>
                <p style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#5c4033" }}>
                  {getPrice(cake)}
                </p>
                <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#888" }}>
                  Click to customize & preorder
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
