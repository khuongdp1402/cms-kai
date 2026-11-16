/* ============================
   KChat Tenant Admin — Interactive JavaScript
   ============================ */

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initColorPresets();
  initChatSimulator();
  initSeedingOrdering();
  initCassoPayment();
  initOnboardingWizard();
  initPosAndAffiliate();
  initCampaignBuilder();
  initBrandGrowthOS();
  initClock();
  initSidebarToggle();
});

// === TAB NAVIGATION ===
function initTabs() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item[data-tab]');
  const quickLinks = document.querySelectorAll('[data-tab]:not(.nav-item)');
  const panes = document.querySelectorAll('.tab-pane');
  const breadcrumb = document.getElementById('currentBreadcrumb');

  const tabTitles = {
    'dashboard': 'Dashboard & Bánh Đà Tăng Trưởng',
    'brand-strategy': 'Định Vị Thương Hiệu & Lộ Trình 90 Ngày',
    'content-studio': 'Xưởng Nội Dung Đa Kênh & Video AI (MMO)',
    'website-seo': 'Website, CRO & SEO/GEO Hub',
    'channels': 'Kết Nối Đa Kênh',
    'team': 'Nhân Viên & Phân Quyền',
    'ai-bot': 'Trợ Lý AI & Dữ Liệu Bot',
    'campaigns': 'Chiến Dịch Tin Nhắn & Phễu Ads',
    'seeding': 'Dịch Vụ Seeding & Ads',
    'pos': 'Bán Hàng & Kho POS (KiotViet/Sapo)',
    'affiliate': 'Tiếp Thị Liên Kết (Affiliate)',
    'branding': 'Tùy Biến Thương Hiệu',
    'billing': 'Gói Cước & Mua Gói Lẻ',
    'settings': 'Cài Đặt Hệ Thống'
  };

  function switchTab(tabId) {
    // Update panes
    panes.forEach(pane => {
      pane.classList.remove('active');
      if (pane.id === `pane-${tabId}`) {
        pane.classList.add('active');
      }
    });

    // Update sidebar active
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.tab === tabId) {
        item.classList.add('active');
      }
    });

    // Update breadcrumb
    if (breadcrumb && tabTitles[tabId]) {
      breadcrumb.textContent = tabTitles[tabId];
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.dataset.tab;
      if (tabId) switchTab(tabId);
    });
  });

  quickLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.dataset.tab;
      if (tabId) switchTab(tabId);
    });
  });

  // Check URL hash on load
  const hash = window.location.hash.replace('#', '');
  if (hash && tabTitles[hash]) {
    switchTab(hash);
  }
}

// === WHITE-LABEL COLOR PICKER ===
function initColorPresets() {
  const presets = document.querySelectorAll('.color-preset');
  const customInput = document.getElementById('customColorInput');
  const brandLogo = document.getElementById('tenantBrandLogo');
  const brandName = document.getElementById('tenantBrandName');
  const inputBrandName = document.getElementById('inputBrandName');
  const logoPreview = document.getElementById('logoPreview');
  const saveBtn = document.getElementById('btnSaveBranding');

  presets.forEach(p => {
    p.addEventListener('click', () => {
      presets.forEach(item => {
        item.classList.remove('active');
        item.innerHTML = '';
      });
      p.classList.add('active');
      p.innerHTML = '<span class="color-check">✓</span>';

      const color = p.dataset.color;
      const bg = p.dataset.bg;
      if (color) {
        document.documentElement.style.setProperty('--primary', color);
      }
      if (bg) {
        document.documentElement.style.setProperty('--cool-blue', bg);
      }
    });
  });

  if (customInput) {
    customInput.addEventListener('input', (e) => {
      document.documentElement.style.setProperty('--primary', e.target.value);
    });
  }

  if (inputBrandName && brandName) {
    inputBrandName.addEventListener('input', (e) => {
      const val = e.target.value.trim() || 'Hana Beauty Shop';
      brandName.textContent = val;
      const initials = val.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      if (brandLogo) brandLogo.textContent = initials;
      if (logoPreview) logoPreview.textContent = initials;
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      alert('Đã lưu cấu hình thương hiệu thành công! Tên miền và giao diện đã được áp dụng.');
    });
  }
}

