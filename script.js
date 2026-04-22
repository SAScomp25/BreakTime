/* =========================================================
   Coffee House Static PWA
   script.js - نسخة نظيفة ومحدثة
   =========================================================
   يحتوي على:
   1) إعدادات الكوفي القابلة للتغيير
   2) LocalStorage / SessionStorage
   3) المنيو والسلة
   4) الطلبات السابقة
   5) نقاط الولاء المباشرة عبر QR الكاش
   6) QR Scanner + Manual Code
   7) اللغة والثيم
   8) زر تثبيت التطبيق PWA
   9) إصلاح إرسال واتساب للجوال وPWA
   ========================================================= */

/* =========================================================
   1) إعدادات الكوفي - غيّر هذه القيم لكل كوفي جديد
   ========================================================= */
const COFFEE_CONFIG = {
  coffeeId: "coffee-house-001", // غيّره لكل كوفي
  coffeeName: "Coffee House", // اسم الكوفي
  tagline: "Specialty Coffee & Fresh Taste", // وصف قصير
  whatsappNumber: "962786237678", // رقم الواتساب بدون + أو مسافات
  currency: "JOD",
  cashierQrSecret: "CH-LOYALTY-STORE-001", // لازم يطابق cashier-qr.html
  scanCooldownMinutes: 180, // مهلة إعادة احتساب النقاط من نفس الجهاز
  pointsPerScan: 10, // عدد النقاط المضافة عند مسح QR صحيح
  tiers: {
    bronzeMax: 99,
    silverMax: 249
    // Gold = أعلى من silverMax
  }
};

/* =========================================================
   2) مفاتيح التخزين
   ========================================================= */
const STORAGE_KEYS = {
  language: `${COFFEE_CONFIG.coffeeId}_language`,
  theme: `${COFFEE_CONFIG.coffeeId}_theme`,
  customer: `${COFFEE_CONFIG.coffeeId}_customer`,
  orders: `${COFFEE_CONFIG.coffeeId}_orders`,
  points: `${COFFEE_CONFIG.coffeeId}_points`,
  lastQrClaimAt: `${COFFEE_CONFIG.coffeeId}_last_qr_claim_at`
};

const SESSION_KEYS = {
  qrClaimedThisSession: `${COFFEE_CONFIG.coffeeId}_qr_claimed_this_session`
};

/* =========================================================
   3) الحالة العامة
   ========================================================= */
let menuData = [];
let currentFilter = "all";
let currentLanguage = "ar";
let cart = [];
let scannerStream = null;
let scannerLoopId = null;
let deferredInstallPrompt = null;

/* =========================================================
   4) النصوص متعددة اللغات
   ========================================================= */
