// ===================== Mock data: vendors + menu =====================
// Swap these for real API calls to your restaurant/menu database.
const VENDORS = [
  { id: "v1", name: "Ember & Ash Grill", lat: 6.5244, lng: 3.3792, etaBase: 9 },
  { id: "v2", name: "Green Bowl Kitchen", lat: 6.5310, lng: 3.3690, etaBase: 7 },
  { id: "v3", name: "Casa Nonna", lat: 6.5180, lng: 3.3850, etaBase: 11 },
  { id: "v4", name: "Spice Route Express", lat: 6.5400, lng: 3.3600, etaBase: 8 },
];

const MENU = [
  { id: "m1", name: "Smoked Beef Suya Wrap", desc: "Charred beef, onions, pepper spice, flatbread", price: 3200, tag: "Bestseller", vendorIds: ["v1", "v4"], veg: false },
  { id: "m2", name: "Jollof & Grilled Chicken", desc: "Smoky party jollof, herb-grilled chicken thigh", price: 4500, tag: "Bestseller", vendorIds: ["v1", "v2", "v3"], veg: false },
  { id: "m3", name: "Roasted Veg Buddha Bowl", desc: "Quinoa, roasted pepper, avocado, tahini", price: 3800, tag: null, vendorIds: ["v2"], veg: true },
  { id: "m4", name: "Truffle Mushroom Pasta", desc: "Fresh tagliatelle, wild mushroom, parmesan", price: 5200, tag: null, vendorIds: ["v3"], veg: true },
  { id: "m5", name: "Paneer Tikka Masala", desc: "Charred paneer, tomato-cashew gravy, basmati", price: 4200, tag: "Spicy", vendorIds: ["v4"], veg: true },
  { id: "m6", name: "Peppered Snail Skewers", desc: "Bush pepper glaze, grilled sweet corn", price: 4800, tag: "Spicy", vendorIds: ["v1"], veg: false },
  { id: "m7", name: "Coconut Rice & Fish", desc: "Toasted coconut rice, pan-seared croaker", price: 4600, tag: null, vendorIds: ["v2", "v3"], veg: false },
  { id: "m8", name: "Tandoori Chicken Bowl", desc: "Char-grilled chicken, mint yoghurt, saffron rice", price: 4400, tag: "Bestseller", vendorIds: ["v4"], veg: false },
];

// Simulated customer location (swap for real geolocation)
const CUSTOMER_LOC = { lat: 6.5265, lng: 3.3745 };

// ===================== State =====================
let cart = {}; // itemId -> qty
let filter = "all";
let countdownInterval = null;

// ===================== Helpers =====================
function distanceKm(a, b) {
  const dx = a.lat - b.lat;
  const dy = a.lng - b.lng;
  return Math.sqrt(dx * dx + dy * dy) * 111; // rough flat-earth approximation for demo
}

function nearestVendorFor(itemId) {
  const item = MENU.find((m) => m.id === itemId);
  if (!item) return null;
  const candidates = VENDORS.filter((v) => item.vendorIds.includes(v.id))
    .map((v) => ({ vendor: v, dist: distanceKm(v, CUSTOMER_LOC) }))
    .sort((a, b) => a.dist - b.dist);
  return candidates[0] || null;
}

function formatNaira(n) {
  return "₦" + n.toLocaleString("en-NG");
}

function getCartItems() {
  return Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ item: MENU.find((m) => m.id === id), qty }));
}

function getCartTotal() {
  return getCartItems().reduce((sum, { item, qty }) => sum + item.price * qty, 0);
}

function getItemCount() {
  return getCartItems().reduce((sum, { qty }) => sum + qty, 0);
}

