/* =============================================
   BurgerPRO - Sistema com Firebase Realtime
   ============================================= */

// ========== FIREBASE CONFIG ==========
// 🔴 SUBSTITUA PELAS SUAS CREDENCIAIS DO FIREBASE
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYcxAbVlDwmqZR8xLUa_Giob3q3u_kX-s",
  authDomain: "delivery-efefc.firebaseapp.com",
  databaseURL: "https://delivery-efefc-default-rtdb.firebaseio.com",
  projectId: "delivery-efefc",
  storageBucket: "delivery-efefc.firebasestorage.app",
  messagingSenderId: "545034723540",
  appId: "1:545034723540:web:b66a7ddaf067a095385b41",
  measurementId: "G-SCLT1LHP4L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

let db = null;
let useFirebase = false;

try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
  useFirebase = true;
  console.log("✅ Firebase conectado");
} catch (e) {
  console.warn("⚠️ Firebase não configurado, usando localStorage");
  useFirebase = false;
}

// ========== STORAGE ABSTRACTION ==========
const D = {
  async get(key, def = []) {
    if (useFirebase) {
      try {
        const snap = await db.ref(key).once('value');
        return snap.val() || def;
      } catch { return this._local(key, def); }
    }
    return this._local(key, def);
  },
  async set(key, val) {
    this._setLocal(key, val);
    if (useFirebase) {
      try { await db.ref(key).set(val); } catch (e) { console.warn('Firebase write error', e); }
    }
  },
  _local(k, d) { try { return JSON.parse(localStorage.getItem('bp_' + k)) || d; } catch { return d; } },
  _setLocal(k, v) { localStorage.setItem('bp_' + k, JSON.stringify(v)); },
  listen(key, cb) {
    if (useFirebase) {
      db.ref(key).on('value', snap => cb(snap.val()));
    }
  }
};

// ========== STATE ==========
let cart = [];
let selCat = 'all';
let itemData = null;
let itemQty = 1;
let chkType = 'balcao';
let chkPay = 'pix';
let admOpen = false;
let admTab = 'pedidos';
let openOrders = new Set();
let CATS = [];
let PRODS = [];
let PEDIDOS = [];
let CFG = {};
let lastPedidoCount = 0;

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
  await seed();
  await loadAll();
  renderAll();
  setupListeners();
  setupScroll();

  setTimeout(() => document.getElementById('preloader').classList.add('done'), 2000);
  startAdmClock();
});

async function seed() {
  const existing = await D.get('cfg', null);
  if (existing) return;

  const cats = [
    { id: 1, nome: 'Hambúrgueres', icone: '🍔', cor: '#ef4444' },
    { id: 2, nome: 'Porções', icone: '🍟', cor: '#f59e0b' },
    { id: 3, nome: 'Bebidas', icone: '🥤', cor: '#3b82f6' },
    { id: 4, nome: 'Sobremesas', icone: '🍰', cor: '#ec4899' },
    { id: 5, nome: 'Hot Dogs', icone: '🌭', cor: '#ef4444' },
    { id: 6, nome: 'Combos', icone: '🎁', cor: '#8b5cf6' },
  ];

  const prods = [
    { id: 1, nome: 'X-Burger Clássico', catId: 1, preco: 19.90, desc: 'Pão brioche, hambúrguer artesanal 180g, queijo cheddar, alface americana, tomate e molho especial da casa', tempo: 12, status: 'ativo', img: '🍔', destaque: false },
    { id: 2, nome: 'X-Bacon Crocante', catId: 1, preco: 25.90, desc: 'Pão brioche, hambúrguer 180g, cheddar derretido, bacon extra crocante, cebola caramelizada e molho BBQ', tempo: 15, status: 'ativo', img: '🥓', destaque: true },
    { id: 3, nome: 'Smash Burger Duplo', catId: 1, preco: 28.90, desc: 'Pão brioche, 2x smash 100g na chapa, cheddar derretido, pickles, cebola roxa e molho smash', tempo: 12, status: 'ativo', img: '🍔', destaque: true },
    { id: 4, nome: 'X-Tudo Supremo', catId: 1, preco: 34.90, desc: 'Pão, 2 hambúrgueres 150g, cheddar duplo, bacon, ovo, presunto, alface, tomate, milho e molho especial', tempo: 18, status: 'ativo', img: '🍔', destaque: true },
    { id: 5, nome: 'Chicken Burger', catId: 1, preco: 23.90, desc: 'Pão australiano, filé de frango grelhado, queijo prato, rúcula, tomate seco e maionese de ervas', tempo: 14, status: 'ativo', img: '🍗', destaque: false },
    { id: 6, nome: 'Veggie Burger', catId: 1, preco: 24.90, desc: 'Pão integral, hambúrguer de grão-de-bico e beterraba, rúcula, tomate confit e tahine', tempo: 12, status: 'ativo', img: '🌱', destaque: false },
    { id: 7, nome: 'Batata Frita Tradicional', catId: 2, preco: 14.90, desc: 'Porção de batata frita sequinha e crocante com sal e orégano', tempo: 8, status: 'ativo', img: '🍟', destaque: false },
    { id: 8, nome: 'Batata Cheddar & Bacon', catId: 2, preco: 27.90, desc: 'Batata frita coberta com molho cheddar cremoso, bacon crocante e cebolinha', tempo: 12, status: 'ativo', img: '🧀', destaque: true },
    { id: 9, nome: 'Onion Rings (8un)', catId: 2, preco: 17.90, desc: 'Anéis de cebola empanados super crocantes com molho ranch', tempo: 8, status: 'ativo', img: '🧅', destaque: false },
    { id: 10, nome: 'Nuggets (10un)', catId: 2, preco: 19.90, desc: 'Nuggets artesanais de frango empanados com molho BBQ e mostarda mel', tempo: 10, status: 'ativo', img: '🍗', destaque: false },
    { id: 11, nome: 'Coca-Cola Lata', catId: 3, preco: 7.90, desc: 'Lata 350ml gelada', tempo: 0, status: 'ativo', img: '🥤', destaque: false },
    { id: 12, nome: 'Guaraná Antarctica', catId: 3, preco: 7.90, desc: 'Lata 350ml gelada', tempo: 0, status: 'ativo', img: '🥤', destaque: false },
    { id: 13, nome: 'Suco Natural 400ml', catId: 3, preco: 11.90, desc: 'Feito na hora: laranja, limão, maracujá ou abacaxi', tempo: 5, status: 'ativo', img: '🍊', destaque: false },
    { id: 14, nome: 'Milkshake 500ml', catId: 3, preco: 18.90, desc: 'Chocolate, morango, baunilha ou Ovomaltine - super cremoso', tempo: 5, status: 'ativo', img: '🥛', destaque: true },
    { id: 15, nome: 'Água Mineral', catId: 3, preco: 3.90, desc: 'Garrafa 500ml sem gás', tempo: 0, status: 'ativo', img: '💧', destaque: false },
    { id: 16, nome: 'Brownie c/ Sorvete', catId: 4, preco: 17.90, desc: 'Brownie quente de chocolate belga com sorvete de creme e calda de chocolate', tempo: 5, status: 'ativo', img: '🍫', destaque: true },
    { id: 17, nome: 'Sundae', catId: 4, preco: 13.90, desc: 'Sorvete de creme com calda quente de chocolate, chantilly e granulado', tempo: 3, status: 'ativo', img: '🍨', destaque: false },
    { id: 18, nome: 'Hot Dog Tradicional', catId: 5, preco: 14.90, desc: 'Pão, salsicha, vinagrete, batata palha, ketchup e mostarda', tempo: 8, status: 'ativo', img: '🌭', destaque: false },
    { id: 19, nome: 'Hot Dog Completo', catId: 5, preco: 21.90, desc: 'Pão, 2 salsichas, purê, cheddar, bacon, milho, ervilha, batata palha e molhos', tempo: 10, status: 'ativo', img: '🌭', destaque: true },
    { id: 20, nome: 'Combo Burger', catId: 6, preco: 36.90, oldPreco: 44.70, desc: 'X-Burger + Batata Frita + Refrigerante Lata. Economize R$7,80!', tempo: 15, status: 'ativo', img: '🎁', destaque: true },
    { id: 21, nome: 'Combo Família', catId: 6, preco: 99.90, oldPreco: 124.50, desc: '2x X-Bacon + Batata Cheddar + 2 Refrigerantes. Economize R$24,60!', tempo: 22, status: 'ativo', img: '👨‍👩‍👧‍👦', destaque: true },
  ];

  const cfg = {
    nome: 'Burger House',
    slogan: 'Hambúrgueres artesanais feitos com amor',
    endereco: 'Rua das Delícias, 123 - Centro',
    telefone: '(11) 99999-9999',
    whatsapp: '5511999999999',
    taxaDelivery: 6.00,
    tempoMedio: '30-45 min',
    aberto: true,
    nextPedido: 1,
    senhaAdmin: '1234'
  };

  await D.set('cats', cats);
  await D.set('prods', prods);
  await D.set('pedidos', []);
  await D.set('cfg', cfg);
}

