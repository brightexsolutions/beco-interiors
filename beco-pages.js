/* ============================================================
   BECO PAGES — Shared JS
   ============================================================ */

const CART_STORAGE_KEY = 'beco_quote_cart_v1';
const CART_PAGE_URL = 'beco-shop.html?openCart=1';

/* Mobile nav */
const ham = document.getElementById('ham');
const mobNav = document.getElementById('mobNav');
const mobOverlay = document.getElementById('mobOverlay');
const mobClose = document.getElementById('mobClose');

if (ham && mobNav && mobOverlay && mobClose) {
  function openMob() {
    mobNav.classList.add('open');
    mobOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    ham.setAttribute('aria-expanded', 'true');
  }
  function closeMob() {
    mobNav.classList.remove('open');
    mobOverlay.classList.remove('open');
    document.body.style.overflow = '';
    ham.setAttribute('aria-expanded', 'false');
  }
  ham.addEventListener('click', openMob);
  mobClose.addEventListener('click', closeMob);
  mobOverlay.addEventListener('click', closeMob);
  document.querySelectorAll('.mob-nav a').forEach(link => link.addEventListener('click', closeMob));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobNav.classList.contains('open')) {
      closeMob();
    }
  });
}

/* Scroll reveal */
if ('IntersectionObserver' in window) {
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(el => {
      if (el.isIntersecting) {
        el.target.classList.add('in');
        revealObs.unobserve(el.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -36px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
}

/* Cart badge + cross-page cart links */
function getStoredCartCount() {
  try {
    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) return 0;
    return stored.reduce((sum, item) => sum + Math.max(1, Number(item.qty) || 1), 0);
  } catch (error) {
    console.warn('Unable to read cart state from localStorage.', error);
    return 0;
  }
}

function syncCartBadges() {
  const count = getStoredCartCount();
  document.querySelectorAll('[data-cart-badge]').forEach((badge) => {
    badge.textContent = count;
    badge.classList.toggle('show', count > 0);
  });
}

function wireCartLinks() {
  document.querySelectorAll('[data-cart-link]').forEach((link) => {
    if (link.tagName === 'A') {
      link.setAttribute('href', CART_PAGE_URL);
    }
  });
}

wireCartLinks();
syncCartBadges();
window.addEventListener('storage', (event) => {
  if (event.key === CART_STORAGE_KEY) {
    syncCartBadges();
  }
});
