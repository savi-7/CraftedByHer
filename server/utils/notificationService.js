const Notification = require("../models/Notification");

/**
 * Create admin notification when order arrives at seller hub
 */
async function createAdminHubNotification(order, hubInfo, adminId = null) {
  try {
    console.log(`🔔 Creating admin notification for order ${order.orderNumber} at hub ${hubInfo.name}`);
    
    // If no specific admin ID provided, create notification for all admins
    // In a real system, you might want to get all admin user IDs from the database
    const User = require("../models/User");
    let adminUsers = [];
    
    if (adminId) {
      adminUsers = [{ uid: adminId }];
    } else {
      // Get all admin users
      adminUsers = await User.find({ role: 'admin' }).select('uid').lean();
    }
    
    const notifications = [];
    
    for (const admin of adminUsers) {
      const notification = await Notification.create({
        userId: admin.uid,
        userRole: 'admin',
        type: 'admin_approval_required',
        title: '🏢 New Order Awaiting Approval',
        message: `Order #${order.orderNumber} from ${order.buyerDetails.name} has arrived at ${hubInfo.name} (${hubInfo.district}) and requires your approval for dispatch to customer hub.`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        read: false,
        actionRequired: true,
        actionType: 'approve_hub_delivery',
        metadata: {
          hubName: hubInfo.name,
          hubDistrict: hubInfo.district,
          customerName: order.buyerDetails.name,
          customerPhone: order.buyerDetails.phone,
          totalAmount: order.finalAmount,
          itemCount: order.items.length,
          arrivedAt: new Date()
        }
      });
      
      notifications.push(notification);
    }
    
    console.log(`✅ Created ${notifications.length} admin notifications`);
    return notifications;
  } catch (error) {
    console.error("Error creating admin hub notification:", error);
    throw error;
  }
}

/**
 * Create notification when order is dispatched from seller hub to customer hub
 */
async function createOrderDispatchedNotification(order, fromHub, toHub, adminId) {
  try {
    console.log(`🚚 Creating dispatch notification for order ${order.orderNumber}`);
    
    // Get all admin users to notify them about the dispatch
    const User = require("../models/User");
    const HubManager = require("../models/HubManager");
    const adminUsers = await User.find({ role: 'admin' }).select('uid').lean();
    
    const notifications = [];
    
    // Create notifications for admin users
    for (const admin of adminUsers) {
      const notification = await Notification.create({
        userId: admin.uid,
        userRole: 'admin',
        type: 'order_dispatched_to_customer_hub',
        title: '🚚 Order Dispatched to Customer Hub',
        message: `Order #${order.orderNumber} has been approved and dispatched from ${fromHub} to ${toHub} for customer pickup.`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        read: false,
        actionRequired: false,
        actionType: 'none',
        metadata: {
          fromHub,
          toHub,
          customerName: order.buyerDetails.name,
          totalAmount: order.finalAmount,
          approvedBy: adminId,
          dispatchedAt: new Date()
        }
      });
      
      notifications.push(notification);
    }
    
    // Create notification for the customer hub manager
    if (order.hubTracking && order.hubTracking.customerHubId) {
      const hubManager = await HubManager.findOne({ 
        hubId: order.hubTracking.customerHubId,
        status: 'active'
      });
      
      if (hubManager) {
        const hubNotification = await Notification.create({
          userId: hubManager.managerId,
          userRole: 'hubmanager',
          type: 'order_dispatched_to_hub',
          title: '📦 Incoming Order Dispatch',
          message: `Order #${order.orderNumber} from ${order.buyerDetails.name} has been dispatched to your hub (${toHub}) and will arrive soon.`,
          orderId: order._id,
          orderNumber: order.orderNumber,
          read: false,
          actionRequired: false,
          actionType: 'none',
          metadata: {
            fromHub,
            toHub,
            customerName: order.buyerDetails.name,
            customerPhone: order.buyerDetails.phone,
            totalAmount: order.finalAmount,
            itemCount: order.items.length,
            dispatchedAt: new Date(),
            expectedArrival: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
          }
        });
        
        notifications.push(hubNotification);
        console.log(`✅ Created hub manager notification for ${hubManager.managerId} at hub ${toHub}`);
      }
    }
    
    console.log(`✅ Created ${notifications.length} dispatch notifications`);
    return notifications;
  } catch (error) {
    console.error("Error creating dispatch notification:", error);
    throw error;
  }
}