async function loadAll() {
  CATS = await D.get('cats', []);
  PRODS = await D.get('prods', []);
  PEDIDOS = await D.get('pedidos', []);
  CFG = await D.get('cfg', {});
}

function renderAll() {
  loadStoreUI();
  renderCats();
  renderMenu();
  updateCartBar();
}

function setupListeners() {
  if (!useFirebase) return;
  D.listen('pedidos', val => {
    const newP = val || [];
    if (newP.length > lastPedidoCount && admOpen) {
      playNotif();
      toast('🔔 Novo pedido recebido!', 'info');
    }
    lastPedidoCount = newP.length;
    PEDIDOS = newP;
    if (admOpen) admGo(admTab);
  });
  D.listen('prods', val => { PRODS = val || []; renderMenu(); });
  D.listen('cats', val => { CATS = val || []; renderCats(); renderMenu(); });
  D.listen('cfg', val => { CFG = val || {}; loadStoreUI(); });
}

function setupScroll() {
  const ss = document.getElementById('searchSticky');
  window.addEventListener('scroll', () => { ss.classList.toggle('scrolled', window.scrollY > 200); });
}

function playNotif() {
  try { document.getElementById('notifSound')?.play(); } catch {}
}

// ========== HELPERS ==========
function fmt(v) { return 'R$ ' + Number(v).toFixed(2).replace('.', ','); }
function toast(m, t = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast-item ' + t;
  el.textContent = m;
  document.getElementById('toastZone').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
function startAdmClock() {
  setInterval(() => {
    const el = document.getElementById('admClock');
    if (el) el.textContent = new Date().toLocaleString('pt-BR');
  }, 1000);
}

// ========== STORE UI ==========
function loadStoreUI() {
  document.getElementById('heroName').textContent = CFG.nome || 'Burger House';
  document.getElementById('heroSub').textContent = CFG.slogan || '';
  document.getElementById('heroAddr').textContent = '📍 ' + (CFG.endereco || '');
  document.getElementById('heroPhone').textContent = '📞 ' + (CFG.telefone || '');
  document.getElementById('heroTime').textContent = CFG.tempoMedio || '30-45 min';
  document.getElementById('footName').textContent = CFG.nome || '';
  document.getElementById('footAddr').textContent = CFG.endereco || '';
  document.getElementById('footPhone').textContent = CFG.telefone || '';
  const st = document.getElementById('heroStatus');
  if (CFG.aberto !== false) {
    st.innerHTML = '<span class="chip-dot"></span> Aberto';
    st.className = 'chip chip-open';
  } else {
    st.innerHTML = '<span class="chip-dot"></span> Fechado';
    st.className = 'chip chip-closed';
  }
}

// ========== CATEGORIES ==========
function renderCats() {
  document.getElementById('catBar').innerHTML =
    `<button class="cat-pill ${selCat === 'all' ? 'active' : ''}" onclick="pickCat('all')">🔥 Destaques</button>` +
    CATS.map(c => `<button class="cat-pill ${selCat === c.id ? 'active' : ''}" onclick="pickCat(${c.id})">${c.icone} ${c.nome}</button>`).join('');
}
function pickCat(id) { selCat = id; renderCats(); renderMenu(); document.getElementById('menuMain').scrollIntoView({ behavior: 'smooth', block: 'start' }); }

// ========== MENU ==========
function renderMenu() {
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  document.getElementById('searchClear').classList.toggle('hidden', !q);

  let list = PRODS.filter(p => p.status === 'ativo');
  if (selCat === 'all' && !q) list = list.filter(p => p.destaque);
  else if (selCat !== 'all') list = list.filter(p => p.catId === selCat);
  if (q) { list = PRODS.filter(p => p.status === 'ativo' && (p.nome.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q))); }

  const grouped = {};
  list.forEach(p => {
    const cat = CATS.find(c => c.id === p.catId);
    const key = cat ? cat.nome : 'Outros';
    if (!grouped[key]) grouped[key] = { cat, items: [] };
    grouped[key].items.push(p);
  });

  const el = document.getElementById('menuMain');
  if (!Object.keys(grouped).length) { el.innerHTML = '<div class="no-results"><span>😕</span><p>Nenhum item encontrado</p></div>'; return; }

  el.innerHTML = Object.entries(grouped).map(([name, { cat, items }]) => `
    <section class="menu-sec" id="sec-${cat?.id || 0}">
      <h3 class="menu-sec-title">${cat?.icone || '🍽️'} ${selCat === 'all' && !q ? '🔥 Destaques' : name}</h3>
      ${items.map(p => `
        <div class="m-card ${p.status === 'esgotado' ? 'off' : ''}" onclick="openItem(${p.id})">
          <div class="m-card-info">
            <div class="m-card-name">${p.nome}</div>
            <div class="m-card-desc">${p.desc}</div>
            <div class="m-card-row">
              <span class="m-card-price">${fmt(p.preco)}</span>
              ${p.oldPreco ? `<span class="m-card-old">${fmt(p.oldPreco)}</span>` : ''}
              ${p.destaque ? '<span class="m-card-badge best">🔥 Mais Pedido</span>' : ''}
              ${p.status === 'esgotado' ? '<span class="m-card-badge sold">Esgotado</span>' : ''}
            </div>
          </div>
          <div class="m-card-img" style="background:${cat?.cor || '#eee'}11">
            ${p.img || '🍽️'}
            ${p.status !== 'esgotado' ? `<button class="quick-add" onclick="event.stopPropagation();quickAdd(${p.id})">+</button>` : ''}
          </div>
        </div>
      `).join('')}
    </section>
  `).join('');

  if (selCat === 'all' && !q) {
    el.innerHTML += `
      <div style="text-align:center;padding:20px">
        <button class="btn-outline" onclick="pickCat(1)" style="margin:4px">🍔 Ver Hambúrgueres</button>
        <button class="btn-outline" onclick="pickCat(2)" style="margin:4px">🍟 Ver Porções</button>
        <button class="btn-outline" onclick="pickCat(3)" style="margin:4px">🥤 Ver Bebidas</button>
      </div>`;
  }
}