const I18N = {
  ar: {
    brandName: COFFEE_CONFIG.coffeeName,
    brandTagline: COFFEE_CONFIG.tagline,
    customerCodeLabel: "كود العميل",
    loyaltyPointsLabel: "نقاط الولاء",
    customerLevelLabel: "مستوى العميل",
    filterAll: "الكل",
    filterHot: "ساخن",
    filterCold: "بارد",
    cartTitle: "السلة",
    totalLabel: "المجموع",
    sendOrder: "إرسال الطلب إلى واتساب",
    previousOrders: "الطلبات السابقة",
    customerNamePlaceholder: "الاسم",
    customerPhonePlaceholder: "رقم الهاتف",
    customerAddressPlaceholder: "العنوان",
    pendingPointsHint: "بعد الدفع عند الكاش، امسح QR لتحصل على نقاط الولاء.",
    bestSeller: "الأكثر مبيعًا",
    add: "إضافة",
    emptyCart: "السلة فارغة حاليًا.",
    remove: "حذف",
    repeatOrder: "إعادة الطلب",
    orderCode: "رقم الطلب",
    paidOn: "تاريخ الطلب",
    scannerTitle: "مسح QR الكاش",
    scannerHint: "وجّه الكاميرا إلى QR الموجود عند الكاش لتأكيد إضافة نقاط الولاء.",
    manualQrLabel: "أو أدخل كود الكاش يدويًا",
    openCamera: "فتح الكاميرا",
    stopCamera: "إيقاف الكاميرا",
    manualConfirm: "تأكيد الكود",
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    pointsAdded: "تمت إضافة النقاط بنجاح",
    pointsAddedSubtitle: "أحسنت! تم تحديث رصيد الولاء.",
    orderSent: "تم حفظ الطلب وسيتم تحويلك إلى واتساب.",
    validationName: "يرجى إدخال الاسم.",
    validationPhone: "يرجى إدخال رقم الهاتف.",
    validationAddress: "يرجى إدخال العنوان.",
    validationCart: "السلة فارغة.",
    confirmSend: "هل أنت متأكد من إرسال الطلب؟",
    noPreviousOrders: "لا توجد طلبات سابقة بعد.",
    invalidCashierQr: "هذا ليس QR الكاش الصحيح.",
    scanCooldown: "تم احتساب النقاط سابقًا. حاول لاحقًا.",
    cameraNotSupported: "المتصفح لا يدعم مسح QR بالكاميرا. استخدم الإدخال اليدوي.",
    cameraPermissionError: "تعذر فتح الكاميرا. تأكد من السماح بالوصول.",
    quickScanLabel: "📷 امسح كود الكاش لتحصل على نقاطك",
    installApp: "📲 نزّل التطبيق على هاتفك",
    installIosHint: "على iPhone: افتح الموقع في Safari ثم Share ثم Add to Home Screen.",
    installAppUnavailable: "خيار التثبيت غير متاح الآن. استخدم Chrome على Android أو Safari على iPhone.",
    whatsappOpenError: "تعذر فتح واتساب. تأكد من تثبيت واتساب وصحة الرقم."
  },
  en: {
    brandName: COFFEE_CONFIG.coffeeName,
    brandTagline: COFFEE_CONFIG.tagline,
    customerCodeLabel: "Customer Code",
    loyaltyPointsLabel: "Loyalty Points",
    customerLevelLabel: "Customer Level",
    filterAll: "All",
    filterHot: "Hot",
    filterCold: "Cold",
    cartTitle: "Cart",
    totalLabel: "Total",
    sendOrder: "Send Order to WhatsApp",
    previousOrders: "Previous Orders",
    customerNamePlaceholder: "Name",
    customerPhonePlaceholder: "Phone Number",
    customerAddressPlaceholder: "Address",
    pendingPointsHint: "After payment at the cashier, scan the QR to get loyalty points.",
    bestSeller: "Best Seller",
    add: "Add",
    emptyCart: "Your cart is empty.",
    remove: "Remove",
    repeatOrder: "Repeat Order",
    orderCode: "Order ID",
    paidOn: "Order Date",
    scannerTitle: "Scan Cashier QR",
    scannerHint: "Point the camera to the cashier QR to confirm loyalty points.",
    manualQrLabel: "Or enter the cashier code manually",
    openCamera: "Open Camera",
    stopCamera: "Stop Camera",
    manualConfirm: "Confirm Code",
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    pointsAdded: "Points added successfully",
    pointsAddedSubtitle: "Great! Your loyalty balance has been updated.",
    orderSent: "Order saved and you will be redirected to WhatsApp.",
    validationName: "Please enter your name.",
    validationPhone: "Please enter your phone number.",
    validationAddress: "Please enter your address.",
    validationCart: "Cart is empty.",
    confirmSend: "Are you sure you want to send the order?",
    noPreviousOrders: "No previous orders yet.",
    invalidCashierQr: "This is not the correct cashier QR.",
    scanCooldown: "Points were already claimed recently. Please try later.",
    cameraNotSupported: "This browser does not support QR camera scanning. Use manual input.",
    cameraPermissionError: "Could not access the camera. Please allow camera access.",
    quickScanLabel: "📷 Scan cashier QR to get your points",
    installApp: "📲 Install the app on your phone",
    installIosHint: "On iPhone: open the site in Safari, tap Share, then Add to Home Screen.",
    installAppUnavailable: "Install is not available right now. Use Chrome on Android or Safari on iPhone.",
    whatsappOpenError: "Could not open WhatsApp. Make sure WhatsApp is installed and the number is correct."
  }
};

/* =========================================================
   5) اختصارات DOM
   ========================================================= */