// === AI CHAT SIMULATOR (Connected to AgentGW + Muse/Gemini CDP :9222 + Brand Brain) ===
function initChatSimulator() {
  const simInput = document.getElementById('simInput');
  const btnSend = document.getElementById('btnSimSend');
  const simMessages = document.getElementById('simMessages');
  const personaCards = document.querySelectorAll('.radio-card');
  const saveAiBtn = document.getElementById('btnSaveAiSettings');
  const aiModelSelect = document.getElementById('aiModelSelect');
  const chatHistory = [];

  personaCards.forEach(card => {
    card.addEventListener('click', () => {
      personaCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });

  async function sendMessage() {
    if (!simInput) return;
    const text = simInput.value.trim();
    if (!text) return;

    const userMsg = document.createElement('div');
    userMsg.className = 'msg user';
    userMsg.textContent = text;
    simMessages.appendChild(userMsg);
    simInput.value = '';
    simMessages.scrollTop = simMessages.scrollHeight;

    const typingMsg = document.createElement('div');
    typingMsg.className = 'msg bot';
    const provider = aiModelSelect?.value || 'agentgw';
    typingMsg.innerHTML = `<span style="opacity:0.75;font-size:12px;">⏳ Đang gọi AI (${provider === 'muse_cdp' ? 'Muse/Gemini CDP :9222' : 'AgentGW Cloud'})...</span>`;
    simMessages.appendChild(typingMsg);
    simMessages.scrollTop = simMessages.scrollHeight;

    try {
      const res = await fetch('/api/v1/brand_growth/chat_reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant: new URLSearchParams(window.location.search).get('tenant') || 'hana',
          message: text,
          provider: provider,
          history: chatHistory.slice(-6)
        })
      });
      if (res.ok) {
        const data = await res.json();
        const replyText = data.reply || 'Dạ Hana Beauty xin nghe ạ!';
        const engineTag = data.engine || provider;
        const guardrailNote = data.guardrail_triggered
          ? `<div style="margin-top:4px;font-size:10px;color:#D97706;">🛡️ Brand Guardrail đã chặn từ cấm: ${data.blocked_phrases.join(', ')}</div>`
          : `<div style="margin-top:4px;font-size:10px;opacity:0.65;">⚡ ${engineTag} • -${data.tokens_used || 180} tokens</div>`;
        typingMsg.innerHTML = `<div>${replyText.replace(/\n/g, '<br>')}</div>${guardrailNote}`;
        chatHistory.push({ role: 'user', content: text }, { role: 'assistant', content: replyText });
        simMessages.scrollTop = simMessages.scrollHeight;
        return;
      }
    } catch (err) {
      // Fallback if offline
    }

    typingMsg.textContent = 'Dạ Hana Beauty chào chị ạ ❤️ Dòng Serum B5 phục hồi da nhạy cảm bên em đang có ưu đãi Freeship 2H hôm nay. Chị cho em xin tình trạng da hoặc SĐT Zalo để chuyên viên gửi phác đồ chi tiết nhé!';
    simMessages.scrollTop = simMessages.scrollHeight;
  }

  if (btnSend && simInput) {
    btnSend.addEventListener('click', sendMessage);
    simInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  if (saveAiBtn) {
    saveAiBtn.addEventListener('click', async () => {
      const sysPrompt = document.getElementById('aiSystemPrompt')?.value || '';
      try {
        await fetch('/api/v1/brand_growth/save_profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant: new URLSearchParams(window.location.search).get('tenant') || 'hana',
            tone: sysPrompt
          })
        });
      } catch (e) {}
      alert('Đã lưu cấu hình Mô hình AI (AgentGW / Muse CDP) và đồng bộ System Prompt vào Brand Brain!');
    });
  }
}

// === SEEDING ORDERING & ADD-ONS ===
function initSeedingOrdering() {
  const seedBtns = document.querySelectorAll('.btn-order-seed');
  const addonBtns = document.querySelectorAll('.btn-buy-addon');

  seedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const pkg = btn.dataset.pkg;
      let title = 'Gói Seeding Bình Luận Mồi FB';
      let amount = 199000;
      if (pkg === 'live-seed') {
        title = 'Gói Seeding Mắt Xem Livestream';
        amount = 350000;
      } else if (pkg === 'review-seed') {
        title = 'Gói Seeding Đánh Giá 5 Sao Shopee';
        amount = 490000;
      }
      openCassoCheckout(title, amount, 'seed');
    });
  });

  addonBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const addon = btn.dataset.addon;
      let title = 'Mua thêm 1 Agent Trực Chat';
      let amount = 50000;
      if (addon === 'ai-token') {
        title = 'Mua thêm 1.000.000 AI Token';
        amount = 100000;
      } else if (addon === 'sms') {
        title = 'Gói 5.000 Tin Nhắn ZNS / SMS';
        amount = 350000;
      } else if (addon === 'seed-credit') {
        title = 'Nạp 1.000.000 Seeding Credits';
        amount = 900000;
      }
      openCassoCheckout(title, amount, addon);
    });
  });
}

// === CASSO VIETQR AUTOMATED PAYMENT ===
let cassoCurrentOrder = null;
let cassoTimerInterval = null;

function openCassoCheckout(itemName, amount, type = 'plan') {
  const modalBackdrop = document.getElementById('cassoModalBackdrop');
  const pendingBody = document.getElementById('cassoModalPending');
  const successBody = document.getElementById('cassoModalSuccess');
  const itemNameElem = document.getElementById('cassoItemName');
  const amountElem = document.getElementById('cassoAmountText');
  const codeElem = document.getElementById('cassoTransferCode');
  const qrImg = document.getElementById('cassoQrImg');
  const countdownElem = document.getElementById('cassoCountdown');

  if (!modalBackdrop) return;

  const orderNum = Math.floor(1000 + Math.random() * 9000);
  const transferCode = `KCHAT HANA ${orderNum}`;

  cassoCurrentOrder = {
    name: itemName,
    amount: amount,
    type: type,
    orderNum: orderNum,
    code: transferCode
  };

  if (itemNameElem) itemNameElem.textContent = itemName;
  if (amountElem) amountElem.textContent = `${amount.toLocaleString('vi-VN')} đ`;
  if (codeElem) codeElem.textContent = transferCode;

  // Generate dynamic VietQR image with Casso transfer description
  if (qrImg) {
    qrImg.src = `https://img.vietqr.io/image/mbbank-0987654321-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferCode)}&accountName=CONG%20TY%20CONG%20NGHE%20KTECH`;
  }

  // Reset view
  if (pendingBody) pendingBody.style.display = 'grid';
  if (successBody) successBody.style.display = 'none';
  modalBackdrop.classList.add('active');

  // Start 15 minute countdown
  let remainingSeconds = 15 * 60;
  if (cassoTimerInterval) clearInterval(cassoTimerInterval);
  cassoTimerInterval = setInterval(() => {
    remainingSeconds--;
    if (remainingSeconds <= 0) {
      clearInterval(cassoTimerInterval);
      if (countdownElem) countdownElem.textContent = 'Hết hạn';
      return;
    }
    const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const secs = String(remainingSeconds % 60).padStart(2, '0');
    if (countdownElem) countdownElem.textContent = `${mins}:${secs}`;
  }, 1000);
}