function clearSearch() { document.getElementById('searchInput').value = ''; renderMenu(); }

// ========== ITEM SHEET ==========
function openItem(id) {
  const p = PRODS.find(x => x.id === id); if (!p) return;
  const cat = CATS.find(c => c.id === p.catId);
  itemData = p; itemQty = 1;
  document.getElementById('bsHero').style.background = (cat?.cor || '#eee') + '15';
  document.getElementById('bsHero').innerHTML = `<span style="font-size:5rem">${p.img || '🍽️'}</span>`;
  document.getElementById('bsContent').innerHTML = `
    <h2>${p.nome}</h2>
    <p class="item-desc">${p.desc}</p>
    <div class="item-price-big">${fmt(p.preco)} ${p.oldPreco ? `<span class="old">${fmt(p.oldPreco)}</span>` : ''}</div>
    ${p.tempo ? `<p style="font-size:.82rem;color:var(--text3);margin-bottom:16px">⏱️ Tempo de preparo: ~${p.tempo} min</p>` : ''}
    <label class="obs-label">📝 Alguma observação?</label>
    <textarea id="itemObs" placeholder="Ex: Sem cebola, ponto da carne bem passado..."></textarea>
  `;
  updateItemFooter();
  show('itemOv'); show('itemBS');
  setTimeout(() => document.getElementById('itemBS').classList.add('show'), 10);
}

function closeItem() {
  document.getElementById('itemBS').classList.remove('show');
  setTimeout(() => { hide('itemBS'); hide('itemOv'); }, 350);
}

function updateItemFooter() {
  if (!itemData) return;
  document.getElementById('bsFooter').innerHTML = `
    <div class="qty-box"><button onclick="chgItemQty(-1)">−</button><span>${itemQty}</span><button onclick="chgItemQty(1)">+</button></div>
    <button class="btn-add" onclick="addItem()"><span>Adicionar</span><span>${fmt(itemData.preco * itemQty)}</span></button>
  `;
}

function chgItemQty(d) { itemQty = Math.max(1, itemQty + d); updateItemFooter(); }

function quickAdd(id) {
  const p = PRODS.find(x => x.id === id); if (!p) return;
  const ex = cart.find(c => c.id === p.id && !c.obs);
  if (ex) ex.qty++; else cart.push({ id: p.id, nome: p.nome, preco: p.preco, img: p.img, qty: 1, obs: '', catId: p.catId });
  updateCartBar(); toast(`${p.nome} adicionado ✓`);
}

function addItem() {
  if (!itemData) return;
  const obs = document.getElementById('itemObs')?.value?.trim() || '';
  const ex = cart.find(c => c.id === itemData.id && c.obs === obs);
  if (ex) ex.qty += itemQty; else cart.push({ id: itemData.id, nome: itemData.nome, preco: itemData.preco, img: itemData.img, qty: itemQty, obs, catId: itemData.catId });
  updateCartBar(); closeItem(); toast(`${itemData.nome} adicionado ✓`);
}

