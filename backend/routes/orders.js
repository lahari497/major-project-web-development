const router = require('express').Router();
const Order = require('../models/Order');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Place an order
router.post('/place', authMiddleware, async (req, res) => {
  try {
    const { items, totalAmount, address } = req.body;

    if (!address) return res.status(400).json({ message: 'Please provide an address!' });
    if (!items || items.length === 0) return res.status(400).json({ message: 'Cart is empty!' });

    // check stock and decrement
    for (const it of items) {
      const product = await require('../models/Product').findById(it.productId);
      if (!product) return res.status(404).json({ message: 'Product not found!' });
      if (product.stock < it.quantity) {
        return res.status(400).json({ message: `Only ${product.stock} of "${product.name}" available` });
      }
    }

    // all good, reserve the stock
    for (const it of items) {
      const product = await require('../models/Product').findById(it.productId);
      product.stock -= it.quantity;
      await product.save();
    }

    const order = await Order.create({
      userId: req.user.id,
      items,
      totalAmount,
      address
    });

    // Clear cart after placing order
    await User.findByIdAndUpdate(req.user.id, { cart: [] });

    res.json({ message: 'Order placed successfully!', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mere orders dekho (User)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .populate('items.productId')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// View all orders (Admin only)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view this.' });
    }

    const orders = await Order.find()
      .populate('userId', 'name email')
      .populate('items.productId', 'name price images')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update order status (Admin only)
router.put('/status/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update orders!' });
    }

    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Please provide a valid status!' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found!' });
    }

    const oldStatus = order.status;

    // if we're cancelling and it wasn't already cancelled/delivered, restore stock
    if (status === 'cancelled' && oldStatus !== 'cancelled' && oldStatus !== 'delivered') {
      for (const it of order.items) {
        const product = await require('../models/Product').findById(it.productId);
        if (product) {
          product.stock += it.quantity;
          await product.save();
        }
      }
    }

    order.status = status;
    await order.save();

    const populated = await Order.findById(order._id)
      .populate('userId', 'name email')
      .populate('items.productId', 'name price images');

    res.json({ message: 'Status updated successfully!', order: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cancel order (User)
router.put('/cancel/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found!' });
    }

    // Check if order belongs to user
    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This order does not belong to you!' });
    }

    // Only allow cancellation if order is pending or processing
    if (order.status === 'shipped' || order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({ 
        message: `Order is ${order.status} and cannot be cancelled.`,
        status: order.status
      });
    }

    // restore stock
    for (const it of order.items) {
      const product = await require('../models/Product').findById(it.productId);
      if (product) {
        product.stock += it.quantity;
        await product.save();
      }
    }

    order.status = 'cancelled';
    await order.save();

    res.json({ message: 'Order cancelled successfully!', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update address (User - only for pending/processing orders)
router.put('/update-address/:id', authMiddleware, async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ message: 'Please provide an address!' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found!' });
    }

    // Check if order belongs to user
    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This order does not belong to you!' });
    }

    // Only allow updating address if order is pending or processing
    if (order.status !== 'pending' && order.status !== 'processing') {
      return res.status(400).json({ 
        message: `Order is ${order.status}; address cannot be updated. Only orders in pending/processing state may update the address.`,
        status: order.status
      });
    }

    order.address = address;
    await order.save();

    res.json({ message: 'Address updated successfully!', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