/**
 * Create notification when order arrives at customer hub
 */
async function createCustomerHubArrivalNotification(order, hubInfo) {
  try {
    console.log(`📦 Creating customer hub arrival notification for order ${order.orderNumber}`);
    
    // Get all admin users to notify them about the arrival
    const User = require("../models/User");
    const HubManager = require("../models/HubManager");
    const adminUsers = await User.find({ role: 'admin' }).select('uid').lean();
    
    const notifications = [];
    
    // Create notifications for admin users
    for (const admin of adminUsers) {
      const notification = await Notification.create({
        userId: admin.uid,
        userRole: 'admin',
        type: 'order_arrived_customer_hub',
        title: '📦 Order Arrived at Customer Hub',
        message: `Order #${order.orderNumber} has arrived at ${hubInfo.name} and is ready for customer pickup.`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        read: false,
        actionRequired: false,
        actionType: 'none',
        metadata: {
          hubName: hubInfo.name,
          hubDistrict: hubInfo.district,
          customerName: order.buyerDetails.name,
          totalAmount: order.finalAmount,
          arrivedAt: new Date()
        }
      });
      
      notifications.push(notification);
    }
    
    // Create notification for the hub manager
    if (hubInfo.hubId) {
      const hubManager = await HubManager.findOne({ 
        hubId: hubInfo.hubId,
        status: 'active'
      });
      
      if (hubManager) {
        const hubNotification = await Notification.create({
          userId: hubManager.managerId,
          userRole: 'hubmanager',
          type: 'order_arrived_at_hub',
          title: '✅ Order Arrived at Your Hub',
          message: `Order #${order.orderNumber} from ${order.buyerDetails.name} has arrived at your hub and is ready for customer pickup.`,
          orderId: order._id,
          orderNumber: order.orderNumber,
          read: false,
          actionRequired: true,
          actionType: 'prepare_for_pickup',
          metadata: {
            hubName: hubInfo.name,
            customerName: order.buyerDetails.name,
            customerPhone: order.buyerDetails.phone,
            totalAmount: order.finalAmount,
            itemCount: order.items.length,
            arrivedAt: new Date()
          }
        });
        
        notifications.push(hubNotification);
        console.log(`✅ Created hub manager arrival notification for ${hubManager.managerId} at hub ${hubInfo.name}`);
      }
    }
    
    console.log(`✅ Created ${notifications.length} customer hub arrival notifications`);
    return notifications;
  } catch (error) {
    console.error("Error creating customer hub arrival notification:", error);
    throw error;
  }
}

/**
 * Get admin notifications with filtering
 */
async function getAdminNotifications(options = {}) {
  try {
    const { 
      unreadOnly = false, 
      page = 1, 
      limit = 20,
      adminId 
    } = options;
    
    console.log("🔍 getAdminNotifications called with:", { unreadOnly, page, limit, adminId });
    
    if (!adminId) {
      throw new Error("Admin ID is required");
    }
    
    const skip = (page - 1) * limit;
    
    let query = {
      userId: adminId,
      userRole: 'admin'
    };
    
    if (unreadOnly) {
      query.read = false;
    }
    
    console.log("📋 Query:", query);
    
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('orderId', 'orderNumber orderStatus items buyerDetails'),
      Notification.countDocuments(query),
      Notification.countDocuments({ 
        userId: adminId,
        userRole: 'admin',
        read: false 
      })
    ]);
    
    console.log(`📊 Found ${notifications.length} notifications, ${total} total, ${unreadCount} unread`);
    
    return {
      success: true,
      notifications,
      unreadCount,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: notifications.length
      }
    };
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(notificationId, adminId) {
  try {
    if (!adminId) {
      throw new Error("Admin ID is required");
    }
    
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: notificationId, 
        userId: adminId,
        userRole: 'admin'
      },
      { 
        read: true, 
        readAt: new Date() 
      },
      { new: true }
    );
    
    if (!notification) {
      throw new Error("Notification not found");
    }
    
    return notification;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

