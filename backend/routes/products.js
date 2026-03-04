const router = require('express').Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// use memory storage so we can either upload to cloudinary or save to disk as fallback
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { files: 5 } });

// helper: decide if cloudinary seems configured (non–empty variables only)
let useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  !process.env.CLOUDINARY_CLOUD_NAME.includes(' ')
);

// verify the credentials by pinging the API; if ping fails we disable cloudinary
(async () => {
  if (useCloudinary) {
    try {
      await cloudinary.api.ping();
      console.log('PRODUCTS ROUTE: Cloudinary ping succeeded.');
    } catch (err) {
      console.error('PRODUCTS ROUTE: Cloudinary ping failed, disabling cloudinary uploads.', err.message || err);
      useCloudinary = false;
    }
  }
  console.log('PRODUCTS ROUTE: useCloudinary=', useCloudinary);
  console.log('CLOUDINARY_CLOUD_NAME=', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('CLOUDINARY_API_KEY=', process.env.CLOUDINARY_API_KEY ? 'Present' : 'Missing');
  console.log('CLOUDINARY_API_SECRET=', process.env.CLOUDINARY_API_SECRET ? 'Present' : 'Missing');
})();

// Public endpoint - list all products (supports search and stock filters)
router.get('/', async (req, res) => {
  try {
    const { stock, search, threshold } = req.query;
    const filter = {};

    if (search) {
      // look by name or description or id
      const regex = new RegExp(search, 'i');
      if (mongoose && mongoose.Types.ObjectId.isValid(search)) {
        filter.$or = [{ name: regex }, { description: regex }, { _id: search }];
      } else {
        filter.$or = [{ name: regex }, { description: regex }];
      }
    }

    if (stock === 'out') {
      filter.stock = { $lte: 0 };
    } else if (stock === 'low') {
      const t = Number(threshold) || 5;
      filter.stock = { $lte: t };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found!' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin - Add product (max 5 images)
router.post('/add', authMiddleware, upload.array('images', 5), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can add products!' });
    }

    const { name, description, price, stock, category } = req.body;

    if (!name || !price || !stock) {
      return res.status(400).json({ message: 'Name, price and stock are required!' });
    }

    const imageUrls = [];

    // if the app is not configured to use cloudinary, reject the request so
    // that admins can fix their environment instead of silently storing
    // images on disk.  (This enforces the "cloud only" behaviour the user
    // asked for.)
    if (!useCloudinary) {
      return res.status(500).json({
        message: 'Cloudinary configuration missing or invalid. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET correctly and restart the server.'
      });
    }

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              { folder: 'ecommerce_products' },
              (err, result) => {
                if (err) reject(err);
                else resolve(result);
              }
            ).end(file.buffer);
          });
          imageUrls.push(result.secure_url);
        } catch (err) {
          console.error('Cloudinary upload failed ERROR DETAILS:', err);
          // if upload fails for any reason we'll bail out instead of
          // silently saving to disk; cloudinary must be working for the
          // application to continue.
          return res.status(500).json({
            message: 'Cloudinary upload failed. Check your credentials and network connectivity.'
          });
        }
      }
    }

    const product = await Product.create({
      name,
      description,
      price: Number(price),
      stock: Number(stock),
      category,
      images: imageUrls,
      createdBy: req.user.id
    });

    res.json({ message: 'Product added successfully!', product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin - Update product
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update products!' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!product) return res.status(404).json({ message: 'Product not found!' });
    res.json({ message: 'Product updated successfully!', product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin - Delete product
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete products!' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
