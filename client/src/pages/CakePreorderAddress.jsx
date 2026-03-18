import React, { useState, useEffect } from "react";
import { API_BASE } from "../config/api";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
function cleanDisplayName(rawName) {
  if (!rawName) return "";
  const words = rawName.split(/\s+/).filter((w) => !/\d/.test(w) && !(w.length >= 3 && w === w.toUpperCase()));
  const final = (words.length ? words : rawName.split(/\s+/).slice(0, 2)).slice(0, 3);
  return final.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

export default function CakePreorderAddress() {
  const navigate = useNavigate();
  const location = useLocation();
  const { district, cake, cartItem, cakePreorderDetails } = location.state || {};
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buyerDetails, setBuyerDetails] = useState({
    name: "",
    email: auth.currentUser?.email || "",
    phone: "",
    address: { street: "", city: "", state: "Kerala", pincode: "", landmark: "" },
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!cartItem || !cakePreorderDetails) {
      toast.error("Session expired. Please customize your cake again.");
      navigate("/cakes/preorder", { state: { district } });
      return;
    }
    if (!auth.currentUser) {
      toast.error("Please log in to continue.");
      navigate("/login");
      return;
    }
    const fetchAddresses = async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_BASE}/api/addresses`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          const addrs = Array.isArray(data.addresses) ? data.addresses : [];
          setSavedAddresses(addrs);
          const defaultAddr = addrs.find((a) => a.isDefault);
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr._id);
            setBuyerDetails({
              name: defaultAddr.name || cleanDisplayName(auth.currentUser.displayName) || "",
              email: auth.currentUser.email || "",
              phone: defaultAddr.phone || "",
              address: { ...defaultAddr.address },
            });
            setShowNewForm(false);
          } else if (addrs.length > 0) {
            const first = addrs[0];
            setSelectedAddressId(first._id);
            setBuyerDetails({
              name: first.name || cleanDisplayName(auth.currentUser.displayName) || "",
              email: auth.currentUser.email || "",
              phone: first.phone || "",
              address: { ...first.address },
            });
          } else {
            setShowNewForm(true);
            setBuyerDetails({
              name: cleanDisplayName(auth.currentUser.displayName) || "",
              email: auth.currentUser.email || "",
              phone: "",
              address: { street: "", city: "", state: "Kerala", pincode: "", landmark: "" },
            });
          }
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load addresses.");
      } finally {
        setLoading(false);
      }
    };
    fetchAddresses();
  }, [navigate, district, cartItem, cakePreorderDetails]);

  const selectAddress = (addr) => {
    setSelectedAddressId(addr._id);
    setShowNewForm(false);
    setBuyerDetails({
      name: addr.name || cleanDisplayName(auth.currentUser.displayName) || "",
      email: auth.currentUser.email || "",
      phone: addr.phone || "",
      address: { ...addr.address },
    });
  };

  const validate = () => {
    const err = {};
    if (!buyerDetails.name?.trim()) err.name = "Name is required.";
    if (!buyerDetails.phone?.trim()) err.phone = "Phone is required.";
    else if (!/^[6-9]\d{9}$/.test(buyerDetails.phone.trim())) err.phone = "Valid 10-digit phone required.";
    if (!buyerDetails.address.street?.trim() || buyerDetails.address.street.trim().length < 5) err.street = "Full address required.";
    if (!buyerDetails.address.city?.trim()) err.city = "City is required.";
    if (!buyerDetails.address.pincode?.trim() || !/^\d{6}$/.test(buyerDetails.address.pincode)) err.pincode = "Valid 6-digit pincode required.";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleContinueToPayment = () => {
    if (!validate()) {
      toast.error("Please fill all required fields correctly.");
      return;
    }
    navigate("/payment-selection", {
      state: {
        cartItems: [cartItem],
        buyerDetails,
        deliveryPincode: buyerDetails.address.pincode,
        deliveryCity: buyerDetails.address.city,
        isCakePreorder: true,
        cakePreorderDetails,
      },
    });
  };

  const handleInput = (field, value) => {
    if (field.includes(".")) {
      const [p, c] = field.split(".");
      setBuyerDetails((prev) => ({ ...prev, [p]: { ...prev[p], [c]: value } }));
    } else {
      setBuyerDetails((prev) => ({ ...prev, [field]: value }));
    }
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  };

  if (!cartItem || !cakePreorderDetails) return null;

  return (
    <div className="product-details-container" style={{ maxWidth: "640px", margin: "0 auto", padding: "24px 16px" }}>
      <button type="button" onClick={() => navigate(-1)} className="product-breadcrumb-button" style={{ marginBottom: "16px" }}>
        ← Back
      </button>
      <h1 style={{ fontSize: "22px", color: "#5c4033", marginBottom: "8px" }}>Delivery address</h1>
      <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>Choose or add address for cake delivery</p>

      {loading ? (
        <p>Loading addresses...</p>
      ) : (
        <>
          {savedAddresses.length > 0 && !showNewForm && (
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>Saved addresses</p>
              {savedAddresses.map((addr) => (
                <div
                  key={addr._id}
                  onClick={() => selectAddress(addr)}
                  style={{
                    padding: "14px",
                    marginBottom: "10px",
                    border: selectedAddressId === addr._id ? "2px solid #5c4033" : "1px solid #ddd",
                    borderRadius: "10px",
                    background: selectedAddressId === addr._id ? "#f5ebe0" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: "600" }}>
                    {addr.label || "Address"} {addr.isDefault && <span style={{ fontSize: "12px", color: "#28a745" }}>Default</span>}
                  </div>
                  <div style={{ fontSize: "13px", color: "#333" }}>{addr.name} {addr.phone && `· ${addr.phone}`}</div>
                  <div style={{ fontSize: "13px", color: "#666" }}>
                    {addr.address?.street}, {addr.address?.city}, {addr.address?.state} - {addr.address?.pincode}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setShowNewForm(true);
                  setSelectedAddressId(null);
                  setBuyerDetails({
                    name: cleanDisplayName(auth.currentUser.displayName) || "",
                    email: auth.currentUser.email || "",
                    phone: "",
                    address: { street: "", city: "", state: "Kerala", pincode: "", landmark: "" },
                  });
                }}
                style={{
                  padding: "10px 16px",
                  border: "2px solid #5c4033",
                  background: "#fff",
                  color: "#5c4033",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                + Add new address
              </button>
            </div>
          )}

          {showNewForm && (
            <div style={{ marginBottom: "24px", padding: "20px", background: "#f9f9f9", borderRadius: "12px" }}>
              <p style={{ fontWeight: "600", marginBottom: "12px" }}>New address</p>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Full name *</label>
                <input
                  value={buyerDetails.name}
                  onChange={(e) => handleInput("name", e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: errors.name ? "2px solid #dc3545" : "1px solid #ddd" }}
                />
                {errors.name && <p style={{ color: "#dc3545", fontSize: "12px" }}>{errors.name}</p>}
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Phone *</label>
                <input
                  type="tel"
                  value={buyerDetails.phone}
                  onChange={(e) => handleInput("phone", e.target.value)}
                  maxLength={10}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: errors.phone ? "2px solid #dc3545" : "1px solid #ddd" }}
                />
                {errors.phone && <p style={{ color: "#dc3545", fontSize: "12px" }}>{errors.phone}</p>}
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Street address *</label>
                <textarea
                  value={buyerDetails.address.street}
                  onChange={(e) => handleInput("address.street", e.target.value)}
                  rows={2}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: errors.street ? "2px solid #dc3545" : "1px solid #ddd" }}
                />
                {errors.street && <p style={{ color: "#dc3545", fontSize: "12px" }}>{errors.street}</p>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>City *</label>
                  <input
                    value={buyerDetails.address.city}
                    onChange={(e) => handleInput("address.city", e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: errors.city ? "2px solid #dc3545" : "1px solid #ddd" }}
                  />
                  {errors.city && <p style={{ color: "#dc3545", fontSize: "12px" }}>{errors.city}</p>}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Pincode *</label>
                  <input
                    value={buyerDetails.address.pincode}
                    onChange={(e) => handleInput("address.pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: errors.pincode ? "2px solid #dc3545" : "1px solid #ddd" }}
                  />
                  {errors.pincode && <p style={{ color: "#dc3545", fontSize: "12px" }}>{errors.pincode}</p>}
                </div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Landmark (optional)</label>
                <input
                  value={buyerDetails.address.landmark}
                  onChange={(e) => handleInput("address.landmark", e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd" }}
                />
              </div>
              {savedAddresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  style={{ padding: "8px 14px", background: "transparent", border: "1px solid #666", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleContinueToPayment}
            className="product-button-primary"
            style={{ width: "100%", padding: "12px 16px", fontSize: "15px" }}
          >
            Continue to payment →
          </button>
        </>
      )}
    </div>
  );
}
