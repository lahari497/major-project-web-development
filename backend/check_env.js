require('dotenv').config();

const envs = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

envs.forEach(key => {
  const val = process.env[key];
  if (val) {
    console.log(`${key}: [${val}] (length: ${val.length})`);
    for (let i = 0; i < val.length; i++) {
      console.log(`  char ${i}: code ${val.charCodeAt(i)} ('${val[i]}')`);
    }
  } else {
    console.log(`${key} is MISSING`);
  }
});