const el = {
  brandName: document.getElementById("brandName"),
  brandTagline: document.getElementById("brandTagline"),
  customerCodeLabel: document.getElementById("customerCodeLabel"),
  customerCodeValue: document.getElementById("customerCodeValue"),
  loyaltyPointsLabel: document.getElementById("loyaltyPointsLabel"),
  pointsValue: document.getElementById("pointsValue"),
  customerLevelLabel: document.getElementById("customerLevelLabel"),
  levelValue: document.getElementById("levelValue"),

  filterAllBtn: document.getElementById("filterAllBtn"),
  filterHotBtn: document.getElementById("filterHotBtn"),
  filterColdBtn: document.getElementById("filterColdBtn"),

  menuGrid: document.getElementById("menuGrid"),

  cartFab: document.getElementById("cartFab"),
  cartCount: document.getElementById("cartCount"),
  cartDrawer: document.getElementById("cartDrawer"),
  overlay: document.getElementById("overlay"),
  closeCartBtn: document.getElementById("closeCartBtn"),

  cartTitle: document.getElementById("cartTitle"),
  cartItems: document.getElementById("cartItems"),
  totalLabel: document.getElementById("totalLabel"),
  cartTotalValue: document.getElementById("cartTotalValue"),
  pendingPointsHint: document.getElementById("pendingPointsHint"),

  customerName: document.getElementById("customerName"),
  customerPhone: document.getElementById("customerPhone"),
  customerAddress: document.getElementById("customerAddress"),
  sendOrderBtn: document.getElementById("sendOrderBtn"),

  previousOrdersTitle: document.getElementById("previousOrdersTitle"),
  ordersList: document.getElementById("ordersList"),

  langArBtn: document.getElementById("langArBtn"),
  langEnBtn: document.getElementById("langEnBtn"),
  themeBtn: document.getElementById("themeBtn"),

  scannerModal: document.getElementById("scannerModal"),
  closeScannerBtn: document.getElementById("closeScannerBtn"),
  scannerTitle: document.getElementById("scannerTitle"),
  scannerHint: document.getElementById("scannerHint"),
  scannerVideo: document.getElementById("scannerVideo"),
  startScannerBtn: document.getElementById("startScannerBtn"),
  stopScannerBtn: document.getElementById("stopScannerBtn"),
  manualQrLabel: document.getElementById("manualQrLabel"),
  manualQrInput: document.getElementById("manualQrInput"),
  manualQrSubmitBtn: document.getElementById("manualQrSubmitBtn"),

  quickScanBtn: document.getElementById("quickScanBtn"),
  installAppBtn: document.getElementById("installAppBtn"),

  pointsSuccess: document.getElementById("pointsSuccess"),
  pointsSuccessTitle: document.getElementById("pointsSuccessTitle"),
  pointsSuccessSubtitle: document.getElementById("pointsSuccessSubtitle")
};

/* =========================================================
   6) أدوات مساعدة
   ========================================================= */
function t(key) {
  return I18N[currentLanguage][key];
}

function formatCurrency(value) {
  return `${Number(value).toFixed(2)} ${COFFEE_CONFIG.currency}`;
}

function createCustomerCode() {
  const randomPart =
    (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();

  return `CU-${randomPart}`;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function getStoredCustomer() {
  const raw = localStorage.getItem(STORAGE_KEYS.customer);
  if (raw) return JSON.parse(raw);

  const customer = {
    code: createCustomerCode(),
    createdAt: Date.now()
  };

  localStorage.setItem(STORAGE_KEYS.customer, JSON.stringify(customer));
  return customer;
}

function getStoredPoints() {
  return Number(localStorage.getItem(STORAGE_KEYS.points) || "0");
}

function setStoredPoints(points) {
  localStorage.setItem(STORAGE_KEYS.points, String(points));
}

function getStoredOrders() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.orders) || "[]");
}

function setStoredOrders(orders) {
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
}

function getCustomerLevel(points) {
  if (points <= COFFEE_CONFIG.tiers.bronzeMax) return t("bronze");
  if (points <= COFFEE_CONFIG.tiers.silverMax) return t("silver");
  return t("gold");
}

function calculateOrderTotal(items) {
  return items.reduce((sum, item) => sum + (Number(item.price) * Number(item.qty)), 0);
}

