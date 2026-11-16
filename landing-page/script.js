/* ========================================
   KChat Landing Page — Interactive Scripts
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  // === Navbar scroll effect ===
  const navbar = document.getElementById('navbar');
  const handleScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });

  // === Mobile menu toggle ===
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
      mobileMenuBtn.classList.toggle('active');
    });
  }

  // === Pricing toggle (Monthly ↔ Yearly) ===
  const pricingToggle = document.getElementById('pricingToggle');
  const monthlyLabel = document.getElementById('monthlyLabel');
  const yearlyLabel = document.getElementById('yearlyLabel');
  let isYearly = false;

  if (pricingToggle) {
    pricingToggle.addEventListener('click', () => {
      isYearly = !isYearly;
      pricingToggle.classList.toggle('active', isYearly);
      monthlyLabel.classList.toggle('active', !isYearly);
      yearlyLabel.classList.toggle('active', isYearly);

      document.querySelectorAll('.monthly-price').forEach(el => {
        el.style.display = isYearly ? 'none' : '';
      });
      document.querySelectorAll('.yearly-price').forEach(el => {
        el.style.display = isYearly ? '' : 'none';
      });
    });
  }

  // === Animated counters ===
  const animateCounters = () => {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'));
      const duration = 2000;
      const startTime = performance.now();

      const updateCounter = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(target * eased);
        counter.textContent = current.toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          counter.textContent = target.toLocaleString();
        }
      };

      requestAnimationFrame(updateCounter);
    });
  };

  // === Intersection Observer for animations ===
  const observerOptions = { threshold: 0.15, rootMargin: '0px 0px -50px 0px' };
  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        
        // Trigger counter animation when hero stats become visible
        if (entry.target.classList.contains('hero-stats')) {
          animateCounters();
        }
        
        fadeObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe elements for fade-in animation
  const animElements = document.querySelectorAll(
    '.pain-card, .feature-card, .channel-card, .ai-feature, ' +
    '.price-card, .addon-item, .hero-stats, .ai-chat-demo, ' +
    '.comparison-table, .cta-card'
  );
  
  animElements.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = `opacity 0.6s cubic-bezier(0.4,0,0.2,1) ${i % 6 * 0.08}s, transform 0.6s cubic-bezier(0.4,0,0.2,1) ${i % 6 * 0.08}s`;
    fadeObserver.observe(el);
  });

  // CSS class for visible state
  const style = document.createElement('style');
  style.textContent = `
    .visible { opacity: 1 !important; transform: translateY(0) !important; }
    .nav-links.mobile-open {
      display: flex !important;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      flex-direction: column;
      background: rgba(10,10,15,0.98);
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      gap: 16px;
    }
    .mobile-menu-btn.active span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
    .mobile-menu-btn.active span:nth-child(2) { opacity: 0; }
    .mobile-menu-btn.active span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }
  `;
  document.head.appendChild(style);

  // === Smooth scroll for anchor links ===
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const navHeight = navbar.offsetHeight;
        const targetPos = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
        window.scrollTo({ top: targetPos, behavior: 'smooth' });
        
        // Close mobile menu if open
        navLinks.classList.remove('mobile-open');
        mobileMenuBtn.classList.remove('active');
      }
    });
  });

  // === Typing effect for AI demo ===
  const aiMessages = document.querySelectorAll('.ai-msg');
  aiMessages.forEach((msg, index) => {
    const aiObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          msg.style.opacity = '0';
          msg.style.transform = 'translateY(16px)';
          msg.style.transition = `all 0.5s ease ${index * 0.4}s`;
          
          requestAnimationFrame(() => {
            msg.style.opacity = '1';
            msg.style.transform = 'translateY(0)';
          });
          
          aiObserver.unobserve(msg);
        }
      });
    }, { threshold: 0.3 });
    
    aiObserver.observe(msg);
  });

  // === Casso VietQR Subscription Checkout (Landing Page) ===
  initLandingCassoCheckout();
});

function initLandingCassoCheckout() {
  const backdrop = document.getElementById('landingCassoModalBackdrop');
  const closeBtn = document.getElementById('btnLandingCassoClose');
  const checkoutBtns = document.querySelectorAll('.btn-plan-checkout');

  const pendingBody = document.getElementById('landingCassoModalPending');
  const successBody = document.getElementById('landingCassoModalSuccess');

  const planNameElem = document.getElementById('landingSelectedPlanName');
  const amountElem = document.getElementById('landingAmountText');
  const qrImg = document.getElementById('landingCassoQrImg');
  const transferCodeElem = document.getElementById('landingTransferCode');
  const shopNameInput = document.getElementById('landingShopName');
  const copyBtn = document.getElementById('btnCopyTransferCode');
  const countdownElem = document.getElementById('landingCassoCountdown');
  const btnSimulate = document.getElementById('btnSimulateLandingCasso');

  let activeOrder = {
    plan: 'growth',
    name: 'Gói Growth',
    amount: 299000,
    slug: 'MIU',
    orderId: '7731'
  };

  let timerInterval = null;

  function startCountdown(seconds) {
    if (timerInterval) clearInterval(timerInterval);
    let remaining = seconds;
    function render() {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      if (countdownElem) countdownElem.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if (remaining <= 0) {
        clearInterval(timerInterval);
        if (countdownElem) countdownElem.textContent = 'Hết hạn';
      }
      remaining--;
    }
    render();
    timerInterval = setInterval(render, 1000);
  }

  function updateOrderInfo() {
    const rawShop = (shopNameInput && shopNameInput.value.trim()) ? shopNameInput.value.trim() : 'Shop';
    const slug = rawShop.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'KTECH';
    activeOrder.slug = slug;

    const fullCode = `KCHAT ${slug} ${activeOrder.orderId}`;
    if (transferCodeElem) transferCodeElem.textContent = fullCode;
    if (copyBtn) copyBtn.dataset.copy = fullCode;

    // VietQR URL
    const qrUrl = `https://img.vietqr.io/image/mbbank-0987654321-compact2.png?amount=${activeOrder.amount}&addInfo=${encodeURIComponent(fullCode)}&accountName=CONG%20TY%20CONG%20NGHE%20KTECH`;
    if (qrImg) qrImg.src = qrUrl;
  }

  if (shopNameInput) {
    shopNameInput.addEventListener('input', updateOrderInfo);
  }

  checkoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const plan = btn.dataset.plan || 'growth';
      const name = btn.dataset.name || 'Gói Growth';
      let amount = parseInt(btn.dataset.amount);
      if (isNaN(amount)) amount = 299000;

      activeOrder = {
        plan: plan,
        name: name,
        amount: amount,
        slug: 'MIU',
        orderId: Math.floor(1000 + Math.random() * 9000).toString()
      };

      if (planNameElem) planNameElem.textContent = name;
      if (amountElem) amountElem.textContent = `${amount.toLocaleString('vi-VN')} đ`;

      updateOrderInfo();
      startCountdown(15 * 60);

      if (pendingBody) pendingBody.style.display = 'grid';
      if (successBody) successBody.style.display = 'none';
      if (backdrop) backdrop.classList.add('active');
    });
  });

  if (closeBtn && backdrop) {
    closeBtn.addEventListener('click', () => {
      backdrop.classList.remove('active');
      if (timerInterval) clearInterval(timerInterval);
    });

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('active');
        if (timerInterval) clearInterval(timerInterval);
      }
    });
  }

  // Copy buttons
  document.querySelectorAll('#landingCassoModal .btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.copy || btn.previousElementSibling?.textContent;
      if (text) {
        navigator.clipboard?.writeText(text).catch(() => {});
        const orig = btn.textContent;
        btn.textContent = 'Đã chép!';
        setTimeout(() => { btn.textContent = orig; }, 1500);
      }
    });
  });

  // Casso Simulate Webhook Test
  if (btnSimulate) {
    btnSimulate.addEventListener('click', async () => {
      btnSimulate.disabled = true;
      btnSimulate.textContent = '⏳ Đang bắn Webhook Casso...';

      try {
        await fetch('/api/v1/casso/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: activeOrder.amount,
            tenant: activeOrder.slug.toLowerCase(),
            order_id: activeOrder.orderId
          })
        });
      } catch (err) {
        console.warn('Backend simulate offline, fallback client success:', err);
      }

      setTimeout(() => {
        btnSimulate.disabled = false;
        btnSimulate.textContent = '⚡️ Giả lập Casso Bắn Webhook Kích Hoạt';
        if (timerInterval) clearInterval(timerInterval);

        const shopName = shopNameInput ? shopNameInput.value.trim() : 'Miu Fashion';
        document.getElementById('landingSuccessShopName').textContent = shopName;
        document.getElementById('landingSuccessOrderId').textContent = `KCHAT-${activeOrder.slug}-${activeOrder.orderId}`;
        document.getElementById('landingSuccessPlan').textContent = `${activeOrder.name} (+30 ngày)`;

        if (pendingBody) pendingBody.style.display = 'none';
        if (successBody) successBody.style.display = 'block';
      }, 700);
    });
  }
}

// === Register PWA Service Worker ===
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('KChat PWA ServiceWorker registered with scope:', registration.scope);
      },
      (err) => {
        console.log('KChat ServiceWorker registration skipped:', err);
      }
    );
  });
}