function initCassoPayment() {
  const modalBackdrop = document.getElementById('cassoModalBackdrop');
  const btnClose = document.getElementById('btnCassoClose');
  const btnDone = document.getElementById('btnCassoDone');
  const btnSimulate = document.getElementById('btnSimulateCassoWebhook');
  const btnRenew = document.getElementById('btnRenewCurrentPlan');

  // Renew current plan buttons
  if (btnRenew) {
    btnRenew.addEventListener('click', (e) => {
      e.preventDefault();
      openCassoCheckout('Gia hạn Gói KChat Growth (1 Tháng)', 299000, 'renew');
    });
  }

  const renew1YearBtn = document.querySelector('.plan-renew-box .btn-primary');
  if (renew1YearBtn) {
    renew1YearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openCassoCheckout('Gia hạn 1 Năm Gói KChat Growth (Giảm 20%)', 2870000, 'renew');
    });
  }

  const upgradeEnterpriseBtn = document.querySelector('.plan-renew-box .btn-outline');
  if (upgradeEnterpriseBtn) {
    upgradeEnterpriseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openCassoCheckout('Nâng cấp Gói KChat Enterprise (1 Tháng)', 799000, 'upgrade');
    });
  }

  const depositSeedBtn = document.getElementById('btnDepositSeeding');
  if (depositSeedBtn) {
    depositSeedBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openCassoCheckout('Nạp 1.000.000 đ Ví Seeding Credits', 1000000, 'seed-credit');
    });
  }

  // Close handlers
  if (btnClose && modalBackdrop) {
    btnClose.addEventListener('click', () => {
      modalBackdrop.classList.remove('active');
      if (cassoTimerInterval) clearInterval(cassoTimerInterval);
    });
  }
  if (btnDone && modalBackdrop) {
    btnDone.addEventListener('click', () => {
      modalBackdrop.classList.remove('active');
      if (cassoTimerInterval) clearInterval(cassoTimerInterval);
    });
  }

  // Copy button handlers
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.copy || btn.previousElementSibling?.textContent;
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          const original = btn.textContent;
          btn.textContent = 'Đã chép! ✓';
          btn.style.background = '#ECFDF5';
          btn.style.color = '#10B981';
          setTimeout(() => {
            btn.textContent = original;
            btn.style.background = '';
            btn.style.color = '';
          }, 1500);
        });
      }
    });
  });

  // Webhook Simulation: Triggers live webhook to Rails backend
  if (btnSimulate) {
    btnSimulate.addEventListener('click', async () => {
      btnSimulate.disabled = true;
      btnSimulate.textContent = 'Đang nhận tín hiệu ngân hàng từ Casso...';

      const order = cassoCurrentOrder || {
        name: 'Gia hạn Gói KChat Growth',
        amount: 299000,
        orderNum: '9812',
        code: 'KCHAT HANA 9812',
        type: 'renew'
      };

      try {
        // Send request to Rails API simulation endpoint
        const response = await fetch('/api/v1/casso/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: order.amount,
            tenant: 'hana',
            order_id: order.orderNum
          })
        });
        const data = await response.json();
        console.log('Casso Webhook Response:', data);
      } catch (err) {
        console.warn('Backend simulate endpoint offline, running client fallback:', err);
      }

      // Success UI transition
      setTimeout(() => {
        btnSimulate.disabled = false;
        btnSimulate.textContent = '⚡️ Giả lập Casso Bắn Webhook Thành Công';
        if (cassoTimerInterval) clearInterval(cassoTimerInterval);

        const pendingBody = document.getElementById('cassoModalPending');
        const successBody = document.getElementById('cassoModalSuccess');
        const successAmount = document.getElementById('successAmount');
        const successService = document.getElementById('successService');
        const successTid = document.getElementById('successTid');

        if (successAmount) successAmount.textContent = `${order.amount.toLocaleString('vi-VN')} đ`;
        if (successService) successService.textContent = order.name;
        if (successTid) successTid.textContent = `CASSO-20261001-${order.orderNum}`;

        if (pendingBody) pendingBody.style.display = 'none';
        if (successBody) successBody.style.display = 'block';

        // Automatically update UI state
        applyPaymentSuccess(order);
      }, 700);
    });
  }
}