function formatDate(timestamp) {
  try {
    return new Date(timestamp).toLocaleString(currentLanguage === "ar" ? "ar-JO" : "en-US");
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

/* =========================================================
   7) صوت النجاح + أنيميشن النجاح
   ========================================================= */
function playSuccessSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1175, now + 0.18);

    osc2.frequency.setValueAtTime(660, now);
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.18);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch {}
}

function showPointsSuccess() {
  el.pointsSuccessTitle.textContent = t("pointsAdded");
  el.pointsSuccessSubtitle.textContent = t("pointsAddedSubtitle");
  el.pointsSuccess.classList.add("show");
  playSuccessSound();

  setTimeout(() => {
    el.pointsSuccess.classList.remove("show");
  }, 1800);
}

/* =========================================================
   8) واجهة عامة
   ========================================================= */
function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = currentLanguage === "ar" ? "rtl" : "ltr";

  el.brandName.textContent = t("brandName");
  el.brandTagline.textContent = t("brandTagline");
  el.customerCodeLabel.textContent = t("customerCodeLabel");
  el.loyaltyPointsLabel.textContent = t("loyaltyPointsLabel");
  el.customerLevelLabel.textContent = t("customerLevelLabel");

  el.filterAllBtn.textContent = t("filterAll");
  el.filterHotBtn.textContent = t("filterHot");
  el.filterColdBtn.textContent = t("filterCold");

  el.cartTitle.textContent = t("cartTitle");
  el.totalLabel.textContent = t("totalLabel");
  el.sendOrderBtn.textContent = t("sendOrder");
  el.previousOrdersTitle.textContent = t("previousOrders");

  el.customerName.placeholder = t("customerNamePlaceholder");
  el.customerPhone.placeholder = t("customerPhonePlaceholder");
  el.customerAddress.placeholder = t("customerAddressPlaceholder");

  el.pendingPointsHint.textContent = t("pendingPointsHint");

  el.scannerTitle.textContent = t("scannerTitle");
  el.scannerHint.textContent = t("scannerHint");
  el.manualQrLabel.textContent = t("manualQrLabel");
  el.startScannerBtn.textContent = t("openCamera");
  el.stopScannerBtn.textContent = t("stopCamera");
  el.manualQrSubmitBtn.textContent = t("manualConfirm");

  el.quickScanBtn.textContent = t("quickScanLabel");

  if (el.installAppBtn) {
    el.installAppBtn.textContent = t("installApp");
  }
}

function renderSummary() {
  const customer = getStoredCustomer();
  const points = getStoredPoints();

  el.customerCodeValue.textContent = customer.code;
  el.pointsValue.textContent = points;
  el.levelValue.textContent = getCustomerLevel(points);
}

function renderFilters() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === currentFilter);
  });
}

function renderMenu() {
  el.menuGrid.innerHTML = "";

  const filteredItems = menuData.filter(item => {
    if (currentFilter === "all") return true;
    return item.type === currentFilter;
  });

  filteredItems.forEach(item => {
    const card = document.createElement("article");
    card.className = "menu-card glass";

    card.innerHTML = `
      <img class="menu-img" src="${item.image}" alt="${item.name[currentLanguage]}" />
      <div class="menu-info">
        <div class="menu-name">${item.name[currentLanguage]}</div>
        <div class="menu-meta">
          <span>${formatCurrency(item.price)}</span>
          ${item.best ? `<span class="badge">⭐ ${t("bestSeller")}</span>` : ""}
        </div>
      </div>
      <button class="add-btn" type="button">${t("add")}</button>
    `;

    card.querySelector(".add-btn").addEventListener("click", () => addToCart(item));
    el.menuGrid.appendChild(card);
  });
}