// group cart lines by nearest vendor
function getVendorGroups() {
  const groups = {};
  getCartItems().forEach(({ item, qty }) => {
    const match = nearestVendorFor(item.id);
    if (!match) return;
    const vId = match.vendor.id;
    if (!groups[vId]) groups[vId] = { vendor: match.vendor, lines: [], maxDist: 0 };
    groups[vId].lines.push({ item, qty, dist: match.dist });
    groups[vId].maxDist = Math.max(groups[vId].maxDist, match.dist);
  });
  return Object.values(groups);
}

// ===================== Rendering: menu =====================
function renderMenu() {
  const grid = document.getElementById("menuGrid");
  const items = MENU.filter((m) => {
    if (filter === "veg") return m.veg;
    if (filter === "bestseller") return m.tag === "Bestseller";
    return true;
  });

  grid.innerHTML = items.map((item) => {
    const qty = cart[item.id] || 0;
    const nearest = nearestVendorFor(item.id);
    const etaLine = nearest
      ? `<div class="eta-line">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
           <span>~${Math.round(nearest.vendor.etaBase + nearest.dist * 2)} min from ${nearest.vendor.name}</span>
         </div>`
      : "";

    const tagHtml = item.veg
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3D5A45" stroke-width="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`
      : "";
    const badgeHtml = item.tag
      ? `<span class="tag ${item.tag === "Spicy" ? "spicy" : "bestseller"}">${item.tag}</span>`
      : "";

    const actionHtml = qty === 0
      ? `<button class="add-btn" data-add="${item.id}">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
           Add
         </button>`
      : `<div class="qty-stepper">
           <button data-remove="${item.id}" aria-label="Remove one">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/></svg>
           </button>
           <span>${qty}</span>
           <button data-add="${item.id}" aria-label="Add one">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
           </button>
         </div>`;

    return `
      <div class="menu-card">
        <div class="menu-card-top">${tagHtml}${badgeHtml}</div>
        <h3>${item.name}</h3>
        <p class="desc">${item.desc}</p>
        ${etaLine}
        <div class="card-bottom">
          <span class="price">${formatNaira(item.price)}</span>
          ${actionHtml}
        </div>
      </div>`;
  }).join("");

  // wire up add/remove buttons
  grid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => { addItem(btn.dataset.add); });
  });
  grid.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => { removeItem(btn.dataset.remove); });
  });
}

// ===================== Cart mutations =====================
function addItem(id) {
  cart[id] = (cart[id] || 0) + 1;
  onCartChange();
}

function removeItem(id) {
  cart[id] = Math.max(0, (cart[id] || 0) - 1);
  onCartChange();
}

function onCartChange() {
  renderMenu();
  renderCartBar();
  renderDrawer();
}

// ===================== Sticky cart bar =====================
function renderCartBar() {
  const bar = document.getElementById("cartBar");
  const count = getItemCount();
  if (count === 0) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  document.getElementById("cartBarSummary").textContent =
    `${count} item${count > 1 ? "s" : ""} · ${formatNaira(getCartTotal())}`;
}

// ===================== Drawer =====================
function renderDrawer() {
  const body = document.getElementById("drawerBody");
  const foot = document.getElementById("drawerFoot");
  const items = getCartItems();
  const badge = document.getElementById("cartBadge");
  const count = getItemCount();

  badge.hidden = count === 0;
  badge.textContent = count;

  if (items.length === 0) {
    body.innerHTML = `<p class="empty-cart">Your cart's empty. Go get hungry.</p>`;
    foot.hidden = true;
    return;
  }

  const linesHtml = items.map(({ item, qty }) => `
    <div class="cart-line">
      <div>
        <div class="cart-line-name">${item.name}</div>
        <div class="cart-line-price">${formatNaira(item.price)} × ${qty}</div>
      </div>
      <div class="qty-stepper">
        <button data-remove="${item.id}" aria-label="Remove one">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/></svg>
        </button>
        <span>${qty}</span>
        <button data-add="${item.id}" aria-label="Add one">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    </div>`).join("");

  const groups = getVendorGroups();
  const routingHtml = `
    <div class="routing-box">
      <div class="routing-title">Assigned kitchens</div>
      ${groups.map((g) => `
        <div class="routing-line">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3D5A45" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          <span class="vname">${g.vendor.name}</span>
          <span class="veta">~${Math.round(g.vendor.etaBase + g.maxDist * 2)} min</span>
        </div>`).join("")}
    </div>`;

  body.innerHTML = linesHtml + routingHtml;
  foot.hidden = false;

  const total = getCartTotal();
  document.getElementById("drawerTotal").textContent = formatNaira(total);
  document.getElementById("placeOrderLabel").textContent = `PLACE ORDER · ${formatNaira(total)}`;

  body.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => { addItem(btn.dataset.add); });
  });
  body.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => { removeItem(btn.dataset.remove); });
  });
}

