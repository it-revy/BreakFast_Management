const BreakfastOrder = require('../models/BreakfastOrder');
const BreakfastOrderItem = require('../models/BreakfastOrderItem');
const Employee = require('../models/Employee');
const { getKolkataDateString } = require('../utils/dateUtils');
const { logAudit } = require('../middleware/auditLogger');

// Create a new Breakfast Order (supports multiple orders per date)
const createOrder = async (req, res) => {
  try {
    const { businessDate, vendorName, notes, items = [] } = req.body;
    const targetDateStr = businessDate || getKolkataDateString();

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one order item is required' });
    }

    const orderId = `ORD-${targetDateStr.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const newOrder = new BreakfastOrder({
      orderId,
      businessDate: targetDateStr,
      vendorName: vendorName ? vendorName.trim() : 'Internal Catering / Vendor',
      notes: notes ? notes.trim() : '',
      createdBy: {
        employeeId: req.user.employeeId,
        employeeName: req.user.name
      }
    });

    await newOrder.save();

    const createdItems = [];
    for (const item of items) {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity, 10) || 1;

      // Backend safety check: Price * Quantity calculation
      const total = price * quantity;

      let empName = null;
      if (item.orderType === 'INDIVIDUAL' && item.employeeId) {
        const emp = await Employee.findOne({ employeeId: item.employeeId.trim().toUpperCase() });
        if (emp) empName = emp.name;
      }

      const itemId = `ITM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const orderItem = new BreakfastOrderItem({
        itemId,
        orderId,
        businessDate: targetDateStr,
        orderType: item.orderType || 'INDIVIDUAL',
        employeeId: item.orderType === 'INDIVIDUAL' ? (item.employeeId ? item.employeeId.trim().toUpperCase() : null) : null,
        employeeName: empName,
        itemName: item.itemName.trim(),
        price,
        quantity,
        total
      });

      await orderItem.save();
      createdItems.push(orderItem);
    }

    // Log audit
    await logAudit(
      req,
      'BREAKFAST_ORDER_CREATED',
      { recordId: orderId, details: `Created breakfast purchase order on ${targetDateStr} with ${createdItems.length} items` },
      null,
      { order: newOrder, items: createdItems }
    );

    res.status(201).json({
      success: true,
      message: 'Breakfast purchase order created successfully',
      order: newOrder,
      items: createdItems
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create order', error: error.message });
  }
};

// Get Orders and Financial Summary for a Business Date
const getOrdersByDate = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDateStr = date || getKolkataDateString();

    const orders = await BreakfastOrder.find({ businessDate: targetDateStr }).sort({ createdAt: -1 });
    const orderItems = await BreakfastOrderItem.find({ businessDate: targetDateStr });

    let individualTotal = 0;
    let commonTotal = 0;

    orderItems.forEach(item => {
      if (item.orderType === 'INDIVIDUAL') {
        individualTotal += item.total;
      } else {
        commonTotal += item.total;
      }
    });

    const grandTotal = individualTotal + commonTotal;

    res.json({
      success: true,
      businessDate: targetDateStr,
      summary: {
        totalOrders: orders.length,
        individualTotal,
        commonTotal,
        grandTotal
      },
      orders,
      orderItems
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: error.message });
  }
};

// Delete Order
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await BreakfastOrder.findOne({ orderId: id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await BreakfastOrder.deleteOne({ orderId: id });
    await BreakfastOrderItem.deleteMany({ orderId: id });

    await logAudit(
      req,
      'BREAKFAST_ORDER_DELETED',
      { recordId: id, details: `Deleted order ${id}` },
      order.toJSON(),
      null
    );

    res.json({ success: true, message: 'Breakfast order deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete order', error: error.message });
  }
};

module.exports = {
  createOrder,
  getOrdersByDate,
  deleteOrder
};