// ========== CART ==========
function cartTotal() { return cart.reduce((s, c) => s + c.preco * c.qty, 0); }
function cartQty() { return cart.reduce((s, c) => s + c.qty, 0); }

function updateCartBar() {
  const q = cartQty(), t = cartTotal();
  document.getElementById('cartBarQty').textContent = q + ' ' + (q === 1 ? 'item' : 'itens');
  document.getElementById('cartBarTotal').textContent = fmt(t);
  document.getElementById('cartBar').classList.toggle('hidden', q === 0);
}

function openCart() { renderCartBody(); show('cartOv'); show('cartPanel'); setTimeout(() => document.getElementById('cartPanel').classList.add('show'), 10); }
function closeCart() { document.getElementById('cartPanel').classList.remove('show'); setTimeout(() => { hide('cartPanel'); hide('cartOv'); }, 350); }
function clearCart() { cart = []; renderCartBody(); updateCartBar(); toast('Sacola limpa', 'info'); }

function renderCartBody() {
  const body = document.getElementById('cartBody');
  const foot = document.getElementById('cartFooter');
  document.getElementById('cartClearBtn').classList.toggle('hidden', !cart.length);

  if (!cart.length) {
    body.innerHTML = '<div class="cart-empty"><span>🛒</span><p>Sua sacola está vazia</p></div>';
    foot.innerHTML = ''; return;
  }

  body.innerHTML = cart.map((c, i) => {
    const cat = CATS.find(x => x.id === c.catId);
    return `<div class="cart-item">
      <div class="ci-thumb" style="background:${cat?.cor || '#eee'}11">${c.img || '🍽️'}</div>
      <div class="ci-detail">
        <div class="ci-name">${c.nome}</div>
        ${c.obs ? `<div class="ci-obs">📝 ${c.obs}</div>` : ''}
        <div class="ci-price">${fmt(c.preco * c.qty)}</div>
      </div>
      <div class="ci-qty">
        <button onclick="cartChg(${i},-1)">${c.qty === 1 ? '🗑' : '−'}</button>
        <span>${c.qty}</span>
        <button onclick="cartChg(${i},1)">+</button>
      </div>
    </div>`;
  }).join('');

  const sub = cartTotal();
  foot.innerHTML = `
    <div class="totals-box">
      <div class="t-row"><span>Subtotal</span><span>${fmt(sub)}</span></div>
      <div class="t-row final"><span>Total</span><span>${fmt(sub)}</span></div>
    </div>
    <button class="btn-checkout" onclick="goCheckout()"><span>Continuar</span><span>${fmt(sub)}</span></button>
  `;
}

function cartChg(i, d) { cart[i].qty += d; if (cart[i].qty <= 0) cart.splice(i, 1); renderCartBody(); updateCartBar(); }

// ========== CHECKOUT ==========
function goCheckout() { if (!cart.length) return toast('Adicione itens', 'warn'); closeCart(); setTimeout(() => { renderCheckout(); show('checkOv'); show('checkPanel'); setTimeout(() => document.getElementById('checkPanel').classList.add('show'), 10); }, 380); }
function closeCheckout() { document.getElementById('checkPanel').classList.remove('show'); setTimeout(() => { hide('checkPanel'); hide('checkOv'); }, 350); }

function renderCheckout() {
  const sub = cartTotal();
  const taxa = chkType === 'delivery' ? (CFG.taxaDelivery || 0) : 0;
  const total = sub + taxa;

  document.getElementById('checkBody').innerHTML = `
    <div class="chk-section"><h4>📍 Como quer receber?</h4>
      <div class="type-btns">
        <button class="type-btn ${chkType === 'balcao' ? 'sel' : ''}" onclick="chkType='balcao';renderCheckout()"><span>🏪</span><small>Retirada</small></button>
        <button class="type-btn ${chkType === 'mesa' ? 'sel' : ''}" onclick="chkType='mesa';renderCheckout()"><span>🪑</span><small>Mesa</small></button>
        <button class="type-btn ${chkType === 'delivery' ? 'sel' : ''}" onclick="chkType='delivery';renderCheckout()"><span>🛵</span><small>Delivery</small></button>
      </div>
      ${chkType === 'mesa' ? '<div class="form-group"><label>Número da mesa</label><input type="number" id="ckMesa" min="1" placeholder="Nº da mesa"></div>' : ''}
      ${chkType === 'delivery' ? '<div class="form-group"><label>Endereço completo *</label><input type="text" id="ckAddr" placeholder="Rua, número, bairro, complemento"></div>' : ''}
    </div>
    <div class="chk-section"><h4>👤 Seus dados</h4>
      <div class="form-group"><label>Seu nome *</label><input type="text" id="ckNome" placeholder="Como podemos te chamar?"></div>
      <div class="form-group"><label>WhatsApp *</label><input type="tel" id="ckTel" placeholder="(11) 99999-9999"></div>
    </div>
    <div class="chk-section"><h4>💳 Pagamento</h4>
      <div class="pay-grid">
        ${['pix', 'dinheiro', 'credito', 'debito'].map(p => {
          const icons = { pix: '💠', dinheiro: '💵', credito: '💳', debito: '💳' };
          const names = { pix: 'PIX', dinheiro: 'Dinheiro', credito: 'Crédito', debito: 'Débito' };
          return `<button class="pay-btn ${chkPay === p ? 'sel' : ''}" onclick="chkPay='${p}';renderCheckout()"><span>${icons[p]}</span><small>${names[p]}</small></button>`;
        }).join('')}
      </div>
      ${chkPay === 'dinheiro' ? '<div class="form-group" style="margin-top:12px"><label>Troco para quanto?</label><input type="number" id="ckTroco" step="0.01" placeholder="Deixe vazio se não precisa"></div>' : ''}
    </div>
    <div class="chk-section"><h4>📋 Resumo</h4>
      ${cart.map(c => `<div class="t-row" style="font-size:.85rem"><span>${c.qty}x ${c.nome}</span><span>${fmt(c.preco * c.qty)}</span></div>`).join('')}
      <div class="t-row" style="margin-top:8px"><span>Subtotal</span><span>${fmt(sub)}</span></div>
      ${taxa > 0 ? `<div class="t-row"><span>Entrega</span><span>${fmt(taxa)}</span></div>` : ''}
      <div class="t-row final"><span>Total</span><span>${fmt(total)}</span></div>
    </div>
    <button class="btn-place" onclick="placeOrder()">✅ Confirmar Pedido · ${fmt(total)}</button>
    ${CFG.whatsapp ? `<button class="btn-wpp" onclick="sendWpp()">📱 Enviar via WhatsApp</button>` : ''}
  `;
}

