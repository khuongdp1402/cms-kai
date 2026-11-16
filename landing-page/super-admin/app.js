/* KChat Super Admin — Interactive Scripts */

document.addEventListener('DOMContentLoaded', () => {
  // === Theme switcher (Dark / Light Mode) ===
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('kchat_super_admin_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('kchat_super_admin_theme', nextTheme);
    });
  }

  // === Page Routing / Navigation ===
  const navItems = document.querySelectorAll('.nav-item[data-page]');
  const pages = document.querySelectorAll('.page-content');
  const breadcrumbActive = document.querySelector('.breadcrumb-item.active');
  
  const pageMap = {
    'dashboard': 'dashboardPage',
    'analytics': 'analyticsPage',
    'tenants': 'tenantsPage',
    'affiliates': 'affiliatesPage',
    'plans': 'plansPage',
    'billing': 'billingPage',
    'ai-pool': 'aiPoolPage',
    'channels': 'channelsPage',
    'seeding': 'seedingPage',
    'settings': 'settingsPage'
  };

  const pageTitles = {
    'dashboard': 'Dashboard',
    'analytics': 'Phân tích & Tăng trưởng',
    'tenants': 'Quản lý Tenant',
    'affiliates': 'Tiếp thị liên kết (Affiliate)',
    'plans': 'Cấu hình Gói cước',
    'billing': 'Thanh toán & Cổng Casso',
    'ai-pool': 'AI Gateway & Model Pool',
    'channels': 'Kênh tích hợp & Bridge',
    'seeding': 'Ads & Seeding Marketplace',
    'settings': 'Cài đặt hệ thống'
  };

  function switchPage(pageKey, updateHash = true) {
    const targetId = pageMap[pageKey] || 'dashboardPage';
    pages.forEach(p => {
      p.style.display = (p.id === targetId) ? 'block' : 'none';
    });

    navItems.forEach(n => {
      if (n.dataset.page === pageKey) {
        n.classList.add('active');
      } else {
        n.classList.remove('active');
      }
    });

    if (breadcrumbActive && pageTitles[pageKey]) {
      breadcrumbActive.textContent = pageTitles[pageKey];
    }

    if (updateHash && window.location.hash !== `#${pageKey}`) {
      history.pushState(null, '', `#${pageKey}`);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const pageKey = item.dataset.page;
      if (pageKey) switchPage(pageKey);
    });
  });

  // Handle Initial Hash on Load & Hash Changes
  function handleHash() {
    const hash = window.location.hash.replace('#', '').trim();
    if (hash && pageMap[hash]) {
      switchPage(hash, false);
    }
  }
  handleHash();
  window.addEventListener('hashchange', handleHash);

  // === Sidebar toggle (mobile) ===
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // === Animate KPI values on load ===
  const animateValue = (element, target, suffix = '', duration = 1500) => {
    const startTime = performance.now();
    const isFloat = target % 1 !== 0;
    const updateFn = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      let current;
      if (isFloat) {
        current = (target * eased).toFixed(1);
      } else {
        current = Math.floor(target * eased);
        current = current.toLocaleString();
      }
      
      element.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(updateFn);
    };
    requestAnimationFrame(updateFn);
  };

  // === Intersection Observer for cards ===
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  // Animate cards on scroll
  document.querySelectorAll('.kpi-card, .chart-card, .table-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(16px)';
    card.style.transition = `opacity 0.5s ease ${i * 0.08}s, transform 0.5s ease ${i * 0.08}s`;
    observer.observe(card);
  });

  // === Bar chart hover tooltip ===
  document.querySelectorAll('.bar').forEach(bar => {
    bar.addEventListener('mouseenter', () => {
      bar.style.filter = 'brightness(1.3)';
    });
    bar.addEventListener('mouseleave', () => {
      bar.style.filter = '';
    });
  });

  // === Donut chart animation ===
  const donutSegments = document.querySelectorAll('.donut-segment');
  donutSegments.forEach((seg, i) => {
    const dasharray = seg.getAttribute('stroke-dasharray');
    seg.setAttribute('stroke-dasharray', '0 502.4');
    setTimeout(() => {
      seg.setAttribute('stroke-dasharray', dasharray);
    }, 300 + i * 200);
  });

  // === Table row hover ===
  document.querySelectorAll('.data-table tbody tr').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
      // In a real app, this would navigate to tenant detail
      const name = row.querySelector('.tenant-name')?.textContent;
      if (name) {
        console.log(`Navigate to tenant: ${name}`);
      }
    });
  });

  // === Search functionality ===
  const tenantSearch = document.getElementById('tenantSearch');
  if (tenantSearch) {
    tenantSearch.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.data-table tbody tr').forEach(row => {
        const name = row.querySelector('.tenant-name')?.textContent.toLowerCase() || '';
        const domain = row.querySelector('.tenant-domain')?.textContent.toLowerCase() || '';
        row.style.display = (name.includes(query) || domain.includes(query)) ? '' : 'none';
      });
    });
  }

  // === Activity feed auto-scroll indicator ===
  const activityItems = document.querySelectorAll('.activity-item');
  activityItems.forEach((item, i) => {
    item.style.opacity = '0';
    item.style.transform = 'translateX(-12px)';
    item.style.transition = `opacity 0.4s ease ${i * 0.1}s, transform 0.4s ease ${i * 0.1}s`;
    
    const itemObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateX(0)';
          itemObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    itemObserver.observe(item);
  });

  // === AI Progress bars animation ===
  document.querySelectorAll('.ai-progress-fill').forEach(fill => {
    const width = fill.style.width;
    fill.style.width = '0';
    setTimeout(() => {
      fill.style.width = width;
    }, 600);
  });

  // === Usage bars animation ===
  document.querySelectorAll('.usage-fill').forEach(fill => {
    const width = fill.style.width;
    fill.style.width = '0';
    setTimeout(() => {
      fill.style.width = width;
    }, 400);
  });

  // === Toast Notification System ===
  window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '⚡️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s ease reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  // === Super Admin Casso Webhook Simulation Test ===
  const btnTestCasso = document.getElementById('btnTestSuperAdminCasso');
  if (btnTestCasso) {
    btnTestCasso.addEventListener('click', async () => {
      const origText = btnTestCasso.innerHTML;
      btnTestCasso.disabled = true;
      btnTestCasso.textContent = '⏳ Đang bắn Webhook Casso...';

      const randomOrder = Math.floor(1000 + Math.random() * 9000);
      const testTenant = 'Hana Beauty Shop';
      const testSlug = 'HANA';
      const testAmount = 299000;
      const tid = `FT${Date.now().toString().slice(-10)}`;

      try {
        const res = await fetch('/api/v1/casso/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: testAmount,
            tenant: testSlug.toLowerCase(),
            order_id: randomOrder.toString()
          })
        });
        const json = await res.json();
        console.log('Super Admin Casso Simulate Result:', json);
      } catch (err) {
        console.warn('Backend simulate offline, running client fallback:', err);
      }

      setTimeout(() => {
        btnTestCasso.disabled = false;
        btnTestCasso.innerHTML = origText;

        // Prepend new row to #cassoSuperAdminTable
        const table = document.getElementById('cassoSuperAdminTable');
        if (table) {
          const tbody = table.querySelector('tbody');
          if (tbody) {
            const now = new Date();
            const dateStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
            const tr = document.createElement('tr');
            tr.className = 'table-row-highlight';
            tr.innerHTML = `
              <td><code>${tid}</code></td>
              <td><strong>${testTenant}</strong></td>
              <td><strong style="color: var(--green-light);">+${testAmount.toLocaleString('vi-VN')} đ</strong></td>
              <td><code>KCHAT ${testSlug} ${randomOrder}</code></td>
              <td>MB Bank (0987654321)</td>
              <td>Gia hạn Gói Growth (+30 ngày)</td>
              <td>${dateStr}</td>
              <td><span class="status-badge active">Khớp tự động (1.1s)</span></td>
            `;
            tbody.insertBefore(tr, tbody.firstChild);
          }
        }

        showToast(`Nhận Webhook Casso thành công: KCHAT ${testSlug} ${randomOrder} (+${testAmount.toLocaleString('vi-VN')} đ)!`);
      }, 700);
    });
  }

  // === Quick Renew Tenant Buttons ===
  document.querySelectorAll('.btn-quick-renew').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tenantName = btn.dataset.tenant || 'Tenant';
      btn.textContent = 'Đang gia hạn...';
      btn.disabled = true;

      setTimeout(() => {
        btn.textContent = 'Đã gia hạn ✓';
        btn.style.color = 'var(--green-light)';
        btn.style.borderColor = 'var(--green-light)';
        showToast(`Đã gia hạn +30 ngày cho "${tenantName}" qua Casso!`);
      }, 500);
    });
  });

  // === Filter Tenants in Tenants Page ===
  const filterPills = document.querySelectorAll('[data-tenant-filter]');
  const tenantRows = document.querySelectorAll('#allTenantsTable tbody tr');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const filter = pill.dataset.tenantFilter;

      tenantRows.forEach(row => {
        const badge = row.querySelector('.status-badge');
        if (!badge) return;
        if (filter === 'all') {
          row.style.display = '';
        } else if (filter === 'active' && badge.classList.contains('active')) {
          row.style.display = '';
        } else if (filter === 'trial' && badge.classList.contains('trial')) {
          row.style.display = '';
        } else if (filter === 'suspended' && badge.classList.contains('suspended')) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  });

  // === Tenant Search in Tenants Page ===
  const tenantPageSearch = document.getElementById('tenantPageSearch');
  if (tenantPageSearch) {
    tenantPageSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      tenantRows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
      });
    });
  }

  // === Save Settings & Plans Buttons ===
  const btnSavePlans = document.getElementById('btnSavePlanSettings');
  if (btnSavePlans) {
    btnSavePlans.addEventListener('click', () => {
      showToast('Đã lưu bảng giá và cấu hình Quota SaaS thành công!');
    });
  }

  const btnSaveSys = document.getElementById('btnSaveSystemSettings');
  if (btnSaveSys) {
    btnSaveSys.addEventListener('click', () => {
      showToast('Đã lưu cấu hình hệ thống & Casso Open Banking!');
    });
  }

  const btnRestart = document.getElementById('btnRestartBridge');
  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      btnRestart.textContent = 'Đang khởi động lại...';
      setTimeout(() => {
        btnRestart.textContent = 'Khởi Động Lại Bridge Zalo';
        showToast('Container zalo-personal-bridge:4000 đã khởi động lại và kết nối 182 accounts thành công!');
      }, 900);
    });
  }

  // === Modal Management System ===
  window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  // Close modals on close button or backdrop click
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const backdrop = btn.closest('.modal-backdrop');
      if (backdrop) backdrop.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
      document.body.style.overflow = '';
    }
  });

  // === Trigger Create Tenant Modal ===
  const btnCreateTenantModal = document.getElementById('btnCreateTenantModal');
  if (btnCreateTenantModal) {
    btnCreateTenantModal.addEventListener('click', () => openModal('createTenantModal'));
  }
  // Also hook header "Tạo Tenant mới" button
  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes('Tạo Tenant mới')) {
      btn.addEventListener('click', () => openModal('createTenantModal'));
    }
  });

  // Handle Create Tenant Form Submission
  const createTenantForm = document.getElementById('createTenantForm');
  if (createTenantForm) {
    createTenantForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('newTenantName')?.value || 'New Tenant';
      const slug = document.getElementById('newTenantSlug')?.value || 'shop';
      const plan = document.getElementById('newTenantPlan')?.value || 'Growth (299k)';
      const email = document.getElementById('newTenantEmail')?.value || 'admin@shop.vn';
      const duration = document.getElementById('newTenantDuration')?.value || '365';

      const initial = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'TN';
      const planClass = plan.includes('Enterprise') ? 'enterprise' : (plan.includes('Starter') ? 'starter' : 'growth');

      // Prepend to #allTenantsTable
      const table = document.getElementById('allTenantsTable');
      if (table) {
        const tbody = table.querySelector('tbody');
        if (tbody) {
          const tr = document.createElement('tr');
          tr.className = 'table-row-highlight';
          tr.innerHTML = `
            <td>
              <div class="tenant-cell">
                <div class="tenant-avatar" style="background: linear-gradient(135deg, #2563EB, #1D4ED8);">${initial}</div>
                <div>
                  <div class="tenant-name">${name}</div>
                  <div class="tenant-domain">${slug}.kchat.vn · ${email}</div>
                </div>
              </div>
            </td>
            <td><span class="plan-badge ${planClass}">${plan}</span></td>
            <td>
              <div class="channel-icons">
                <span class="channel-dot zalo" title="Zalo Personal">Z</span>
                <span class="channel-dot fb" title="Facebook">F</span>
                <span class="channel-dot web" title="Web Chat">W</span>
              </div>
            </td>
            <td>1 / 5</td>
            <td>
              <div class="usage-bar"><div class="usage-fill" style="width: 5%"></div></div>
              <span class="usage-text">1.2k / 300k</span>
            </td>
            <td><span class="status-badge active">Hoạt động</span></td>
            <td><span style="font-weight: 600;">Hạn ${duration} ngày</span></td>
            <td>
              <div style="display: flex; gap: 6px;">
                <a href="../tenant-admin/" target="_blank" class="btn btn-sm btn-outline">Truy cập</a>
                <button class="btn btn-sm btn-outline btn-quick-renew" data-tenant="${name}">+30d</button>
              </div>
            </td>
          `;
          tbody.insertBefore(tr, tbody.firstChild);

          // Wire row click for detail modal
          attachRowClick(tr);
        }
      }

      // Update badge counter in sidebar
      const navBadge = document.querySelector('.nav-item[data-page="tenants"] .nav-badge');
      if (navBadge) {
        const cur = parseInt(navBadge.textContent) || 248;
        navBadge.textContent = (cur + 1).toString();
      }

      closeModal('createTenantModal');
      createTenantForm.reset();
      showToast(`Đã cấp mới Tenant "${name}" thành công! Kích hoạt ngay tại ${slug}.kchat.vn`);
    });
  }

  // === Tenant Detail Modal Logic ===
  function attachRowClick(row) {
    row.addEventListener('click', (e) => {
      // Don't open if clicked button or link
      if (e.target.closest('button') || e.target.closest('a')) return;

      const nameEl = row.querySelector('.tenant-name');
      const domainEl = row.querySelector('.tenant-domain');
      const planEl = row.querySelector('.plan-badge');
      const avatarEl = row.querySelector('.tenant-avatar');

      if (nameEl) {
        const modalName = document.getElementById('modalTenantName');
        const modalDomain = document.getElementById('modalTenantDomain');
        const modalPlan = document.getElementById('modalTenantPlan');
        const modalAvatar = document.getElementById('modalTenantAvatar');

        if (modalName) modalName.textContent = nameEl.textContent;
        if (modalDomain) modalDomain.textContent = domainEl ? domainEl.textContent : '';
        if (modalPlan) modalPlan.textContent = planEl ? planEl.textContent : 'Growth (299k)';
        if (modalAvatar && avatarEl) {
          modalAvatar.textContent = avatarEl.textContent;
          modalAvatar.style.background = avatarEl.style.background || '#2563EB';
        }

        openModal('tenantDetailModal');
      }
    });
  }

  document.querySelectorAll('#allTenantsTable tbody tr').forEach(row => {
    attachRowClick(row);
  });

  // Modal actions
  const btnModalRenew30 = document.getElementById('btnModalRenew30');
  if (btnModalRenew30) {
    btnModalRenew30.addEventListener('click', () => {
      const modalName = document.getElementById('modalTenantName')?.textContent || 'Tenant';
      btnModalRenew30.textContent = 'Đang kích hoạt...';
      setTimeout(() => {
        btnModalRenew30.textContent = 'Đã Gia Hạn ✓';
        const expiry = document.getElementById('modalTenantExpiry');
        if (expiry) expiry.textContent = '12/11/2026 (48 ngày)';
        showToast(`Đã gia hạn +30 ngày cho "${modalName}" qua VietQR Casso Napas 24/7!`);
      }, 500);
    });
  }

  const btnModalToggleLock = document.getElementById('btnModalToggleLock');
  if (btnModalToggleLock) {
    btnModalToggleLock.addEventListener('click', () => {
      const statusBadge = document.getElementById('modalTenantStatus');
      const modalName = document.getElementById('modalTenantName')?.textContent || 'Tenant';
      if (statusBadge) {
        if (statusBadge.classList.contains('active')) {
          statusBadge.className = 'status-badge suspended';
          statusBadge.textContent = 'Đã Tạm Khóa';
          btnModalToggleLock.textContent = 'Mở Khóa Lại';
          showToast(`Đã tạm khóa tài khoản "${modalName}"!`, 'info');
        } else {
          statusBadge.className = 'status-badge active';
          statusBadge.textContent = 'Đang Hoạt Động';
          btnModalToggleLock.textContent = 'Khóa Tạm Thời';
          showToast(`Đã kích hoạt lại tài khoản "${modalName}"!`);
        }
      }
    });
  }

  const btnModalResetPass = document.getElementById('btnModalResetPass');
  if (btnModalResetPass) {
    btnModalResetPass.addEventListener('click', () => {
      showToast('Đã gửi liên kết đặt lại mật khẩu về email của chủ shop!');
    });
  }

  // === Affiliate Payout Approval (Casso VietQR Napas 24/7) ===
  function attachPayoutButtons() {
    document.querySelectorAll('.btn-payout-approve').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const partner = btn.dataset.partner || 'Đối tác';
        const amount = btn.dataset.amount || '0 đ';
        btn.disabled = true;
        btn.textContent = '⚡️ Đang duyệt chi Napas 24/7...';

        setTimeout(() => {
          btn.textContent = 'Đã Chi Tiền ✓';
          btn.className = 'btn btn-sm btn-outline';
          btn.style.color = 'var(--green-light)';
          btn.style.borderColor = 'var(--green-light)';

          const row = btn.closest('tr');
          if (row) {
            const statusCell = row.querySelector('.payout-status');
            if (statusCell) {
              statusCell.className = 'status-badge active';
              statusCell.textContent = 'Đã Chuyển Tiền ✓';
            }
          }

          showToast(`Đã chuyển ${amount} hoa hồng cho "${partner}" tức thì qua Casso Open Banking!`);
        }, 600);
      });
    });
  }
  attachPayoutButtons();

  const btnApproveAllPayouts = document.getElementById('btnApproveAllPayouts');
  if (btnApproveAllPayouts) {
    btnApproveAllPayouts.addEventListener('click', () => {
      btnApproveAllPayouts.disabled = true;
      btnApproveAllPayouts.textContent = '⚡️ Đang chi trả toàn bộ...';

      setTimeout(() => {
        document.querySelectorAll('.btn-payout-approve').forEach(btn => {
          btn.disabled = true;
          btn.textContent = 'Đã Chi Tiền ✓';
          btn.className = 'btn btn-sm btn-outline';
          btn.style.color = 'var(--green-light)';
          btn.style.borderColor = 'var(--green-light)';
          const row = btn.closest('tr');
          if (row) {
            const statusCell = row.querySelector('.payout-status');
            if (statusCell) {
              statusCell.className = 'status-badge active';
              statusCell.textContent = 'Đã Chuyển Tiền ✓';
            }
          }
        });

        const payableEl = document.getElementById('superAdminAffiliatePayable');
        if (payableEl) payableEl.innerHTML = '0<span class="kpi-unit">đ</span>';

        btnApproveAllPayouts.textContent = 'Đã Hoàn Tất Duyệt Chi ✓';
        showToast('Đã chi trả toàn bộ 7.68 triệu đ hoa hồng Affiliate qua VietQR Napas 24/7!');
      }, 800);
    });
  }

  // Affiliate Policy Modal Trigger
  const btnConfigAffiliatePolicy = document.getElementById('btnConfigAffiliatePolicy');
  if (btnConfigAffiliatePolicy) {
    btnConfigAffiliatePolicy.addEventListener('click', () => openModal('affiliatePolicyModal'));
  }
  const affiliatePolicyForm = document.getElementById('affiliatePolicyForm');
  if (affiliatePolicyForm) {
    affiliatePolicyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      closeModal('affiliatePolicyModal');
      showToast('Đã lưu cấu hình chính sách Tiếp thị liên kết (Affiliate)!');
    });
  }

  // === AI Gateway Features: Latency Test & Key Config ===
  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes('Kiểm Tra Latency')) {
      btn.addEventListener('click', () => {
        const orig = btn.textContent;
        btn.textContent = 'Đang ping models...';
        btn.disabled = true;

        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = orig;
          showToast('Đã kiểm tra 3 model AI: GPT-4o-mini (380ms), Claude 3.5 Sonnet (680ms), Gemini 1.5 Flash (310ms) — Trạng thái Rất Tốt!');
        }, 700);
      });
    }

    if (btn.textContent.includes('+ Cấu hình API Key')) {
      btn.addEventListener('click', () => openModal('aiKeyModal'));
    }

    if (btn.textContent.includes('+ Thêm Gói Dịch Vụ')) {
      btn.addEventListener('click', () => openModal('seedingServiceModal'));
    }

    if (btn.textContent.includes('Xuất Excel') || btn.textContent.includes('Xuất Báo Cáo')) {
      btn.addEventListener('click', () => {
        showToast('Đang tạo và tải xuống file báo cáo Excel / PDF...');
      });
    }
  });

  const aiKeyForm = document.getElementById('aiKeyForm');
  if (aiKeyForm) {
    aiKeyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      closeModal('aiKeyModal');
      showToast('Đã lưu và đồng bộ API Key AI Gateway cho toàn hệ thống!');
    });
  }

  const seedingServiceForm = document.getElementById('seedingServiceForm');
  if (seedingServiceForm) {
    seedingServiceForm.addEventListener('submit', (e) => {
      e.preventDefault();
      closeModal('seedingServiceModal');
      showToast('Đã tạo và kích hoạt gói dịch vụ Seeding mới trên sàn!');
    });
  }
});

