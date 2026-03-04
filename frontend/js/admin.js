// use shared `API` from auth.js (defined in frontend/js/auth.js)

// in-memory cache so search/filter can operate on existing data
let adminProducts = [];
let adminOrders = [];

async function loadAdminDashboard(stockFilter = 'all') {
  const token = localStorage.getItem('token');
  if (!token || localStorage.getItem('role') !== 'admin') {
    const target = window.location.pathname.includes('/admin/') ? '../login.html' : 'login.html';
    window.location.href = target;
    return;
  }

  try {
    // Load products with optional stock filter
    let prodUrl = `${API}/products`;
    if (stockFilter === 'out') prodUrl += '?stock=out';
    else if (stockFilter === 'low') prodUrl += '?stock=low&threshold=5';
    const prodRes = await fetch(prodUrl);
    const products = await prodRes.json();
    adminProducts = products;

    // Load orders
    const ordRes = await fetch(`${API}/orders/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const orders = await ordRes.json();
    adminOrders = orders;

    // clear search fields
    document.getElementById('productSearch')?.value && (document.getElementById('productSearch').value = '');
    document.getElementById('orderSearch')?.value && (document.getElementById('orderSearch').value = '');
    document.getElementById('userSearch')?.value && (document.getElementById('userSearch').value = '');

    // Load users
    loadUsers();

    // Stats
    document.getElementById('totalProducts').textContent = products.length;
    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('totalRevenue').textContent =
      '₹' + orders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString();
    document.getElementById('pendingOrders').textContent =
      orders.filter(o => o.status === 'pending').length;
    document.getElementById('lowStockCount').textContent =
      products.filter(p => p.stock <= 5).length;
    document.getElementById('outStockCount').textContent =
      products.filter(p => p.stock <= 0).length;

    renderProductTable(products);
    renderOrderTable(orders);

  } catch (err) {
    showToast('Failed to load data!', 'error');
  }
}

function renderProductTable(products) {
  document.getElementById('productsTable').innerHTML = products.length === 0
    ? '<tr><td colspan="6" style="text-align:center;padding:30px">No products found</td></tr>'
    : products.map(p => `
        <tr>
          <td><img src="${p.images && p.images[0] ? p.images[0] : 'https://via.placeholder.com/50'}" alt="${p.name}"></td>
          <td><strong>${p.name}</strong></td>
          <td>${p.category || '-'}</td>
          <td>₹${p.price.toLocaleString()}</td>
          <td>${p.stock}</td>
          <td>
            <button class="btn btn-warning" onclick="goEditProduct('${p._id}')">✏️ Edit</button>
            <button class="btn btn-danger" onclick="deleteProduct('${p._id}')">🗑️ Delete</button>
          </td>
        </tr>
      `).join('');
}

function renderOrderTable(orders) {
  document.getElementById('ordersTable').innerHTML = orders.length === 0
    ? '<tr><td colspan="5" style="text-align:center;padding:30px">No orders found</td></tr>'
    : orders.map(o => `
        <tr>
          <td><strong>#${o._id.slice(-6).toUpperCase()}</strong></td>
          <td>${o.userId ? o.userId.name : 'N/A'}<br><small>${o.userId ? o.userId.email : ''}</small></td>
          <td>₹${o.totalAmount.toLocaleString()}</td>
          <td><span class="status-badge status-${o.status}">${o.status}</span></td>
          <td>
            <div style="display:flex;gap:8px;align-items:center">
              <select id="status_${o._id}" class="btn" style="flex:1">
                <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>Processing</option>
                <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
              <button class="btn btn-primary" onclick="updateOrderStatus('${o._id}', document.getElementById('status_${o._id}').value)" style="white-space:nowrap">✅ Update</button>
            </div>
          </td>
        </tr>
      `).join('');
}

function filterOrders() {
  const q = document.getElementById('orderSearch').value.toLowerCase();
  const filtered = adminOrders.filter(o => {
    const name = o.userId ? o.userId.name.toLowerCase() : '';
    const email = o.userId ? o.userId.email.toLowerCase() : '';
    const id = o._id.toLowerCase();
    return name.includes(q) || email.includes(q) || id.includes(q);
  });
  renderOrderTable(filtered);
}

function filterProductsAdmin() {
  const q = document.getElementById('productSearch').value.toLowerCase();
  const filtered = adminProducts.filter(p => {
    const name = p.name.toLowerCase();
    const id = p._id.toLowerCase();
    return name.includes(q) || id.includes(q);
  });
  renderProductTable(filtered);
}

let adminUsers = [];
async function loadUsers() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API}/auth/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const users = await res.json();
    adminUsers = users;
    renderUserTable(users);
  } catch (err) {
    showToast('Failed to load users', 'error');
  }
}

function renderUserTable(users) {
  document.getElementById('usersTable').innerHTML = users.length === 0
    ? '<tr><td colspan="4" style="text-align:center;padding:30px">No users found</td></tr>'
    : users.map(u => `
        <tr>
          <td>${u._id}</td>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td>${u.role}</td>
        </tr>
      `).join('');
}

function searchUsers() {
  const q = document.getElementById('userSearch').value.toLowerCase();
  const filtered = adminUsers.filter(u => {
    const name = u.name.toLowerCase();
    const email = u.email.toLowerCase();
    const id = u._id.toLowerCase();
    return name.includes(q) || email.includes(q) || id.includes(q);
  });
  renderUserTable(filtered);
}

function goEditProduct(id) {
  window.location.href = `edit-product.html?id=${id}`;
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}/products/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (res.ok) {
    showToast('Product deleted successfully!');
    loadAdminDashboard();
  }
}

async function updateOrderStatus(orderId, status) {
  console.log('Update function called:', orderId, status);
  
  const token = localStorage.getItem('token');
  if (!token) {
    showToast('Token not found! Please login again.', 'error');
    return;
  }

  console.log('API endpoint:', `${API}/orders/status/${orderId}`);
  
  try {
    const res = await fetch(`${API}/orders/status/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });

    console.log('Response status:', res.status);
    
    const data = await res.json();
    console.log('Response data:', data);

    if (res.ok) {
      showToast(`✅ Status updated to "${status}"!`);
      setTimeout(() => loadAdminDashboard(), 800);
    } else {
      showToast(data.message || 'Update failed! Check console for details.', 'error');
    }
  } catch (err) {
    console.error('Error:', err);
    showToast('Network error! ' + err.message, 'error');
  }
}