function getOrderInfo() {
  const nome = document.getElementById('ckNome')?.value?.trim();
  const tel = document.getElementById('ckTel')?.value?.trim();
  if (!nome) { toast('Informe seu nome', 'warn'); return null; }
  if (!tel) { toast('Informe seu telefone', 'warn'); return null; }
  if (chkType === 'delivery' && !document.getElementById('ckAddr')?.value?.trim()) { toast('Informe o endereço', 'warn'); return null; }
  if (chkType === 'mesa' && !document.getElementById('ckMesa')?.value) { toast('Informe a mesa', 'warn'); return null; }
  const sub = cartTotal();
  const taxa = chkType === 'delivery' ? (CFG.taxaDelivery || 0) : 0;
  return {
    nome, telefone: tel, tipo: chkType,
    mesa: document.getElementById('ckMesa')?.value || '',
    endereco: document.getElementById('ckAddr')?.value || '',
    pagamento: chkPay,
    troco: document.getElementById('ckTroco')?.value || '',
    itens: cart.map(c => ({ ...c })),
    subtotal: sub, taxa, total: sub + taxa
  };
}

async function placeOrder() {
  const info = getOrderInfo(); if (!info) return;
  const num = CFG.nextPedido || 1;
  const pedido = { id: Date.now(), numero: num, status: 'pendente', criadoEm: new Date().toISOString(), ...info };
  PEDIDOS.unshift(pedido);
  CFG.nextPedido = num + 1;
  await D.set('pedidos', PEDIDOS);
  await D.set('cfg', CFG);
  const sNum = num;
  cart = []; updateCartBar(); closeCheckout();
  toast(`Pedido #${String(sNum).padStart(3, '0')} realizado! 🎉`);
  setTimeout(() => openTracking(pedido.id), 500);
}

