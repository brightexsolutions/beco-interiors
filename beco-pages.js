/* ============================================================
   BECO PAGES — Shared JS
   ============================================================ */

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
  }
  function closeMob() {
    mobNav.classList.remove('open');
    mobOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  ham.addEventListener('click', openMob);
  mobClose.addEventListener('click', closeMob);
  mobOverlay.addEventListener('click', closeMob);
  document.querySelectorAll('.mob-nav a').forEach(link => link.addEventListener('click', closeMob));
}

/* Scroll reveal */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(el => {
    if (el.isIntersecting) {
      el.target.classList.add('in');
      revealObs.unobserve(el.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -36px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
