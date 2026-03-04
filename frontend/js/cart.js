// Use shared API from auth.js

function loadCart() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '../login.html';
    return;
  }

  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const container = document.getElementById('cartItems');
  const summaryDiv = document.getElementById('cartSummary');

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <div class="empty-icon">🛒</div>
        <h3>Your cart is empty!</h3>
        <p>Add some products to your cart</p>
        <br>
        <a href="../index.html" class="btn btn-primary">🛍️ Start Shopping</a>
      </div>
    `;
    summaryDiv.style.display = 'none';
    return;
  }

  summaryDiv.style.display = 'block';

  container.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <img src="${item.image || 'https://via.placeholder.com/80'}" alt="${item.name}">
      <div class="cart-item-info">
        <h3>${item.name}</h3>
        <p class="item-price">₹${item.price.toLocaleString()} × ${item.quantity} = <strong>₹${(item.price * item.quantity).toLocaleString()}</strong></p>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="changeQty(${i}, -1)">−</button>
        <span class="qty-display">${item.quantity}</span>
        <button class="qty-btn" onclick="changeQty(${i}, 1)">+</button>
        <button class="remove-btn" onclick="removeItem(${i})">🗑️</button>
      </div>
    </div>
  `).join('');

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.getElementById('totalAmount').textContent = `₹${total.toLocaleString()}`;
}

async function changeQty(index, delta) {
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  if (delta > 0) {
    // check stock before increasing
    const productId = cart[index].id;
    try {
      const res = await fetch(`${API}/products/${productId}`);
      if (res.ok) {
        const prod = await res.json();
        if (cart[index].quantity + delta > prod.stock) {
          showToast(`Only ${prod.stock} items available in stock`, 'error');
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  cart[index].quantity += delta;
  if (cart[index].quantity <= 0) cart.splice(index, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  loadCart();
  updateCartCount();
}

function removeItem(index) {
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  cart.splice(index, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  loadCart();
  updateCartCount();
  showToast('Item removed from cart!', 'error');
}

async function placeOrder() {
  const address = document.getElementById('addressInput').value.trim();
  if (!address) {
    showToast('Please enter your delivery address!', 'error');
    return;
  }

  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  if (cart.length === 0) {
    showToast('Your cart is empty!', 'error');
    return;
  }

  const token = localStorage.getItem('token');
  const items = cart.map(item => ({
    productId: item.id,
    quantity: item.quantity,
    price: item.price
  }));
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const btn = document.getElementById('orderBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Placing your order...';

  try {
    const res = await fetch(`${API}/orders/place`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ items, totalAmount, address })
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.removeItem('cart');
      showToast('🎉 Order placed successfully!');
      setTimeout(() => window.location.href = 'orders.html', 1500);
    } else {
      showToast(data.message, 'error');
      btn.disabled = false;
      btn.textContent = '✅ Place Order';
    }
  } catch (err) {
    showToast('Server error!', 'error');
    btn.disabled = false;
    btn.textContent = '✅ Place Order';
  }
}