function renderCart() {
  el.cartCount.textContent = String(cart.reduce((sum, item) => sum + item.qty, 0));
  el.cartItems.innerHTML = "";

  if (cart.length === 0) {
    el.cartItems.innerHTML = `<div class="empty-box">${t("emptyCart")}</div>`;
    el.cartTotalValue.textContent = formatCurrency(0);
    return;
  }

  cart.forEach((item, index) => {
    const lineTotal = Number(item.price) * Number(item.qty);

    const row = document.createElement("div");
    row.className = "cart-item";

    row.innerHTML = `
      <div>
        <div class="cart-item-title">${item.name[currentLanguage]}</div>
        <div class="cart-item-sub">${formatCurrency(item.price)} × ${item.qty}</div>
        <div class="qty-wrap">
          <button class="qty-btn" type="button">-</button>
          <strong>${item.qty}</strong>
          <button class="qty-btn" type="button">+</button>
        </div>
      </div>

      <div>
        <div class="cart-item-title">${formatCurrency(lineTotal)}</div>
        <button class="remove-btn" type="button">${t("remove")}</button>
      </div>
    `;

    const minusBtn = row.querySelectorAll(".qty-btn")[0];
    const plusBtn = row.querySelectorAll(".qty-btn")[1];
    const removeBtn = row.querySelector(".remove-btn");

    minusBtn.addEventListener("click", () => changeCartQty(index, -1));
    plusBtn.addEventListener("click", () => changeCartQty(index, 1));
    removeBtn.addEventListener("click", () => removeFromCart(index));

    el.cartItems.appendChild(row);
  });

  const total = calculateOrderTotal(cart);
  el.cartTotalValue.textContent = formatCurrency(total);
}

function renderOrders() {
  const orders = getStoredOrders();
  el.ordersList.innerHTML = "";

  if (orders.length === 0) {
    el.ordersList.innerHTML = `<div class="empty-box">${t("noPreviousOrders")}</div>`;
    return;
  }

  const sortedOrders = [...orders].sort((a, b) => b.createdAt - a.createdAt);

  sortedOrders.forEach(order => {
    const preview = order.items
      .map(item => `${item.name[currentLanguage]} × ${item.qty}`)
      .join(" • ");

    const orderCard = document.createElement("div");
    orderCard.className = "order-card";

    orderCard.innerHTML = `
      <div class="order-card-head">
        <strong>${t("orderCode")}: ${order.id}</strong>
        <span class="order-meta">${t("paidOn")}: ${formatDate(order.createdAt)}</span>
      </div>

      <div class="order-items-preview">${preview}</div>

      <div class="order-meta">${t("totalLabel")}: ${formatCurrency(order.total)}</div>

      <div class="order-actions">
        <button class="repeat-btn" type="button">${t("repeatOrder")}</button>
      </div>
    `;

    orderCard.querySelector(".repeat-btn").addEventListener("click", () => repeatOrder(order.id));
    el.ordersList.appendChild(orderCard);
  });
}

/* =========================================================
   9) السلة
   ========================================================= */
function addToCart(item) {
  const found = cart.find(cartItem => cartItem.name.ar === item.name.ar);

  if (found) {
    found.qty += 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }

  renderCart();
}

function changeCartQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  renderCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

/* =========================================================
   10) فتح وإغلاق السلة
   ========================================================= */
function openCart() {
  el.cartDrawer.classList.add("open");
  el.overlay.classList.add("show");
}

function closeCart() {
  el.cartDrawer.classList.remove("open");
  el.overlay.classList.remove("show");
}

/* =========================================================
   11) التحقق وإرسال الطلب
   ========================================================= */
function validateOrderForm() {
  if (!el.customerName.value.trim()) {
    alert(t("validationName"));
    return false;
  }
  if (!el.customerPhone.value.trim()) {
    alert(t("validationPhone"));
    return false;
  }
  if (!el.customerAddress.value.trim()) {
    alert(t("validationAddress"));
    return false;
  }
  if (cart.length === 0) {
    alert(t("validationCart"));
    return false;
  }
  return true;
}

