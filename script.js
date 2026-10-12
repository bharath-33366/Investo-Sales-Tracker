// SECURITY: Input validation and sanitization
    const SECURITY_CONFIG = {
      MAX_INPUT_LENGTH: 500,
      MAX_NOTES_LENGTH: 2000,
      MAX_NAME_LENGTH: 100,
      MIN_NAME_LENGTH: 2,
      MAX_PHONE_LENGTH: 20,
      MAX_EMAIL_LENGTH: 100,
      FIELD_TRIM: true
    };

    const ALLOWED_STATUSES = new Set(['completed', 'pending']);
    const ALLOWED_PAYMENT_STATUSES = new Set(['unpaid', 'paid']);
    const ALLOWED_PRODUCT_TYPES = new Set(['coffee', 'tea', 'other']);
    const ALLOWED_SEGMENTS = new Set(['Wholesale', 'Supermarket', 'Cafe', 'Casuals', 'Regular']);

    function sanitizeInput(input) {
      if (!input) return '';
      if (typeof input !== 'string') return '';
      
      const trimmed = input.trim().slice(0, SECURITY_CONFIG.MAX_INPUT_LENGTH);
      const div = document.createElement('div');
      div.textContent = trimmed;
      return div.innerHTML;
    }

    function validateAndSanitizeString(value, minLen = 1, maxLen = 100, fieldName = 'field') {
      if (!value || typeof value !== 'string') return null;
      
      const trimmed = value.trim().slice(0, maxLen);
      if (trimmed.length < minLen) return null;
      
      const sanitized = sanitizeInput(trimmed);
      return sanitized;
    }

    function validateEmail(email) {
      if (!email) return true;
      if (email.length > SECURITY_CONFIG.MAX_EMAIL_LENGTH) return false;
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    }

    function validatePhone(phone) {
      if (!phone) return false;
      const phoneStr = String(phone).trim();
      if (phoneStr.length > SECURITY_CONFIG.MAX_PHONE_LENGTH) return false;
      const digitsOnly = phoneStr.replace(/\D/g, '');
      return digitsOnly.length >= 7;
    }

    function validateNumber(value, minVal = 0) {
      const num = parseFloat(value);
      return !isNaN(num) && num >= minVal && num <= 1000000;
    }

    function validateStatus(status) {
      return ALLOWED_STATUSES.has(status);
    }

    function validatePaymentStatus(status) {
      return ALLOWED_PAYMENT_STATUSES.has(status);
    }

    function validateProductType(type) {
      return ALLOWED_PRODUCT_TYPES.has(type);
    }

    function validateSegment(segment) {
      return ALLOWED_SEGMENTS.has(segment);
    }

    function cleanPhoneNumber(phone) {
      if (!phone) return '';
      const phoneStr = String(phone).trim();
      const cleaned = phoneStr.replace(/\D/g, '');
      
      if (cleaned.length < 7) return '';
      
      if (cleaned.startsWith('91') && cleaned.length >= 11) {
        return cleaned.slice(0, 12);
      }
      
      if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return cleaned;
      }
      
      const last10 = cleaned.slice(-10);
      if (last10.length === 10) {
        return '91' + last10;
      }
      
      if (cleaned.length > 0) {
        return '91' + cleaned;
      }
      
      return '';
    }

    function exportToCSV() {
      const sales = getSales();
      const customers = getCustomers();
      
      if (sales.length === 0) {
        showToast('No sales data to export', 'error');
        return;
      }

      const headers = ['Date', 'Product', 'Product Type', 'Customer', 'Quantity', 'Cost per Unit', 'Selling Price', 'Total Amount', 'Profit', 'Status', 'Payment Status', 'Due Date', 'Notes'];
      
      const rows = sales.map(sale => [
        sale.date || '',
        sanitizeInput(sale.productName),
        sale.productType || '',
        sanitizeInput(sale.customerName),
        parseFloat(sale.quantity) || 0,
        parseFloat(sale.costPerUnit) || 0,
        parseFloat(sale.sellingPrice) || 0,
        (parseFloat(sale.sellingPrice) || 0) * (parseFloat(sale.quantity) || 0),
        parseFloat(sale.profit) || 0,
        sale.status || '',
        sale.paymentStatus || '',
        sale.dueDate || '',
        sanitizeInput(sale.notes || '')
      ]);

      let csvContent = headers.map(h => `"${h}"`).join(',') + '\n';
      rows.forEach(row => {
        csvContent += row.map(cell => {
          const cellStr = String(cell).replace(/"/g, '""');
          return `"${cellStr}"`;
        }).join(',') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `investo-sales-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('📥 CSV exported successfully!');
    }

    const defaultConfig = {
      primary_color: '#2563EB',
      secondary_color: '#64748B',
      accent_color: '#10B981',
      background_color: '#F8FAFC',
      error_color: '#EF4444',
      font_family: 'Inter',
      font_size: 16,
      app_title: 'Investo',
      quick_stats_title: "Today's Overview",
      add_sale_button: 'Add New Sale',
      save_sale_button: 'Save Sale',
      reports_title: 'Reports',
      pending_payments_title: 'Pending Payments'
    };

    let config = { ...defaultConfig };
    let allRecords = [];
    let currentView = 'dashboard';
    let isLoading = false;
    let editingRecord = null;
    let deleteConfirmId = null;

    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      const safeMessage = sanitizeInput(message);
      toast.textContent = safeMessage;
      toast.className = `toast ${type} show`;
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }

    function showReminderCard(customer, amount, dueDate, phone) {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const baseSize = Math.max(12, Math.min(24, config.font_size || defaultConfig.font_size));
      const dueDateObj = new Date(dueDate);

      overlay.innerHTML = `
        <div class="modal-content" style="padding: 0; overflow: hidden; max-width: 450px;">
          <div style="padding: 24px; background: linear-gradient(135deg, ${config.primary_color || defaultConfig.primary_color} 0%, ${config.accent_color || defaultConfig.accent_color} 100%); color: white; border-radius: 16px 16px 0 0;">
            <h3 style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin: 0; text-align: center;">📋 Payment Reminder</h3>
          </div>
          
          <div style="padding: 32px 24px; text-align: center;">
            <div style="font-size: ${baseSize * 0.875}px; color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 8px;">Outstanding Payment From</div>
            <h2 style="font-size: ${baseSize * 1.5}px; font-weight: 700; color: ${config.secondary_color || defaultConfig.secondary_color}; margin: 0 0 24px 0;">${sanitizeInput(customer)}</h2>
            
            <div style="background: ${config.background_color || defaultConfig.background_color}; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
              <div style="font-size: ${baseSize * 0.875}px; color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 8px;">Amount Due</div>
              <div style="font-size: ${baseSize * 2.5}px; font-weight: 700; color: ${config.primary_color || defaultConfig.primary_color};">₹${parseFloat(amount).toFixed(2)}</div>
            </div>

            <div style="padding: 16px; background: #dbeafe; border-radius: 8px; margin-bottom: 24px;">
              <div style="font-size: ${baseSize * 0.75}px; color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 4px;">Due Date</div>
              <div style="font-size: ${baseSize * 1.125}px; font-weight: 700; color: ${config.secondary_color || defaultConfig.secondary_color};">${dueDateObj.toLocaleDateString()}</div>
            </div>

            <div style="padding: 16px; background: ${config.background_color || defaultConfig.background_color}; border-left: 4px solid ${config.accent_color || defaultConfig.accent_color}; border-radius: 8px; margin-bottom: 24px; text-align: left;">
              <div style="font-size: ${baseSize * 0.875}px; font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">📞 Reminder Details:</div>
              <div style="font-size: ${baseSize * 0.8}px; color: ${config.secondary_color || defaultConfig.secondary_color}; margin-top: 8px; line-height: 1.6;">
                Customer: <strong>${sanitizeInput(customer)}</strong><br>
                Amount: <strong>₹${parseFloat(amount).toFixed(2)}</strong><br>
                Due: <strong>${dueDateObj.toLocaleDateString()}</strong>
              </div>
            </div>
          </div>

          <div style="padding: 0 24px 24px 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <button id="send-whatsapp-from-card" data-phone="${phone}" style="padding: 12px 16px; background: #25D366; color: white; border: none; border-radius: 8px; font-size: ${baseSize}px; font-weight: 600; cursor: pointer; transition: all 0.2s;">💬 Send WhatsApp</button>
            <button id="close-reminder-card" style="padding: 12px 16px; background: ${config.background_color || defaultConfig.background_color}; color: ${config.secondary_color || defaultConfig.secondary_color}; border: 2px solid ${config.primary_color || defaultConfig.primary_color}; border-radius: 8px; font-size: ${baseSize}px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Close</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });

      document.getElementById('close-reminder-card').addEventListener('click', () => {
        overlay.remove();
      });

      document.getElementById('send-whatsapp-from-card').addEventListener('click', (e) => {
        const phoneNumber = e.currentTarget.dataset.phone;
        if (!phoneNumber || phoneNumber.trim() === '') {
          showToast('No phone number available', 'error');
          return;
        }

        const cleanedPhone = cleanPhoneNumber(phoneNumber);
        if (!cleanedPhone) {
          showToast('Could not format phone number', 'error');
          return;
        }

        const whatsappUrl = `https://wa.me/${cleanedPhone}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        showToast('💬 Opening WhatsApp...', 'success');
        setTimeout(() => {
          overlay.remove();
        }, 500);
      });
    }

    function getSales() {
      return allRecords.filter(r => r.type === 'sale');
    }

    function getCustomers() {
      return allRecords.filter(r => r.type === 'customer');
    }

    function getTodaySales() {
      const today = new Date().toISOString().split('T')[0];
      return getSales().filter(s => s.date && s.date.startsWith(today));
    }

    function getPendingPayments() {
      return getSales().filter(s => {
        const status = s.paymentStatus || 'unpaid';
        return status !== 'paid';
      });
    }

    function calculatePaymentStatus(saleRecord) {
      if (!saleRecord.dueDate) return 'unpaid';
      const today = new Date();
      const dueDate = new Date(saleRecord.dueDate);
      
      if (isNaN(dueDate.getTime())) return 'unpaid';
      
      if (dueDate < today) return 'overdue';
      const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 3) return 'due-soon';
      return 'upcoming';
    }

    function getProductType(productName) {
      const name = (productName || '').toLowerCase();
      if (name.includes('coffee') || name.includes('espresso') || name.includes('cappuccino') || name.includes('latte')) {
        return 'coffee';
      } else if (name.includes('tea') || name.includes('chai')) {
        return 'tea';
      }
      return 'other';
    }

    function calculateStats() {
      const sales = getSales();
      const todaySales = getTodaySales();
      const pendingPayments = getPendingPayments();
      
      const coffeeSales = sales.filter(s => getProductType(s.productName) === 'coffee');
      const teaSales = sales.filter(s => getProductType(s.productName) === 'tea');

      const totalPendingAmount = pendingPayments.reduce((sum, s) => {
        const price = parseFloat(s.sellingPrice) || 0;
        const qty = parseFloat(s.quantity) || 0;
        return sum + (price * qty);
      }, 0);
      
      return {
        todaySalesCount: todaySales.length,
        todayProfit: todaySales.reduce((sum, s) => sum + (parseFloat(s.profit) || 0), 0),
        pendingOrders: sales.filter(s => s.status === 'pending').length,
        totalSales: sales.length,
        totalProfit: sales.reduce((sum, s) => sum + (parseFloat(s.profit) || 0), 0),
        totalRevenue: sales.reduce((sum, s) => sum + ((parseFloat(s.sellingPrice) || 0) * (parseFloat(s.quantity) || 0)), 0),
        coffeeProfit: coffeeSales.reduce((sum, s) => sum + (parseFloat(s.profit) || 0), 0),
        coffeeRevenue: coffeeSales.reduce((sum, s) => sum + ((parseFloat(s.sellingPrice) || 0) * (parseFloat(s.quantity) || 0)), 0),
        coffeeSales: coffeeSales.length,
        coffeeUnits: coffeeSales.reduce((sum, s) => sum + (parseFloat(s.quantity) || 0), 0),
        teaProfit: teaSales.reduce((sum, s) => sum + (parseFloat(s.profit) || 0), 0),
        teaRevenue: teaSales.reduce((sum, s) => sum + ((parseFloat(s.sellingPrice) || 0) * (parseFloat(s.quantity) || 0)), 0),
        teaSales: teaSales.length,
        teaUnits: teaSales.reduce((sum, s) => sum + (parseFloat(s.quantity) || 0), 0),
        pendingPaymentCount: pendingPayments.length,
        totalPendingAmount: totalPendingAmount,
        overduePayments: pendingPayments.filter(s => calculatePaymentStatus(s) === 'overdue').length
      };
    }

    function calculateProductProfits() {
      const sales = getSales();
      const productProfits = {};
      
      sales.forEach(sale => {
        const productName = sanitizeInput(sale.productName);
        if (!productProfits[productName]) {
          productProfits[productName] = {
            totalProfit: 0,
            totalRevenue: 0,
            totalCost: 0,
            quantity: 0,
            salesCount: 0
          };
        }
        
        const product = productProfits[productName];
        const profit = parseFloat(sale.profit) || 0;
        const cost = (parseFloat(sale.costPerUnit) || 0) * (parseFloat(sale.quantity) || 0);
        const revenue = (parseFloat(sale.sellingPrice) || 0) * (parseFloat(sale.quantity) || 0);
        const qty = parseFloat(sale.quantity) || 0;
        
        product.totalProfit += profit;
        product.totalRevenue += revenue;
        product.totalCost += cost;
        product.quantity += qty;
        product.salesCount += 1;
      });
      
      return Object.entries(productProfits)
        .map(([name, data]) => ({
          name,
          ...data,
          avgProfitPerUnit: data.quantity > 0 ? data.totalProfit / data.quantity : 0
        }))
        .sort((a, b) => b.totalProfit - a.totalProfit);
    }

    function renderPaymentThumbnail(payment, baseSize, config, status) {
      const amount = (parseFloat(payment.sellingPrice) || 0) * (parseFloat(payment.quantity) || 0);
      
      let borderColor, statusText, statusClass;
      
      if (status === 'overdue') {
        borderColor = config.error_color || defaultConfig.error_color;
        statusClass = 'overdue';
        statusText = '⏰ Overdue';
      } else if (status === 'due-soon') {
        borderColor = '#f59e0b';
        statusClass = 'due-soon';
        statusText = '⚠️ Due Soon';
      } else {
        borderColor = '#3b82f6';
        statusClass = 'upcoming';
        statusText = '⏳ Upcoming';
      }

      return `
        <div class="payment-thumbnail" style="border-top-color: ${borderColor};">
          <span class="payment-thumbnail-status ${statusClass}">${statusText}</span>
          
          <div class="payment-thumbnail-customer">${sanitizeInput(payment.customerName)}</div>
          <div class="payment-thumbnail-product">📦 ${sanitizeInput(payment.productName)}</div>
          <div class="payment-thumbnail-date">Qty: ${parseFloat(payment.quantity) || 0} units</div>
          
          <div class="payment-thumbnail-amount" style="color: ${config.primary_color || defaultConfig.primary_color};">
            ₹${amount.toFixed(2)}
          </div>

          <div class="payment-thumbnail-actions">
            <button class="payment-thumbnail-btn mark-paid-btn" data-id="${payment.__backendId}" style="background: ${config.accent_color || defaultConfig.accent_color};">✓ Paid</button>
            <button class="payment-thumbnail-btn send-reminder-btn" data-id="${payment.__backendId}" data-phone="${payment.phone}" data-customer="${sanitizeInput(payment.customerName)}" data-amount="${amount}" data-duedate="${payment.dueDate}" style="background: #25D366;">💬 Remind</button>
          </div>
        </div>
      `;
    }

    async function onConfigChange(newConfig) {
      config = { ...newConfig };
      renderCurrentView();
    }

    function applyStyles() {
      const baseSize = Math.max(12, Math.min(24, config.font_size || defaultConfig.font_size));
      const customFont = sanitizeInput(config.font_family || defaultConfig.font_family);
      const baseFontStack = 'system-ui, -apple-system, sans-serif';
      
      return `
        font-family: ${customFont}, ${baseFontStack};
        font-size: ${baseSize}px;
        background-color: ${config.background_color || defaultConfig.background_color};
        color: ${config.secondary_color || defaultConfig.secondary_color};
      `;
    }

    function renderApp() {
      const app = document.getElementById('app');
      app.style.cssText = applyStyles();
      
      const title = sanitizeInput(config.app_title || defaultConfig.app_title);
      const baseSize = Math.max(12, Math.min(24, config.font_size || defaultConfig.font_size));
      
      app.innerHTML = `
        <div class="w-full" style="min-height: 100%; padding-bottom: 80px;">
          <header style="background: ${config.primary_color || defaultConfig.primary_color}; color: white; padding: 16px 20px; position: sticky; top: 0; z-index: 40; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto;">
              <h1 style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin: 0;">${title}</h1>
            </div>
          </header>
          
          <main id="main-content" style="max-width: 1200px; margin: 0 auto; padding: 20px;">
            <!-- Content will be rendered here -->
          </main>

          <div class="bottom-nav">
            <div class="nav-item" data-view="dashboard" style="color: ${config.secondary_color || defaultConfig.secondary_color};">
              <div style="font-size: 24px;">🏠</div>
              <div style="font-size: 12px; margin-top: 4px;">Home</div>
            </div>
            <div class="nav-item" data-view="sales" style="color: ${config.secondary_color || defaultConfig.secondary_color};">
              <div style="font-size: 24px;">📊</div>
              <div style="font-size: 12px; margin-top: 4px;">Sales</div>
            </div>
            <div class="nav-item" data-view="payments" style="color: ${config.secondary_color || defaultConfig.secondary_color};">
              <div style="font-size: 24px;">💳</div>
              <div style="font-size: 12px; margin-top: 4px;">Payments</div>
            </div>
            <div class="nav-item" data-view="reports" style="color: ${config.secondary_color || defaultConfig.secondary_color};">
              <div style="font-size: 24px;">📈</div>
              <div style="font-size: 12px; margin-top: 4px;">Reports</div>
            </div>
            <div class="nav-item" data-view="customers" style="color: ${config.secondary_color || defaultConfig.secondary_color};">
              <div style="font-size: 24px;">👥</div>
              <div style="font-size: 12px; margin-top: 4px;">Customers</div>
            </div>
          </div>
        </div>
      `;
      
      document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
          const view = item.dataset.view;
          if (view) navigateTo(view);
        });
      });

      renderCurrentView();
    }

    function navigateTo(view, data = null) {
      if (!view || typeof view !== 'string') return;
      
      currentView = view;
      editingRecord = data;
      deleteConfirmId = null;
      
      document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.view === view) {
          item.classList.add('active');
          item.style.color = config.primary_color || defaultConfig.primary_color;
        } else {
          item.classList.remove('active');
          item.style.color = config.secondary_color || defaultConfig.secondary_color;
        }
      });
      
      renderCurrentView();
    }

    function renderCurrentView() {
      const content = document.getElementById('main-content');
      if (!content) return;

      const existingFab = document.querySelector('.fab');
      if (existingFab) existingFab.remove();

      switch(currentView) {
        case 'dashboard':
          renderDashboard();
          break;
        case 'sales':
          renderSalesList();
          break;
        case 'sale-form':
          renderSaleForm();
          break;
        case 'customers':
          renderCustomers();
          break;
        case 'customer-detail':
          renderCustomerDetail();
          break;
        case 'reports':
          renderReports();
          break;
        case 'payments':
          renderPendingPayments();
          break;
        default:
          renderDashboard();
      }
    }

    function renderDashboard() {
      const content = document.getElementById('main-content');
      const stats = calculateStats();
      const recentSales = getSales().slice(0, 5);
      const baseSize = Math.max(12, Math.min(24, config.font_size || defaultConfig.font_size));

      content.innerHTML = `
        <div class="fade-in">
          <h2 style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin-bottom: 20px; color: ${config.secondary_color || defaultConfig.secondary_color};">${sanitizeInput(config.quick_stats_title || defaultConfig.quick_stats_title)}</h2>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 32px;">
            <div class="stat-card">
              <div style="font-size: ${baseSize * 0.875}px; color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 8px;">Today's Sales</div>
              <div style="font-size: ${baseSize * 2}px; font-weight: 700; color: ${config.primary_color || defaultConfig.primary_color};">${stats.todaySalesCount}</div>
            </div>
            <div class="stat-card">
              <div style="font-size: ${baseSize * 0.875}px; color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 8px;">Today's Profit</div>
              <div style="font-size: ${baseSize * 2}px; font-weight: 700; color: ${config.accent_color || defaultConfig.accent_color};">₹${stats.todayProfit.toFixed(2)}</div>
            </div>
            <div class="stat-card">
              <div style="font-size: ${baseSize * 0.875}px; color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 8px;">Pending Orders</div>
              <div style="font-size: ${baseSize * 2}px; font-weight: 700; color: ${config.error_color || defaultConfig.error_color};">${stats.pendingOrders}</div>
            </div>
            <div class="stat-card" style="border-left: 4px solid ${config.error_color || defaultConfig.error_color};">
              <div style="font-size: ${baseSize * 0.875}px; color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 8px;">⚠️ Overdue Payments</div>
              <div style="font-size: ${baseSize * 2}px; font-weight: 700; color: ${config.error_color || defaultConfig.error_color};">${stats.overduePayments}</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 32px;">
            <div class="stat-card" style="background: linear-gradient(135deg, #6B4423 0%, #8B5A3C 100%); color: white; border-left: 4px solid #A0522D;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: ${baseSize * 1.5}px;">☕</span>
                <span style="font-size: ${baseSize * 0.875}px; opacity: 0.9;">Coffee</span>
              </div>
              <div style="font-size: ${baseSize * 2}px; font-weight: 700;">₹${stats.coffeeRevenue.toFixed(2)}</div>
              <div style="font-size: ${baseSize * 0.75}px; opacity: 0.8; margin-top: 4px;">Revenue • ${stats.coffeeSales} sales • ${stats.coffeeUnits} units</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #2D5016 0%, #4A7C2B 100%); color: white; border-left: 4px solid #556B2F;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: ${baseSize * 1.5}px;">🍵</span>
                <span style="font-size: ${baseSize * 0.875}px; opacity: 0.9;">Tea</span>
              </div>
              <div style="font-size: ${baseSize * 2}px; font-weight: 700;">₹${stats.teaRevenue.toFixed(2)}</div>
              <div style="font-size: ${baseSize * 0.75}px; opacity: 0.8; margin-top: 4px;">Revenue • ${stats.teaSales} sales • ${stats.teaUnits} units</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; border-left: 4px solid #475569;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: ${baseSize * 1.5}px;">💳</span>
                <span style="font-size: ${baseSize * 0.875}px; opacity: 0.9;">Pending</span>
              </div>
              <div style="font-size: ${baseSize * 2}px; font-weight: 700;">₹${stats.totalPendingAmount.toFixed(2)}</div>
              <div style="font-size: ${baseSize * 0.75}px; opacity: 0.8; margin-top: 4px;">${stats.pendingPaymentCount} payments</div>
            </div>
          </div>

          <div class="stat-card">
            <h3 style="font-size: ${baseSize * 1.25}px; font-weight: 700; margin-bottom: 16px; color: ${config.secondary_color || defaultConfig.secondary_color};">Recent Transactions</h3>
            ${recentSales.length > 0 ? `
              <div style="overflow-x: auto;">
                <table>
                  <thead>
                    <tr style="color: ${config.secondary_color || defaultConfig.secondary_color};">
                      <th>Date</th>
                      <th>Product</th>
                      <th>Customer</th>
                      <th>Qty</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recentSales.map(sale => {
                      const amount = (parseFloat(sale.sellingPrice) || 0) * (parseFloat(sale.quantity) || 0);
                      return `
                        <tr>
                          <td>${new Date(sale.date).toLocaleDateString()}</td>
                          <td>${sanitizeInput(sale.productName)}</td>
                          <td>${sanitizeInput(sale.customerName)}</td>
                          <td>${parseFloat(sale.quantity) || 0}</td>
                          <td style="color: ${config.accent_color || defaultConfig.accent_color}; font-weight: 600;">₹${amount.toFixed(2)}</td>
                          <td><span class="status-badge status-${sanitizeInput(sale.status)}">${sanitizeInput(sale.status)}</span></td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <p style="text-align: center; color: ${config.secondary_color || defaultConfig.secondary_color}; padding: 40px 0;">No sales yet. Add your first sale!</p>
            `}
          </div>
        </div>
      `;

      const fab = document.createElement('div');
      fab.className = 'fab';
      fab.style.backgroundColor = config.primary_color || defaultConfig.primary_color;
      fab.innerHTML = '<span style="color: white; font-size: 32px;">+</span>';
      fab.addEventListener('click', () => navigateTo('sale-form'));
      document.body.appendChild(fab);
    }

    function renderPendingPayments() {
      const content = document.getElementById('main-content');
      const pendingPayments = getPendingPayments();
      const baseSize = Math.max(12, Math.min(24, config.font_size || defaultConfig.font_size));

      const overduePayments = pendingPayments.filter(p => calculatePaymentStatus(p) === 'overdue');
      const dueSoonPayments = pendingPayments.filter(p => calculatePaymentStatus(p) === 'due-soon');
      const upcomingPayments = pendingPayments.filter(p => calculatePaymentStatus(p) === 'upcoming');

      content.innerHTML = `
        <div class="fade-in">
          <h2 style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin-bottom: 8px; color: ${config.secondary_color || defaultConfig.secondary_color};">${sanitizeInput(config.pending_payments_title || defaultConfig.pending_payments_title)}</h2>
          <p style="font-size: ${baseSize * 0.875}px; color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 24px; opacity: 0.7;">Quick overview of all pending customer payments</p>

          ${pendingPayments.length > 0 ? `
            ${overduePayments.length > 0 ? `
              <div style="margin-bottom: 32px;">
                <h3 style="font-size: ${baseSize * 1.125}px; font-weight: 700; color: ${config.error_color || defaultConfig.error_color}; margin: 0 0 16px 0;">
                  ⏰ Overdue Payments (${overduePayments.length})
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
                  ${overduePayments.map(payment => renderPaymentThumbnail(payment, baseSize, config, 'overdue')).join('')}
                </div>
              </div>
            ` : ''}

            ${dueSoonPayments.length > 0 ? `
              <div style="margin-bottom: 32px;">
                <h3 style="font-size: ${baseSize * 1.125}px; font-weight: 700; color: #f59e0b; margin: 0 0 16px 0;">
                  ⚠️ Due Soon (${dueSoonPayments.length})
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
                  ${dueSoonPayments.map(payment => renderPaymentThumbnail(payment, baseSize, config, 'due-soon')).join('')}
                </div>
              </div>
            ` : ''}

            ${upcomingPayments.length > 0 ? `
              <div style="margin-bottom: 32px;">
                <h3 style="font-size: ${baseSize * 1.125}px; font-weight: 700; color: #3b82f6; margin: 0 0 16px 0;">
                  ⏳ Upcoming (${upcomingPayments.length})
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
                  ${upcomingPayments.map(payment => renderPaymentThumbnail(payment, baseSize, config, 'upcoming')).join('')}
                </div>
              </div>
            ` : ''}
          ` : `
            <div class="stat-card" style="text-align: center; padding: 60px 20px;">
              <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
              <p style="color: ${config.secondary_color || defaultConfig.secondary_color}; font-size: ${baseSize * 1.125}px; font-weight: 600;">All payments are clear!</p>
              <p style="color: ${config.secondary_color || defaultConfig.secondary_color}; margin-top: 8px; font-size: ${baseSize * 0.875}px;">No pending payments at the moment.</p>
            </div>
          `}
        </div>
      `;

      document.querySelectorAll('.mark-paid-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (!id) return;
          const payment = getSales().find(s => s.__backendId === id);
          if (payment) {
            await markPaymentAsPaid(payment);
          }
        });
      });

      document.querySelectorAll('.send-reminder-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const id = e.target.dataset.id;
          const phone = e.target.dataset.phone;
          const customer = e.target.dataset.customer;
          const amount = e.target.dataset.amount;
          const dueDate = e.target.dataset.duedate;
          
          showReminderCard(customer, amount, dueDate, phone);
        });
      });
    }

    async function markPaymentAsPaid(payment) {
      if (isLoading) return;
      
      isLoading = true;
      const updatedPayment = {
        ...payment,
        paymentStatus: 'paid',
        __backendId: payment.__backendId
      };

      const result = await window.dataSdk.update(updatedPayment);
      isLoading = false;
      
      if (result.isOk) {
        showToast('Payment marked as paid ✓');
      } else {
        showToast('Failed to update payment', 'error');
      }
    }

    function renderReports() {
      const content = document.getElementById('main-content');
      const sales = getSales();
      const baseSize = Math.max(12, Math.min(24, config.font_size || defaultConfig.font_size));
      const stats = calculateStats();
      const productProfits = calculateProductProfits();

      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
      }

      const weeklyData = last7Days.map(date => {
        const daySales = sales.filter(s => s.date && s.date.startsWith(date));
        return {
          date,
          sales: daySales.length,
          profit: daySales.reduce((sum, s) => sum + (parseFloat(s.profit) || 0), 0)
        };
      });

      content.innerHTML = `
        <div class="fade-in">
          <h2 style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin-bottom: 20px; color: ${config.secondary_color || defaultConfig.secondary_color};">${sanitizeInput(config.reports_title || defaultConfig.reports_title)}</h2>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 32px;">
            <div class="stat-card">
              <div style="font-size: ${baseSize * 0.875}px; color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 8px;">Total Sales</div>
              <div style="font-size: ${baseSize * 2}px; font-weight: 700; color: ${config.primary_color || defaultConfig.primary_color};">${stats.totalSales}</div>
            </div>
            <div class="stat-card">
              <div style="font-size: ${baseSize * 0.875}px; color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 8px;">Total Revenue</div>
              <div style="font-size: ${baseSize * 2}px; font-weight: 700; color: ${config.accent_color || defaultConfig.accent_color};">₹${stats.totalRevenue.toFixed(2)}</div>
            </div>
            <div class="stat-card">
              <div style="font-size: ${baseSize * 0.875}px; color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 8px;">Total Profit</div>
              <div style="font-size: ${baseSize * 2}px; font-weight: 700; color: ${config.accent_color || defaultConfig.accent_color};">₹${stats.totalProfit.toFixed(2)}</div>
            </div>
            <div class="stat-card">
              <div style="font-size: ${baseSize * 0.875}px; color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 8px;">Profit Margin</div>
              <div style="font-size: ${baseSize * 2}px; font-weight: 700; color: ${config.accent_color || defaultConfig.accent_color};">${stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : '0'}%</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 32px;">
            <div class="stat-card">
              <h3 style="font-size: ${baseSize * 1.125}px; font-weight: 700; margin: 0 0 16px 0; color: ${config.secondary_color || defaultConfig.secondary_color};">☕ Coffee Sales</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div style="padding: 16px; background: linear-gradient(135deg, #6B4423 0%, #8B5A3C 100%); color: white; border-radius: 8px;">
                  <div style="font-size: ${baseSize * 0.75}px; opacity: 0.9;">Revenue</div>
                  <div style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin-top: 4px;">₹${stats.coffeeRevenue.toFixed(2)}</div>
                </div>
                <div style="padding: 16px; background: linear-gradient(135deg, #6B4423 0%, #8B5A3C 100%); color: white; border-radius: 8px;">
                  <div style="font-size: ${baseSize * 0.75}px; opacity: 0.9;">Profit</div>
                  <div style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin-top: 4px;">₹${stats.coffeeProfit.toFixed(2)}</div>
                </div>
                <div style="padding: 16px; background: linear-gradient(135deg, #6B4423 0%, #8B5A3C 100%); color: white; border-radius: 8px;">
                  <div style="font-size: ${baseSize * 0.75}px; opacity: 0.9;">Units</div>
                  <div style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin-top: 4px;">${Math.floor(stats.coffeeUnits)}</div>
                </div>
                <div style="padding: 16px; background: linear-gradient(135deg, #6B4423 0%, #8B5A3C 100%); color: white; border-radius: 8px;">
                  <div style="font-size: ${baseSize * 0.75}px; opacity: 0.9;">Sales</div>
                  <div style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin-top: 4px;">${stats.coffeeSales}</div>
                </div>
              </div>
            </div>

            <div class="stat-card">
              <h3 style="font-size: ${baseSize * 1.125}px; font-weight: 700; margin: 0 0 16px 0; color: ${config.secondary_color || defaultConfig.secondary_color};">🍵 Tea Sales</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div style="padding: 16px; background: linear-gradient(135deg, #2D5016 0%, #4A7C2B 100%); color: white; border-radius: 8px;">
                  <div style="font-size: ${baseSize * 0.75}px; opacity: 0.9;">Revenue</div>
                  <div style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin-top: 4px;">₹${stats.teaRevenue.toFixed(2)}</div>
                </div>
                <div style="padding: 16px; background: linear-gradient(135deg, #2D5016 0%, #4A7C2B 100%); color: white; border-radius: 8px;">
                  <div style="font-size: ${baseSize * 0.75}px; opacity: 0.9;">Profit</div>
                  <div style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin-top: 4px;">₹${stats.teaProfit.toFixed(2)}</div>
                </div>
                <div style="padding: 16px; background: linear-gradient(135deg, #2D5016 0%, #4A7C2B 100%); color: white; border-radius: 8px;">
                  <div style="font-size: ${baseSize * 0.75}px; opacity: 0.9;">Units</div>
                  <div style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin-top: 4px;">${Math.floor(stats.teaUnits)}</div>
                </div>
                <div style="padding: 16px; background: linear-gradient(135deg, #2D5016 0%, #4A7C2B 100%); color: white; border-radius: 8px;">
                  <div style="font-size: ${baseSize * 0.75}px; opacity: 0.9;">Sales</div>
                  <div style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin-top: 4px;">${stats.teaSales}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="stat-card" style="margin-bottom: 20px;">
            <h3 style="font-size: ${baseSize * 1.125}px; font-weight: 700; margin: 0 0 16px 0; color: ${config.secondary_color || defaultConfig.secondary_color};">7-Day Sales Trend</h3>
            <canvas id="salesChart" style="max-height: 300px;"></canvas>
          </div>

          <div class="stat-card" style="margin-bottom: 20px;">
            <h3 style="font-size: ${baseSize * 1.125}px; font-weight: 700; margin: 0 0 16px 0; color: ${config.secondary_color || defaultConfig.secondary_color};">Profit by Product</h3>
            ${productProfits.length > 0 ? `
              <div style="display: grid; gap: 12px;">
                ${productProfits.slice(0, 10).map((product) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: ${config.background_color || defaultConfig.background_color}; border-radius: 8px; border-left: 4px solid ${config.primary_color || defaultConfig.primary_color};">
                    <div>
                      <div style="font-weight: 700; font-size: ${baseSize * 1.05}px; color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 4px;">${sanitizeInput(product.name)}</div>
                      <div style="font-size: ${baseSize * 0.875}px; color: ${config.secondary_color || defaultConfig.secondary_color};">
                        ${product.salesCount} sales • ${Math.floor(product.quantity)} units
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-weight: 700; font-size: ${baseSize * 1.25}px; color: ${config.accent_color || defaultConfig.accent_color};">₹${product.totalProfit.toFixed(2)}</div>
                      <div style="font-size: ${baseSize * 0.75}px; color: ${config.secondary_color || defaultConfig.secondary_color};">profit</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <p style="text-align: center; color: ${config.secondary_color || defaultConfig.secondary_color}; padding: 40px 0;">No product data yet.</p>
            `}
          </div>

          <div class="stat-card">
            <h3 style="font-size: ${baseSize * 1.125}px; font-weight: 700; margin: 0 0 16px 0; color: ${config.secondary_color || defaultConfig.secondary_color};">Summary</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: ${baseSize * 0.875}px;">
              <div style="padding: 16px; background: ${config.background_color || defaultConfig.background_color}; border-radius: 8px;">
                <div style="color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 8px;">Avg. Profit per Sale</div>
                <div style="font-weight: 700; font-size: ${baseSize * 1.25}px; color: ${config.primary_color || defaultConfig.primary_color};">
                  ₹${stats.totalSales > 0 ? (stats.totalProfit / stats.totalSales).toFixed(2) : '0'}
                </div>
              </div>
              <div style="padding: 16px; background: ${config.background_color || defaultConfig.background_color}; border-radius: 8px;">
                <div style="color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 8px;">Avg. Transaction Value</div>
                <div style="font-weight: 700; font-size: ${baseSize * 1.25}px; color: ${config.primary_color || defaultConfig.primary_color};">
                  ₹${stats.totalSales > 0 ? (stats.totalRevenue / stats.totalSales).toFixed(2) : '0'}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      setTimeout(() => {
        const canvas = document.getElementById('salesChart');
        if (canvas && weeklyData.length > 0) {
          new Chart(canvas, {
            type: 'line',
            data: {
              labels: weeklyData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
              datasets: [{
                label: 'Daily Profit',
                data: weeklyData.map(d => d.profit),
                borderColor: config.primary_color || defaultConfig.primary_color,
                backgroundColor: (config.primary_color || defaultConfig.primary_color) + '20',
                tension: 0.4,
                fill: true
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: function(value) {
                      return '₹' + value;
                    }
                  }
                }
              }
            }
          });
        }
      }, 100);
    }

    function renderSalesList() {
      const content = document.getElementById('main-content');
      const sales = getSales();
      const baseSize = Math.max(12, Math.min(24, config.font_size || defaultConfig.font_size));

      content.innerHTML = `
        <div class="fade-in">
          <h2 style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin-bottom: 20px; color: ${config.secondary_color || defaultConfig.secondary_color};">All Sales</h2>

          <div class="stat-card" style="margin-bottom: 20px;">
            <input type="text" id="search-input" placeholder="Search by product or customer..." style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: ${baseSize}px;">
          </div>

          <div class="stat-card">
            ${sales.length > 0 ? `
              <div style="overflow-x: auto;">
                <table id="sales-table">
                  <thead>
                    <tr style="color: ${config.secondary_color || defaultConfig.secondary_color};">
                      <th>Date</th>
                      <th>Product</th>
                      <th>Customer</th>
                      <th>Qty</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="sales-tbody">
                    ${renderSalesRows(sales)}
                  </tbody>
                </table>
              </div>
            ` : `
              <p style="text-align: center; color: ${config.secondary_color || defaultConfig.secondary_color}; padding: 40px 0;">No sales recorded yet.</p>
            `}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px;">
            <button id="add-sale-btn" style="padding: 14px; background: ${config.primary_color || defaultConfig.primary_color}; color: white; border: none; border-radius: 8px; font-size: ${baseSize}px; font-weight: 600; cursor: pointer;">
              ${sanitizeInput(config.add_sale_button || defaultConfig.add_sale_button)}
            </button>
            <button id="export-csv-btn" style="padding: 14px; background: ${config.accent_color || defaultConfig.accent_color}; color: white; border: none; border-radius: 8px; font-size: ${baseSize}px; font-weight: 600; cursor: pointer;">
              📥 Export CSV
            </button>
          </div>
        </div>
      `;

      document.getElementById('add-sale-btn')?.addEventListener('click', () => navigateTo('sale-form'));
      document.getElementById('export-csv-btn')?.addEventListener('click', exportToCSV);
      document.getElementById('search-input')?.addEventListener('input', handleSearch);
      attachSalesEventListeners();
    }

    function renderSalesRows(sales) {
      return sales.map(sale => {
        const amount = (parseFloat(sale.sellingPrice) || 0) * (parseFloat(sale.quantity) || 0);
        return `
          <tr data-id="${sale.__backendId}">
            <td>${new Date(sale.date).toLocaleDateString()}</td>
            <td>${sanitizeInput(sale.productName)}</td>
            <td>${sanitizeInput(sale.customerName)}</td>
            <td>${parseFloat(sale.quantity) || 0}</td>
            <td style="color: ${config.accent_color || defaultConfig.accent_color}; font-weight: 600;">₹${amount.toFixed(2)}</td>
            <td><span class="status-badge status-${sanitizeInput(sale.status)}">${sanitizeInput(sale.status)}</span></td>
            <td>
              <button class="edit-btn" data-id="${sale.__backendId}" style="padding: 6px 12px; background: ${config.primary_color || defaultConfig.primary_color}; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;">Edit</button>
              <button class="delete-btn" data-id="${sale.__backendId}" style="padding: 6px 12px; background: ${config.error_color || defaultConfig.error_color}; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    function handleSearch(e) {
      const searchTerm = sanitizeInput(e.target.value).toLowerCase();
      const sales = getSales();
      const filtered = sales.filter(s => 
        sanitizeInput(s.productName).toLowerCase().includes(searchTerm) ||
        sanitizeInput(s.customerName).toLowerCase().includes(searchTerm)
      );
      
      const tbody = document.getElementById('sales-tbody');
      if (tbody) {
        tbody.innerHTML = renderSalesRows(filtered);
        attachSalesEventListeners();
      }
    }

    function attachSalesEventListeners() {
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          if (!id) return;
          const sale = getSales().find(s => s.__backendId === id);
          if (sale) navigateTo('sale-form', sale);
        });
      });

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (!id) return;
          
          if (deleteConfirmId === id) {
            const sale = getSales().find(s => s.__backendId === id);
            if (sale) {
              await deleteSale(sale);
            }
            deleteConfirmId = null;
          } else {
            deleteConfirmId = id;
            e.target.textContent = 'Confirm?';
            e.target.classList.add('delete-confirm-btn');
            
            setTimeout(() => {
              if (deleteConfirmId === id) {
                deleteConfirmId = null;
                e.target.textContent = 'Delete';
                e.target.classList.remove('delete-confirm-btn');
              }
            }, 3000);
          }
        });
      });
    }

    function renderSaleForm() {
      const content = document.getElementById('main-content');
      const baseSize = Math.max(12, Math.min(24, config.font_size || defaultConfig.font_size));
      const isEdit = editingRecord !== null;
      const customers = getCustomers();

      const formData = isEdit ? editingRecord : {
        date: new Date().toISOString().split('T')[0],
        productName: '',
        productType: 'coffee',
        customerName: '',
        customerId: '',
        quantity: 1,
        costPerUnit: 0,
        sellingPrice: 0,
        status: 'completed',
        notes: '',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paymentStatus: 'unpaid'
      };

      content.innerHTML = `
        <div class="fade-in">
          <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <button id="back-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; margin-right: 12px; color: ${config.secondary_color || defaultConfig.secondary_color};">←</button>
            <h2 style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin: 0; color: ${config.secondary_color || defaultConfig.secondary_color};">${isEdit ? 'Edit Sale' : 'New Sale'}</h2>
          </div>

          <div class="stat-card">
            <form id="sale-form">
              <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">Date</label>
                <input type="date" id="date" value="${formData.date}" required style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: ${baseSize}px;">
              </div>

              <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">Product Type</label>
                <select id="productType" required style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: ${baseSize}px; cursor: pointer;">
                  <option value="coffee" ${formData.productType === 'coffee' ? 'selected' : ''}>☕ Coffee</option>
                  <option value="tea" ${formData.productType === 'tea' ? 'selected' : ''}>🍵 Tea</option>
                </select>
              </div>

              <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">Product Name</label>
                <input type="text" id="productName" value="${sanitizeInput(formData.productName)}" required placeholder="Enter product name" maxlength="100" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: ${baseSize}px;">
              </div>

              <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">Customer</label>
                <select id="customerName" required style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: ${baseSize}px; cursor: pointer;">
                  <option value="">Select customer</option>
                  ${customers.map(c => `<option value="${sanitizeInput(c.customerName)}" ${formData.customerName === c.customerName ? 'selected' : ''}>${sanitizeInput(c.customerName)}</option>`).join('')}
                  <option value="__new__">+ Add New Customer</option>
                </select>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div>
                  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">Quantity</label>
                  <input type="number" id="quantity" value="${formData.quantity}" required min="1" max="10000" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: ${baseSize}px;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">Status</label>
                  <select id="status" required style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: ${baseSize}px; cursor: pointer;">
                    <option value="completed" ${formData.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="pending" ${formData.status === 'pending' ? 'selected' : ''}>Pending</option>
                  </select>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div>
                  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">Cost per Unit (₹)</label>
                  <input type="number" id="costPerUnit" value="${formData.costPerUnit}" required min="0" max="1000000" step="0.01" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: ${baseSize}px;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">Selling Price (₹)</label>
                  <input type="number" id="sellingPrice" value="${formData.sellingPrice}" required min="0" max="1000000" step="0.01" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: ${baseSize}px;">
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div>
                  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">Payment Status</label>
                  <select id="paymentStatus" required style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: ${baseSize}px; cursor: pointer;">
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; margin-bottom: 8px; font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">Payment Due Date</label>
                  <input type="date" id="dueDate" value="${formData.dueDate}" required style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: ${baseSize}px;">
                </div>
              </div>

              <div style="margin-bottom: 16px; padding: 16px; background: ${config.background_color || defaultConfig.background_color}; border-radius: 8px;">
                <div style="font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">Profit (Selling Price Only):</div>
                <div id="profit-display" style="font-size: ${baseSize * 1.5}px; font-weight: 700; color: ${config.accent_color || defaultConfig.accent_color};">₹0.00</div>
              </div>

              <div style="margin-bottom: 24px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">Notes (Optional)</label>
                <textarea id="notes" rows="3" placeholder="Add any additional notes..." maxlength="2000" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: ${baseSize}px; resize: vertical;">${sanitizeInput(formData.notes || '')}</textarea>
              </div>

              <button type="submit" id="submit-btn" style="width: 100%; padding: 14px; background: ${config.primary_color || defaultConfig.primary_color}; color: white; border: none; border-radius: 8px; font-size: ${baseSize}px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span id="submit-text">${sanitizeInput(config.save_sale_button || defaultConfig.save_sale_button)}</span>
                <div id="submit-spinner" class="loading-spinner" style="display: none;"></div>
              </button>
            </form>
          </div>
        </div>
      `;

      document.getElementById('back-btn').addEventListener('click', () => navigateTo('sales'));
      document.getElementById('sale-form').addEventListener('submit', handleSaleSubmit);
      document.getElementById('customerName').addEventListener('change', handleCustomerSelect);
      
      ['quantity', 'costPerUnit', 'sellingPrice'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateProfitDisplay);
      });
      
      updateProfitDisplay();
    }

    function updateProfitDisplay() {
      const quantity = parseFloat(document.getElementById('quantity')?.value) || 0;
      const costPerUnit = parseFloat(document.getElementById('costPerUnit')?.value) || 0;
      const sellingPrice = parseFloat(document.getElementById('sellingPrice')?.value) || 0;
      const profit = (sellingPrice - costPerUnit) * quantity;
      
      const display = document.getElementById('profit-display');
      if (display) {
        display.textContent = `₹${profit.toFixed(2)}`;
        display.style.color = profit >= 0 ? (config.accent_color || defaultConfig.accent_color) : (config.error_color || defaultConfig.error_color);
      }
    }

    function handleCustomerSelect(e) {
      if (e.target.value === '__new__') {
        showAddCustomerModal();
        e.target.value = '';
      }
    }

    function showAddCustomerModal() {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const baseSize = Math.max(12, Math.min(24, config.font_size || defaultConfig.font_size));

      overlay.innerHTML = `
        <div class="modal-content" style="padding: 0; overflow: hidden;">
          <div style="padding: 24px; background: ${config.primary_color || defaultConfig.primary_color}; color: white; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="font-size: ${baseSize * 1.25}px; font-weight: 700; margin: 0;">Add New Customer</h3>
            <button id="close-customer-modal" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0;">×</button>
          </div>
          <form id="customer-form" style="padding: 24px;">
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">Customer Name *</label>
              <input type="text" id="new-customer-name" required placeholder="Enter customer name" maxlength="100" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: ${baseSize}px;">
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">Phone Number *</label>
              <input type="tel" id="new-customer-phone" required placeholder="Enter phone number (at least 7 digits)" maxlength="20" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: ${baseSize}px;">
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">Email (Optional)</label>
              <input type="email" id="new-customer-email" placeholder="Enter email address" maxlength="100" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: ${baseSize}px;">
            </div>

            <div style="margin-bottom: 24px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: ${config.secondary_color || defaultConfig.secondary_color};">Segment *</label>
              <select id="new-customer-segment" required style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: ${baseSize}px; cursor: pointer;">
                <option value="">Select segment</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Supermarket">Supermarket</option>
                <option value="Cafe">Cafe</option>
                <option value="Casuals">Casuals</option>
              </select>
            </div>

            <button type="submit" style="width: 100%; padding: 14px; background: ${config.primary_color || defaultConfig.primary_color}; color: white; border: none; border-radius: 8px; font-size: ${baseSize}px; font-weight: 600; cursor: pointer;">
              Add Customer
            </button>
          </form>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });

      document.getElementById('close-customer-modal').addEventListener('click', () => {
        overlay.remove();
      });

      document.getElementById('customer-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = validateAndSanitizeString(document.getElementById('new-customer-name').value, 2, 100);
        const phone = document.getElementById('new-customer-phone').value.trim();
        const email = document.getElementById('new-customer-email').value.trim();
        const segment = document.getElementById('new-customer-segment').value;
        
        if (!name) {
          showToast('Name must be 2-100 characters', 'error');
          return;
        }

        if (!validatePhone(phone)) {
          showToast('Phone number must have at least 7 digits', 'error');
          return;
        }

        if (email && !validateEmail(email)) {
          showToast('Please enter a valid email address', 'error');
          return;
        }

        if (!validateSegment(segment)) {
          showToast('Please select a valid segment', 'error');
          return;
        }
        
        await addCustomer(name, phone, email, segment);
        overlay.remove();
      });
    }

    async function addCustomer(name, phone, email, segment) {
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }

      const customer = {
        id: Date.now().toString(),
        type: 'customer',
        customerName: name,
        phone: phone,
        email: email,
        segment: segment,
        totalPurchases: 0,
        createdAt: new Date().toISOString()
      };

      const result = await window.dataSdk.create(customer);
      if (result.isOk) {
        showToast('Customer added successfully');
        
        const select = document.getElementById('customerName');
        if (select) {
          const newOption = document.createElement('option');
          newOption.value = name;
          newOption.textContent = name;
          newOption.selected = true;
          select.insertBefore(newOption, select.lastElementChild);
        }
      } else {
        showToast('Failed to add customer', 'error');
      }
    }

    async function handleSaleSubmit(e) {
      e.preventDefault();
      if (isLoading) return;

      const productName = validateAndSanitizeString(document.getElementById('productName').value, 2, 100);
      const productType = document.getElementById('productType').value;
      const customerName = document.getElementById('customerName').value;
      const quantity = parseFloat(document.getElementById('quantity').value);
      const costPerUnit = parseFloat(document.getElementById('costPerUnit').value);
      const sellingPrice = parseFloat(document.getElementById('sellingPrice').value);
      const status = document.getElementById('status').value;
      const paymentStatus = document.getElementById('paymentStatus').value;

      if (!productName) {
        showToast('Product name must be 2-100 characters', 'error');
        return;
      }

      if (!validateProductType(productType)) {
        showToast('Please select a valid product type', 'error');
        return;
      }

      if (!customerName) {
        showToast('Please select a customer', 'error');
        return;
      }

      if (!validateNumber(quantity, 1)) {
        showToast('Quantity must be between 1 and 1,000,000', 'error');
        return;
      }

      if (!validateNumber(costPerUnit) || !validateNumber(sellingPrice)) {
        showToast('Prices must be valid numbers between 0 and 1,000,000', 'error');
        return;
      }

      if (!validateStatus(status)) {
        showToast('Please select a valid status', 'error');
        return;
      }

      if (!validatePaymentStatus(paymentStatus)) {
        showToast('Please select a valid payment status', 'error');
        return;
      }

      const formData = {
        id: editingRecord?.id || Date.now().toString(),
        type: 'sale',
        date: document.getElementById('date').value,
        productName: productName,
        productType: productType,
        customerName: customerName,
        quantity: quantity,
        costPerUnit: costPerUnit,
        sellingPrice: sellingPrice,
        status: status,
        notes: document.getElementById('notes').value.slice(0, SECURITY_CONFIG.MAX_NOTES_LENGTH),
        paymentStatus: paymentStatus,
        dueDate: document.getElementById('dueDate').value,
        createdAt: editingRecord?.createdAt || new Date().toISOString()
      };

      formData.profit = (formData.sellingPrice - formData.costPerUnit) * formData.quantity;
      formData.amountDue = formData.sellingPrice * formData.quantity;

      if (allRecords.length >= 999 && !editingRecord) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }

      isLoading = true;
      const submitBtn = document.getElementById('submit-btn');
      const submitText = document.getElementById('submit-text');
      const submitSpinner = document.getElementById('submit-spinner');
      
      if (submitBtn && submitText && submitSpinner) {
        submitBtn.disabled = true;
        submitText.style.display = 'none';
        submitSpinner.style.display = 'block';
      }

      let result;
      if (editingRecord) {
        result = await window.dataSdk.update({ ...formData, __backendId: editingRecord.__backendId });
      } else {
        result = await window.dataSdk.create(formData);
      }

      isLoading = false;
      
      if (result.isOk) {
        showToast(editingRecord ? 'Sale updated successfully' : 'Sale added successfully');
        navigateTo('sales');
      } else {
        showToast('Failed to save sale', 'error');
        if (submitBtn && submitText && submitSpinner) {
          submitBtn.disabled = false;
          submitText.style.display = 'block';
          submitSpinner.style.display = 'none';
        }
      }
    }

    async function deleteSale(sale) {
      if (isLoading) return;
      
      isLoading = true;
      const result = await window.dataSdk.delete(sale);
      isLoading = false;
      
      if (result.isOk) {
        showToast('Sale deleted successfully');
      } else {
        showToast('Failed to delete sale', 'error');
      }
    }

    async function deleteCustomer(customer) {
      if (isLoading) return;
      
      isLoading = true;
      const result = await window.dataSdk.delete(customer);
      isLoading = false;
      
      if (result.isOk) {
        showToast('Customer deleted successfully');
      } else {
        showToast('Failed to delete customer', 'error');
      }
    }

    function renderCustomers() {
      const content = document.getElementById('main-content');
      const customers = getCustomers();
      const baseSize = Math.max(12, Math.min(24, config.font_size || defaultConfig.font_size));

      content.innerHTML = `
        <div class="fade-in">
          <h2 style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin-bottom: 8px; color: ${config.secondary_color || defaultConfig.secondary_color};">Customers</h2>
          <p style="font-size: ${baseSize * 0.875}px; color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 24px; opacity: 0.7;">Manage all your customer details and interactions</p>

          <button id="add-customer-btn" style="width: 100%; margin-bottom: 24px; padding: 14px; background: ${config.primary_color || defaultConfig.primary_color}; color: white; border: none; border-radius: 8px; font-size: ${baseSize}px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            + Add New Customer
          </button>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
            ${customers.length > 0 ? customers.map(customer => {
              const customerSales = getSales().filter(s => s.customerName === customer.customerName);
              const totalSpent = customerSales.reduce((sum, s) => sum + ((parseFloat(s.sellingPrice) || 0) * (parseFloat(s.quantity) || 0)), 0);
              const segmentColor = {
                'Wholesale': '#8B5A3C',
                'Supermarket': '#2D5016',
                'Cafe': '#1e3a8a',
                'Casuals': '#7c3aed'
              }[customer.segment] || '#64748b';
              
              return `
                <div class="customer-thumbnail" style="border-top-color: ${segmentColor};">
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div style="flex: 1;">
                      <div class="customer-thumbnail-name">${sanitizeInput(customer.customerName)}</div>
                      ${customer.segment ? `<span style="display: inline-block; padding: 4px 8px; background: ${segmentColor}20; color: ${segmentColor}; border-radius: 8px; font-size: ${baseSize * 0.7}px; font-weight: 700;">${sanitizeInput(customer.segment)}</span>` : ''}
                    </div>
                  </div>

                  <div class="customer-thumbnail-info">
                    <div>📞 ${sanitizeInput(customer.phone || 'No phone')}</div>
                    ${customer.email ? `<div>✉️ ${sanitizeInput(customer.email)}</div>` : ''}
                  </div>

                  <div style="margin: 12px 0; padding: 12px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-size: ${baseSize * 0.875}px; color: ${config.secondary_color || defaultConfig.secondary_color}; margin-bottom: 4px;">📦 Orders: ${customerSales.length}</div>
                    <div style="font-size: ${baseSize * 1.25}px; font-weight: 700; color: ${config.accent_color || defaultConfig.accent_color};">₹${totalSpent.toFixed(2)}</div>
                  </div>

                  <div class="customer-thumbnail-actions">
                    <button class="customer-view-btn" data-id="${customer.__backendId}" style="flex: 1; padding: 8px; background: ${config.primary_color || defaultConfig.primary_color}; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: ${baseSize * 0.8}px; transition: all 0.2s;">📋 View</button>
                    <button class="customer-whatsapp-btn" data-id="${customer.__backendId}" data-phone="${customer.phone}" data-name="${sanitizeInput(customer.customerName)}" style="flex: 1; padding: 8px; background: #25D366; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: ${baseSize * 0.8}px; transition: all 0.2s; margin-left: 6px;">💬 MSG</button>
                    <button class="delete-customer-btn" data-customer-id="${customer.__backendId}" style="flex: 1; padding: 8px; background: ${config.error_color || defaultConfig.error_color}; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: ${baseSize * 0.8}px; transition: all 0.2s; margin-left: 6px;">🗑️ Del</button>
                  </div>
                </div>
              `;
            }).join('') : `
              <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
                <p style="color: ${config.secondary_color || defaultConfig.secondary_color}; font-size: ${baseSize * 1.125}px; font-weight: 600;">No customers yet</p>
                <p style="color: ${config.secondary_color || defaultConfig.secondary_color}; margin-top: 8px; font-size: ${baseSize * 0.875}px;">Add your first customer to get started</p>
              </div>
            `}
          </div>
        </div>
      `;

      document.getElementById('add-customer-btn')?.addEventListener('click', () => {
        showAddCustomerModal();
      });

      document.querySelectorAll('.customer-view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          if (!id) return;
          const customer = customers.find(c => c.__backendId === id);
          if (customer) navigateTo('customer-detail', customer);
        });
      });

      document.querySelectorAll('.customer-whatsapp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const phone = e.target.dataset.phone;
          const name = e.target.dataset.name;
          
          if (!phone || phone.trim() === '') {
            showToast('No phone number available for this customer', 'error');
            return;
          }

          const cleanedPhone = cleanPhoneNumber(phone);
          if (!cleanedPhone) {
            showToast('Could not format phone number. Please check it has enough digits.', 'error');
            return;
          }

          const whatsappUrl = `https://wa.me/${cleanedPhone}`;
          window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
          showToast(`💬 Opening WhatsApp for ${sanitizeInput(name)}...`, 'success');
        });
      });

      let deleteCustomerConfirmId = null;
      document.querySelectorAll('.delete-customer-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = e.target.dataset.customerId;
          if (!id) return;
          
          if (deleteCustomerConfirmId === id) {
            const customer = customers.find(c => c.__backendId === id);
            if (customer) {
              await deleteCustomer(customer);
            }
            deleteCustomerConfirmId = null;
          } else {
            deleteCustomerConfirmId = id;
            e.target.textContent = 'Confirm?';
            e.target.classList.add('delete-confirm-btn');
            
            setTimeout(() => {
              if (deleteCustomerConfirmId === id) {
                deleteCustomerConfirmId = null;
                e.target.textContent = '🗑️ Del';
                e.target.classList.remove('delete-confirm-btn');
              }
            }, 3000);
          }
        });
      });
    }

    function renderCustomerDetail() {
      if (!editingRecord) {
        navigateTo('customers');
        return;
      }

      const content = document.getElementById('main-content');
      const customer = editingRecord;
      const customerSales = getSales().filter(s => s.customerName === customer.customerName);
      const baseSize = Math.max(12, Math.min(24, config.font_size || defaultConfig.font_size));
      const totalSpent = customerSales.reduce((sum, s) => sum + ((parseFloat(s.sellingPrice) || 0) * (parseFloat(s.quantity) || 0)), 0);

      content.innerHTML = `
        <div class="fade-in">
          <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <button id="back-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; margin-right: 12px; color: ${config.secondary_color || defaultConfig.secondary_color};">←</button>
            <h2 style="font-size: ${baseSize * 1.5}px; font-weight: 700; margin: 0; color: ${config.secondary_color || defaultConfig.secondary_color};">Customer Details</h2>
          </div>

          <div class="stat-card" style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
              <h3 style="font-size: ${baseSize * 1.25}px; font-weight: 700; margin: 0; color: ${config.secondary_color || defaultConfig.secondary_color};">${sanitizeInput(customer.customerName)}</h3>
              ${customer.segment ? `<span style="padding: 6px 16px; background: ${config.primary_color || defaultConfig.primary_color}; color: white; border-radius: 16px; font-size: ${baseSize * 0.875}px; font-weight: 600;">${sanitizeInput(customer.segment)}</span>` : ''}
            </div>
            <div style="margin-bottom: 12px;">
              <span style="color: ${config.secondary_color || defaultConfig.secondary_color};">📞 ${sanitizeInput(customer.phone || 'No phone')}</span>
            </div>
            ${customer.email ? `
              <div style="margin-bottom: 12px;">
                <span style="color: ${config.secondary_color || defaultConfig.secondary_color};">✉️ ${sanitizeInput(customer.email)}</span>
              </div>
            ` : ''}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
              <div>
                <div style="font-size: ${baseSize * 0.875}px; color: ${config.secondary_color || defaultConfig.secondary_color};">Total Orders</div>
                <div style="font-size: ${baseSize * 1.5}px; font-weight: 700; color: ${config.primary_color || defaultConfig.primary_color};">${customerSales.length}</div>
              </div>
              <div>
                <div style="font-size: ${baseSize * 0.875}px; color: ${config.secondary_color || defaultConfig.secondary_color};">Total Spent</div>
                <div style="font-size: ${baseSize * 1.5}px; font-weight: 700; color: ${config.accent_color || defaultConfig.accent_color};">₹${totalSpent.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div class="stat-card">
            <h3 style="font-size: ${baseSize * 1.125}px; font-weight: 700; margin: 0 0 16px 0; color: ${config.secondary_color || defaultConfig.secondary_color};">Transaction History</h3>
            ${customerSales.length > 0 ? `
              <div style="overflow-x: auto;">
                <table>
                  <thead>
                    <tr style="color: ${config.secondary_color || defaultConfig.secondary_color};">
                      <th>Date</th>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${customerSales.map(sale => {
                      const amount = (parseFloat(sale.sellingPrice) || 0) * (parseFloat(sale.quantity) || 0);
                      return `
                        <tr>
                          <td>${new Date(sale.date).toLocaleDateString()}</td>
                          <td>${sanitizeInput(sale.productName)}</td>
                          <td>${parseFloat(sale.quantity) || 0}</td>
                          <td style="color: ${config.accent_color || defaultConfig.accent_color}; font-weight: 600;">₹${amount.toFixed(2)}</td>
                          <td><span class="status-badge status-${sanitizeInput(sale.status)}">${sanitizeInput(sale.status)}</span></td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <p style="text-align: center; color: ${config.secondary_color || defaultConfig.secondary_color}; padding: 40px 0;">No transactions yet.</p>
            `}
          </div>
        </div>
      `;

      document.getElementById('back-btn').addEventListener('click', () => navigateTo('customers'));
    }

    // Local development fallback: replaces Canva's Data SDK with browser storage.
    // This allows the app to run on VS Code / GitHub Pages without Canva hosting.
    if (!window.dataSdk) {
      const STORAGE_KEY = 'investo-app-records-v1';
      const readLocalRecords = () => {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          return saved ? JSON.parse(saved) : [];
        } catch (error) {
          console.error('Could not read local app data:', error);
          return [];
        }
      };
      const saveLocalRecords = (records) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      };
      window.dataSdk = {
        _handler: null,
        async init(handler) {
          this._handler = handler;
          handler.onDataChanged(readLocalRecords());
          return { isOk: true };
        },
        async create(record) {
          const records = readLocalRecords();
          const newRecord = { ...record, __backendId: record.__backendId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)) };
          records.push(newRecord);
          saveLocalRecords(records);
          this._handler?.onDataChanged(records);
          return { isOk: true, data: newRecord };
        },
        async update(record) {
          const records = readLocalRecords();
          const index = records.findIndex(item => item.__backendId === record.__backendId);
          if (index < 0) return { isOk: false, error: 'Record not found' };
          records[index] = { ...records[index], ...record };
          saveLocalRecords(records);
          this._handler?.onDataChanged(records);
          return { isOk: true, data: records[index] };
        },
        async delete(record) {
          const records = readLocalRecords().filter(item => item.__backendId !== record.__backendId);
          saveLocalRecords(records);
          this._handler?.onDataChanged(records);
          return { isOk: true };
        }
      };
    }

    const dataHandler = {
      onDataChanged(data) {
        if (!Array.isArray(data)) return;
        
        const previousRecordCount = allRecords.length;
        allRecords = data.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        
        if (previousRecordCount === 0 && allRecords.length > 0) {
          renderCurrentView();
        }
      }
    };

    async function init() {
      const dataSdkResult = await window.dataSdk.init(dataHandler);
      if (!dataSdkResult.isOk) {
        showToast('Failed to initialize app', 'error');
        return;
      }

      if (window.elementSdk) {
        window.elementSdk.init({
          defaultConfig,
          onConfigChange,
          mapToCapabilities: (config) => ({
            recolorables: [
              {
                get: () => config.primary_color || defaultConfig.primary_color,
                set: (value) => {
                  config.primary_color = value;
                  window.elementSdk.setConfig({ primary_color: value });
                }
              },
              {
                get: () => config.secondary_color || defaultConfig.secondary_color,
                set: (value) => {
                  config.secondary_color = value;
                  window.elementSdk.setConfig({ secondary_color: value });
                }
              },
              {
                get: () => config.accent_color || defaultConfig.accent_color,
                set: (value) => {
                  config.accent_color = value;
                  window.elementSdk.setConfig({ accent_color: value });
                }
              },
              {
                get: () => config.background_color || defaultConfig.background_color,
                set: (value) => {
                  config.background_color = value;
                  window.elementSdk.setConfig({ background_color: value });
                }
              },
              {
                get: () => config.error_color || defaultConfig.error_color,
                set: (value) => {
                  config.error_color = value;
                  window.elementSdk.setConfig({ error_color: value });
                }
              }
            ],
            borderables: [],
            fontEditable: {
              get: () => config.font_family || defaultConfig.font_family,
              set: (value) => {
                config.font_family = value;
                window.elementSdk.setConfig({ font_family: value });
              }
            },
            fontSizeable: {
              get: () => config.font_size || defaultConfig.font_size,
              set: (value) => {
                config.font_size = value;
                window.elementSdk.setConfig({ font_size: value });
              }
            }
          }),
          mapToEditPanelValues: (config) => new Map([
            ['app_title', sanitizeInput(config.app_title || defaultConfig.app_title)],
            ['quick_stats_title', sanitizeInput(config.quick_stats_title || defaultConfig.quick_stats_title)],
            ['add_sale_button', sanitizeInput(config.add_sale_button || defaultConfig.add_sale_button)],
            ['save_sale_button', sanitizeInput(config.save_sale_button || defaultConfig.save_sale_button)],
            ['reports_title', sanitizeInput(config.reports_title || defaultConfig.reports_title)],
            ['pending_payments_title', sanitizeInput(config.pending_payments_title || defaultConfig.pending_payments_title)]
          ])
        });
      }

      renderApp();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  
