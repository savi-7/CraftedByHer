import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const STEPS = [
  { id: 1, label: "Check Pincode", short: "1. Pincode" },
  { id: 2, label: "Select Cake", short: "2. Select" },
  { id: 3, label: "Customize", short: "3. Customize" },
  { id: 4, label: "Address", short: "4. Address" },
  { id: 5, label: "Payment", short: "5. Payment" },
];

const EVENT_OPTIONS = ["Birthday", "Anniversary", "Wedding", "Baby Shower", "Graduation", "Housewarming", "Get Well Soon", "Thank You", "Farewell", "Retirement", "Other"];
const EXTRA_TOPPINGS = ["Dry fruits", "Choco chips", "Fresh fruits", "Buttercream flowers", "Edible glitter", "Nuts", "Whipped cream", "Fondant", "Chocolate ganache", "Sprinkles", "Coconut flakes", "Caramel drizzle", "Cream cheese frosting", "Fresh berries", "Gold leaf", "None"];
const COMMON_SIZES = [
  { weight: "0.25 kg", price: 0 },
  { weight: "0.5 kg", price: 0 },
  { weight: "1 kg", price: 0 },
  { weight: "1.5 kg", price: 0 },
  { weight: "2 kg", price: 0 },
  { weight: "2.5 kg", price: 0 },
  { weight: "3 kg", price: 0 },
  { weight: "4 kg", price: 0 },
  { weight: "5 kg", price: 0 },
];

