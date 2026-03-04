require('dotenv').config();
const cloudinary = require('cloudinary').v2;

const clouds = ['Major', 'major', 'bibek', 'bibekgorai', 'bibekgorai2002'];

(async () => {
  for (const cloud of clouds) {
    console.log(`Testing cloud name: ${cloud}`);
    cloudinary.config({
      cloud_name: cloud,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    await new Promise((resolve) => {
      cloudinary.api.ping((err, res) => {
        if (err) {
          console.error(`Ping Failed for ${cloud}:`, err.message || err);
        } else {
          console.log(`Ping Success for ${cloud}:`, res);
          process.exit(0);
        }
        resolve();
      });
    });
  }
  process.exit(0);
})();
