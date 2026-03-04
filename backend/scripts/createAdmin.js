require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const email = 'admin@example.com';
  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Admin already exists:', existing.email, existing.role);
    process.exit(0);
  }

  const hashed = await bcrypt.hash('adminpass123', 10);
  const admin = await User.create({ name: 'Admin', email, password: hashed, role: 'admin' });
  console.log('Created admin:', admin.email);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