function cleanDisplayName(raw) {
  if (!raw) return "";
  const words = raw.split(/\s+/).filter((w) => !/\d/.test(w) && !(w.length >= 3 && w === w.toUpperCase()));
  const final = (words.length ? words : raw.split(/\s+/).slice(0, 2)).slice(0, 3);
  return final.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

export default function CakePreorder() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedProductId = location.state?.productId;
  const [step, setStep] = useState(1);
  const [pincode, setPincode] = useState("");
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState(null); // 'available' | 'unavailable' | null
  const [district, setDistrict] = useState("");
  const [cakes, setCakes] = useState([]);
  const [loadingCakes, setLoadingCakes] = useState(false);
  const [selectedCake, setSelectedCake] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [messageOnCake, setMessageOnCake] = useState("");
  const [eventType, setEventType] = useState("");
  const [eggOrEggless, setEggOrEggless] = useState("eggless");
  const [extraToppings, setExtraToppings] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [customizeErrors, setCustomizeErrors] = useState({});
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [buyerDetails, setBuyerDetails] = useState({
    name: "",
    email: auth.currentUser?.email || "",
    phone: "",
    address: { street: "", city: "", state: "Kerala", pincode: "", landmark: "" },
  });
  const [addressErrors, setAddressErrors] = useState({});

  // Step 1: Check pincode
  const handleCheckPincode = async () => {
    const pin = pincode.trim();
    if (!pin || !/^[0-9]{6}$/.test(pin)) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }
    setCheckingPincode(true);
    setPincodeStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/cakes/check-availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode: pin }),
      });
      const data = await res.json();
      if (data.success && data.available) {
        setPincodeStatus("available");
        setDistrict(data.district || "");
        toast.success("Cakes available near you!");
        setStep(2);
        fetchCakes(data.district);
      } else {
        setPincodeStatus("unavailable");
        toast.error(data.message || "No cake sellers in your area");
      }
    } catch (e) {
      setPincodeStatus("unavailable");
      toast.error("Failed to check availability");
    } finally {
      setCheckingPincode(false);
    }
  };

  const fetchCakes = async (dist) => {
    if (!dist) return;
    setLoadingCakes(true);
    try {
      const res = await fetch(`${API_BASE}/api/cakes/available?district=${encodeURIComponent(dist)}`);
      const data = await res.json();
      const list = data.success && Array.isArray(data.cakes) ? data.cakes : [];
      setCakes(list);
      // Auto-select cake if user came from a specific product page
      if (preselectedProductId && list.length) {
        const found = list.find((c) => c._id === preselectedProductId);
        if (found) {
          setSelectedCake(found);
          const variants = found.variants?.length ? found.variants : [{ weight: "1 piece", price: found.price || 0 }];
          setSelectedVariant(variants[0]);
          setStep(3);
        }
      }
    } catch (e) {
      setCakes([]);
    } finally {
      setLoadingCakes(false);
    }
  };

  // Step 2: Select cake
  const handleSelectCake = (cake) => {
    setSelectedCake(cake);
    const variants = cake.variants?.length ? cake.variants : [{ weight: "1 piece", price: cake.price || 0 }];
    setSelectedVariant(variants[0]);
    setStep(3);
  };

  // Step 3: Customize
  const variants = selectedCake?.variants?.length
    ? selectedCake.variants
    : selectedCake?.price != null
    ? COMMON_SIZES.map((s) => ({ ...s, price: Math.round((selectedCake.price || 0) * parseFloat(s.weight)) }))
    : [{ weight: "1 piece", price: selectedCake?.price || 0 }];

  const validateCustomize = () => {
    const err = {};
    if (!selectedVariant) err.size = "Select cake size";
    if (!deliveryDate.trim()) err.deliveryDate = "Select delivery date";
    else if (new Date(deliveryDate) < new Date(new Date().toDateString())) err.deliveryDate = "Date must be today or later";
    setCustomizeErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleContinueToAddress = () => {
    if (!validateCustomize()) {
      toast.error("Please fix the errors");
      return;
    }
    setStep(4);
    loadAddresses();
  };

  const loadAddresses = async () => {
    if (!auth.currentUser) {
      toast.error("Please log in");
      navigate("/login");
      return;
    }
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/addresses`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const addrs = Array.isArray(data.addresses) ? data.addresses : [];
        setSavedAddresses(addrs);
        const def = addrs.find((a) => a.isDefault) || addrs[0];
        if (def) {
          setSelectedAddressId(def._id);
          setBuyerDetails({
            name: def.name || cleanDisplayName(auth.currentUser.displayName) || "",
            email: auth.currentUser.email || "",
            phone: def.phone || "",
            address: { ...def.address },
          });
        } else {
          setShowNewAddress(true);
          setBuyerDetails({
            name: cleanDisplayName(auth.currentUser.displayName) || "",
            email: auth.currentUser.email || "",
            phone: "",
            address: { street: "", city: "", state: "Kerala", pincode: pincode || "", landmark: "" },
          });
        }
      }
    } catch (e) {
      setShowNewAddress(true);
    }
  };

  const validateAddress = () => {
    const err = {};
    if (!buyerDetails.name?.trim()) err.name = "Name required";
    if (!buyerDetails.phone?.trim()) err.phone = "Phone required";
    else if (!/^[6-9]\d{9}$/.test(buyerDetails.phone)) err.phone = "Valid 10-digit phone";
    if (!buyerDetails.address.street?.trim() || buyerDetails.address.street.length < 5) err.street = "Full address required";
    if (!buyerDetails.address.city?.trim()) err.city = "City required";
    if (!buyerDetails.address.pincode?.trim() || !/^\d{6}$/.test(buyerDetails.address.pincode)) err.pincode = "Valid 6-digit pincode";
    setAddressErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleContinueToPayment = () => {
    if (!validateAddress()) {
      toast.error("Please fill all required fields");
      return;
    }
    const cakePreorderDetails = {
      size: selectedVariant.weight,
      messageOnCake: messageOnCake.trim(),
      eventType: eventType.trim(),
      eggOrEggless,
      extraToppings: extraToppings.filter((t) => t && t !== "None"),
      deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
    };
    const cartItem = {
      productId: selectedCake._id,
      title: selectedCake.title,
      image: selectedCake.image || selectedCake.img,
      variant: { weight: selectedVariant.weight, price: selectedVariant.price },
      quantity: 1,
    };
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

  const toggleTopping = (t) => {
    if (t === "None") setExtraToppings([]);
    else setExtraToppings((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev.filter((x) => x !== "None"), t]));
  };

  const getImageUrl = (cake) => {
    const img = cake?.image || cake?.img;
    return img ? `${API_BASE}/uploads/${img}` : "/images/placeholder.png";
  };

  const getPrice = (cake) => {
    const v = cake?.variants;
    if (v?.length) {
      const prices = v.map((x) => x.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return min === max ? `₹${min}` : `₹${min} - ₹${max}`;
    }
    return cake?.price != null ? `₹${cake.price}` : "Price on request";
  };

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "40px 24px", minHeight: "70vh" }}>
      {/* Centered title block */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "32px", color: "#5c4033", marginBottom: "8px", fontWeight: "700", letterSpacing: "-0.5px" }}>
          🎂 Cake Preorder
        </h1>
        <p style={{ color: "#666", fontSize: "15px", maxWidth: "400px", margin: "0 auto" }}>
          Order your custom cake in 5 simple steps — check availability, pick your cake, customize, add address & pay
        </p>
      </div>

      {/* Stepper - flow 1-2-3-4-5 like a real website */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "48px",
          padding: "0 8px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: "1",
                minWidth: "80px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: step >= s.id ? "#5c4033" : "#e9ecef",
                  color: step >= s.id ? "#fff" : "#666",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "14px",
                }}
              >
                {s.id}
              </div>
              <span style={{ fontSize: "12px", marginTop: "6px", color: step >= s.id ? "#5c4033" : "#999", fontWeight: step === s.id ? "600" : "400" }}>
                {s.short}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  flex: "0 0 24px",
                  height: "2px",
                  background: step > s.id ? "#5c4033" : "#e9ecef",
                  alignSelf: "flex-start",
                  marginTop: "18px",
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", padding: "32px", border: "1px solid #eee" }}>
        {/* Step 1: Pincode */}
        {step === 1 && (
          <div style={{ textAlign: "center", maxWidth: "400px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "18px", color: "#5c4033", marginBottom: "12px" }}>Step 1: Check delivery availability</h2>
            <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>
              Enter your pincode to see cakes available in your area
            </p>
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <input
                type="text"
                value={pincode}
                onChange={(e) => {
                  setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setPincodeStatus(null);
                }}
                placeholder="6-digit pincode"
                maxLength={6}
                disabled={checkingPincode}
                onKeyDown={(e) => e.key === "Enter" && handleCheckPincode()}
                style={{
                  flex: 1,
                  padding: "14px 16px",
                  borderRadius: "10px",
                  border: pincodeStatus === "available" ? "2px solid #28a745" : pincodeStatus === "unavailable" ? "2px solid #dc3545" : "2px solid #ddd",
                  fontSize: "16px",
                }}
              />
              <button
                type="button"
                onClick={handleCheckPincode}
                disabled={checkingPincode}
                className="product-button-primary"
                style={{ padding: "14px 24px", minWidth: "120px" }}
              >
                {checkingPincode ? "Checking..." : "Check"}
              </button>
            </div>
            {pincodeStatus === "available" && (
              <p style={{ color: "#28a745", fontWeight: "600", fontSize: "14px" }}>✓ Cakes available near you!</p>
            )}
            {pincodeStatus === "unavailable" && (
              <p style={{ color: "#dc3545", fontSize: "14px" }}>No cake sellers in your area. Try another pincode.</p>
            )}
          </div>
        )}

        {/* Step 2: Select cake */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: "18px", color: "#5c4033", marginBottom: "12px" }}>Step 2: Select your cake</h2>
            <p style={{ color: "#666", fontSize: "14px", marginBottom: "24px" }}>Cakes available in {district}</p>
            {loadingCakes ? (
              <div style={{ textAlign: "center", padding: "40px" }}>Loading cakes...</div>
            ) : cakes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", background: "#f9f9f9", borderRadius: "12px" }}>
                <p style={{ color: "#666" }}>No cakes in this district yet.</p>
                <button type="button" onClick={() => setStep(1)} className="product-button-primary" style={{ marginTop: "16px" }}>
                  Try another pincode
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
                {cakes.map((cake) => (
                  <div
                    key={cake._id}
                    onClick={() => handleSelectCake(cake)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleSelectCake(cake)}
                    style={{
                      borderRadius: "12px",
                      overflow: "hidden",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                      cursor: "pointer",
                      border: "2px solid #eee",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ height: "180px", background: "#f5f5f5" }}>
                      <img
                        src={getImageUrl(cake)}
                        alt={cake.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => { e.target.src = "/images/placeholder.png"; }}
                      />
                    </div>
                    <div style={{ padding: "14px" }}>
                      <h3 style={{ margin: "0 0 6px 0", fontSize: "15px", color: "#333" }}>{cake.title}</h3>
                      <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#5c4033" }}>{getPrice(cake)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Customize */}
        {step === 3 && selectedCake && (
          <div>
            <h2 style={{ fontSize: "18px", color: "#5c4033", marginBottom: "12px" }}>Step 3: Customize your cake</h2>
            <p style={{ color: "#666", fontSize: "14px", marginBottom: "24px" }}>{selectedCake.title}</p>
            <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 200px" }}>
                <img
                  src={getImageUrl(selectedCake)}
                  alt={selectedCake.title}
                  style={{ width: "100%", borderRadius: "12px", aspectRatio: "1", objectFit: "cover" }}
                  onError={(e) => { e.target.src = "/images/placeholder.png"; }}
                />
              </div>
              <div style={{ flex: "1", minWidth: "280px" }}>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>Cake size *</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {variants.map((v) => (
                      <button
                        key={v.weight}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        style={{
                          padding: "10px 14px",
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
                  {customizeErrors.size && <p style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>{customizeErrors.size}</p>}
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>Message on cake</label>
                  <input
                    type="text"
                    value={messageOnCake}
                    onChange={(e) => setMessageOnCake(e.target.value)}
                    placeholder="e.g. Happy Birthday!"
                    maxLength={50}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px" }}
                  />
                  <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>Max 50 characters</p>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>Event / Occasion</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {EVENT_OPTIONS.map((ev) => (
                      <button
                        key={ev}
                        type="button"
                        onClick={() => setEventType(ev)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "8px",
                          border: eventType === ev ? "2px solid #5c4033" : "1px solid #ddd",
                          background: eventType === ev ? "#f5ebe0" : "#fff",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        {ev}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>Type *</label>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="radio" name="egg" checked={eggOrEggless === "egg"} onChange={() => setEggOrEggless("egg")} />
                      <span>Egg</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="radio" name="egg" checked={eggOrEggless === "eggless"} onChange={() => setEggOrEggless("eggless")} />
                      <span>Eggless</span>
                    </label>
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>Extra toppings (optional)</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {EXTRA_TOPPINGS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTopping(t)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "999px",
                          border: extraToppings.includes(t) || (t === "None" && extraToppings.length === 0) ? "2px solid #5c4033" : "1px solid #ddd",
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
                      border: customizeErrors.deliveryDate ? "2px solid #dc3545" : "1px solid #ddd",
                      fontSize: "14px",
                    }}
                  />
                  {customizeErrors.deliveryDate && <p style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>{customizeErrors.deliveryDate}</p>}
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button type="button" onClick={() => setStep(2)} style={{ padding: "12px 20px", border: "1px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer" }}>
                    ← Back
                  </button>
                  <button type="button" onClick={handleContinueToAddress} className="product-button-primary" style={{ flex: 1, padding: "12px 16px" }}>
                    Continue to address →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Address */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: "18px", color: "#5c4033", marginBottom: "12px" }}>Step 4: Delivery address</h2>
            <p style={{ color: "#666", fontSize: "14px", marginBottom: "24px" }}>Choose or add your delivery address</p>
            {!auth.currentUser ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <p style={{ marginBottom: "16px" }}>Please log in to continue</p>
                <button type="button" onClick={() => navigate("/login")} className="product-button-primary">
                  Log in
                </button>
              </div>
            ) : (
              <>
                {savedAddresses.length > 0 && !showNewAddress && (
                  <div style={{ marginBottom: "20px" }}>
                    {savedAddresses.map((addr) => (
                      <div
                        key={addr._id}
                        onClick={() => {
                          setSelectedAddressId(addr._id);
                          setBuyerDetails({
                            name: addr.name || cleanDisplayName(auth.currentUser.displayName) || "",
                            email: auth.currentUser.email || "",
                            phone: addr.phone || "",
                            address: { ...addr.address },
                          });
                        }}
                        style={{
                          padding: "16px",
                          marginBottom: "12px",
                          border: selectedAddressId === addr._id ? "2px solid #5c4033" : "1px solid #ddd",
                          borderRadius: "10px",
                          background: selectedAddressId === addr._id ? "#f5ebe0" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontWeight: "600" }}>{addr.label || "Address"} {addr.isDefault && <span style={{ fontSize: "12px", color: "#28a745" }}>Default</span>}</div>
                        <div style={{ fontSize: "13px", color: "#333" }}>{addr.name} {addr.phone && `· ${addr.phone}`}</div>
                        <div style={{ fontSize: "13px", color: "#666" }}>{addr.address?.street}, {addr.address?.city}, {addr.address?.state} - {addr.address?.pincode}</div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewAddress(true);
                        setSelectedAddressId(null);
                        setBuyerDetails({
                          name: cleanDisplayName(auth.currentUser.displayName) || "",
                          email: auth.currentUser.email || "",
                          phone: "",
                          address: { street: "", city: "", state: "Kerala", pincode: pincode || "", landmark: "" },
                        });
                      }}
                      style={{ padding: "10px 16px", border: "2px solid #5c4033", background: "#fff", color: "#5c4033", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
                    >
                      + Add new address
                    </button>
                  </div>
                )}
                {showNewAddress && (
                  <div style={{ padding: "20px", background: "#f9f9f9", borderRadius: "12px", marginBottom: "20px" }}>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Full name *</label>
                      <input
                        value={buyerDetails.name}
                        onChange={(e) => setBuyerDetails((p) => ({ ...p, name: e.target.value }))}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: addressErrors.name ? "2px solid #dc3545" : "1px solid #ddd" }}
                      />
                      {addressErrors.name && <p style={{ color: "#dc3545", fontSize: "12px" }}>{addressErrors.name}</p>}
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Phone *</label>
                      <input
                        type="tel"
                        value={buyerDetails.phone}
                        onChange={(e) => setBuyerDetails((p) => ({ ...p, phone: e.target.value }))}
                        maxLength={10}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: addressErrors.phone ? "2px solid #dc3545" : "1px solid #ddd" }}
                      />
                      {addressErrors.phone && <p style={{ color: "#dc3545", fontSize: "12px" }}>{addressErrors.phone}</p>}
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Street address *</label>
                      <textarea
                        value={buyerDetails.address.street}
                        onChange={(e) => setBuyerDetails((p) => ({ ...p, address: { ...p.address, street: e.target.value } }))}
                        rows={2}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: addressErrors.street ? "2px solid #dc3545" : "1px solid #ddd" }}
                      />
                      {addressErrors.street && <p style={{ color: "#dc3545", fontSize: "12px" }}>{addressErrors.street}</p>}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>City *</label>
                        <input
                          value={buyerDetails.address.city}
                          onChange={(e) => setBuyerDetails((p) => ({ ...p, address: { ...p.address, city: e.target.value } }))}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: addressErrors.city ? "2px solid #dc3545" : "1px solid #ddd" }}
                        />
                        {addressErrors.city && <p style={{ color: "#dc3545", fontSize: "12px" }}>{addressErrors.city}</p>}
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Pincode *</label>
                        <input
                          value={buyerDetails.address.pincode}
                          onChange={(e) => setBuyerDetails((p) => ({ ...p, address: { ...p.address, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) } }))}
                          maxLength={6}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: addressErrors.pincode ? "2px solid #dc3545" : "1px solid #ddd" }}
                        />
                        {addressErrors.pincode && <p style={{ color: "#dc3545", fontSize: "12px" }}>{addressErrors.pincode}</p>}
                      </div>
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Landmark (optional)</label>
                      <input
                        value={buyerDetails.address.landmark}
                        onChange={(e) => setBuyerDetails((p) => ({ ...p, address: { ...p.address, landmark: e.target.value } }))}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd" }}
                      />
                    </div>
                    {savedAddresses.length > 0 && (
                      <button type="button" onClick={() => setShowNewAddress(false)} style={{ padding: "8px 14px", background: "transparent", border: "1px solid #666", borderRadius: "8px", cursor: "pointer" }}>
                        Cancel
                      </button>
                    )}
                  </div>
                )}
                <div style={{ display: "flex", gap: "12px" }}>
                  <button type="button" onClick={() => setStep(3)} style={{ padding: "12px 20px", border: "1px solid #ddd", borderRadius: "8px", background: "#fff", cursor: "pointer" }}>
                    ← Back
                  </button>
                  <button type="button" onClick={handleContinueToPayment} className="product-button-primary" style={{ flex: 1, padding: "12px 16px" }}>
                    Continue to payment →
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