/**
 * Create notification for hub manager when order arrives at seller hub
 */
async function createHubManagerNotification(order, hubInfo) {
  try {
    console.log(`🔔 Creating hub manager notification for order ${order.orderNumber} at hub ${hubInfo.name}`);
    
    const HubManager = require("../models/HubManager");
    
    // Find the hub manager for this hub
    const hubManager = await HubManager.findOne({ 
      hubId: hubInfo.hubId,
      status: 'active'
    });
    
    if (!hubManager) {
      console.log(`⚠️ No active hub manager found for hub ${hubInfo.hubId}`);
      return [];
    }
    
    console.log(`✅ Found hub manager: ${hubManager.managerId} for hub ${hubInfo.name}`);
    
    const notification = await Notification.create({
      userId: hubManager.managerId,
      userRole: 'hubmanager',
      type: 'order_arrived_seller_hub',
      title: '📦 New Order Awaiting Approval',
      message: `Order #${order.orderNumber} from ${order.buyerDetails.name} has arrived at ${hubInfo.name} (${hubInfo.district}) and requires your approval for dispatch to customer hub.`,
      orderId: order._id,
      orderNumber: order.orderNumber,
      read: false,
      actionRequired: true,
      actionType: 'approve_hub_delivery',
      metadata: {
        hubName: hubInfo.name,
        hubId: hubInfo.hubId,
        hubDistrict: hubInfo.district,
        customerName: order.buyerDetails.name,
        customerPhone: order.buyerDetails.phone,
        customerEmail: order.buyerDetails.email,
        totalAmount: order.finalAmount,
        itemCount: order.items.length,
        arrivedAt: new Date()
      }
    });
    
    console.log(`✅ Created hub manager notification for ${hubManager.managerId}`);
    return [notification];
  } catch (error) {
    console.error("Error creating hub manager notification:", error);
    throw error;
  }
}

/**
 * Create notification for buyer when order is out for delivery
 */
async function createBuyerOutForDeliveryNotification(order, otp) {
  try {
    console.log(`🚚 Creating buyer out-for-delivery notification for order ${order.orderNumber}`);
    
    const notification = await Notification.create({
      userId: order.userId,
      userRole: 'buyer',
      type: 'order_shipped',
      title: '🚚 Order Out for Delivery',
      message: `Your order #${order.orderNumber} is out for delivery to ${order.hubTracking.customerHubName}. Your pickup OTP is ${otp}.`,
      orderId: order._id,
      orderNumber: order.orderNumber,
      read: false,
      actionRequired: false,
      actionType: 'none',
      metadata: {
        otp: otp,
        hubName: order.hubTracking.customerHubName,
        hubDistrict: order.hubTracking.customerHubDistrict,
        customerName: order.buyerDetails.name,
        totalAmount: order.finalAmount,
        dispatchedAt: new Date(),
        expectedArrival: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours from now
      }
    });
    
    console.log(`✅ Created buyer out-for-delivery notification`);
    return notification;
  } catch (error) {
    console.error("Error creating buyer out-for-delivery notification:", error);
    throw error;
  }
}

module.exports = {
  createAdminHubNotification,
  createHubManagerNotification,
  createOrderDispatchedNotification,
  createCustomerHubArrivalNotification,
  createBuyerOutForDeliveryNotification,
  getAdminNotifications,
  markNotificationAsRead
};