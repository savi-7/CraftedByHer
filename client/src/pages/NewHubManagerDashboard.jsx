import React, { useState, useEffect } from "react";
import { API_BASE } from "../config/api";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/HubManagerDashboard.css";
import { 
  FiBell, 
  FiPackage, 
  FiTruck, 
  FiMapPin, 
  FiUser, 
  FiHome, 
  FiLogOut,
  FiRefreshCw,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiMenu,
  FiX,
  FiBox,
  FiBarChart2,
  FiGrid,
  FiShoppingCart,
  FiCheck,
  FiUsers,
  FiKey,
  FiSettings,
  FiChevronRight
} from "react-icons/fi";

export default function NewHubManagerDashboard() {
  const navigate = useNavigate();
  const [manager, setManager] = useState(null);
  const [stats, setStats] = useState({
    totalHubs: 0,
    ordersAtSellerHubs: 0,
    ordersInTransit: 0,
    ordersAtCustomerHubs: 0,
    ordersAwaitingPickup: 0,
    deliveredOrders: 0
  });
  const [hubs, setHubs] = useState([]);
  const [hubsByDistrict, setHubsByDistrict] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [orders, setOrders] = useState([]);
  const [sellerHubOrders, setSellerHubOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [approvalOrders, setApprovalOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingOrder, setApprovingOrder] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("hubManagerToken");
    const managerData = localStorage.getItem("hubManager");

    if (!token || !managerData) {
      toast.error("Please login first");
      navigate("/hub-manager/login");
      return;
    }

    setManager(JSON.parse(managerData));
    fetchDashboardData(token);
  }, [navigate]);

  const fetchDashboardData = async (token) => {
    setLoading(true);
    try {
      console.log("🔍 Fetching dashboard data...");
      
      const managerData = localStorage.getItem("hubManager");
      const manager = managerData ? JSON.parse(managerData) : null;
      const managerId = manager?.managerId;
      
      if (!managerId) {
        console.error("❌ No manager ID found in localStorage");
        toast.error("Manager ID not found. Please login again.");
        navigate("/hub-manager/login");
        return;
      }

      // Fetch all data in parallel (keep existing notifications API, add fallback)
      const [statsRes, hubsRes, hubNotificationsRes, hubManagerNotificationsRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/api/hub-managers/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ ok: false })),
        
        fetch(`${API_BASE}/api/hubs/all-with-stats`).catch(() => ({ ok: false })),
        
        // Existing functionality: hub notifications route (what your UI originally used)
        fetch(`${API_BASE}/api/hub-notifications?managerId=${encodeURIComponent(managerId)}`).catch(() => ({ ok: false })),
        // Fallback: hub-managers notifications route (same Notification collection)
        fetch(`${API_BASE}/api/hub-managers/notifications?managerId=${encodeURIComponent(managerId)}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ ok: false })),
        
        fetch(`${API_BASE}/api/hub-managers/orders/hub`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ ok: false }))
      ]);

      // Process responses
      if (hubsRes.ok) {
        const hubsData = await hubsRes.json();
        if (hubsData.success && hubsData.hubs) {
          setHubs(hubsData.hubs);
          
          // Group hubs by district
          const grouped = {};
          hubsData.hubs.forEach(hub => {
            const district = hub.district || "N/A";
            if (!grouped[district]) grouped[district] = [];
            grouped[district].push(hub);
          });
          setHubsByDistrict(grouped);
          
          // Calculate stats from hubs data
          const totalHubs = hubsData.hubs.length;
          const ordersAtSellerHubs = hubsData.hubs.reduce((sum, hub) => sum + (hub.ordersAtHub || 0), 0);
          
          setStats(prev => ({
            ...prev,
            totalHubs,
            ordersAtSellerHubs,
            ordersInTransit: Math.floor(ordersAtSellerHubs * 0.3), // Simulated
            ordersAtCustomerHubs: Math.floor(ordersAtSellerHubs * 0.2), // Simulated
            ordersAwaitingPickup: Math.floor(ordersAtSellerHubs * 0.15), // Simulated
            deliveredOrders: Math.floor(ordersAtSellerHubs * 2.5) // Simulated
          }));
        }
      }

      // Notifications: keep existing behavior, but fallback if it returns empty/fails
      let notificationsData = null;
      if (hubNotificationsRes.ok) {
        try {
          const d = await hubNotificationsRes.json();
          if (d?.success) notificationsData = d;
        } catch (e) {
          // ignore
        }
      }
      if ((!notificationsData || (notificationsData.notifications || []).length === 0) && hubManagerNotificationsRes.ok) {
        try {
          const d2 = await hubManagerNotificationsRes.json();
          if (d2?.success) notificationsData = d2;
        } catch (e) {
          // ignore
        }
      }
      if (notificationsData?.success) {
        const list = Array.isArray(notificationsData.notifications) ? notificationsData.notifications : [];
        setNotifications(list);
        setUnreadCount(notificationsData.unreadCount || 0);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (ordersData.success) {
          setOrders(ordersData.orders || []);
        }
      }

      // Fetch all orders at seller hub (for Seller Hub Orders section)
      const sellerHubOrdersRes = await fetch(`${API_BASE}/api/hub-managers/orders/seller-hub`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => ({ ok: false }));

      if (sellerHubOrdersRes.ok) {
        const sellerData = await sellerHubOrdersRes.json();
        if (sellerData.success) {
          setSellerHubOrders(sellerData.orders || []);
        }
      }

      // Fetch pending approvals (orders awaiting hub manager approval)
      const approvalOrdersRes = await fetch(`${API_BASE}/api/hub-managers/orders/pending-approvals`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => ({ ok: false }));

      if (approvalOrdersRes.ok) {
        const approvalData = await approvalOrdersRes.json();
        if (approvalData.success) {
          setApprovalOrders(approvalData.orders || []);
        }
      }

    } catch (error) {
      console.error("❌ Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("hubManagerToken");
    localStorage.removeItem("hubManager");
    toast.success("Logged out successfully");
    navigate("/hub-manager/login");
  };

  const handleRefresh = () => {
    const token = localStorage.getItem("hubManagerToken");
    if (token) {
      fetchDashboardData(token);
      toast.success("Dashboard refreshed");
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    const token = localStorage.getItem("hubManagerToken");
    try {
      const res = await fetch(
        `${API_BASE}/api/hub-managers/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n._id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const approveAndDispatchOrder = async (orderId) => {
    const token = localStorage.getItem("hubManagerToken");
    if (!token) {
      toast.error("Please login again");
      return;
    }

    setApprovingOrder(orderId);
    try {
      const res = await fetch(
        `${API_BASE}/api/hub-managers/orders/${orderId}/approve-and-dispatch`,
        {
          method: "PATCH",
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || "Order approved and dispatched successfully!");
        setSelectedNotification(null);
        // Refresh orders and approvals
        const token = localStorage.getItem("hubManagerToken");
        if (token) {
          fetchDashboardData(token);
        }
      } else {
        toast.error(data.error || "Failed to approve order");
      }
    } catch (error) {
      console.error("Error approving order:", error);
      toast.error("Failed to approve order. Please try again.");
    } finally {
      setApprovingOrder(null);
    }
  };

  const resolveOrderMongoIdFromNotification = (notif) => {
    if (!notif) return null;
    if (notif.orderId) return notif.orderId;
    const orderNumber = notif.orderNumber || notif.metadata?.orderId;
    if (!orderNumber) return null;
    const fromSellerHub = sellerHubOrders.find((o) => o.orderNumber === orderNumber)?._id;
    if (fromSellerHub) return fromSellerHub;
    const fromApprovals = approvalOrders.find((o) => o.orderNumber === orderNumber)?._id;
    if (fromApprovals) return fromApprovals;
    const fromOrders = orders.find((o) => o.orderNumber === orderNumber)?._id;
    return fromOrders || null;
  };

  const [otpOrderNumber, setOtpOrderNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const verifyOtp = async () => {
    const token = localStorage.getItem("hubManagerToken");
    if (!otpOrderNumber.trim()) return toast.error("Enter order number");
    if (otpCode.trim().length !== 6) return toast.error("OTP must be 6 digits");
    if (!token) return toast.error("Please login again");

    setVerifyingOtp(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/delivery-otp/orders/${encodeURIComponent(
          otpOrderNumber.trim()
        )}/verify-otp`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ otp: otpCode.trim() }),
        }
      );

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("OTP verified. Order delivered!");
        setOtpOrderNumber("");
        setOtpCode("");
        const t = localStorage.getItem("hubManagerToken");
        if (t) fetchDashboardData(t);
      } else {
        toast.error(data.error || "OTP verification failed");
      }
    } catch (e) {
      toast.error("Failed to verify OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleNotificationClick = (notification) => {
    setSelectedNotification(notification);
    setShowNotifications(false);
    if (!notification.read) {
      markNotificationAsRead(notification._id);
    }
  };

  // Helper functions for dynamic classes - Beige Theme Colors
  const getCardIconBgClass = (color) => {
    const colorMap = {
      blue: 'bg-blue-100',
      orange: 'bg-orange-100',
      purple: 'bg-purple-100',
      green: 'bg-green-100',
      yellow: 'bg-yellow-100',
      emerald: 'bg-emerald-100'
    };
    return colorMap[color] || 'bg-gray-100';
  };

  const getCardIconColorClass = (color) => {
    const colorMap = {
      blue: 'text-blue-600',
      orange: 'text-orange-600',
      purple: 'text-purple-600',
      green: 'text-green-600',
      yellow: 'text-yellow-600',
      emerald: 'text-emerald-600'
    };
    return colorMap[color] || 'text-gray-600';
  };

  const getCardIconStyle = (color) => {
    const colorMap = {
      blue: { background: '#d4e4f0', color: '#8b5e34' },
      orange: { background: '#ffe8d6', color: '#b8865a' },
      purple: { background: '#f3e7f3', color: '#8b5e34' },
      green: { background: '#e8f5e9', color: '#5c8d5c' },
      yellow: { background: '#fff9e6', color: '#b8865a' },
      emerald: { background: '#e8f5e9', color: '#5c8d5c' }
    };
    return colorMap[color] || { background: 'var(--accent-soft, #f3e7dc)', color: 'var(--brand, #8b5e34)' };
  };

  // Get district icon function
  const getDistrictIcon = (district) => {
    const icons = {
      "Thiruvananthapuram": "🏛️",
      "Kollam": "⚓",
      "Pathanamthitta": "⛪",
      "Alappuzha": "🌴",
      "Kottayam": "📚",
      "Idukki": "⛰️",
      "Ernakulam": "🏙️",
      "Thrissur": "🎭",
      "Palakkad": "🌾",
      "Malappuram": "🕌",
      "Kozhikode": "🏖️",
      "Wayanad": "🌲",
      "Kannur": "🏰",
      "Kasaragod": "🏝️"
    };
    return icons[district] || "📍";
  };

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard Overview", icon: FiGrid },
    { id: "hubs", label: "Hubs (District-wise)", icon: FiMapPin },
    { id: "seller-orders", label: "Seller Hub Orders", icon: FiPackage },
    { id: "approved-orders", label: "Approved Orders", icon: FiCheck },
    { id: "customer-orders", label: "Customer Hub Orders", icon: FiUsers },
    { id: "otp-verification", label: "OTP Verification", icon: FiKey }
  ];

  const overviewCards = [
    {
      title: "Total Hubs",
      value: stats.totalHubs,
      icon: FiMapPin,
      color: "blue",
      description: "Active hubs across Kerala"
    },
    {
      title: "Orders at Seller Hubs",
      value: stats.ordersAtSellerHubs,
      icon: FiPackage,
      color: "orange",
      description: "Orders waiting at seller hubs"
    },
    {
      title: "Orders in Transit",
      value: stats.ordersInTransit,
      icon: FiTruck,
      color: "purple",
      description: "Orders being transported"
    },
    {
      title: "Orders at Customer Hubs",
      value: stats.ordersAtCustomerHubs,
      icon: FiBox,
      color: "green",
      description: "Orders at customer hubs"
    },
    {
      title: "Orders Awaiting Pickup",
      value: stats.ordersAwaitingPickup,
      icon: FiClock,
      color: "yellow",
      description: "Ready for customer pickup"
    },
    {
      title: "Delivered Orders",
      value: stats.deliveredOrders,
      icon: FiCheckCircle,
      color: "emerald",
      description: "Successfully delivered"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #faf8f5 0%, #f7f3ed 100%)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" style={{ borderTopColor: 'var(--brand, #8b5e34)', borderBottomColor: 'var(--brand, #8b5e34)' }}></div>
          <p className="mt-4 text-lg text-gray-600" style={{ color: 'var(--text-muted, #7b6457)', fontFamily: 'var(--body-font, "Poppins", sans-serif)' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex" style={{ background: 'linear-gradient(135deg, #faf8f5 0%, #f7f3ed 100%)', fontFamily: 'var(--body-font, "Poppins", sans-serif)' }}>
      {/* Sidebar */}
      <div className={`bg-white shadow-lg transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`} style={{ position: 'relative', minHeight: '100vh', background: 'var(--surface, #ffffff)', borderRight: '1px solid var(--border, #ead9c9)' }}>
        <div className="p-4 border-b border-gray-200" style={{ borderBottom: '1px solid var(--border, #ead9c9)' }}>
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold" style={{ 
                    color: 'var(--brand, #8b5e34)', 
                    fontFamily: 'var(--title-font, "Playfair Display", serif)', 
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: '700'
                  }}>
                    CraftedByHer
                  </h1>
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    style={{ marginLeft: 'auto', padding: '4px' }}
                  >
                    <FiMenu size={18} style={{ color: 'var(--text, #3f2d23)' }} />
                  </button>
                </div>
                <p className="text-sm" style={{ 
                  color: 'var(--text-muted, #7b6457)', 
                  margin: 0,
                  fontSize: '13px'
                }}>
                  Hub Manager Portal
                </p>
              </div>
            )}
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FiMenu size={20} style={{ color: 'var(--text, #3f2d23)' }} />
              </button>
            )}
          </div>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={activeSection === item.id ? {
                    background: 'var(--accent-soft, #f3e7dc)',
                    color: 'var(--brand, #8b5e34)',
                    borderRight: '2px solid var(--brand, #8b5e34)',
                    fontWeight: '500'
                  } : {
                    color: 'var(--text, #3f2d23)'
                  }}
                >
                  <item.icon size={20} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="font-medium" style={{ flex: 1 }}>{item.label}</span>
                      <FiChevronRight size={16} style={{ color: 'var(--text-muted, #7b6457)' }} />
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {!sidebarCollapsed && (
          <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem' }}>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FiUser size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate" style={{ color: 'var(--text, #3f2d23)' }}>
                    {manager?.name || 'Central Hub Manager'}
                  </p>
                  <p className="text-xs text-gray-500 truncate" style={{ color: 'var(--text-muted, #7b6457)' }}>
                    {manager?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                style={{ color: 'var(--error, #9e4c34)' }}
              >
                <FiLogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border, #ead9c9)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800" style={{ color: 'var(--text, #3f2d23)', fontFamily: 'var(--title-font, "Playfair Display", serif)' }}>
                {sidebarItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
              </h2>
              <p className="text-gray-600" style={{ color: 'var(--text-muted, #7b6457)' }}>
                {activeSection === 'dashboard' && 'Overview of all hub operations'}
                {activeSection === 'hubs' && 'Manage hubs across all 14 districts'}
                {activeSection === 'approvals' && 'Approve and dispatch orders from your hub'}
                {activeSection === 'seller-orders' && 'View all orders at seller hub'}
                {activeSection === 'approved-orders' && 'Approved orders for delivery'}
                {activeSection === 'customer-orders' && 'Orders at customer hubs'}
                {activeSection === 'otp-verification' && 'Verify delivery OTPs'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Refresh"
              >
                <FiRefreshCw size={20} />
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Notifications"
                >
                  <FiBell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    {/* click-outside overlay to avoid stacking issues */}
                    <div
                      onClick={() => setShowNotifications(false)}
                      style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 99998,
                        background: "transparent",
                      }}
                    />
                    <div
                      className="w-80 bg-white rounded-lg shadow-lg border border-gray-200"
                      style={{
                        position: "fixed",
                        right: 24,
                        top: 76,
                        zIndex: 99999,
                      }}
                    >
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="text-sm text-blue-600">{unreadCount} unread</span>
                        )}
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <FiBell size={40} className="mx-auto mb-3 opacity-30" />
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification._id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                              !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-full ${!notification.read ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                <FiPackage size={16} className={!notification.read ? 'text-blue-600' : 'text-gray-600'} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 text-sm mb-1">
                                  {notification.title}
                                </p>
                                <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <FiClock size={12} />
                                    {new Date(notification.createdAt).toLocaleDateString()}
                                  </span>
                                  {notification.orderNumber && (
                                    <span className="bg-gray-100 px-2 py-1 rounded">
                                      {notification.orderNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {overviewCards.map((card, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ 
                    background: 'var(--surface, #ffffff)', 
                    border: '1px solid var(--border, #ead9c9)',
                    boxShadow: 'var(--shadow, 0 10px 24px rgba(63,45,35,.10))',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(63, 45, 35, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow, 0 10px 24px rgba(63,45,35,.10))';
                  }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1" style={{ color: 'var(--text-muted, #7b6457)' }}>{card.title}</p>
                        <p className="text-3xl font-bold text-gray-800" style={{ color: 'var(--text, #3f2d23)', fontFamily: 'var(--title-font, "Playfair Display", serif)' }}>{card.value}</p>
                        <p className="text-sm text-gray-500 mt-1" style={{ color: 'var(--text-muted, #7b6457)' }}>{card.description}</p>
                      </div>
                      <div className={`p-3 rounded-full ${getCardIconBgClass(card.color)}`} style={getCardIconStyle(card.color)}>
                        <card.icon size={24} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              <div
                className="bg-white rounded-lg shadow-sm border border-gray-200"
                style={{
                  background: 'var(--surface, #ffffff)',
                  border: '1px solid var(--border, #ead9c9)',
                  boxShadow: 'var(--shadow, 0 10px 24px rgba(63,45,35,.10))'
                }}
              >
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
                    <p className="text-sm text-gray-600">Latest hub updates (always visible)</p>
                  </div>
                  {unreadCount > 0 && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div className="p-6">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <FiBell size={40} className="mx-auto mb-3 opacity-30" />
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.slice(0, 6).map((notification) => (
                        <div
                          key={notification._id}
                          className={`border rounded-lg p-4 ${
                            !notification.read ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
                          }`}
                          style={{ borderLeft: !notification.read ? "4px solid #3b82f6" : undefined }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <FiPackage size={16} className={!notification.read ? "text-blue-600" : "text-gray-600"} />
                                <p className="font-semibold text-gray-800 text-sm">{notification.title}</p>
                                {notification.type === "cake_preorder_at_hub" && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800">
                                    Preorder Cake
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700">{notification.message}</p>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                                <span className="flex items-center gap-1">
                                  <FiClock size={12} />
                                  {new Date(notification.createdAt).toLocaleString()}
                                </span>
                                {notification.orderNumber && (
                                  <span className="bg-gray-100 px-2 py-1 rounded">
                                    {notification.orderNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {notification.orderId &&
                                (notification.actionType === "approve_hub_delivery" ||
                                  notification.actionRequired === true ||
                                  notification.type === "cake_preorder_at_hub" ||
                                  notification.type === "order_arrived_seller_hub") && (
                                  <button
                                    onClick={() => approveAndDispatchOrder(notification.orderId)}
                                    disabled={approvingOrder === notification.orderId}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                      approvingOrder === notification.orderId
                                        ? "bg-gray-300 cursor-not-allowed"
                                        : "bg-green-600 hover:bg-green-700 text-white"
                                    }`}
                                    style={approvingOrder !== notification.orderId ? { background: "var(--brand, #8b5e34)" } : {}}
                                  >
                                    {approvingOrder === notification.orderId
                                      ? "Approving..."
                                      : notification.type === "cake_preorder_at_hub"
                                      ? "Approve & Send OTP"
                                      : "Approve"}
                                  </button>
                                )}
                              <button
                                onClick={() => handleNotificationClick(notification)}
                                className="px-3 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'hubs' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ 
                background: 'var(--surface, #ffffff)', 
                border: '1px solid var(--border, #ead9c9)',
                boxShadow: 'var(--shadow, 0 10px 24px rgba(63,45,35,.10))'
              }}>
                <h3 className="text-lg font-semibold text-gray-800 mb-2" style={{ 
                  color: 'var(--text, #3f2d23)', 
                  fontFamily: 'var(--title-font, "Playfair Display", serif)',
                  fontSize: '20px',
                  fontWeight: '700'
                }}>
                  District-wise Hub Management
                </h3>
                <p className="text-sm text-gray-600 mb-6" style={{ color: 'var(--text-muted, #7b6457)' }}>
                  Manage all 14 hubs across Kerala's 14 districts
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(hubsByDistrict).map(([district, districtHubs]) => (
                    <div 
                      key={district} 
                      className="border border-gray-200 rounded-lg p-5" 
                      style={{
                        background: 'var(--surface, #ffffff)',
                        border: '1px solid var(--border, #ead9c9)',
                        borderRadius: '14px',
                        boxShadow: '0 2px 10px rgba(63, 45, 35, 0.08)',
                        transition: 'all 0.3s ease',
                        padding: '20px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(63, 45, 35, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(63, 45, 35, 0.08)';
                      }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <span style={{ fontSize: '36px', lineHeight: '1' }}>{getDistrictIcon(district)}</span>
                        <div style={{ flex: 1 }}>
                          <h4 className="font-semibold text-gray-800 mb-1" style={{ 
                            color: 'var(--text, #3f2d23)', 
                            fontFamily: 'var(--title-font, "Playfair Display", serif)',
                            fontSize: '18px',
                            fontWeight: '700',
                            margin: '0 0 4px 0',
                            lineHeight: '1.3'
                          }}>
                            {district}
                          </h4>
                          <p className="text-sm text-gray-600" style={{ 
                            color: 'var(--text-muted, #7b6457)',
                            margin: 0,
                            fontSize: '14px',
                            lineHeight: '1.4'
                          }}>
                            {districtHubs.length} hub{districtHubs.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {districtHubs.map((hub) => (
                        <div 
                          key={hub._id} 
                          className="bg-gray-50 rounded p-3 mb-2 last:mb-0"
                          style={{
                            background: 'var(--accent-soft, #f3e7dc)',
                            borderRadius: '10px',
                            padding: '14px',
                            border: '1px solid var(--border, #ead9c9)',
                            marginBottom: '8px'
                          }}
                        >
                          <p className="font-medium text-sm mb-2" style={{ 
                            color: 'var(--text, #3f2d23)',
                            fontWeight: '600',
                            margin: '0 0 6px 0',
                            fontSize: '14px',
                            lineHeight: '1.4'
                          }}>
                            {hub.name}
                          </p>
                          <p className="text-xs text-gray-600 mb-1" style={{ 
                            color: 'var(--text-muted, #7b6457)',
                            fontSize: '12px',
                            margin: '4px 0',
                            lineHeight: '1.5'
                          }}>
                            ID: {hub.hubId}
                          </p>
                          <p className="text-xs text-gray-600" style={{ 
                            color: 'var(--text-muted, #7b6457)',
                            fontSize: '12px',
                            margin: '4px 0',
                            lineHeight: '1.5'
                          }}>
                            Orders: {hub.ordersAtHub || 0}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'approvals' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Orders Awaiting Approval</h3>
                  <p className="text-gray-600">Approve and dispatch orders from your hub to customer hubs</p>
                </div>
                <div className="p-6">
                  {approvalOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <FiCheckCircle size={48} className="mx-auto text-gray-400 mb-4" />
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">No Orders Pending Approval</h4>
                      <p className="text-gray-600">There are no orders at your hub awaiting approval currently.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {approvalOrders.map((order) => (
                        <div key={order._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-gray-800 text-lg">Order #{order.orderNumber}</h4>
                                <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                                  Awaiting Approval
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">
                                Arrived at: {new Date(order.hubTracking?.arrivedAtSellerHub || order.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <button
                              onClick={() => approveAndDispatchOrder(order._id)}
                              disabled={approvingOrder === order._id}
                              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                                approvingOrder === order._id
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                              style={approvingOrder !== order._id ? {
                                background: 'var(--brand, #8b5e34)',
                                color: '#ffffff'
                              } : {}}
                              onMouseEnter={(e) => {
                                if (approvingOrder !== order._id) {
                                  e.currentTarget.style.background = 'var(--brand-strong, #6f4518)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (approvingOrder !== order._id) {
                                  e.currentTarget.style.background = 'var(--brand, #8b5e34)';
                                }
                              }}
                            >
                              {approvingOrder === order._id ? (
                                <span className="flex items-center gap-2">
                                  <FiRefreshCw className="animate-spin" size={16} />
                                  Approving...
                                </span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  <FiCheckCircle size={16} />
                                  {order.isCakePreorder ? "Approve & Send OTP" : "Approve & Dispatch"}
                                </span>
                              )}
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <span className="text-xs text-gray-600 uppercase">Customer</span>
                              <p className="font-medium text-gray-800 mt-1">{order.buyerDetails?.name || 'N/A'}</p>
                              <p className="text-sm text-gray-600">{order.buyerDetails?.phone || 'N/A'}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <span className="text-xs text-gray-600 uppercase">Total Amount</span>
                              <p className="font-semibold text-gray-800 mt-1 text-lg">₹{order.finalAmount || order.totalAmount || 0}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <span className="text-xs text-gray-600 uppercase">Items</span>
                              <p className="font-medium text-gray-800 mt-1">{order.items?.length || 0} item(s)</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <span className="text-xs text-gray-600 uppercase">Delivery Address</span>
                              <p className="font-medium text-gray-800 mt-1 text-sm">
                                {order.buyerDetails?.address?.city || order.buyerDetails?.address || 'N/A'}
                              </p>
                            </div>
                          </div>

                          {order.items && order.items.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <h5 className="text-sm font-semibold text-gray-700 mb-2">Order Items:</h5>
                              <div className="space-y-2">
                                {order.items.slice(0, 3).map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-3 text-sm">
                                    {item.productId?.image && (
                                      <img 
                                        src={`${API_BASE}/uploads/${item.productId.image}`} 
                                        alt={item.productId.title}
                                        className="w-10 h-10 rounded object-cover"
                                      />
                                    )}
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-800">{item.productId?.title || 'Product'}</p>
                                      <p className="text-gray-600">Qty: {item.quantity} × ₹{item.price}</p>
                                    </div>
                                  </div>
                                ))}
                                {order.items.length > 3 && (
                                  <p className="text-sm text-gray-600">+ {order.items.length - 3} more item(s)</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'seller-orders' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">All Orders at Seller Hub</h3>
                  <p className="text-gray-600">View all orders currently at your seller hub</p>
                </div>
                <div className="p-6">
                  {sellerHubOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <FiPackage size={48} className="mx-auto text-gray-400 mb-4" />
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">No Orders Found</h4>
                      <p className="text-gray-600">There are no orders at your seller hub currently.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sellerHubOrders.map((order) => (
                        <div key={order._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-gray-800">Order #{order.orderNumber}</h4>
                                {order.isCakePreorder && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800">
                                    Preorder Cake
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
                              {order.isCakePreorder && !order.hubTracking?.approvedByHubManager && (
                                <p className="text-sm mt-2" style={{ color: 'var(--text-muted, #7b6457)' }}>
                                  Cake preorder has reached your hub. Please approve to send OTP to buyer.
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {!order.hubTracking?.approvedByHubManager && (
                                <button
                                  onClick={() => approveAndDispatchOrder(order._id)}
                                  disabled={approvingOrder === order._id}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    approvingOrder === order._id
                                      ? 'bg-gray-400 cursor-not-allowed'
                                      : 'bg-green-600 hover:bg-green-700 text-white'
                                  }`}
                                  style={approvingOrder !== order._id ? { background: 'var(--brand, #8b5e34)' } : {}}
                                >
                                  {approvingOrder === order._id ? 'Approving...' : 'Approve'}
                                </button>
                              )}
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              order.hubTracking?.approvedByHubManager 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {order.hubTracking?.approvedByHubManager ? 'Approved' : 'At Seller Hub'}
                            </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Customer:</span>
                              <p className="font-medium">{order.buyerDetails?.name || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Amount:</span>
                              <p className="font-medium">₹{order.finalAmount || order.totalAmount || 0}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Items:</span>
                              <p className="font-medium">{order.items?.length || 0} item(s)</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Hub:</span>
                              <p className="font-medium">{order.hubTracking?.sellerHubName || 'N/A'}</p>
                            </div>
                          </div>

                          {/* OTP verification inside Seller Hub section (after approval) */}
                          {order.hubTracking?.approvedByHubManager && (
                            <div
                              style={{
                                marginTop: "14px",
                                padding: "12px",
                                borderRadius: "10px",
                                border: "1px solid #e5e7eb",
                                background: "#fafafa",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "10px" }}>
                                <div style={{ fontWeight: 600, color: "#374151" }}>Verify OTP & Deliver</div>
                                <div style={{ fontSize: "12px", color: "#6b7280" }}>Order: {order.orderNumber}</div>
                              </div>
                              <div style={{ display: "flex", gap: "10px" }}>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="Enter 6-digit OTP"
                                  maxLength={6}
                                  value={inlineOtpByOrderNumber[order.orderNumber] || ""}
                                  onChange={(e) =>
                                    setInlineOtpByOrderNumber((prev) => ({
                                      ...prev,
                                      [order.orderNumber]: e.target.value.replace(/\D/g, "").slice(0, 6),
                                    }))
                                  }
                                  style={{
                                    flex: 1,
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid #d1d5db",
                                    fontSize: "14px",
                                    fontFamily:
                                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                                    textAlign: "center",
                                    letterSpacing: "2px",
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => verifyDeliveryOtpForOrderNumber(order.orderNumber)}
                                  disabled={verifyingInlineOtp}
                                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    verifyingInlineOtp ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"
                                  }`}
                                >
                                  {verifyingInlineOtp ? "Verifying..." : "Verify"}
                                </button>
                              </div>
                              <p style={{ marginTop: "8px", marginBottom: 0, fontSize: "12px", color: "#6b7280" }}>
                                Buyer OTP is sent by email after hub approval. Verify it here to mark as delivered.
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'approved-orders' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Approved Orders</h3>
                  <p className="text-gray-600">Orders approved for delivery to customers</p>
                </div>
                <div className="p-6">
                  <div className="text-center py-12">
                    <FiCheck size={48} className="mx-auto text-green-400 mb-4" />
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Approved Orders</h4>
                    <p className="text-gray-600">Orders that have been approved for delivery will appear here.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'customer-orders' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Customer Hub Orders</h3>
                  <p className="text-gray-600">Orders at customer hubs awaiting pickup</p>
                </div>
                <div className="p-6">
                  <div className="text-center py-12">
                    <FiUsers size={48} className="mx-auto text-blue-400 mb-4" />
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Customer Hub Orders</h4>
                    <p className="text-gray-600">Orders at customer hubs will be displayed here.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'otp-verification' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">OTP Verification</h3>
                  <p className="text-gray-600">Verify buyer OTP to complete delivery</p>
                </div>
                <div className="p-6">
                  <div className="max-w-md mx-auto">
                    <div className="text-center mb-6">
                      <FiKey size={48} className="mx-auto text-yellow-400 mb-4" />
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">OTP Verification</h4>
                      <p className="text-gray-600">Enter the OTP to verify order delivery</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Order Number
                        </label>
                        <input
                          type="text"
                          placeholder="Enter order number"
                          value={otpOrderNumber}
                          onChange={(e) => setOtpOrderNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          OTP Code
                        </label>
                        <input
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          maxLength="6"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
                        />
                      </div>
                      
                      <button
                        onClick={verifyOtp}
                        disabled={verifyingOtp}
                        className={`w-full text-white py-2 px-4 rounded-lg transition-colors font-medium ${
                          verifyingOtp ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {verifyingOtp ? "Verifying..." : "Verify OTP"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other sections fallback */}
          {!['dashboard', 'hubs', 'approvals', 'seller-orders', 'approved-orders', 'customer-orders', 'otp-verification'].includes(activeSection) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center py-12">
                <FiSettings size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {sidebarItems.find(item => item.id === activeSection)?.label}
                </h3>
                <p className="text-gray-600">This section is under development.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 100000 }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800">
                  {selectedNotification.title}
                </h3>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-gray-800">{selectedNotification.message}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <FiClock size={14} />
                    {new Date(selectedNotification.createdAt).toLocaleString()}
                  </span>
                  {selectedNotification.orderNumber && (
                    <span className="bg-white px-2 py-1 rounded border">
                      Order: {selectedNotification.orderNumber}
                    </span>
                  )}
                </div>
              </div>

              {selectedNotification.metadata && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800">Order Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedNotification.metadata.hubName && (
                      <div>
                        <span className="text-gray-600">Hub:</span>
                        <p className="font-medium">{selectedNotification.metadata.hubName}</p>
                      </div>
                    )}
                    {selectedNotification.metadata.customerName && (
                      <div>
                        <span className="text-gray-600">Customer:</span>
                        <p className="font-medium">{selectedNotification.metadata.customerName}</p>
                      </div>
                    )}
                    {selectedNotification.metadata.totalAmount && (
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <p className="font-medium">₹{selectedNotification.metadata.totalAmount}</p>
                      </div>
                    )}
                    {selectedNotification.metadata.itemCount && (
                      <div>
                        <span className="text-gray-600">Items:</span>
                        <p className="font-medium">{selectedNotification.metadata.itemCount} item(s)</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              {(() => {
                const effectiveOrderId = resolveOrderMongoIdFromNotification(selectedNotification);
                const canApprove =
                  !!effectiveOrderId &&
                  (selectedNotification.actionType === "approve_hub_delivery" ||
                    selectedNotification.actionRequired === true ||
                    selectedNotification.type === "cake_preorder_at_hub" ||
                    selectedNotification.type === "order_arrived_seller_hub");

                if (!canApprove) {
                  return (
                    <button
                      onClick={() => setSelectedNotification(null)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Close
                    </button>
                  );
                }

                return (
                <div className="flex gap-3">
                  <button
                    onClick={() => approveAndDispatchOrder(effectiveOrderId)}
                    disabled={approvingOrder === effectiveOrderId}
                    className={`flex-1 text-white py-2 px-4 rounded-lg transition-colors font-medium ${
                      approvingOrder === effectiveOrderId
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                    style={approvingOrder !== effectiveOrderId ? { background: "var(--brand, #8b5e34)" } : {}}
                  >
                    {approvingOrder === effectiveOrderId
                      ? "Approving..."
                      : selectedNotification.type === "cake_preorder_at_hub"
                      ? "Approve & Send OTP"
                      : "Approve"}
                  </button>
                  <button
                    onClick={() => setSelectedNotification(null)}
                    className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Not now
                  </button>
                </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}