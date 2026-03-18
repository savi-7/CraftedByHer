import React, { useState } from "react";
import { toast } from "react-toastify";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const boxStyle = {
  padding: "12px",
  background: "#f3e7dc",
  borderRadius: "6px",
  fontSize: "13px",
  color: "#3f2d23",
  border: "1px solid #ead9c9",
};
const headingStyle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#3f2d23",
  marginBottom: "8px",
};

export default function HealthAssistantPage() {
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showHealth, setShowHealth] = useState(true);
  const [showFoodInfo, setShowFoodInfo] = useState(true);
  const [showNutrition, setShowNutrition] = useState(true);

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === "front") {
      setFrontImage(file);
      setFrontPreview(URL.createObjectURL(file));
    } else {
      setBackImage(file);
      setBackPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!backImage) {
      toast.error("Back image (nutrition label) is required.");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("backImage", backImage, backImage.name || "back.jpg");
      if (frontImage) formData.append("frontImage", frontImage, frontImage.name || "front.jpg");

      // Do not set Content-Type — browser must set multipart/form-data with boundary
      const response = await fetch(`${API_BASE}/api/health/predict`, {
        method: "POST",
        body: formData,
      });

      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: "Invalid server response" };
      }

      if (!response.ok) {
        const msg = data?.error || data?.detail || "Request failed.";
        throw new Error(msg);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      toast.success("Extraction completed!");
    } catch (err) {
      toast.error(err?.message || "Analysis failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFrontImage(null);
    setBackImage(null);
    setFrontPreview(null);
    setBackPreview(null);
    setResult(null);
  };

  const success = result?.status === "success";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #f7f3ed 0%, #ffffff 100%)",
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h1
            style={{
              color: "#5c4033",
              fontSize: "24px",
              fontWeight: "700",
              marginBottom: "6px",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            Health Assistant
          </h1>
          <p style={{ color: "#7b6457", fontSize: "14px" }}>
            Upload product images. Back image (nutrition label) is required. Front image is optional for name & brand.
          </p>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(63,45,35,0.08)",
            marginBottom: "16px",
            border: "1px solid #ead9c9",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", ...headingStyle }}>Front Image (optional)</label>
              <div
                style={{
                  border: "2px dashed #ead9c9",
                  borderRadius: "8px",
                  padding: "16px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: frontPreview ? "#f3e7dc" : "#fff",
                }}
              >
                {frontPreview ? (
                  <img src={frontPreview} alt="Front" style={{ maxWidth: "100%", maxHeight: "120px", borderRadius: "6px" }} />
                ) : (
                  <span style={{ color: "#7b6457", fontSize: "12px" }}>Click to upload</span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, "front")}
                  style={{ display: "none" }}
                  id="front-img"
                />
                <label htmlFor="front-img" style={{ display: "inline-block", marginTop: "8px", padding: "6px 14px", background: "#8b5e34", color: "#fff", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
                  {frontPreview ? "Change" : "Upload"}
                </label>
              </div>
            </div>
            <div>
              <label style={{ display: "block", ...headingStyle }}>Back Image (required)</label>
              <div
                style={{
                  border: "2px dashed #ead9c9",
                  borderRadius: "8px",
                  padding: "16px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: backPreview ? "#f3e7dc" : "#fff",
                }}
              >
                {backPreview ? (
                  <img src={backPreview} alt="Back" style={{ maxWidth: "100%", maxHeight: "120px", borderRadius: "6px" }} />
                ) : (
                  <span style={{ color: "#7b6457", fontSize: "12px" }}>Click to upload</span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, "back")}
                  style={{ display: "none" }}
                  id="back-img"
                />
                <label htmlFor="back-img" style={{ display: "inline-block", marginTop: "8px", padding: "6px 14px", background: "#8b5e34", color: "#fff", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
                  {backPreview ? "Change" : "Upload"}
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px", marginBottom: "16px", padding: "12px", background: "#f3e7dc", borderRadius: "6px", border: "1px solid #ead9c9" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input type="checkbox" checked={showHealth} onChange={(e) => setShowHealth(e.target.checked)} style={{ accentColor: "#8b5e34" }} />
              <span style={{ fontSize: "12px", color: "#3f2d23", fontWeight: "500" }}>Health assessment</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input type="checkbox" checked={showFoodInfo} onChange={(e) => setShowFoodInfo(e.target.checked)} style={{ accentColor: "#8b5e34" }} />
              <span style={{ fontSize: "12px", color: "#3f2d23", fontWeight: "500" }}>Food info</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input type="checkbox" checked={showNutrition} onChange={(e) => setShowNutrition(e.target.checked)} style={{ accentColor: "#8b5e34" }} />
              <span style={{ fontSize: "12px", color: "#3f2d23", fontWeight: "500" }}>Nutrition</span>
            </label>
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              onClick={handleSubmit}
              disabled={loading || !backImage}
              style={{
                padding: "8px 20px",
                background: loading ? "#ead9c9" : "linear-gradient(135deg, #8b5e34 0%, #6f4518 100%)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Extracting…" : "Extract"}
            </button>
            {(frontImage || backImage || result) && (
              <button
                onClick={handleReset}
                style={{
                  padding: "8px 20px",
                  background: "#fff",
                  color: "#8b5e34",
                  border: "1px solid #8b5e34",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {result && (
          <div
            style={{
              background: "#ffffff",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(63,45,35,0.08)",
              border: "1px solid #ead9c9",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#5c4033", marginBottom: "16px", fontFamily: "'Playfair Display', serif" }}>
              Results
            </h2>

            {!success && result.error && (
              <div style={{ ...boxStyle, marginBottom: "16px", color: "#c0392b" }}>
                {result.error}
              </div>
            )}

            {success && showFoodInfo && result.food_info != null && (
              <div style={{ marginBottom: "16px" }}>
                <h3 style={headingStyle}>Product</h3>
                <div style={boxStyle}>
                  <div><strong>Name:</strong> {result.food_info.item_name ?? "—"}</div>
                  <div><strong>Brand:</strong> {result.food_info.brand ?? "—"}</div>
                </div>
              </div>
            )}

            {success && showHealth && result.health_info != null && (
              <div style={{ marginBottom: "16px" }}>
                <h3 style={headingStyle}>Health assessment</h3>
                <div style={boxStyle}>
                  <div><strong>Verdict:</strong> {result.health_info.verdict ?? "—"}</div>
                  {result.health_info.score != null && <div><strong>Score:</strong> {result.health_info.score}/10</div>}
                  {result.health_info.summary && <div style={{ marginTop: "8px" }}>{result.health_info.summary}</div>}
                  {result.health_info.positives?.length > 0 && (
                    <div style={{ marginTop: "8px" }}>
                      <strong>Positives:</strong> {result.health_info.positives.join("; ")}
                    </div>
                  )}
                  {result.health_info.negatives?.length > 0 && (
                    <div style={{ marginTop: "4px" }}>
                      <strong>Negatives:</strong> {result.health_info.negatives.join("; ")}
                    </div>
                  )}
                </div>
              </div>
            )}

            {success && showNutrition && result.nutrition_info != null && (
              <div>
                <h3 style={headingStyle}>Nutrition (per 100g)</h3>
                <div style={boxStyle}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <tbody>
                      {Object.entries(result.nutrition_info).map(([key, value]) => (
                        <tr key={key} style={{ borderBottom: "1px solid #ead9c9" }}>
                          <td style={{ padding: "4px 8px 4px 0", color: "#5c4033" }}>{key.replace(/_/g, " ")}</td>
                          <td style={{ padding: "4px 0", fontWeight: "600" }}>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
