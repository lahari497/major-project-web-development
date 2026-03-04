const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const Product = require('./models/Product');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const products = await Product.find({});
    console.log('Product count:', products.length);
    console.log('Products:', JSON.stringify(products, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ DB Error:', err);
    process.exit(1);
  });
