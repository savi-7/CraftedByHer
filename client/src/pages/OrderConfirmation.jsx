import React, { useState, useEffect } from "react";
import { API_BASE } from "../config/api";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import OrderRating from "../components/OrderRating";
// Live tracking (Socket.IO + Leaflet) loaded via CDN at runtime

export default function OrderConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [live, setLive] = useState({
    connected: false,
    updates: 0,
    distanceM: 0,
    coords: null,
    delivered: false
  });

  // Check for persisted delivery status and sync with server
  useEffect(() => {
    const checkDeliveredStatus = async () => {
      if (orderId) {
        const savedStatus = localStorage.getItem(`delivery-status-${orderId}`);
        if (savedStatus) {
          const parsed = JSON.parse(savedStatus);
          if (parsed.delivered) {
            console.log('[OrderConfirmation] Found delivered status in localStorage, syncing...');
            setLive(prev => ({ ...prev, delivered: true }));
            setOrder((prev) => prev ? { ...prev, orderStatus: "delivered" } : prev);
            
            // Also sync with server to ensure consistency
            try {
              if (auth.currentUser) {
                const token = await auth.currentUser.getIdToken();
                await fetch(`${API_BASE}/api/orders/${orderId}/delivered`, {
                  method: 'PATCH',
                  headers: { Authorization: `Bearer ${token}` }
                });
                console.log('[OrderConfirmation] Synced delivered status with server');
              }
            } catch (e) {
              console.warn('[OrderConfirmation] Failed to sync with server:', e);
            }
          }
        }
      }
    };
    
    checkDeliveredStatus();
  }, [orderId]);

  // Lazy load external scripts (Socket.IO client + Leaflet assets)
  const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src=\"${src}\"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
  const loadCss = (href) => new Promise((resolve, reject) => {
    if (document.querySelector(`link[href=\"${href}\"]`)) return resolve();
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    l.onload = resolve;
    l.onerror = reject;
    document.head.appendChild(l);
  });

  const fetchOrderDetails = async () => {
    if (orderId) {
      try {
        const token = await auth.currentUser.getIdToken();
        const resp = await fetch(`${API_BASE}/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error("Failed to fetch order");
        const data = await resp.json();
        setOrder(data);
      } catch (e) {
        console.error("Error fetching order:", e);
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!auth.currentUser) {
        toast.error("Please login to view order details");
        navigate("/login");
        return;
      }

      if (location.state?.order) {
        setOrder(location.state.order);
        setPaymentSuccess(location.state.paymentSuccess || false);
        return;
      }

      if (orderId) {
        try {
          const token = await auth.currentUser.getIdToken();
          const resp = await fetch(`${API_BASE}/api/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!resp.ok) throw new Error("Failed to fetch order");
          const data = await resp.json();
          setOrder(data);
        } catch (e) {
          toast.error("No order found");
          navigate("/orders");
        }
      } else {
        toast.error("No order found");
        navigate("/orders");
      }
    };
    init();
  }, [navigate, location.state, orderId]);

  // Prevent going back to payment/checkout pages after order is placed
  useEffect(() => {
    // Add a new history entry to prevent back navigation
    window.history.pushState(null, '', window.location.href);
    
    const handlePopState = (event) => {
      // Prevent default back navigation
      window.history.pushState(null, '', window.location.href);
      toast.info("Please use the navigation buttons to continue shopping");
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Attach live tracking map when order becomes available
  useEffect(() => {
    let socket;
    let map;
    let marker;
    let polyline;
    let coords = [];
    const haversine = (lat1, lon1, lat2, lon2) => {
      const toRad = (v) => (v * Math.PI) / 180;
      const R = 6371000;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const setup = async () => {
      if (!order) return;
      
      // Check if map container exists
      const mapContainer = document.getElementById("buyer-live-map");
      if (!mapContainer) {
        console.warn("Map container not found, skipping map initialization");
        return;
      }
      
      try {
        // Load assets
        await loadCss("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
        await loadScript("https://cdn.socket.io/4.7.4/socket.io.min.js");
        await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");

        // eslint-disable-next-line no-undef
        map = window.L.map("buyer-live-map").setView([9.9312, 76.2673], 14);
      } catch (error) {
        console.error("Error initializing map:", error);
        return;
      }
      // eslint-disable-next-line no-undef
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      // eslint-disable-next-line no-undef
      marker = window.L.marker([9.9312, 76.2673]).addTo(map);
      marker.bindPopup('Delivery Boy is on the way 🚚').openPopup();
      // eslint-disable-next-line no-undef
      polyline = window.L.polyline([], { color: '#2563eb', weight: 4 }).addTo(map);

      // eslint-disable-next-line no-undef
      socket = window.io('http://localhost:3000', { transports: ['websocket', 'polling'], timeout: 4000, reconnectionAttempts: 5 });
      socket.on('connect', () => setLive((p) => ({ ...p, connected: true })));
      socket.on('location-D1', (p) => {
        const { lat, lon, count, delivered } = p;
        if (marker && map) {
          marker.setLatLng([lat, lon]);
          map.setView([lat, lon]);
          if (delivered) {
            marker.bindPopup('Delivered ✅').openPopup();
          }
        }
        coords.push([lat, lon]);
        if (polyline) polyline.setLatLngs(coords);
        let add = 0;
        if (coords.length >= 2) {
          const prev = coords[coords.length - 2];
          add = haversine(prev[0], prev[1], lat, lon);
        }
        setLive((p2) => ({
          ...p2,
          updates: count,
          coords: { lat, lon },
          distanceM: Number((p2.distanceM + add).toFixed(1)),
          delivered: delivered || p2.delivered
        }));
        
        // Persist delivery status
        if (delivered && orderId) {
          localStorage.setItem(`delivery-status-${orderId}`, JSON.stringify({ delivered: true, timestamp: Date.now() }));
        }
      });
      socket.on('delivered-D1', () => {
        setLive((p2) => ({ ...p2, delivered: true }));
        if (orderId) {
          localStorage.setItem(`delivery-status-${orderId}`, JSON.stringify({ delivered: true, timestamp: Date.now() }));
        }
      });
      socket.on('orderDelivered', () => {
        setLive((p2) => ({ ...p2, delivered: true }));
        if (orderId) {
          localStorage.setItem(`delivery-status-${orderId}`, JSON.stringify({ delivered: true, timestamp: Date.now() }));
        }
      });
    };

    setup();
    return () => {
      try { if (map) map.remove(); } catch {}
      if (socket) socket.close();
    };
  }, [order]);

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "#d4a574";
      case "confirmed": return "#c9a87c";
      case "preparing": return "#c9a87c";
      case "shipped": return "#b8956a";
      case "delivered": return "#8b6f47";
      case "cancelled": return "#a0826d";
      default: return "#8b6f47";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending": return "Ordered";
      case "confirmed": return "Ordered";
      case "preparing": return "Ordered";
      case "shipped": return "Shipped";
      case "in_transit_to_customer_hub": return "Shipped";
      case "at_customer_hub": return "Out for Delivery";
      case "out_for_delivery": return "Out for Delivery";
      case "ready_for_pickup": return "Out for Delivery";
      case "delivered": return "Delivered";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  // Get status progression steps
  const getStatusSteps = (orderStatus) => {
    const status = orderStatus || "pending";
    const steps = [
      { key: "ordered", label: "Ordered", status: ["pending", "confirmed", "preparing", "shipped", "in_transit_to_customer_hub", "at_customer_hub", "out_for_delivery", "ready_for_pickup", "delivered"] },
      { key: "shipped", label: "Shipped", status: ["shipped", "in_transit_to_customer_hub", "at_customer_hub", "out_for_delivery", "ready_for_pickup", "delivered"] },
      { key: "out_for_delivery", label: "Out for Delivery", status: ["at_customer_hub", "out_for_delivery", "ready_for_pickup", "delivered"] },
      { key: "delivered", label: "Delivered", status: ["delivered"] }
    ];

    return steps.map((step, index) => {
      const isCompleted = step.status.includes(status);
      const isCurrent = index === steps.findIndex(s => s.status.includes(status));
      return {
        ...step,
        completed: isCompleted && !isCurrent,
        current: isCurrent
      };
    });
  };

  const getPaymentStatusText = (status, method) => {
    if (method === "cod" && status === "pending") return "Pay on Delivery";
    switch (status) {
      case "pending": return "Payment Pending";
      case "paid": return "Payment Successful";
      case "failed": return "Payment Failed";
      case "refunded": return "Payment Refunded";
      default: return status;
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "pending": return "#ffc107";
      case "paid": return "#28a745";
      case "failed": return "#dc3545";
      case "refunded": return "#6c757d";
      default: return "#6c757d";
    }
  };

  const getEstimatedDelivery = () => {
    const orderDate = new Date(order.createdAt);
    const deliveryDate = new Date(orderDate.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days
    return deliveryDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleTrackOrder = () => {
    navigate("/orders");
  };

  const handleContinueShopping = () => {
    navigate("/products");
  };

  if (!order) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Loading order details...</h2>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: "1200px", 
      margin: "0 auto", 
      padding: "40px 20px",
      background: "linear-gradient(to bottom, #faf8f5 0%, #ffffff 100%)",
      minHeight: "100vh"
    }}>
      {/* Success Message */}
      {paymentSuccess && (
        <div style={{ 
          background: "linear-gradient(135deg, #f3e7dc 0%, #ead9c9 100%)", 
          border: "1px solid #d4a574", 
          color: "#5c4033", 
          padding: "16px", 
          borderRadius: "12px", 
          marginBottom: "24px",
          textAlign: "center",
          boxShadow: "0 2px 8px rgba(92, 64, 51, 0.08)"
        }}>
          <h2 style={{ margin: "0 0 6px 0", color: "#5c4033", fontSize: "20px", fontWeight: "600" }}>🎉 Order Placed Successfully!</h2>
          <p style={{ margin: 0, fontSize: "14px", color: "#8b5e34" }}>Thank you for your order. We'll start preparing it right away!</p>
        </div>
      )}

      {/* Page Header */}
      <div style={{ marginBottom: "24px", textAlign: "center" }}>
        <h1 style={{ 
          marginBottom: "8px", 
          color: "#5c4033", 
          fontSize: "28px",
          fontWeight: "700",
          letterSpacing: "-0.3px"
        }}>
          Order Confirmation
        </h1>
        <p style={{ 
          color: "#8b5e34", 
          fontSize: "14px",
          margin: 0
        }}>
          Your order details and tracking information
        </p>
      </div>

      {/* Order Summary Card */}
      <div style={{ 
        background: "linear-gradient(135deg, #fff 0%, #faf8f5 100%)", 
        padding: "24px", 
        borderRadius: "16px", 
        marginBottom: "24px", 
        border: "1px solid #e8ddd4",
        boxShadow: "0 4px 16px rgba(92, 64, 51, 0.06)"
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: "1px solid #f3e7dc"
        }}>
          <h2 style={{ 
            margin: 0, 
            color: "#5c4033", 
            fontSize: "20px",
            fontWeight: "700"
          }}>
            Order #{order.orderNumber}
          </h2>
          <div style={{ 
            background: getStatusColor(live.delivered ? "delivered" : order.orderStatus), 
            color: "white", 
            padding: "6px 14px", 
            borderRadius: "16px", 
            fontSize: "12px", 
            fontWeight: "600",
            boxShadow: "0 2px 6px rgba(92, 64, 51, 0.2)"
          }}>
            {getStatusText(live.delivered ? "delivered" : order.orderStatus)}
          </div>
        </div>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "12px",
          fontSize: "14px"
        }}>
          <div style={{
            padding: "12px",
            background: "#fff",
            borderRadius: "10px",
            border: "1px solid #f3e7dc"
          }}>
            <div style={{ color: "#8b5e34", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Order Date</div>
            <div style={{ color: "#5c4033", fontWeight: "600", fontSize: "13px" }}>{new Date(order.createdAt).toLocaleDateString('en-IN', { 
              weekday: 'short', 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}</div>
          </div>
          <div style={{
            padding: "12px",
            background: "#fff",
            borderRadius: "10px",
            border: "1px solid #f3e7dc"
          }}>
            <div style={{ color: "#8b5e34", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Payment Method</div>
            <div style={{ color: "#5c4033", fontWeight: "600", fontSize: "13px" }}>{order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}</div>
          </div>
          <div style={{
            padding: "12px",
            background: "#fff",
            borderRadius: "10px",
            border: "1px solid #f3e7dc"
          }}>
            <div style={{ color: "#8b5e34", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Payment Status</div>
            <span style={{ 
              color: order.paymentMethod === "cod" && order.paymentStatus === "pending" ? "#8b6f47" : 
                    order.paymentStatus === "paid" ? "#8b6f47" : 
                    order.paymentStatus === "pending" ? "#d4a574" : "#a0826d",
              fontWeight: "600",
              fontSize: "13px"
            }}>
              {live.delivered ? "Payment Successful" : getPaymentStatusText(order.paymentStatus, order.paymentMethod)}
            </span>
          </div>
          <div style={{
            padding: "12px",
            background: "linear-gradient(135deg, #5c4033 0%, #8b5e34 100%)",
            borderRadius: "10px",
            border: "1px solid #5c4033"
          }}>
            <div style={{ color: "#f3e7dc", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Total Amount</div>
            <div style={{ color: "#fff", fontWeight: "700", fontSize: "18px" }}>₹{order.finalAmount}</div>
          </div>
          <div style={{
            padding: "12px",
            background: "#fff",
            borderRadius: "10px",
            border: "1px solid #f3e7dc"
          }}>
            <div style={{ color: "#8b5e34", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Estimated Delivery</div>
            <div style={{ color: "#5c4033", fontWeight: "600", fontSize: "13px" }}>{getEstimatedDelivery()}</div>
          </div>
          {live.delivered && (
            <div style={{
              gridColumn: "1 / -1",
              padding: "16px",
              background: "linear-gradient(135deg, #f3e7dc 0%, #ead9c9 100%)",
              borderRadius: "10px",
              border: "1px solid #d4a574",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#5c4033", marginBottom: "6px" }}>
                ✅ Order Delivered!
              </div>
              <div style={{ fontSize: "13px", color: "#8b5e34" }}>
                Your order has been successfully delivered to your address.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Status Timeline */}
      <div style={{ 
        background: "#fff", 
        padding: "24px", 
        borderRadius: "16px", 
        marginBottom: "24px", 
        border: "1px solid #e8ddd4",
        boxShadow: "0 4px 16px rgba(92, 64, 51, 0.06)"
      }}>
        <h3 style={{ 
          marginBottom: "24px", 
          color: "#5c4033",
          fontSize: "20px",
          fontWeight: "700"
        }}>
          Order Status
        </h3>
        
        {/* Status Progression Timeline */}
        <div style={{ position: "relative", padding: "16px 0" }}>
          {getStatusSteps(live.delivered ? "delivered" : order.orderStatus).map((step, index, steps) => (
            <div key={step.key} style={{ position: "relative", marginBottom: index < steps.length - 1 ? "24px" : "0" }}>
              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div style={{
                  position: "absolute",
                  left: "18px",
                  top: "36px",
                  width: "2px",
                  height: "32px",
                  backgroundColor: step.completed ? "#8b6f47" : "#e8ddd4",
                  zIndex: 0,
                  borderRadius: "1px"
                }}></div>
              )}

              {/* Status Circle */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "16px"
              }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: step.completed ? "#8b6f47" : step.current ? getStatusColor(live.delivered ? "delivered" : order.orderStatus) : "#e8ddd4",
                  border: "3px solid #fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: step.completed || step.current ? "0 2px 8px rgba(92, 64, 51, 0.2)" : "0 1px 4px rgba(92, 64, 51, 0.1)",
                  zIndex: 1,
                  flexShrink: 0
                }}>
                  {step.completed && (
                    <span style={{ color: "white", fontSize: "18px", fontWeight: "bold" }}>✓</span>
                  )}
                  {step.current && !step.completed && (
                    <span style={{ color: "white", fontSize: "12px" }}>●</span>
                  )}
                </div>

                {/* Status Label */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: "15px",
                    fontWeight: step.current ? "700" : step.completed ? "600" : "500",
                    color: step.completed || step.current ? "#5c4033" : "#8b5e34",
                    marginBottom: "4px"
                  }}>
                    {step.label}
                  </div>
                  {step.current && (
                    <div style={{
                      fontSize: "12px",
                      color: getStatusColor(live.delivered ? "delivered" : order.orderStatus),
                      fontWeight: "600"
                    }}>
                      Current Status
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status Message */}
        <div style={{ 
          marginTop: "24px", 
          padding: "16px", 
          background: live.delivered || order.orderStatus === "delivered" ? 
            "linear-gradient(135deg, #f3e7dc 0%, #ead9c9 100%)" : "#faf8f5", 
          borderRadius: "12px", 
          textAlign: "center",
          border: live.delivered || order.orderStatus === "delivered" ? "1px solid #d4a574" : "1px solid #f3e7dc"
        }}>
          <div style={{ 
            fontSize: "16px", 
            fontWeight: "700", 
            color: "#5c4033", 
            marginBottom: "8px" 
          }}>
            Current Status: {getStatusText(live.delivered ? "delivered" : order.orderStatus)}
          </div>
          <div style={{ 
            fontSize: "13px", 
            color: "#8b5e34" 
          }}>
            {live.delivered || order.orderStatus === "delivered" ? 
              "✅ Your order has been successfully delivered!" : 
              order.orderStatus === "shipped" || order.orderStatus === "in_transit_to_customer_hub" ?
              "🚚 Your order has been shipped and is on the way!" :
              order.orderStatus === "at_customer_hub" || order.orderStatus === "out_for_delivery" || order.orderStatus === "ready_for_pickup" ?
              "📦 Your order is out for delivery!" :
              "⏳ Your order is being processed."
            }
          </div>
        </div>
      </div>

      {/* Order Items - SHOWN FIRST */}
      <div style={{ 
        background: "#fff", 
        padding: "24px", 
        borderRadius: "16px", 
        marginBottom: "24px", 
        border: "1px solid #e8ddd4",
        boxShadow: "0 4px 16px rgba(92, 64, 51, 0.06)"
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: "1px solid #f3e7dc"
        }}>
          <h2 style={{ 
            margin: 0, 
            color: "#5c4033", 
            fontSize: "20px",
            fontWeight: "700"
          }}>
            Your Products
          </h2>
          <div style={{
            background: "#f3e7dc",
            color: "#5c4033",
            padding: "4px 12px",
            borderRadius: "16px",
            fontSize: "12px",
            fontWeight: "600"
          }}>
            {order.items.length} {order.items.length === 1 ? 'Item' : 'Items'}
          </div>
        </div>
        
        <div style={{ display: "grid", gap: "16px" }}>
          {order.items.map((item, index) => {
            const productImage = item.image || (item.productId && item.productId.image);
            const productTitle = item.title || (item.productId && item.productId.title) || "Product";
            const productPrice = item.variant?.price || 0;
            const productQuantity = item.quantity || 0;
            const totalPrice = productPrice * productQuantity;
            
            return (
              <div 
                key={index} 
                style={{ 
                  display: "flex", 
                  gap: "16px", 
                  padding: "16px",
                  background: index % 2 === 0 ? "#faf8f5" : "#fff",
                  borderRadius: "12px",
                  border: "1px solid #f3e7dc",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(92, 64, 51, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Product Image - Large and Prominent */}
                <div style={{ 
                  width: "120px", 
                  height: "120px", 
                  background: "#faf8f5", 
                  borderRadius: "12px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  overflow: "hidden",
                  border: "1px solid #f3e7dc",
                  flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(92, 64, 51, 0.06)"
                }}>
                  {productImage ? (
                    <img
                      src={`${API_BASE}/uploads/${productImage}`}
                      alt={productTitle}
                      style={{ 
                        width: "100%", 
                        height: "100%", 
                        objectFit: "cover",
                        borderRadius: "11px"
                      }}
                    />
                  ) : (
                    <div style={{ 
                      width: "100%", 
                      height: "100%", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      background: "linear-gradient(135deg, #f3e7dc 0%, #ead9c9 100%)"
                    }}>
                      <span style={{ fontSize: "12px", color: "#8b5e34", fontWeight: "500" }}>No Image</span>
                    </div>
                  )}
                </div>
                
                {/* Product Details */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <h3 style={{ 
                      margin: "0 0 8px 0", 
                      fontSize: "16px",
                      fontWeight: "700",
                      color: "#5c4033",
                      lineHeight: "1.4"
                    }}>
                      {productTitle}
                    </h3>
                    {item.variant?.weight && (
                      <div style={{ 
                        fontSize: "13px", 
                        color: "#8b5e34", 
                        marginBottom: "12px",
                        fontWeight: "500"
                      }}>
                        {item.variant.weight}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between",
                    paddingTop: "12px",
                    borderTop: "1px solid #f3e7dc"
                  }}>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "10px"
                    }}>
                      <div style={{
                        background: "#5c4033",
                        color: "#fff",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}>
                        Qty: {productQuantity}
                      </div>
                      <div style={{ 
                        fontSize: "13px", 
                        color: "#8b5e34",
                        fontWeight: "500"
                      }}>
                        ₹{productPrice} each
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: "18px", 
                      color: "#5c4033", 
                      fontWeight: "700"
                    }}>
                      ₹{totalPrice}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivery Address & Price Breakdown - Side by Side */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
        gap: "20px",
        marginBottom: "24px"
      }}>
        {/* Delivery Address */}
        <div style={{ 
          background: "#fff", 
          padding: "20px", 
          borderRadius: "16px", 
          border: "1px solid #e8ddd4",
          boxShadow: "0 4px 16px rgba(92, 64, 51, 0.06)"
        }}>
          <h3 style={{ 
            marginBottom: "16px", 
            color: "#5c4033",
            fontSize: "18px",
            fontWeight: "700",
            paddingBottom: "12px",
            borderBottom: "1px solid #f3e7dc"
          }}>
            Delivery Address
          </h3>
          
          <div style={{ fontSize: "14px", lineHeight: "1.7", color: "#5c4033" }}>
            <div style={{ fontWeight: "700", marginBottom: "10px", fontSize: "15px" }}>
              {order.buyerDetails.name}
            </div>
            <div style={{ marginBottom: "6px" }}>{order.buyerDetails.address.street}</div>
            {order.buyerDetails.address.landmark && (
              <div style={{ marginBottom: "6px", color: "#8b5e34" }}>
                Near {order.buyerDetails.address.landmark}
              </div>
            )}
            <div style={{ marginBottom: "12px" }}>
              {order.buyerDetails.address.city}, {order.buyerDetails.address.state} - {order.buyerDetails.address.pincode}
            </div>
            <div style={{ 
              paddingTop: "12px", 
              borderTop: "1px solid #f3e7dc",
              display: "flex",
              flexDirection: "column",
              gap: "6px"
            }}>
              <div>
                <strong style={{ color: "#8b5e34", fontSize: "13px" }}>Phone:</strong> 
                <span style={{ marginLeft: "6px", color: "#5c4033", fontSize: "13px" }}>{order.buyerDetails.phone}</span>
              </div>
              <div>
                <strong style={{ color: "#8b5e34", fontSize: "13px" }}>Email:</strong> 
                <span style={{ marginLeft: "6px", color: "#5c4033", fontSize: "13px" }}>{order.buyerDetails.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div style={{ 
          background: "#fff", 
          padding: "20px", 
          borderRadius: "16px", 
          border: "1px solid #e8ddd4",
          boxShadow: "0 4px 16px rgba(92, 64, 51, 0.06)"
        }}>
          <h3 style={{ 
            marginBottom: "16px", 
            color: "#5c4033",
            fontSize: "18px",
            fontWeight: "700",
            paddingBottom: "12px",
            borderBottom: "1px solid #f3e7dc"
          }}>
            Price Breakdown
          </h3>
          
          <div style={{ fontSize: "14px" }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              marginBottom: "12px",
              paddingBottom: "12px",
              borderBottom: "1px solid #f3e7dc"
            }}>
              <span style={{ color: "#8b5e34" }}>Subtotal:</span>
              <span style={{ color: "#5c4033", fontWeight: "600" }}>₹{order.totalAmount}</span>
            </div>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              marginBottom: "16px",
              paddingBottom: "16px",
              borderBottom: "1px solid #f3e7dc"
            }}>
              <span style={{ color: "#8b5e34" }}>Shipping:</span>
              <span style={{ color: "#5c4033", fontWeight: "600" }}>₹{(order.shippingCharges || 50)}</span>
            </div>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              fontSize: "18px", 
              fontWeight: "700", 
              color: "#5c4033", 
              padding: "14px",
              background: "linear-gradient(135deg, #faf8f5 0%, #f3e7dc 100%)",
              borderRadius: "10px",
              border: "1px solid #e8ddd4"
            }}>
              <span>Total:</span>
              <span>₹{order.finalAmount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details (if online payment) */}
      {order.paymentMethod === "online" && order.paymentDetails && (
        <div style={{ 
          background: "#fff", 
          padding: "20px", 
          borderRadius: "16px", 
          marginBottom: "24px", 
          border: "1px solid #e8ddd4",
          boxShadow: "0 4px 16px rgba(92, 64, 51, 0.06)"
        }}>
          <h3 style={{ 
            marginBottom: "16px", 
            color: "#5c4033",
            fontSize: "18px",
            fontWeight: "700",
            paddingBottom: "12px",
            borderBottom: "1px solid #f3e7dc"
          }}>
            Payment Details
          </h3>
          
          <div style={{ fontSize: "14px", display: "grid", gap: "12px" }}>
            <div style={{
              padding: "12px",
              background: "#faf8f5",
              borderRadius: "10px",
              border: "1px solid #f3e7dc"
            }}>
              <div style={{ color: "#8b5e34", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Transaction ID</div>
              <div style={{ color: "#5c4033", fontWeight: "600", fontSize: "13px", fontFamily: "monospace" }}>{order.paymentDetails.transactionId}</div>
            </div>
            <div style={{
              padding: "12px",
              background: "#faf8f5",
              borderRadius: "10px",
              border: "1px solid #f3e7dc"
            }}>
              <div style={{ color: "#8b5e34", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Payment Gateway</div>
              <div style={{ color: "#5c4033", fontWeight: "600", fontSize: "13px" }}>{order.paymentDetails.paymentGateway}</div>
            </div>
            {order.paymentDetails.paidAt && (
              <div style={{
                padding: "12px",
                background: "#faf8f5",
                borderRadius: "10px",
                border: "1px solid #f3e7dc"
              }}>
                <div style={{ color: "#8b5e34", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Paid At</div>
                <div style={{ color: "#5c4033", fontWeight: "600", fontSize: "13px" }}>{new Date(order.paymentDetails.paidAt).toLocaleString('en-IN')}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ 
        display: "flex", 
        gap: "12px", 
        justifyContent: "center",
        marginBottom: "32px",
        flexWrap: "wrap"
      }}>
        <button
          onClick={() => navigate("/orders")}
          style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, #5c4033 0%, #8b5e34 100%)",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            boxShadow: "0 2px 8px rgba(92, 64, 51, 0.25)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 4px 12px rgba(92, 64, 51, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 2px 8px rgba(92, 64, 51, 0.25)";
          }}
        >
          View All Orders
        </button>
        <button
          onClick={() => navigate("/products")}
          style={{
            padding: "12px 24px",
            background: "#fff",
            color: "#5c4033",
            border: "1px solid #5c4033",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#5c4033";
            e.target.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#fff";
            e.target.style.color = "#5c4033";
          }}
        >
          Continue Shopping
        </button>
      </div>

      {/* Rating Section - Only show for delivered orders that haven't been rated */}
      {(live.delivered || order.orderStatus === "delivered") && !order.rating?.value && (
        <OrderRating 
          orderId={orderId} 
          onRatingSubmitted={() => {
            // Refresh order data to show rating
            fetchOrderDetails();
          }}
        />
      )}

      {/* Show existing rating if already rated */}
      {(live.delivered || order.orderStatus === "delivered") && order.rating?.value && (
        <div style={{
          background: '#fff',
          border: '1px solid #e8ddd4',
          borderRadius: '16px',
          padding: '24px',
          marginTop: '24px',
          boxShadow: "0 4px 16px rgba(92, 64, 51, 0.06)"
        }}>
          <h3 style={{ 
            margin: '0 0 16px 0', 
            color: '#5c4033',
            fontSize: '18px',
            fontWeight: '700',
            paddingBottom: '12px',
            borderBottom: '1px solid #f3e7dc'
          }}>
            Your Rating
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  style={{
                    fontSize: '22px',
                    color: star <= order.rating.value ? '#d4a574' : '#e8ddd4',
                    transition: 'transform 0.2s ease'
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            <span style={{ 
              fontSize: '15px', 
              color: '#5c4033',
              fontWeight: '600'
            }}>
              {order.rating.value === 1 ? 'Poor' :
               order.rating.value === 2 ? 'Fair' :
               order.rating.value === 3 ? 'Good' :
               order.rating.value === 4 ? 'Very Good' :
               'Excellent'}
            </span>
          </div>
          
          {order.rating.review && (
            <div style={{
              background: '#faf8f5',
              padding: '16px',
              borderRadius: '10px',
              fontSize: '14px',
              color: '#5c4033',
              fontStyle: 'italic',
              border: '1px solid #f3e7dc',
              lineHeight: '1.6'
            }}>
              "{order.rating.review}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