function applyPaymentSuccess(order) {
  // Update days left in sidebar if renewing or upgrading
  if (order.type === 'renew' || order.type === 'upgrade' || order.type === 'plan') {
    const daysElem = document.querySelector('.days-left');
    if (daysElem) daysElem.textContent = 'Còn 48 ngày (+30)';
    const dateHighlight = document.querySelector('.plan-dates .text-primary');
    if (dateHighlight) dateHighlight.textContent = '12/11/2026 (Còn 48 ngày)';
  }

  // Update AI tokens if bought
  if (order.type === 'ai-token') {
    const aiVal = document.querySelector('.pill-item .pill-val:not(.credit)');
    if (aiVal) aiVal.textContent = '1,284,500';
  }

  // Update Seeding credits if bought
  if (order.type === 'seed-credit' || order.type === 'seed') {
    const seedVal = document.querySelector('.pill-val.credit');
    if (seedVal) seedVal.textContent = '2.500.000 đ';
    const creditBox = document.querySelector('.credit-display strong');
    if (creditBox) creditBox.textContent = '2.500.000 đ';
  }

  // Add new row to Billing transaction table
  const tbody = document.querySelector('#pane-billing .data-table tbody');
  if (tbody) {
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
      <td><code>#INV-2026-${order.orderNum}</code></td>
      <td>${order.name}</td>
      <td><strong>${order.amount.toLocaleString('vi-VN')} đ</strong></td>
      <td><span style="color:#0284C7; font-weight:700;">VietQR Napas (Casso)</span></td>
      <td>${dateStr}</td>
      <td><a href="#" class="link-invoice">Tải PDF</a></td>
    `;
    tbody.insertBefore(newRow, tbody.firstChild);
  }
}

// === TIME & REFRESH ===
function initClock() {
  const timeElem = document.getElementById('liveTime');
  const refreshBtn = document.getElementById('btnRefreshData');

  function updateTime() {
    if (!timeElem) return;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    timeElem.textContent = `${hours}:${minutes}:${seconds}`;
  }

  updateTime();
  setInterval(updateTime, 1000);

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.textContent = 'Đang đồng bộ...';
      setTimeout(() => {
        refreshBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Làm mới`;
        alert('Đã làm mới dữ liệu hội thoại từ các kênh!');
      }, 500);
    });
  }
}

// === SIDEBAR TOGGLE (MOBILE) ===
function initSidebarToggle() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