async function addProduct() {
  const token = localStorage.getItem('token');
  const name = document.getElementById('pName').value.trim();
  const desc = document.getElementById('pDesc').value.trim();
  const price = document.getElementById('pPrice').value;
  const stock = document.getElementById('pStock').value;
  const category = document.getElementById('pCategory').value.trim();
  const images = document.getElementById('pImages').files;

  if (!name || !price || !stock) {
    showToast('Name, Price, and Stock are required!', 'error');
    return;
  }

  if (images.length > 5) {
    showToast('Maximum 5 images allowed!', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('name', name);
  formData.append('description', desc);
  formData.append('price', price);
  formData.append('stock', stock);
  formData.append('category', category);
  Array.from(images).forEach(img => formData.append('images', img));

  const btn = document.getElementById('addProductBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Adding product...';

  try {
    const res = await fetch(`${API}/products/add`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = { message: await res.text() };
    }

    if (res.ok) {
      showToast('✅ Product added successfully!');
      setTimeout(() => window.location.href = 'dashboard.html', 1500);
    } else {
      console.error('Add product failed:', res.status, data);
      showToast(data.message || 'Server error', 'error');
      btn.disabled = false;
      btn.textContent = '✅ Add Product';
    }
  } catch (err) {
    showToast('Server error!', 'error');
    btn.disabled = false;
    btn.textContent = '✅ Add Product';
  }
}

// edit product helpers
async function loadProductForEdit() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API}/products/${id}`);
    if (!res.ok) throw new Error('Product not found');
    const p = await res.json();
    document.getElementById('pName').value = p.name;
    document.getElementById('pDesc').value = p.description || '';
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pStock').value = p.stock;
    document.getElementById('pCategory').value = p.category || '';
    // show existing images
    const preview = document.getElementById('imagePreview');
    if (p.images && p.images.length) {
      preview.innerHTML = p.images.map(src => `<img src="${src}" class="preview-img">`).join('');
    }
    document.getElementById('addProductBtn').textContent = '🖊️ Update Product';
    document.getElementById('addProductBtn').onclick = () => updateProduct(id);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function updateProduct(id) {
  const token = localStorage.getItem('token');
  const name = document.getElementById('pName').value.trim();
  const desc = document.getElementById('pDesc').value.trim();
  const price = document.getElementById('pPrice').value;
  const stock = document.getElementById('pStock').value;
  const category = document.getElementById('pCategory').value.trim();
  // don't allow new images here (simpler) or we can allow
  
  if (!name || !price || !stock) {
    showToast('Name, Price, and Stock are required!', 'error');
    return;
  }

  const body = { name, description: desc, price, stock, category };
  const btn = document.getElementById('addProductBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Updating product...';
  try {
    const res = await fetch(`${API}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      showToast('✅ Product updated successfully!');
      setTimeout(() => window.location.href = 'dashboard.html', 1500);
    } else {
      showToast(data.message || 'Error', 'error');
      btn.disabled = false;
      btn.textContent = '🖊️ Update Product';
    }
  } catch (err) {
    showToast('Server error!', 'error');
    btn.disabled = false;
    btn.textContent = '🖊️ Update Product';
  }
}