async function sendWpp() {
  const info = getOrderInfo(); if (!info) return;
  const num = CFG.nextPedido || 1;
  const pedido = { id: Date.now(), numero: num, status: 'pendente', criadoEm: new Date().toISOString(), ...info };
  PEDIDOS.unshift(pedido);
  CFG.nextPedido = num + 1;
  await D.set('pedidos', PEDIDOS);
  await D.set('cfg', CFG);

  let msg = `🍔 *NOVO PEDIDO #${String(num).padStart(3, '0')}*\n\n👤 ${info.nome}\n📞 ${info.telefone}\n`;
  const tipos = { balcao: '🏪 Retirada', mesa: `🪑 Mesa ${info.mesa}`, delivery: `🛵 Delivery\n📍 ${info.endereco}` };
  msg += tipos[info.tipo] + '\n\n📋 *Itens:*\n';
  info.itens.forEach(i => { msg += `  ${i.qty}x ${i.nome} — ${fmt(i.preco * i.qty)}\n`; if (i.obs) msg += `     📝 ${i.obs}\n`; });
  msg += `\n💰 *Total: ${fmt(info.total)}*\n💳 ${info.pagamento.toUpperCase()}`;
  if (info.troco) msg += ` · Troco p/ R$${info.troco}`;
  window.open(`https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
  cart = []; updateCartBar(); closeCheckout();
  toast('Enviado via WhatsApp! 📱');
}

// ========== TRACKING ==========
function openTracking(id) {
  const p = PEDIDOS.find(x => x.id === id); if (!p) return;
  const steps = ['pendente', 'preparo', 'pronto', 'entregue'];
  const idx = steps.indexOf(p.status);
  const labels = [
    { t: 'Pedido recebido', d: 'Aguardando confirmação' },
    { t: 'Em preparo', d: 'Preparando seu pedido' },
    { t: 'Pronto!', d: p.tipo === 'delivery' ? 'Saiu para entrega' : 'Aguardando retirada' },
    { t: 'Finalizado', d: 'Bom apetite! 🎉' }
  ];
  document.getElementById('trackBody').innerHTML = `
    <div class="track-card">
      <div class="track-num">Pedido #${String(p.numero).padStart(3, '0')}</div>
      <span class="track-badge badge-${p.status}">${p.status.toUpperCase()}</span>
      <div class="track-tl">
        ${labels.map((l, i) => `<div class="tl-step ${i < idx ? 'done' : ''} ${i === idx ? 'now' : ''}"><h5>${l.t}</h5><p>${l.d}</p></div>`).join('')}
      </div>
      <div class="track-info">
        <strong>${p.nome}</strong> · ${p.telefone}<br>
        ${p.itens.map(c => `${c.qty}x ${c.nome}`).join(', ')}<br>
        <strong>${fmt(p.total)}</strong> · ${p.pagamento.toUpperCase()}
      </div>
    </div>
    <button class="btn-outline btn-block" onclick="closeTracking()">Voltar ao Cardápio</button>
  `;
  show('trackOv'); show('trackPanel');
  setTimeout(() => document.getElementById('trackPanel').classList.add('show'), 10);
}
function closeTracking() { document.getElementById('trackPanel').classList.remove('show'); setTimeout(() => { hide('trackPanel'); hide('trackOv'); }, 350); }

// ========== ADMIN ==========
function showAdmin() { show('adminOv'); }
function hideAdmin() { hide('adminOv'); hide('admDash'); show('admLogin'); admOpen = false; }

function doAdmLogin() {
  if (document.getElementById('admPassInput').value === (CFG.senhaAdmin || '1234')) {
    hide('admLogin'); show('admDash'); admOpen = true;
    lastPedidoCount = PEDIDOS.length;
    admGo('pedidos');
    document.getElementById('admPassInput').value = '';
  } else toast('Senha incorreta', 'err');
}

function admGo(tab, btn) {
  admTab = tab;
  document.querySelectorAll('.adm-nav-btn').forEach(b => b.classList.remove('active'));
  (btn || document.querySelector(`.adm-nav-btn[data-t="${tab}"]`))?.classList.add('active');
  const c = document.getElementById('admBody');
  if (tab === 'pedidos') admRenderPedidos(c);
  else if (tab === 'produtos') admRenderProdutos(c);
  else if (tab === 'categorias') admRenderCats(c);
  else if (tab === 'caixa') admRenderCaixa(c);
  else if (tab === 'config') admRenderConfig(c);
  // Badge
  const atv = PEDIDOS.filter(p => ['pendente', 'preparo', 'pronto'].includes(p.status)).length;
  const badge = document.getElementById('admPedidoBadge');
  badge.textContent = atv; badge.style.display = atv ? 'inline' : 'none';
}

function admRenderPedidos(c) {
  const hoje = new Date().toISOString().split('T')[0];
  const hp = PEDIDOS.filter(p => p.criadoEm?.startsWith(hoje) && p.status !== 'cancelado');
  c.innerHTML = `
    <div class="adm-metrics">
      <div class="adm-metric"><div class="m-icon">📦</div><div class="m-val">${hp.length}</div><div class="m-label">Pedidos hoje</div></div>
      <div class="adm-metric"><div class="m-icon">💰</div><div class="m-val" style="color:var(--green)">${fmt(hp.reduce((s, p) => s + (p.total || 0), 0))}</div><div class="m-label">Faturamento</div></div>
      <div class="adm-metric"><div class="m-icon">🔥</div><div class="m-val" style="color:var(--orange)">${PEDIDOS.filter(p => ['pendente', 'preparo'].includes(p.status)).length}</div><div class="m-label">Em andamento</div></div>
    </div>
    ${PEDIDOS.length === 0 ? '<p style="text-align:center;color:var(--text3);padding:40px">Nenhum pedido ainda</p>' : ''}
    ${PEDIDOS.map(p => {
      const tipos = { balcao: '🏪', mesa: '🪑 Mesa ' + p.mesa, delivery: '🛵' };
      const open = openOrders.has(p.id);
      return `<div class="adm-order ${open ? 'open' : ''}">
        <div class="adm-order-head" onclick="toggleOrder(${p.id})">
          <div><h4>#${String(p.numero).padStart(3, '0')} · ${p.nome || 'Cliente'}</h4>
          <div class="adm-order-sub">${tipos[p.tipo] || ''} · ${new Date(p.criadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${fmt(p.total || 0)}</div></div>
          <span class="adm-badge badge-${p.status}">${p.status?.toUpperCase()}</span>
        </div>
        <div class="adm-order-body">
          ${(p.itens || []).map(i => `<div class="adm-order-line"><span>${i.qty}x ${i.nome}${i.obs ? ' <small style="color:var(--orange)">📝 ' + i.obs + '</small>' : ''}</span><span>${fmt(i.preco * i.qty)}</span></div>`).join('')}
          <div class="adm-order-line" style="font-weight:700;margin-top:6px"><span>Total</span><span>${fmt(p.total || 0)}</span></div>
          <div style="font-size:.8rem;color:var(--text3);margin-top:6px">💳 ${p.pagamento?.toUpperCase() || ''}${p.endereco ? ' · 📍 ' + p.endereco : ''}${p.telefone ? ' · 📞 ' + p.telefone : ''}</div>
          <div class="adm-order-actions">
            ${p.status === 'pendente' ? `<button class="btn-green btn-xs" onclick="admChgStatus(${p.id},'preparo')">👨‍🍳 Preparar</button><button class="btn-red-o" onclick="admChgStatus(${p.id},'cancelado')">Cancelar</button>` : ''}
            ${p.status === 'preparo' ? `<button class="btn-green btn-xs" onclick="admChgStatus(${p.id},'pronto')">✅ Pronto</button>` : ''}
            ${p.status === 'pronto' ? `<button class="btn-primary btn-xs" onclick="admChgStatus(${p.id},'entregue')">📦 Entregue</button>` : ''}
          </div>
        </div>
      </div>`;
    }).join('')}
  `;
}

function toggleOrder(id) { openOrders.has(id) ? openOrders.delete(id) : openOrders.add(id); admGo('pedidos'); }

async function admChgStatus(id, st) {
  const p = PEDIDOS.find(x => x.id === id);
  if (p) { p.status = st; await D.set('pedidos', PEDIDOS); admGo('pedidos'); toast(`#${String(p.numero).padStart(3, '0')} → ${st.toUpperCase()}`); }
}

function admRenderProdutos(c) {
  c.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="font-weight:700">${PRODS.length} produtos</h3>
      <button class="btn-primary btn-sm" onclick="admProdForm()">+ Novo Produto</button>
    </div>
    <div class="adm-prod-list">
      ${PRODS.map(p => { const cat = CATS.find(x => x.id === p.catId); return `
        <div class="adm-prod-row">
          <span class="adm-prod-emoji">${p.img || '🍽️'}</span>
          <div class="adm-prod-info"><div class="adm-prod-name">${p.nome} ${p.destaque ? '🔥' : ''}</div><div class="adm-prod-meta">${cat?.nome || ''} · ${p.status}</div></div>
          <span class="adm-prod-price">${fmt(p.preco)}</span>
          <button class="btn-outline btn-xs" onclick="admProdForm(${p.id})">✏️</button>
          <button class="btn-red-o" onclick="admDelProd(${p.id})">🗑</button>
        </div>`; }).join('')}
    </div>`;
}

function admProdForm(id) {
  const p = id ? PRODS.find(x => x.id === id) : null;
  document.getElementById('admMTitle').textContent = p ? 'Editar Produto' : 'Novo Produto';
  document.getElementById('admMBody').innerHTML = `
    <input type="hidden" id="apId" value="${p?.id || ''}">
    <div class="form-group"><label>Nome *</label><input id="apNome" value="${p?.nome || ''}"></div>
    <div class="form-row">
      <div class="form-group"><label>Categoria</label><select id="apCat">${CATS.map(c => `<option value="${c.id}" ${p?.catId === c.id ? 'selected' : ''}>${c.icone} ${c.nome}</option>`).join('')}</select></div>
      <div class="form-group"><label>Preço *</label><input type="number" id="apPreco" step="0.01" value="${p?.preco || ''}"></div>
    </div>
    <div class="form-group"><label>Descrição</label><textarea id="apDesc" rows="2">${p?.desc || ''}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Emoji</label><input id="apImg" value="${p?.img || '🍔'}" maxlength="4"></div>
      <div class="form-group"><label>Tempo (min)</label><input type="number" id="apTempo" value="${p?.tempo || 10}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Preço anterior</label><input type="number" id="apOld" step="0.01" value="${p?.oldPreco || ''}"></div>
      <div class="form-group"><label>Status</label><select id="apSt"><option value="ativo" ${p?.status === 'ativo' ? 'selected' : ''}>Ativo</option><option value="esgotado" ${p?.status === 'esgotado' ? 'selected' : ''}>Esgotado</option><option value="inativo" ${p?.status === 'inativo' ? 'selected' : ''}>Inativo</option></select></div>
    </div>
    <label style="font-size:.88rem;display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="apDest" ${p?.destaque ? 'checked' : ''}> Destaque 🔥</label>
  `;
  document.getElementById('admMFoot').innerHTML = `<button class="btn-ghost" onclick="closeAdmM()">Cancelar</button><button class="btn-primary" onclick="admSaveProd()">Salvar</button>`;
  openAdmM();
}

async function admSaveProd() {
  const id = document.getElementById('apId').value;
  const nome = document.getElementById('apNome').value.trim();
  const preco = parseFloat(document.getElementById('apPreco').value);
  if (!nome || !preco) return toast('Preencha nome e preço', 'warn');
  const data = {
    nome, catId: parseInt(document.getElementById('apCat').value), preco,
    desc: document.getElementById('apDesc').value.trim(),
    img: document.getElementById('apImg').value || '🍔',
    tempo: parseInt(document.getElementById('apTempo').value) || 10,
    oldPreco: parseFloat(document.getElementById('apOld').value) || null,
    status: document.getElementById('apSt').value,
    destaque: document.getElementById('apDest').checked
  };
  if (id) { const i = PRODS.findIndex(p => p.id === parseInt(id)); if (i >= 0) PRODS[i] = { ...PRODS[i], ...data }; }
  else { data.id = PRODS.reduce((m, p) => Math.max(m, p.id), 0) + 1; PRODS.push(data); }
  await D.set('prods', PRODS);
  closeAdmM(); admGo('produtos'); renderMenu(); toast(id ? 'Atualizado ✓' : 'Criado ✓');
}

async function admDelProd(id) {
  if (!confirm('Excluir produto?')) return;
  PRODS = PRODS.filter(p => p.id !== id);
  await D.set('prods', PRODS);
  admGo('produtos'); renderMenu(); toast('Excluído', 'info');
}

function admRenderCats(c) {
  c.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="font-weight:700">${CATS.length} categorias</h3>
      <button class="btn-primary btn-sm" onclick="admCatForm()">+ Nova</button>
    </div>
    <div class="adm-cat-list">
      ${CATS.map(ct => `<div class="adm-cat-row">
        <div class="adm-cat-icon" style="background:${ct.cor}15">${ct.icone}</div>
        <div class="adm-cat-info"><div class="adm-cat-name">${ct.nome}</div><div class="adm-cat-count">${PRODS.filter(p => p.catId === ct.id).length} produtos</div></div>
        <button class="btn-outline btn-xs" onclick="admCatForm(${ct.id})">✏️</button>
        <button class="btn-red-o" onclick="admDelCat(${ct.id})">🗑</button>
      </div>`).join('')}
    </div>`;
}

function admCatForm(id) {
  const ct = id ? CATS.find(x => x.id === id) : null;
  document.getElementById('admMTitle').textContent = ct ? 'Editar Categoria' : 'Nova Categoria';
  document.getElementById('admMBody').innerHTML = `
    <input type="hidden" id="acId" value="${ct?.id || ''}">
    <div class="form-group"><label>Nome</label><input id="acNome" value="${ct?.nome || ''}"></div>
    <div class="form-row">
      <div class="form-group"><label>Emoji</label><input id="acIco" value="${ct?.icone || '🍽️'}" maxlength="2"></div>
      <div class="form-group"><label>Cor</label><input type="color" id="acCor" value="${ct?.cor || '#ef4444'}"></div>
    </div>`;
  document.getElementById('admMFoot').innerHTML = `<button class="btn-ghost" onclick="closeAdmM()">Cancelar</button><button class="btn-primary" onclick="admSaveCat()">Salvar</button>`;
  openAdmM();
}

async function admSaveCat() {
  const id = document.getElementById('acId').value;
  const nome = document.getElementById('acNome').value.trim();
  if (!nome) return toast('Nome obrigatório', 'warn');
  const data = { nome, icone: document.getElementById('acIco').value || '🍽️', cor: document.getElementById('acCor').value };
  if (id) { const i = CATS.findIndex(c => c.id === parseInt(id)); if (i >= 0) CATS[i] = { ...CATS[i], ...data }; }
  else { data.id = CATS.reduce((m, c) => Math.max(m, c.id), 0) + 1; CATS.push(data); }
  await D.set('cats', CATS);
  closeAdmM(); admGo('categorias'); renderCats(); renderMenu(); toast('Salvo ✓');
}

async function admDelCat(id) {
  if (PRODS.some(p => p.catId === id)) return toast('Remova os produtos primeiro', 'warn');
  if (!confirm('Excluir?')) return;
  CATS = CATS.filter(c => c.id !== id);
  await D.set('cats', CATS);
  admGo('categorias'); renderCats(); renderMenu(); toast('Excluído', 'info');
}

function admRenderCaixa(c) {
  const hoje = new Date().toISOString().split('T')[0];
  const hp = PEDIDOS.filter(p => p.criadoEm?.startsWith(hoje) && p.status !== 'cancelado');
  const total = hp.reduce((s, p) => s + (p.total || 0), 0);
  const porPgto = {};
  hp.forEach(p => { porPgto[p.pagamento] = (porPgto[p.pagamento] || 0) + (p.total || 0); });
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = d.toISOString().split('T')[0]; days.push({ l: d.toLocaleDateString('pt-BR', { weekday: 'short' }), v: PEDIDOS.filter(p => p.criadoEm?.startsWith(k) && p.status !== 'cancelado').reduce((s, p) => s + (p.total || 0), 0) }); }
  const mx = Math.max(...days.map(d => d.v), 1);
  c.innerHTML = `
    <div class="adm-metrics">
      <div class="adm-metric"><div class="m-icon">💰</div><div class="m-val" style="color:var(--green)">${fmt(total)}</div><div class="m-label">Vendas hoje</div></div>
      <div class="adm-metric"><div class="m-icon">📦</div><div class="m-val">${hp.length}</div><div class="m-label">Pedidos</div></div>
      <div class="adm-metric"><div class="m-icon">🎯</div><div class="m-val">${fmt(hp.length ? total / hp.length : 0)}</div><div class="m-label">Ticket médio</div></div>
    </div>
    <div class="adm-section"><h4>📈 Últimos 7 dias</h4>
      <div style="display:flex;align-items:flex-end;gap:6px;height:120px">
        ${days.map(d => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
          <span style="font-size:.65rem;font-weight:700">${d.v > 0 ? fmt(d.v) : '-'}</span>
          <div style="width:100%;background:var(--primary);border-radius:4px 4px 0 0;height:${Math.max(d.v / mx * 90, 4)}px;transition:height .5s"></div>
          <span style="font-size:.68rem;color:var(--text3)">${d.l}</span>
        </div>`).join('')}
      </div>
    </div>
    <div class="adm-section"><h4>💳 Por pagamento</h4>
      ${Object.entries(porPgto).map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:.9rem"><span>${k.toUpperCase()}</span><span style="font-weight:700">${fmt(v)}</span></div>`).join('') || '<p style="color:var(--text3);font-size:.85rem">Nenhuma venda hoje</p>'}
    </div>
  `;
}

function admRenderConfig(c) {
  c.innerHTML = `
    <div class="adm-section"><h4>🏪 Dados da Lanchonete</h4>
      <div class="form-group"><label>Nome</label><input id="cfN" value="${CFG.nome || ''}"></div>
      <div class="form-group"><label>Slogan</label><input id="cfS" value="${CFG.slogan || ''}"></div>
      <div class="form-group"><label>Endereço</label><input id="cfE" value="${CFG.endereco || ''}"></div>
      <div class="form-row">
        <div class="form-group"><label>Telefone</label><input id="cfT" value="${CFG.telefone || ''}"></div>
        <div class="form-group"><label>WhatsApp (c/ DDI)</label><input id="cfW" value="${CFG.whatsapp || ''}" placeholder="5511999999999"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Tempo estimado</label><input id="cfTm" value="${CFG.tempoMedio || ''}"></div>
        <div class="form-group"><label>Taxa delivery</label><input type="number" id="cfTx" step="0.01" value="${CFG.taxaDelivery || 0}"></div>
      </div>
      <label style="font-size:.88rem;display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer"><input type="checkbox" id="cfAb" ${CFG.aberto !== false ? 'checked' : ''}> Loja aberta</label>
      <button class="btn-primary" onclick="admSaveCfg()">💾 Salvar</button>
    </div>
    <div class="adm-section"><h4>🔒 Senha</h4>
      <div class="form-group"><label>Nova senha admin</label><input type="password" id="cfPw" value="${CFG.senhaAdmin || '1234'}"></div>
      <button class="btn-primary btn-sm" onclick="admSavePw()">Alterar</button>
    </div>
    <div class="adm-section"><h4>🗃️ Sistema</h4>
      <p style="font-size:.82rem;color:var(--text2);margin-bottom:12px">${useFirebase ? '✅ Firebase conectado - dados sincronizam em tempo real!' : '⚠️ Usando localStorage - configure o Firebase para sincronizar entre dispositivos'}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn-outline btn-sm" onclick="admExport()">📥 Backup JSON</button>
        <button class="btn-red-o" onclick="admReset()">⚠️ Resetar tudo</button>
      </div>
    </div>`;
}

async function admSaveCfg() {
  CFG.nome = document.getElementById('cfN').value.trim();
  CFG.slogan = document.getElementById('cfS').value.trim();
  CFG.endereco = document.getElementById('cfE').value.trim();
  CFG.telefone = document.getElementById('cfT').value.trim();
  CFG.whatsapp = document.getElementById('cfW').value.trim();
  CFG.tempoMedio = document.getElementById('cfTm').value.trim();
  CFG.taxaDelivery = parseFloat(document.getElementById('cfTx').value) || 0;
  CFG.aberto = document.getElementById('cfAb').checked;
  await D.set('cfg', CFG); loadStoreUI(); toast('Configurações salvas ✓');
}
async function admSavePw() { CFG.senhaAdmin = document.getElementById('cfPw').value; await D.set('cfg', CFG); toast('Senha alterada ✓'); }

function admExport() {
  const data = { cats: CATS, prods: PRODS, pedidos: PEDIDOS, cfg: CFG, date: new Date().toISOString() };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = `backup_${new Date().toISOString().split('T')[0]}.json`; a.click(); toast('Backup exportado ✓');
}
async function admReset() { if (!confirm('⚠️ APAGAR TUDO?')) return; if (!confirm('Certeza?')) return; localStorage.clear(); if (useFirebase) { await db.ref().remove(); } location.reload(); }

function openWhatsAppDirect() { if (CFG.whatsapp) window.open(`https://wa.me/${CFG.whatsapp}`, '_blank'); }

// ========== HELPERS ==========
function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }
function openAdmM() { show('admMOv'); show('admM'); }
function closeAdmM() { hide('admM'); hide('admMOv'); }