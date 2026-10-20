// @ts-nocheck
/* eslint-disable */
// Ported from assets/main.js (v3). The original had `import` statements in a classic <script>,
// which is a SyntaxError in browsers, so none of this ran on the old static site.
// TODO: replace each block with proper React components/hooks.
export function initLegacyMain() {
(function () {
  'use strict';

  /* ── Dark mode ── */
  const THEME_KEY = 'diraflow-theme';
  const root = document.documentElement;

  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    localStorage.setItem(THEME_KEY, t);
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }

  // Init: honour saved preference, then system preference
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));

  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  });

  /* ── Sticky nav shadow ── */
  const nav = document.querySelector('nav.top');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.style.boxShadow = window.scrollY > 10
        ? '0 2px 24px rgba(0,0,0,.1)'
        : 'none';
    }, { passive: true });
  }

  /* ── Scroll-reveal cards ── */
  if ('IntersectionObserver' in window) {
    const revealEls = document.querySelectorAll(
      '.card, .post-card, .job-card, .testimonial, .industry-card, .process-step, .faq-item, .feature-row, .compare-card, .hero-stat'
    );

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          const el = e.target;
          el.style.transitionDelay = `${(i % 4) * 60}ms`;
          el.style.opacity = '1';
          el.style.transform = 'translateY(0) scale(1)';
          io.unobserve(el);
        }
      });
    }, { threshold: 0.07, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px) scale(.99)';
      el.style.transition = 'opacity .6s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.22,1,.36,1), border-color .25s, box-shadow .25s';
      io.observe(el);
    });
  }

  /* ── Count-up numbers ── */
  function animateCount(el) {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
    const duration = 1600;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = (target * eased).toFixed(decimals);
      el.textContent = prefix + val + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  if ('IntersectionObserver' in window) {
    const countEls = document.querySelectorAll('[data-target]');
    const countIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCount(e.target);
          countIO.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    countEls.forEach(el => countIO.observe(el));
  }

  /* ── Ticker duplicate for seamless loop ── */
  document.querySelectorAll('.ticker-track, .quote-track').forEach(track => {
    if (!track.dataset.duped) {
      track.innerHTML += track.innerHTML;
      track.dataset.duped = '1';
    }
  });

  /* ── Mobile menu toggle ── */
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
    });
  }

  /* ── Smooth hover tilt on cards ── */
  document.querySelectorAll('.card-glow').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = `translateY(-4px) perspective(800px) rotateX(${-y*4}deg) rotateY(${x*4}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

})();

/* In your <script> block */
document.querySelectorAll('.tag').forEach(tag => {
  tag.addEventListener('click', e => {
    e.preventDefault(); // blocks navigation

    // Remove class first so re-clicking re-triggers the animation
    tag.classList.remove('float');
    void tag.offsetWidth; // force reflow
    tag.classList.add('float');

    tag.addEventListener('animationend', () => {
      tag.classList.remove('float');
    }, { once: true });
  });
});

const subscribeForm = document.getElementById('subscribe-form');
if (subscribeForm) {
  subscribeForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('subscribe-btn');
    const success = document.getElementById('form-success');
    const error   = document.getElementById('form-error');

    btn.textContent = 'Subscribing…';
    btn.disabled    = true;

    try {
      const res = await fetch(subscribeForm.action, {
        method:  'POST',
        body:    new FormData(subscribeForm),
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        subscribeForm.style.display = 'none';
        success.style.display = 'block';
      } else {
        throw new Error('failed');
      }
    } catch {
      error.style.display = 'block';
      btn.textContent = 'Subscribe →';
      btn.disabled    = false;
    }
  });
}

// ── Expert modal ──
function openExpertModal() {
  const modal = document.getElementById('expert-modal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // prevent background scroll
}

function closeExpertModal() {
  const modal = document.getElementById('expert-modal');
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

function handleModalBackdropClick(e) {
  // Close if clicking the dark backdrop, not the card itself
  if (e.target === document.getElementById('expert-modal')) {
    closeExpertModal();
  }
}

// Close on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeExpertModal();
});

// Form submission
const expertForm = document.getElementById('expert-form');
if (expertForm) {
  expertForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn     = document.getElementById('expert-submit-btn');
    const success = document.getElementById('expert-success');
    const error   = document.getElementById('expert-error');

    btn.textContent = 'Sending…';
    btn.disabled    = true;
    error.style.display = 'none';

    try {
      const res = await fetch(expertForm.action, {
        method:  'POST',
        body:    new FormData(expertForm),
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        expertForm.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
        btn.style.display   = 'none';
        success.style.display = 'block';
      } else {
        throw new Error('failed');
      }
    } catch {
      error.style.display = 'block';
      btn.textContent = 'Send request →';
      btn.disabled    = false;
    }
  });
}

const briefForm = document.getElementById('brief-form');
if (briefForm) {
  briefForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn     = document.getElementById('brief-submit-btn');
    const success = document.getElementById('brief-success');
    const error   = document.getElementById('brief-error');

    btn.textContent = 'Sending…';
    btn.disabled    = true;
    error.style.display = 'none';

    try {
      const res = await fetch(briefForm.action, {
        method:  'POST',
        body:    new FormData(briefForm),
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        briefForm.reset(); // ← clears all fields instantly
        btn.style.display     = 'none';
        success.style.display = 'block';

        // Optional: bring the button back after 4 seconds
        // so the form can be used again
        setTimeout(() => {
          success.style.display = 'none';
          btn.style.display     = 'block';
          btn.textContent       = 'Send enquiry →';
          btn.disabled          = false;
        }, 4000);

      } else {
        throw new Error();
      }
    } catch {
      error.style.display = 'block';
      btn.textContent = 'Send enquiry →';
      btn.disabled    = false;
    }
  });
}
// ── Custom Engagement modal ──
function openConversationModal() {
  document.getElementById('conversation-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeConversationModal() {
  document.getElementById('conversation-modal').style.display = 'none';
  document.body.style.overflow = '';
}
function handleConversationBackdrop(e) {
  if (e.target === document.getElementById('conversation-modal')) {
    closeConversationModal();
  }
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeConversationModal();
});

// Form submission
const conversationForm = document.getElementById('conversation-form');
if (conversationForm) {
  conversationForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn     = document.getElementById('conversation-submit-btn');
    const success = document.getElementById('conversation-success');
    const error   = document.getElementById('conversation-error');

    btn.textContent  = 'Sending…';
    btn.disabled     = true;
    error.style.display = 'none';

    try {
      const res = await fetch(conversationForm.action, {
        method: 'POST',
        body: new FormData(conversationForm),
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        conversationForm.querySelectorAll('input,select,textarea').forEach(el => el.disabled = true);
        btn.style.display     = 'none';
        success.style.display = 'block';
      } else {
        throw new Error();
      }
    } catch {
      error.style.display  = 'block';
      btn.textContent = 'Send message →';
      btn.disabled    = false;
    }
  });
}





window.openExpertModal = openExpertModal;
window.closeExpertModal = closeExpertModal;
window.handleModalBackdropClick = handleModalBackdropClick;
window.openConversationModal = openConversationModal;
window.closeConversationModal = closeConversationModal;
window.handleConversationBackdrop = handleConversationBackdrop;
}