function sendOrderToWhatsApp() {
  if (!validateOrderForm()) return;
  if (!window.confirm(t("confirmSend"))) return;

  const customer = getStoredCustomer();
  const total = calculateOrderTotal(cart);

  const order = {
    id: `ORD-${Date.now().toString().slice(-8)}`,
    customerCode: customer.code,
    customerName: el.customerName.value.trim(),
    customerPhone: el.customerPhone.value.trim(),
    customerAddress: el.customerAddress.value.trim(),
    items: cart.map(item => ({ ...item })),
    total,
    createdAt: Date.now()
  };

  const isArabic = currentLanguage === "ar";

  let message = "";
  message += isArabic
    ? `طلب جديد - ${COFFEE_CONFIG.coffeeName}\n`
    : `New Order - ${COFFEE_CONFIG.coffeeName}\n`;

  message += isArabic
    ? `رقم الطلب: ${order.id}\n`
    : `Order ID: ${order.id}\n`;

  message += isArabic
    ? `كود العميل: ${order.customerCode}\n\n`
    : `Customer Code: ${order.customerCode}\n\n`;

  message += isArabic ? "الأصناف:\n" : "Items:\n";

  order.items.forEach(item => {
    message += `- ${item.name[currentLanguage]} x${item.qty} = ${formatCurrency(item.price * item.qty)}\n`;
  });

  message += "\n";
  message += isArabic
    ? `المجموع: ${formatCurrency(order.total)}\n`
    : `Total: ${formatCurrency(order.total)}\n`;

  message += isArabic
    ? `الاسم: ${order.customerName}\n`
    : `Name: ${order.customerName}\n`;

  message += isArabic
    ? `الهاتف: ${order.customerPhone}\n`
    : `Phone: ${order.customerPhone}\n`;

  message += isArabic
    ? `العنوان: ${order.customerAddress}\n`
    : `Address: ${order.customerAddress}\n`;

  const phone = String(COFFEE_CONFIG.whatsappNumber).replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

  // نحفظ الطلب أولًا
  const orders = getStoredOrders();
  orders.push(order);
  setStoredOrders(orders);

  // نفرغ السلة قبل التحويل
  cart = [];
  renderCart();
  renderOrders();
  closeCart();

  alert(t("orderSent"));

  // طريقة أكثر توافقًا مع الجوال وPWA
  try {
    window.location.href = whatsappUrl;
  } catch {
    try {
      const newWindow = window.open(whatsappUrl, "_blank");
      if (!newWindow) {
        alert(t("whatsappOpenError"));
      }
    } catch {
      alert(t("whatsappOpenError"));
    }
  }
}

function repeatOrder(orderId) {
  const orders = getStoredOrders();
  const order = orders.find(item => item.id === orderId);
  if (!order) return;

  cart = order.items.map(item => ({ ...item }));
  renderCart();
  openCart();
}

/* =========================================================
   12) نقاط الولاء المباشرة عبر QR
   ========================================================= */
function addPointsToCustomer(points) {
  const currentPoints = getStoredPoints();
  setStoredPoints(currentPoints + points);
  renderSummary();
}

function canClaimQrPointsNow() {
  const claimedThisSession = sessionStorage.getItem(SESSION_KEYS.qrClaimedThisSession);

  if (claimedThisSession === "true") {
    return false;
  }

  const lastClaimAt = Number(localStorage.getItem(STORAGE_KEYS.lastQrClaimAt) || "0");
  const now = Date.now();
  const cooldownMs = COFFEE_CONFIG.scanCooldownMinutes * 60 * 1000;

  if (lastClaimAt && (now - lastClaimAt) < cooldownMs) {
    return false;
  }

  return true;
}

function markQrClaimSuccess() {
  sessionStorage.setItem(SESSION_KEYS.qrClaimedThisSession, "true");
  localStorage.setItem(STORAGE_KEYS.lastQrClaimAt, String(Date.now()));
}

function claimPointsDirectlyByQr(qrPayload) {
  if (qrPayload !== COFFEE_CONFIG.cashierQrSecret) {
    alert(t("invalidCashierQr"));
    return;
  }

  if (!canClaimQrPointsNow()) {
    alert(t("scanCooldown"));
    return;
  }

  addPointsToCustomer(COFFEE_CONFIG.pointsPerScan);
  markQrClaimSuccess();
  showPointsSuccess();
}

/* =========================================================
   13) QR Scanner
   ========================================================= */
function openScannerModalDirect() {
  el.manualQrInput.value = "";
  el.scannerModal.classList.add("show");
}

function closeScannerModal() {
  el.scannerModal.classList.remove("show");
  stopScanner();
}

