import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const EXTRA_TOPPING_OPTIONS = ["Dry fruits", "Choco chips", "Fresh fruits", "Buttercream flowers", "Edible glitter", "None"];

export default function CakePreorderCustomize() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cake, district } = location.state || {};
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [messageOnCake, setMessageOnCake] = useState("");
  const [eggOrEggless, setEggOrEggless] = useState("eggless");
  const [extraToppings, setExtraToppings] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!cake || !district) {
      toast.error("Please select a cake first.");
      navigate("/cakes/preorder", { state: { district: district || "" } });
      return;
    }
    const variants = cake.variants && cake.variants.length > 0 ? cake.variants : [{ weight: "1 piece", price: cake.price || 0 }];
    if (!selectedVariant) setSelectedVariant(variants[0]);
  }, [cake, district, navigate, selectedVariant]);

  const variants = cake?.variants?.length ? cake.variants : [{ weight: "1 piece", price: cake?.price || 0 }];

  const validate = () => {
    const err = {};
    if (!selectedVariant) err.size = "Please select cake size.";
    if (!deliveryDate.trim()) err.deliveryDate = "Please select delivery date.";
    else {
      const d = new Date(deliveryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) err.deliveryDate = "Delivery date must be today or later.";
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleContinueToAddress = () => {
    if (!validate()) {
      toast.error("Please fix the errors below.");
      return;
    }
    const cakePreorderDetails = {
      size: selectedVariant.weight,
      messageOnCake: messageOnCake.trim(),
      eggOrEggless,
      extraToppings: extraToppings.filter((t) => t && t !== "None"),
      deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
    };
    const cartItem = {
      productId: cake._id,
      title: cake.title,
      image: cake.image || cake.img,
      variant: { weight: selectedVariant.weight, price: selectedVariant.price },
      quantity: 1,
    };
    navigate("/cakes/preorder/address", {
      state: {
        district,
        cake,
        cartItem,
        cakePreorderDetails,
      },
    });
  };

  const toggleTopping = (t) => {
    if (t === "None") {
      setExtraToppings([]);
      return;
    }
    setExtraToppings((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev.filter((x) => x !== "None"), t]
    );
  };

  if (!cake || !district) return null;

  const imageUrl = cake.image || cake.img ? `${API_BASE}/uploads/${cake.image || cake.img}` : "/images/placeholder.png";

  return (
    <div className="product-details-container" style={{ maxWidth: "640px", margin: "0 auto", padding: "24px 16px" }}>
      <button type="button" onClick={() => navigate(-1)} className="product-breadcrumb-button" style={{ marginBottom: "16px" }}>
        ← Back
      </button>

      <h1 style={{ fontSize: "22px", color: "#5c4033", marginBottom: "8px" }}>Customize your cake</h1>
      <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>{cake.title} · {district}</p>

      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 200px" }}>
          <img
            src={imageUrl}
            alt={cake.title}
            style={{ width: "100%", borderRadius: "12px", objectFit: "cover", aspectRatio: "1" }}
            onError={(e) => { e.target.src = "/images/placeholder.png"; }}
          />
        </div>
        <div style={{ flex: "1", minWidth: "280px" }}>
          {/* Cake size */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>Cake size *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {variants.map((v) => (
                <button
                  key={v.weight}
                  type="button"
                  onClick={() => setSelectedVariant(v)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: selectedVariant?.weight === v.weight ? "2px solid #5c4033" : "1px solid #ddd",
                    background: selectedVariant?.weight === v.weight ? "#f5ebe0" : "#fff",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  {v.weight} · ₹{v.price}
                </button>
              ))}
            </div>
            {errors.size && <p style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>{errors.size}</p>}
          </div>

          {/* Message on cake */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>Message on cake</label>
            <input
              type="text"
              value={messageOnCake}
              onChange={(e) => setMessageOnCake(e.target.value)}
              placeholder="e.g. Happy Birthday!"
              maxLength={50}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontSize: "14px",
              }}
            />
            <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>Max 50 characters</p>
          </div>

          {/* Egg / Eggless */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>Type *</label>
            <div style={{ display: "flex", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="egg"
                  checked={eggOrEggless === "egg"}
                  onChange={() => setEggOrEggless("egg")}
                />
                <span>Egg</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="egg"
                  checked={eggOrEggless === "eggless"}
                  onChange={() => setEggOrEggless("eggless")}
                />
                <span>Eggless</span>
              </label>
            </div>
          </div>

          {/* Extra toppings (optional) */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>Extra toppings (optional)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {EXTRA_TOPPING_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTopping(t)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "999px",
                    border: extraToppings.includes(t) || (t === "None" && extraToppings.length === 0)
                      ? "2px solid #5c4033"
                      : "1px solid #ddd",
                    background: extraToppings.includes(t) || (t === "None" && extraToppings.length === 0) ? "#f5ebe0" : "#fff",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery date */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>Delivery date *</label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: errors.deliveryDate ? "2px solid #dc3545" : "1px solid #ddd",
                fontSize: "14px",
              }}
            />
            {errors.deliveryDate && <p style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>{errors.deliveryDate}</p>}
          </div>

          <button
            type="button"
            onClick={handleContinueToAddress}
            className="product-button-primary"
            style={{ width: "100%", padding: "12px 16px", fontSize: "15px" }}
          >
            Continue to address →
          </button>
        </div>
      </div>
    </div>
  );
}