// === ONBOARDING WIZARD (Phase A-06 & B-01) ===
function initOnboardingWizard() {
  const backdrop = document.getElementById('onboardingModalBackdrop');
  const btnOpen = document.getElementById('btnOpenOnboarding');
  const btnBanner = document.getElementById('btnStartWizardBanner');
  const btnClose = document.getElementById('btnCloseOnboarding');
  const btnNext = document.getElementById('btnWizardNext');
  const btnPrev = document.getElementById('btnWizardPrev');
  const btnFinish = document.getElementById('btnWizardFinish');

  let currentStep = 1;
  const totalSteps = 4;

  if (!backdrop) return;

  function openWizard() {
    backdrop.classList.add('active');
    goToStep(1);
  }

  function closeWizard() {
    backdrop.classList.remove('active');
  }

  if (btnOpen) btnOpen.addEventListener('click', openWizard);
  if (btnBanner) btnBanner.addEventListener('click', openWizard);
  if (btnClose) btnClose.addEventListener('click', closeWizard);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeWizard();
  });

  // Step pane switching
  function goToStep(step) {
    currentStep = step;

    for (let i = 1; i <= totalSteps; i++) {
      const pane = document.getElementById(`wizardPane-${i}`);
      const node = document.getElementById(`stepNode-${i}`);
      const line = document.getElementById(`stepLine-${i}`);

      if (pane) pane.classList.toggle('active', i === currentStep);

      if (node) {
        node.classList.remove('active', 'completed');
        if (i < currentStep) node.classList.add('completed');
        else if (i === currentStep) node.classList.add('active');
      }

      if (line) {
        line.classList.toggle('completed', i < currentStep);
      }
    }

    // Prev / Next button state
    if (btnPrev) btnPrev.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
    if (btnNext) btnNext.style.display = currentStep === totalSteps ? 'none' : 'inline-block';
    if (btnFinish) btnFinish.style.display = currentStep === totalSteps ? 'inline-block' : 'none';
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (currentStep < totalSteps) {
        // Step 1: save shop name
        if (currentStep === 1) {
          const shopInput = document.getElementById('wizardInputShopName');
          if (shopInput && shopInput.value.trim()) {
            const name = shopInput.value.trim();
            const brandName = document.getElementById('tenantBrandName');
            const logo = document.getElementById('tenantBrandLogo');
            if (brandName) brandName.textContent = name;
            if (logo) logo.textContent = name.substring(0, 2).toUpperCase();
          }
        }
        goToStep(currentStep + 1);
      }
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentStep > 1) goToStep(currentStep - 1);
    });
  }

  if (btnFinish) {
    btnFinish.addEventListener('click', () => {
      closeWizard();
      const banner = document.querySelector('.welcome-wizard-card');
      if (banner) {
        banner.innerHTML = `
          <div style="display:flex; align-items:center; gap:14px;">
            <span style="font-size:24px; color:#10B981;">✓</span>
            <div>
              <strong style="color:var(--text); font-size:14px;">Đã hoàn thành thiết lập khởi tạo!</strong>
              <p style="font-size:12px; color:var(--text-muted); margin:0;">Cửa hàng đã sẵn sàng đón khách hàng và trả lời tự động qua AI.</p>
            </div>
          </div>
          <button class="btn btn-sm btn-outline" id="btnReopenWizard" style="font-size:12px;">Thiết lập lại</button>
        `;
        document.getElementById('btnReopenWizard')?.addEventListener('click', openWizard);
      }
      alert('Chúc mừng! Cửa hàng của bạn đã hoàn tất thiết lập ban đầu thành công.');
    });
  }

  // Channel cards selection
  document.querySelectorAll('.channel-select-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.channel-select-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });

  // Persona cards selection
  document.querySelectorAll('.persona-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.persona-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });
}

// === POS & AFFILIATE INTERACTIONS (Phase D-03 & C-05) ===
function initPosAndAffiliate() {
  // POS Order Calculation
  const prodSelect = document.getElementById('orderProductSelect');
  const carrierSelect = document.getElementById('orderCarrierSelect');
  const totalText = document.getElementById('orderTotalText');
  const btnCreateOrder = document.getElementById('btnCreateOrderGHTK');
  const resultBox = document.getElementById('orderSuccessResult');

  function recalcOrder() {
    if (!prodSelect || !carrierSelect || !totalText) return;
    const prodPrice = parseInt(prodSelect.value) || 0;
    const shipPrice = parseInt(carrierSelect.value) || 0;
    const total = prodPrice + shipPrice;
    totalText.textContent = `${total.toLocaleString('vi-VN')} đ`;
  }

  if (prodSelect) prodSelect.addEventListener('change', recalcOrder);
  if (carrierSelect) carrierSelect.addEventListener('change', recalcOrder);

  if (btnCreateOrder) {
    btnCreateOrder.addEventListener('click', () => {
      btnCreateOrder.disabled = true;
      btnCreateOrder.textContent = '⏳ Đang đồng bộ kho KiotViet & Đẩy GHTK...';

      setTimeout(() => {
        btnCreateOrder.disabled = false;
        btnCreateOrder.textContent = '⚡️ Tạo Đơn & Đẩy Mã Vận Đơn Sang GHTK';
        if (resultBox) {
          resultBox.style.display = 'block';
          resultBox.scrollIntoView({ behavior: 'smooth' });
        }
      }, 700);
    });
  }

  // Affiliate copy link
  const btnCopyAff = document.getElementById('btnCopyAffiliateLink');
  const affInput = document.getElementById('affiliateLinkInput');
  if (btnCopyAff && affInput) {
    btnCopyAff.addEventListener('click', () => {
      navigator.clipboard?.writeText(affInput.value).catch(() => {});
      const orig = btnCopyAff.textContent;
      btnCopyAff.textContent = 'Đã chép link!';
      setTimeout(() => { btnCopyAff.textContent = orig; }, 1500);
    });
  }

  // Payout request button
  const btnPayout = document.getElementById('btnRequestPayout');
  if (btnPayout) {
    btnPayout.addEventListener('click', () => {
      btnPayout.disabled = true;
      btnPayout.textContent = 'Đang xử lý...';
      setTimeout(() => {
        btnPayout.disabled = false;
        btnPayout.textContent = 'Tạo Yêu Cầu Rút Tiền Ngay';
        alert('Yêu cầu rút 374.000 đ đã được gửi đến ban quản trị! Tiền sẽ được chuyển khoản qua Casso VietQR trong 15-30 phút.');
      }, 600);
    });
  }

  // Sync POS button
  const btnSync = document.getElementById('btnSyncPos');
  if (btnSync) {
    btnSync.addEventListener('click', () => {
      btnSync.textContent = 'Đang đồng bộ...';
      setTimeout(() => {
        btnSync.textContent = 'Đồng Bộ Tồn Kho Ngay';
        alert('Đã đồng bộ thành công 142 mã sản phẩm từ KiotViet (Chi nhánh Quận 1)!');
      }, 700);
    });
  }
}

// === CAMPAIGN BUILDER (Phase C-06) ===
function initCampaignBuilder() {
  const tplSelect = document.getElementById('campTemplateSelect');
  const audSelect = document.getElementById('campAudienceSelect');
  const previewText = document.getElementById('phonePreviewText');
  const contentArea = document.getElementById('campContentPreview');
  const costEst = document.getElementById('campCostEst');
  const btnSend = document.getElementById('btnSendCampaign');

  const templates = {
    'order_success': 'Chào {{customer_name}}, đơn hàng #HN8921 của bạn đã được đóng gói và gửi qua GHTK. Dự kiến giao trong 1-2 ngày. Cảm ơn bạn!',
    'birthday_gift': 'Chào {{customer_name}}, Hana Beauty gửi tặng bạn mã giảm 20% toàn bộ sản phẩm trị mụn nhân dịp sinh nhật. Mã: HANA20, áp dụng đến hết tuần này!',
    'cart_recovery': 'Chào {{customer_name}}, combo dưỡng trắng da trong giỏ hàng của bạn đang được freeship hôm nay! Bấm để nhận ưu đãi ngay nhé.'
  };

  const audienceCounts = {
    'vip': 180,
    'inactive': 450,
    'all': 1240
  };

  function updateCampaign() {
    if (!tplSelect || !audSelect) return;
    const tplKey = tplSelect.value;
    const audKey = audSelect.value;
    const text = templates[tplKey] || templates['birthday_gift'];
    const count = audienceCounts[audKey] || 180;
    const cost = count * 120; // 120d/ZNS

    if (contentArea) contentArea.value = text;
    if (previewText) previewText.innerHTML = text.replace('{{customer_name}}', '<strong>Nguyễn Thu Hà</strong>').replace('HANA20', '<strong>HANA20</strong>');
    if (costEst) costEst.textContent = `${cost.toLocaleString('vi-VN')} đ`;
  }

  if (tplSelect) tplSelect.addEventListener('change', updateCampaign);
  if (audSelect) audSelect.addEventListener('change', updateCampaign);

  if (btnSend) {
    btnSend.addEventListener('click', () => {
      btnSend.disabled = true;
      btnSend.textContent = '⏳ Đang bắn chiến dịch qua Zalo ZNS...';
      setTimeout(() => {
        btnSend.disabled = false;
        btnSend.textContent = '🚀 Kích Hoạt & Bắn Chiến Dịch Ngay';
        alert('Chiến dịch đã được gửi thành công đến danh sách khách hàng! Tỷ lệ gửi thành công: 99.8%.');
      }, 900);
    });
  }
}

// === BRAND GROWTH OS (5-Stage Workflow + MMO Video Engine + Guardrails) ===
function initBrandGrowthOS() {
  // 1. 90-Day Roadmap Checkboxes
  const roadmapChecks = document.querySelectorAll('.roadmap-check');
  const progressBar = document.getElementById('roadmapProgressBar');
  const progressBadge = document.getElementById('roadmapProgressBadge');
  const dashRoadmapPct = document.getElementById('dashRoadmapPct');

  function recalcRoadmapProgress() {
    if (!roadmapChecks.length) return;
    let checked = 0;
    roadmapChecks.forEach(c => { if (c.checked) checked++; });
    const pct = Math.round((checked / roadmapChecks.length) * 100);
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (progressBadge) progressBadge.textContent = `${pct}% Hoàn thành`;
    if (dashRoadmapPct) dashRoadmapPct.textContent = `${pct}%`;
  }

  roadmapChecks.forEach(chk => {
    chk.addEventListener('change', recalcRoadmapProgress);
  });

  // 2. Brand Brain Sync & Competitor Radar Scan (Persisted to Backend State)
  const btnSyncBrain = document.getElementById('btnSyncBrandBrain');
  const posInput = document.getElementById('brandPositioningInput');
  const uspInput = document.getElementById('brandUspInput');
  const bansInput = document.getElementById('brandHardBansInput');

  // Load saved Brand Brain on startup
  fetch(`/api/v1/brand_growth/overview?tenant=${encodeURIComponent(new URLSearchParams(window.location.search).get('tenant') || 'hana')}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data || !data.brand_profile) return;
      const bp = data.brand_profile;
      if (posInput && bp.positioning) posInput.value = bp.positioning;
      if (uspInput && bp.usp) uspInput.value = bp.usp;
      if (bansInput && Array.isArray(bp.hard_bans)) bansInput.value = bp.hard_bans.join(', ');
    })
    .catch(() => {});

  if (btnSyncBrain) {
    btnSyncBrain.addEventListener('click', async () => {
      btnSyncBrain.disabled = true;
      btnSyncBrain.textContent = '⏳ Đang lưu & đồng bộ Brand Brain...';
      try {
        await fetch('/api/v1/brand_growth/save_profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant: new URLSearchParams(window.location.search).get('tenant') || 'hana',
            positioning: posInput?.value || '',
            usp: uspInput?.value || '',
            hard_bans: bansInput?.value || ''
          })
        });
      } catch (e) {}
      setTimeout(() => {
        btnSyncBrain.disabled = false;
        btnSyncBrain.textContent = '✓ Đã Lưu & Đồng Bộ Brand Brain';
        alert('Đã lưu Định vị, USP và Danh sách Từ vựng cấm vào cơ sở dữ liệu! Toàn bộ AI Content Engine, Video MMO & KChat Bot sẽ áp dụng ngay lập tức.');
      }, 400);
    });
  }

  const btnScanComp = document.getElementById('btnScanCompetitors');
  if (btnScanComp) {
    btnScanComp.addEventListener('click', () => {
      btnScanComp.disabled = true;
      btnScanComp.textContent = '⏳ Đang quét Meta & TikTok Ads Library...';
      setTimeout(() => {
        btnScanComp.disabled = false;
        btnScanComp.textContent = '🔍 Quét Ads Library Đối Thủ';
        alert('Đã cập nhật dữ liệu 3 đối thủ từ Meta Ad Library & TikTok Creative Center! Phát hiện đối thủ SkinLab vừa tăng 6 mẫu video KOC mới.');
      }, 700);
    });
  }

  // 3. 1-to-10 Repurposing Engine & MMO Video Job Creation
  const btnRunRepurpose = document.getElementById('btnRunRepurpose');
  const mmoApprovalTable = document.getElementById('mmoApprovalTable');
  const previewBox = document.getElementById('repurposePreviewBox');

  if (btnRunRepurpose) {
    btnRunRepurpose.addEventListener('click', async () => {
      const topic = document.getElementById('mmoTopicInput')?.value?.trim() || 'Phác đồ phục hồi da B5 trong 14 ngày';
      const region = document.getElementById('mmoRegionSelect')?.value || 'VN';
      const videoMode = document.getElementById('mmoVideoModeSelect')?.value || 'mode_3';

      btnRunRepurpose.disabled = true;
      btnRunRepurpose.textContent = '⏳ Đang bóc tách 1-ra-10 & sinh kịch bản chia cảnh...';

      let jobData = null;
      try {
        const res = await fetch('/api/v1/brand_growth/repurpose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant: 'hana', topic, region, video_mode: videoMode })
        });
        if (res.ok) jobData = await res.json();
      } catch (err) {
        // Offline client fallback
      }

      const jobId = jobData?.job_id || `MMO-${region}-1028-${Math.floor(600 + Math.random() * 390)}`;
      const modeNames = {
        'mode_1': 'Mode 1: Parallax 2.5D',
        'mode_2': 'Mode 2: Mascot Dex Lip-sync',
        'mode_3': 'Mode 3: Muse.ai CDP'
      };
      const modeLabel = modeNames[videoMode] || 'Mode 3: Muse.ai CDP';

      setTimeout(() => {
        btnRunRepurpose.disabled = false;
        btnRunRepurpose.textContent = '🎬 Bóc Tách 1-Ra-10 & Tạo Job Video (Đưa Vào Hàng Đợi Duyệt)';

        if (previewBox) {
          previewBox.innerHTML = `
            <div style="padding: 10px 12px; border-radius: 8px; background: var(--bg-surface); border-left: 3px solid #1E5EFF;">
              <strong>🎥 3 Kịch bản Short Video (${jobId} • ${modeLabel}):</strong>
              <ul style="margin: 6px 0 0 16px; color: var(--text-secondary); line-height: 1.5;">
                <li><strong>Video 1 (Pain-Agitate-Solve):</strong> Hook 3s: <em>"Dừng ngay việc tốn tiền vô ích nếu chưa biết nguyên tắc ${topic} này!"</em></li>
                <li><strong>Video 2 (Chuyên gia phân tích):</strong> Phân tích cơ chế khoa học & so sánh trực quan.</li>
                <li><strong>Video 3 (Social Proof):</strong> Kết quả thực tế sau 14 ngày + Cam kết hoàn tiền 7 ngày.</li>
              </ul>
            </div>
            <div style="padding: 10px 12px; border-radius: 8px; background: var(--bg-surface); border-left: 3px solid #0891B2;">
              <strong>🖼️ 1 Bộ Ảnh Trượt Carousel (Instagram / Facebook - 7 trang):</strong>
              <div style="color: var(--text-secondary); margin-top: 4px;">Cẩm nang lưu trữ: <em>"Tóm tắt ${topic} trên 1 trang giấy"</em>.</div>
            </div>
            <div style="padding: 10px 12px; border-radius: 8px; background: var(--bg-surface); border-left: 3px solid #059669;">
              <strong>💬 2 Bài Thảo Luận Cộng Đồng + 1 Bài Chuẩn SEO/GEO:</strong>
              <div style="color: var(--text-secondary); margin-top: 4px;">Đã kiểm tra qua <strong>Brand Brain Hard Bans</strong> (0 từ vi phạm) • Sẵn sàng chờ duyệt Bước 1.</div>
            </div>
          `;
        }

        const tbody = mmoApprovalTable?.querySelector('tbody');
        if (tbody) {
          const tr = document.createElement('tr');
          tr.dataset.jobId = jobId;
          tr.innerHTML = `
            <td><code>${jobId}</code></td>
            <td>
              <strong>${topic}</strong>
              <div style="font-size: 11px; color: var(--text-muted);">3 Video 9:16 (${region}) + 1 Carousel IG + 2 Post Group</div>
            </td>
            <td><span style="font-size: 11px; font-weight: 700; color: #1E5EFF;">40% Giáo dục</span></td>
            <td>${modeLabel}</td>
            <td class="job-status-cell"><span style="font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; background: rgba(245,158,11,0.15); color: #D97706;">⏳ Bước 1: Chờ duyệt Kịch bản (Khóa API)</span></td>
            <td class="job-action-cell">
              <button class="btn btn-xs btn-primary btn-approve-mmo" data-job="${jobId}" data-stage="approve_script">✓ Duyệt Kịch Bản &amp; Render</button>
            </td>
          `;
          tbody.insertBefore(tr, tbody.firstChild);
          bindMmoApprovalButton(tr.querySelector('.btn-approve-mmo'));
        }
      }, 600);
    });
  }

  // 4. Human-in-the-Loop 2-Stage Approval Gate Buttons
  function bindMmoApprovalButton(btn) {
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const jobId = btn.dataset.job;
      const stage = btn.dataset.stage;
      const row = btn.closest('tr');
      const statusCell = row?.querySelector('.job-status-cell');
      const actionCell = row?.querySelector('.job-action-cell');

      btn.disabled = true;
      btn.textContent = '⏳ Đang xử lý...';

      try {
        await fetch('/api/v1/brand_growth/approve_job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant: 'hana', job_id: jobId, stage })
        });
      } catch (err) {
        // Offline client fallback
      }

      setTimeout(() => {
        if (stage === 'approve_script') {
          if (statusCell) {
            statusCell.innerHTML = `<span style="font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; background: rgba(30,94,255,0.12); color: var(--primary);">🎬 Bước 2: Đã Render 9:16 • Chờ duyệt Đăng</span>`;
          }
          if (actionCell) {
            actionCell.innerHTML = `<button class="btn btn-xs btn-primary btn-approve-mmo" style="background: #059669; border-color: #059669;" data-job="${jobId}" data-stage="approve_publish">🚀 Duyệt Đăng 4 Kênh + Auto-Seeding</button>`;
            bindMmoApprovalButton(actionCell.querySelector('.btn-approve-mmo'));
          }
        } else {
          if (statusCell) {
            statusCell.innerHTML = `<span class="badge-success">✓ Đã xuất bản 4 kênh &amp; Đang Seeding 30p đầu</span>`;
          }
          if (actionCell) {
            actionCell.innerHTML = `<span style="font-size: 11px; font-weight: 700; color: #059669;">Hoàn tất ✓</span>`;
          }
        }
      }, 550);
    });
  }

  document.querySelectorAll('.btn-approve-mmo').forEach(bindMmoApprovalButton);

  // 5. Website CRO Audit, Server-Side CAPI Test & SEO/GEO Article Generator
  const btnTestCapi = document.getElementById('btnTestCapiEvent');
  if (btnTestCapi) {
    btnTestCapi.addEventListener('click', () => {
      btnTestCapi.disabled = true;
      btnTestCapi.textContent = '⏳ Đang bắn sự kiện Server-side CAPI...';
      setTimeout(() => {
        btnTestCapi.disabled = false;
        btnTestCapi.textContent = '🔄 Test Bắn Sự Kiện Purchase CAPI';
        alert('Đã bắn thử nghiệm sự kiện Purchase (480.000đ) qua Meta Conversions API & TikTok Events API thành công! Điểm khớp dữ liệu (EMQ): 9.4/10.');
      }, 600);
    });
  }

  const btnRunCro = document.getElementById('btnRunCroAudit');
  if (btnRunCro) {
    btnRunCro.addEventListener('click', () => {
      btnRunCro.disabled = true;
      btnRunCro.textContent = '⏳ Đang kiểm toán 5-Second Test & Core Web Vitals...';
      setTimeout(() => {
        btnRunCro.disabled = false;
        btnRunCro.textContent = '⚡ Chạy Kiểm Toán 5-Second Test & CRO';
        const scoreEl = document.getElementById('croScoreVal');
        if (scoreEl) scoreEl.innerHTML = '96<span class="kpi-unit">/100</span>';
        alert('Kiểm toán hoàn tất: Trang đích đạt 96/100 điểm 5-Second Test, LCP 1.7s, KChat Live Widget & VietQR Casso phản hồi tức thì!');
      }, 650);
    });
  }

  const btnAddSeo = document.getElementById('btnAddSeoArticle');
  const seoTable = document.getElementById('seoClusterTable');
  if (btnAddSeo && seoTable) {
    btnAddSeo.addEventListener('click', () => {
      btnAddSeo.disabled = true;
      btnAddSeo.textContent = '⏳ Đang sinh bài SEO/GEO + Schema JSON-LD...';
      setTimeout(() => {
        btnAddSeo.disabled = false;
        btnAddSeo.textContent = '+ Sinh Bài Chuẩn SEO/GEO Mới';
        const tbody = seoTable.querySelector('tbody');
        if (tbody) {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>
              <strong>Hướng dẫn 3 bước phục hồi hàng rào bảo vệ da chuẩn Bác sĩ Da liễu (2026)</strong>
              <div style="font-size: 11px; color: var(--text-muted);"><code>/blog/3-buoc-phuc-hoi-hang-rao-bao-ve-da-2026</code></div>
            </td>
            <td><span style="font-size: 11px; font-weight: 700; color: #1E5EFF;">Informational + GEO</span></td>
            <td><code>Article</code>, <code>FAQPage</code>, <code>HowTo</code></td>
            <td><strong style="color: var(--primary);">Đã Index</strong></td>
            <td><span class="badge-success">Chuẩn cấu trúc trích dẫn AI Overview</span></td>
            <td><strong>Mới xuất bản</strong></td>
          `;
          tbody.insertBefore(tr, tbody.firstChild);
        }
      }, 600);
    });
  }

  // 6. Full-Funnel Ads Automated Guardrails (Scale +20% / Auto-Kill)
  document.querySelectorAll('.btn-ad-guardrail').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const campId = btn.dataset.camp;
      const row = btn.closest('tr');
      const budgetCell = row?.querySelector('.ad-budget-cell');

      btn.disabled = true;
      btn.textContent = '⏳ Đang thực thi...';

      try {
        await fetch('/api/v1/brand_growth/ads_guardrail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant: 'hana', campaign_id: campId, rule_action: action })
        });
      } catch (err) {
        // Offline client fallback
      }

      setTimeout(() => {
        if (action === 'scale_budget') {
          const baseBudget = parseInt(btn.dataset.budget || '300000', 10);
          const newBudget = Math.round(baseBudget * 1.2);
          if (budgetCell) {
            budgetCell.innerHTML = `<strong style="color: #059669;">${newBudget.toLocaleString('vi-VN')} đ (+20%)</strong>`;
          }
          btn.textContent = 'Đã Scale +20% ✓';
          btn.className = 'btn btn-xs btn-outline';
          btn.style.color = '#059669';
          btn.style.borderColor = '#059669';
        } else if (action === 'auto_kill') {
          btn.textContent = 'Đã Tắt Cắt Lỗ 🛡️';
          btn.className = 'btn btn-xs btn-outline';
          if (budgetCell) {
            budgetCell.innerHTML = `<span style="text-decoration: line-through; color: var(--text-muted);">200.000 đ</span> <strong style="color: #DC2626;">(Đã dừng)</strong>`;
          }
        }
      }, 500);
    });
  });
}
