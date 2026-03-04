// Use shared API from auth.js
let allProducts = [];
let isFilterActive = false;

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '<div class="loading"><div class="spinner"></div>Loading products...</div>';

  try {
    const res = await fetch(`${API}/products`);
    allProducts = await res.json();

    // Fill categories
    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
    const catFilter = document.getElementById('categoryFilter');
    if (catFilter) {
      categories.forEach(cat => {
        catFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
      });
    }

    renderProductsByCategory(allProducts);
  } catch (err) {
    grid.innerHTML = '<div class="loading">❌ Products failed to load. Please check the server.</div>';
  }
}

function getProductCard(p) {
  return `
    <div class="product-card">
      <div class="product-img-container">
        <a href="product.html?id=${p._id}">
          <img
            src="${p.images && p.images[0] ? p.images[0] : 'https://via.placeholder.com/300x220?text=No+Image'}"
            alt="${p.name}"
            class="main-img"
            id="mainImg_${p._id}"
          >
        </a>
      </div>
      ${p.images && p.images.length > 1 ? `
        <div class="thumb-row">
          ${p.images.slice(0, 5).map((img, i) => `
            <img src="${img}" class="thumb ${i === 0 ? 'active' : ''}"
              onclick="changeImg(this, '${p._id}')"
            >
          `).join('')}
        </div>
      ` : ''}
      <div class="product-info">
        ${p.category ? `<span class="category-tag">${p.category}</span>` : ''}
        <h3><a href="product.html?id=${p._id}">${p.name}</a></h3>
        <p class="description">${p.description || ''}</p>
        <p class="price">₹${p.price.toLocaleString()}</p>
        <p class="${p.stock > 0 ? 'in-stock' : 'out-stock'}">
          ${p.stock > 0 ? `✅ In Stock: ${p.stock}` : '❌ Out of Stock'}
        </p>
        <button
          class="add-cart-btn"
          data-product-id="${p._id}"
          data-product-name="${(p.name || '').replace(/"/g, '&quot;')}"
          data-product-price="${p.price}"
          data-product-image="${(p.images && p.images[0] || '').replace(/"/g, '&quot;')}"
          ${p.stock === 0 ? 'disabled' : ''}
        >
          🛒 Add to Cart
        </button>
      </div>
    </div>
  `;
}

function renderProductsByCategory(products) {
  const grid = document.getElementById('productsGrid');
  
  if (products.length === 0) {
    grid.innerHTML = '<div class="loading">🔍 No products found</div>';
    return;
  }

  // Group products by category
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const uncategorized = products.filter(p => !p.category);

  let html = '';

  // Add each category with its products
  categories.forEach(category => {
    const categoryProducts = products.filter(p => p.category === category);
    if (categoryProducts.length > 0) {
      html += `
        <div class="section-container">
          <div class="section-title">🔥 ${category}</div>
          <div class="products-grid">
            ${categoryProducts.map(p => getProductCard(p)).join('')}
          </div>
        </div>
      `;
    }
  });

  // Add "All Products" section at the bottom
  html += `
    <div class="section-container">
      <div class="section-title">📦 All Products</div>
      <div class="products-grid">
        ${products.map(p => getProductCard(p)).join('')}
      </div>
    </div>
  `;

  grid.innerHTML = html;

  // Event delegation for add to cart buttons
  grid.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-cart-btn')) {
      const btn = e.target;
      const id = btn.dataset.productId;
      const name = btn.dataset.productName;
      const price = parseFloat(btn.dataset.productPrice);
      const image = btn.dataset.productImage;
      addToCart(id, name, price, image);
    }
  });
}

function renderProducts(products) {
  const grid = document.getElementById('productsGrid');

  if (products.length === 0) {
    grid.innerHTML = '<div class="loading">🔍 No products found</div>';
    return;
  }
  // Wrap filtered results in the same grid container so CSS applies
  grid.innerHTML = `
    <div class="section-container">
      <div class="products-grid">
        ${products.map(p => getProductCard(p)).join('')}
      </div>
    </div>
  `;

  // Event delegation for add to cart buttons
  grid.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-cart-btn')) {
      const btn = e.target;
      const id = btn.dataset.productId;
      const name = btn.dataset.productName;
      const price = parseFloat(btn.dataset.productPrice);
      const image = btn.dataset.productImage;
      addToCart(id, name, price, image);
    }
  });
}

function changeImg(thumb, productId) {
  document.getElementById(`mainImg_${productId}`).src = thumb.src;
  thumb.closest('.product-card').querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
}

function filterProducts() {
  const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const category = document.getElementById('categoryFilter')?.value || '';

  // Check if any filter is active
  isFilterActive = search !== '' || category !== '';

  const filtered = allProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search) ||
      (p.description || '').toLowerCase().includes(search);
    const matchCat = !category || p.category === category;
    return matchSearch && matchCat;
  });

  // If filters are active, show filtered results in grid
  // If no filters, show categorized view
  if (isFilterActive) {
    renderProducts(filtered);
  } else {
    renderProductsByCategory(allProducts);
  }
}

async function addToCart(id, name, price, image, qty = 1) {
  const token = localStorage.getItem('token');
  if (!token) {
    showToast('Please login to access your cart!', 'error');
    const target = window.location.pathname.includes('/user/') || window.location.pathname.includes('/admin/') ? '../login.html' : 'login.html';
    setTimeout(() => window.location.href = target, 1200);
    return;
  }

  // fetch latest stock
  try {
    const prodRes = await fetch(`${API}/products/${id}`);
    if (!prodRes.ok) {
      showToast('Product details not found', 'error');
      return;
    }
    const product = await prodRes.json();
    if (product.stock <= 0) {
      showToast('Product out of stock!', 'error');
      return;
    }

    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find(item => item.id === id);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty + qty > product.stock) {
      showToast(`Only ${product.stock - currentQty} items left in stock`, 'error');
      return;
    }

    if (existing) {
      existing.quantity += qty;
      showToast(`${name} quantity updated!`);
    } else {
      cart.push({ id, name, price, image, quantity: qty });
      showToast(`✅ ${name} added to cart!`);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
  } catch (err) {
    showToast('Server error!', 'error');
    console.error(err);
  }
}