function openDrawer() {
  document.getElementById("drawerOverlay").hidden = false;
}
function closeDrawer() {
  document.getElementById("drawerOverlay").hidden = true;
}

// ===================== Order placement + confirmation =====================
function placeOrder() {
  const btn = document.getElementById("placeOrderBtn");
  const label = document.getElementById("placeOrderLabel");
  btn.disabled = true;
  label.textContent = "ROUTING TO NEAREST KITCHEN...";

  setTimeout(() => {
    showConfirmation();
    btn.disabled = false;
    closeDrawer();
  }, 1400);
}

function showConfirmation() {
  const screen = document.getElementById("confirmScreen");
  const card = document.getElementById("confirmCard");
  const groups = getVendorGroups();
  const total = getCartTotal();

  card.innerHTML = groups.map((g) => `
    <div class="confirm-vendor-group">
      <div class="confirm-vendor-head">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E4572E" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        <span class="vname">${g.vendor.name}</span>
        <span class="match-badge">NEAREST MATCH</span>
      </div>
      ${g.lines.map(({ item, qty }) => `<div class="confirm-line">${qty}× ${item.name}</div>`).join("")}
    </div>`).join("") + `
    <div class="confirm-total">
      <span>Total</span>
      <span>${formatNaira(total)}</span>
    </div>`;

  screen.hidden = false;
  startCountdown();
}

function startCountdown() {
  let seconds = 20 * 60;
  const total = seconds;
  const ring = document.getElementById("ringProgress");
  const timeLabel = document.getElementById("ringTime");
  const r = 55;
  const circ = 2 * Math.PI * r;
  ring.style.strokeDasharray = circ;

  function tick() {
    const pct = Math.max(0, seconds / total);
    ring.style.strokeDashoffset = circ * (1 - pct);
    const mm = Math.floor(seconds / 60);
    const ss = String(seconds % 60).padStart(2, "0");
    timeLabel.textContent = `${mm}:${ss}`;
    if (seconds > 0) seconds--;
  }

  tick();
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(tick, 1000);
}

function resetOrder() {
  cart = {};
  document.getElementById("confirmScreen").hidden = true;
  if (countdownInterval) clearInterval(countdownInterval);
  onCartChange();
}

// ===================== Filters =====================
function setupFilters() {
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      filter = chip.dataset.filter;
      document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      renderMenu();
    });
  });
}

// ===================== Init =====================
function init() {
  renderMenu();
  renderCartBar();
  renderDrawer();
  setupFilters();

  document.getElementById("cartBtn").addEventListener("click", openDrawer);
  document.getElementById("cartBar").addEventListener("click", openDrawer);
  document.getElementById("closeCart").addEventListener("click", closeDrawer);
  document.getElementById("drawerOverlay").addEventListener("click", (e) => {
    if (e.target.id === "drawerOverlay") closeDrawer();
  });
  document.getElementById("placeOrderBtn").addEventListener("click", placeOrder);
  document.getElementById("newOrderBtn").addEventListener("click", resetOrder);
}

document.addEventListener("DOMContentLoaded", init);