async function startScanner() {
  if (!("BarcodeDetector" in window)) {
    alert(t("cameraNotSupported"));
    return;
  }

  try {
    const detector = new BarcodeDetector({ formats: ["qr_code"] });

    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });

    el.scannerVideo.srcObject = scannerStream;
    await el.scannerVideo.play();

    const scanFrame = async () => {
      if (!scannerStream) return;

      try {
        const barcodes = await detector.detect(el.scannerVideo);
        if (barcodes && barcodes.length > 0) {
          const rawValue = barcodes[0].rawValue || "";
          claimPointsDirectlyByQr(rawValue);
          closeScannerModal();
          return;
        }
      } catch {}

      scannerLoopId = requestAnimationFrame(scanFrame);
    };

    scanFrame();
  } catch {
    alert(t("cameraPermissionError"));
  }
}

function stopScanner() {
  if (scannerLoopId) {
    cancelAnimationFrame(scannerLoopId);
    scannerLoopId = null;
  }

  if (scannerStream) {
    scannerStream.getTracks().forEach(track => track.stop());
    scannerStream = null;
  }

  el.scannerVideo.srcObject = null;
}

function submitManualQrCode() {
  const value = el.manualQrInput.value.trim();
  if (!value) return;

  claimPointsDirectlyByQr(value);
  closeScannerModal();
}

/* =========================================================
   14) اللغة والثيم
   ========================================================= */
function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem(STORAGE_KEYS.language, lang);

  applyTranslations();
  renderSummary();
  renderFilters();
  renderMenu();
  renderCart();
  renderOrders();
}

function toggleTheme() {
  const isLight = document.body.classList.toggle("light");
  localStorage.setItem(STORAGE_KEYS.theme, isLight ? "light" : "dark");
}

/* =========================================================
   15) تحميل المنيو
   ========================================================= */
async function loadMenu() {
  const response = await fetch("menu.json");
  const data = await response.json();
  menuData = data.items || [];
  renderMenu();
}

/* =========================================================
   16) زر تثبيت التطبيق
   ========================================================= */
function setupInstallPrompt() {
  if (!el.installAppBtn) return;

  if (isIOS()) {
    el.installAppBtn.hidden = false;
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    el.installAppBtn.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    el.installAppBtn.hidden = true;
  });
}

/* =========================================================
   17) ربط الأحداث
   ========================================================= */
function bindEvents() {
  el.langArBtn.addEventListener("click", () => setLanguage("ar"));
  el.langEnBtn.addEventListener("click", () => setLanguage("en"));
  el.themeBtn.addEventListener("click", toggleTheme);

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      renderFilters();
      renderMenu();
    });
  });

  el.cartFab.addEventListener("click", openCart);
  el.closeCartBtn.addEventListener("click", closeCart);
  el.overlay.addEventListener("click", closeCart);
  el.sendOrderBtn.addEventListener("click", sendOrderToWhatsApp);

  el.quickScanBtn.addEventListener("click", openScannerModalDirect);
  el.closeScannerBtn.addEventListener("click", closeScannerModal);
  el.startScannerBtn.addEventListener("click", startScanner);
  el.stopScannerBtn.addEventListener("click", stopScanner);
  el.manualQrSubmitBtn.addEventListener("click", submitManualQrCode);

  if (el.installAppBtn) {
    el.installAppBtn.addEventListener("click", async () => {
      if (isIOS()) {
        alert(t("installIosHint"));
        return;
      }

      if (!deferredInstallPrompt) {
        alert(t("installAppUnavailable"));
        return;
      }

      deferredInstallPrompt.prompt();

      try {
        await deferredInstallPrompt.userChoice;
      } catch {}

      deferredInstallPrompt = null;
      el.installAppBtn.hidden = true;
    });
  }

  el.pointsSuccess.addEventListener("click", () => {
    el.pointsSuccess.classList.remove("show");
  });
}

/* =========================================================
   18) التهيئة
   ========================================================= */
function initSettings() {
  const savedLang = localStorage.getItem(STORAGE_KEYS.language) || "ar";
  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || "dark";

  if (savedTheme === "light") {
    document.body.classList.add("light");
  }

  currentLanguage = savedLang;
}

async function initApp() {
  initSettings();
  bindEvents();
  setupInstallPrompt();
  applyTranslations();
  renderSummary();
  renderFilters();
  renderCart();
  renderOrders();
  await loadMenu();
}

initApp();

/* =========================================================
   19) تسجيل Service Worker
   ========================================================= */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
