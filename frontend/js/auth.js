// If frontend is served by a dev server (like live-server on :5500),
// point to backend at localhost:5000. Otherwise use relative path so
// when served by the backend (express.static) `/api` resolves correctly.
const API = window.location.origin.includes('5500') ? 'http://localhost:5000/api' : '/api';

function getToken() { return localStorage.getItem('token'); }
function getRole() { return localStorage.getItem('role'); }
function getName() { return localStorage.getItem('name'); }

function logout() {
  localStorage.clear();
  // Navigate to index.html - works from any directory
  if (window.location.pathname.includes('/user/') || window.location.pathname.includes('/admin/')) {
    window.location.href = '../index.html';
  } else {
    window.location.href = 'index.html';
  }
}

function requireLogin() {
  if (!getToken()) {
    showToast('Please login first!', 'error');
    const target = window.location.pathname.includes('/user/') || window.location.pathname.includes('/admin/') ? '../login.html' : 'login.html';
    setTimeout(() => window.location.href = target, 1000);
    return false;
  }
  return true;
}

function requireAdmin() {
  if (!getToken() || getRole() !== 'admin') {
    const target = window.location.pathname.includes('/user/') || window.location.pathname.includes('/admin/') ? '../login.html' : 'login.html';
    window.location.href = target;
    return false;
  }
  return true;
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function updateNavbar() {
  const authButtons = document.getElementById('authButtons');
  if (!authButtons) return;

  const token = getToken();
  const role = getRole();
  const name = getName();

  if (token) {
    if (role === 'admin') {
      authButtons.innerHTML = `
        <a href="admin/dashboard.html">⚙️ Admin Panel</a>
        <a href="#" onclick="logout()">Logout</a>
      `;
    } else {
      authButtons.innerHTML = `
        <a href="user/dashboard.html">👤 ${name}</a>
        <a href="user/orders.html">My Orders</a>
        <a href="#" onclick="logout()">Logout</a>
      `;
    }
  } else {
    authButtons.innerHTML = `<a href="login.html">Login / Register</a>`;
  }
}

function updateCartCount() {
  const cartCount = document.getElementById('cartCount');
  if (!cartCount) return;
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = total;
}
