// product.js - handles the product detail page

async function loadProduct() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const container = document.getElementById('productDetail');

  if (!id) {
    container.innerHTML = '<p>Product ID missing</p>';
    return;
  }

  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading product...</div>';

  try {
    const res = await fetch(`${API}/products/${id}`);
    const product = await res.json();
    if (!res.ok) {
      container.innerHTML = `<p class="error">${product.message || 'Product not found'}</p>`;
      return;
    }
    renderProduct(product);
  } catch (err) {
    container.innerHTML = '<p class="error">🔌 Server error. Please try again later.</p>';
  }
}

function renderProduct(p) {
  const container = document.getElementById('productDetail');
  const nameSafe = (p.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const imgSafe = (p.images && p.images[0] || '').replace(/'/g, "\\'")
  container.innerHTML = `
    <div class="back-link"><a href="index.html">← Back to Shop</a></div>
    <div class="product-detail">
      <div class="images">
        <img
          src="${p.images && p.images[0] ? p.images[0] : 'https://via.placeholder.com/400x400?text=No+Image'}"
          alt="${p.name}"
          class="main-img"
          id="mainImg_${p._id}"
        >
        ${p.images && p.images.length > 1 ? `
          <div class="thumb-row">
            ${p.images.map((img, i) => `
              <img src="${img}" class="thumb ${i === 0 ? 'active' : ''}"
                onclick="changeImg(this, '${p._id}')"
              >
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div class="info">
        ${p.category ? `<span class="category-tag">${p.category}</span>` : ''}
        <h2>${p.name}</h2>
        <p class="description">${p.description || ''}</p>
        <p class="price">₹${p.price.toLocaleString()}</p>
        <p class="${p.stock > 0 ? 'in-stock' : 'out-stock'}">
          ${p.stock > 0 ? `✅ In Stock: ${p.stock}` : '❌ Out of Stock'}
        </p>
        ${p.stock > 0 ? `
          <div class="buy-controls">
            <input type="number" id="qtyInput" class="quantity-input" value="1" min="1" max="${p.stock}">
            <button class="add-cart-btn" data-product-id="${p._id}" data-product-name="${nameSafe}" data-product-price="${p.price}" data-product-image="${imgSafe}">
              🛒 Add to Cart
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  // Add event listener to button instead of inline onclick
  const btn = container.querySelector('.add-cart-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      const id = btn.dataset.productId;
      const name = btn.dataset.productName;
      const price = parseFloat(btn.dataset.productPrice);
      const image = btn.dataset.productImage;
      const qty = parseInt(document.getElementById('qtyInput').value || '1', 10);
      addToCart(id, name, price, image, qty);
    });
  }
}
