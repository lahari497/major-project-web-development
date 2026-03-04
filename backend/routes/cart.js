const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// View cart
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('cart.productId');
    res.json(user.cart || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add to cart with stock check
router.post('/add', authMiddleware, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const qty = quantity && Number(quantity) > 0 ? Number(quantity) : 1;

    // make sure product exists and has enough stock
    const product = await require('../models/Product').findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found!' });
    if (product.stock <= 0) return res.status(400).json({ message: 'Product is out of stock!' });

    const user = await User.findById(req.user.id);
    const existing = user.cart.find(
      item => item.productId.toString() === productId
    );

    const currentQty = existing ? existing.quantity : 0;
    if (currentQty + qty > product.stock) {
      return res.status(400).json({ message: `Only ${product.stock - currentQty} quantity left` });
    }

    if (existing) {
      existing.quantity += qty;
    } else {
      user.cart.push({ productId, quantity: qty });
    }

    await user.save();
    res.json({ message: 'Added to cart!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update quantity with stock enforcement
router.put('/update/:productId', authMiddleware, async (req, res) => {
  try {
    const { quantity } = req.body;
    const qty = Number(quantity);
    const user = await User.findById(req.user.id);

    const item = user.cart.find(
      item => item.productId.toString() === req.params.productId
    );

    if (!item) return res.status(404).json({ message: 'Item not found in cart!' });

    if (qty <= 0) {
      user.cart = user.cart.filter(
        item => item.productId.toString() !== req.params.productId
      );
    } else {
      // check stock
      const product = await require('../models/Product').findById(req.params.productId);
      if (!product) return res.status(404).json({ message: 'Product not found!' });
      if (qty > product.stock) {
        return res.status(400).json({ message: `Only ${product.stock} quantity available` });
      }
      item.quantity = qty;
    }

    await user.save();
    res.json({ message: 'Cart updated!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove from cart
router.delete('/remove/:productId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.cart = user.cart.filter(
      item => item.productId.toString() !== req.params.productId
    );
    await user.save();
    res.json({ message: 'Item removed!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Clear cart
router.delete('/clear', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { cart: [] });
    res.json({ message: 'Cart cleared!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
