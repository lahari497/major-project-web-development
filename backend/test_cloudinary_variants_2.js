require('dotenv').config();
const cloudinary = require('cloudinary').v2;

const clouds = ['bibek', 'bibekgorai', 'bibekgorai2002', 'ecommerce', 'major-ecommerce', 'bibek-ecommerce'];

(async () => {
  for (const cloud of clouds) {
    console.log(`Testing cloud name: ${cloud}`);
    cloudinary.config({
      cloud_name: cloud,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    try {
      const res = await cloudinary.api.ping();
      console.log(`Ping Success for ${cloud}:`, res);
      process.exit();
    } catch (err) {
      console.error(`Ping Failed for ${cloud}:`, err.message);
    }
  }
  process.exit();
})();
