/***********************
 * Firebase Kurulum
 ***********************/
const firebaseConfig = {
  apiKey: "AIzaSyAHSENkdEn-E4hoomD88mYJnvdHMCBB9AQ",
  authDomain: "ayyapi-surmecambalkon.firebaseapp.com",
  projectId: "ayyapi-surmecambalkon",
  storageBucket: "ayyapi-surmecambalkon.firebasestorage.app",
  messagingSenderId: "345356781986",
  appId: "1:345356781986:web:a1bbcd7f4dae20cfd5cafb",
  measurementId: "G-VYGW4HCZT1",
  // ÖNEMLİ: RTDB adresi
  databaseURL: "https://ayyapi-surmecambalkon-default-rtdb.europe-west1.firebasedatabase.app"
};

// Firebase SDK (modülsüz kullanım)
if (!window.firebase) {
  console.error("Firebase SDK ekli değil. index.html içine şu iki etiketi ekleyin:\n" +
    '<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>\n' +
    '<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js"></script>');
}
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/***********************
 * Varsayılan ayarlar
 ***********************/
const DEFAULTS = {
  prices: {
    aluAgri: 215,   // ₺/kg (Antrasit)
    aluRall: 270,   // ₺/kg (RALL)
    iscilik: 500,   // ₺/m²
    firePct: 15,    // %
    glass: {
      "8_seffaf": 1050,
      "8_fume": 1150,
      "20_seffaf": 1600,
      "20_fume": 1750
    },
    acc: {
      pss1: 10,    // çekme kol aksesuarı (adet)
      pss2: 7.5,   // kenet üst
      pss3: 7.5,   // kenet alt
      pss5: 15,    // 2'li köşe
      pss6: 20,    // 3'lü köşe
      pss8: 55,    // paslanmaz lüks teker
      pss9: 350,   // multi / anahtarlı / havuz
      pss10: 350,  // klips kol
      pss11: 750,  // kale 201F
      pss12: 5,    // sürme yalıtım
      zz126: 1500  // ispanyolet kol
    }
  },
  admins: { admin: "3482" } // ilk kurulum
};

// kg/metre değerleri
const KG = {
  alt2: 0.974,          // 213
  ust2: 1.120,          // 229
  alt3: 1.333,          // 222 (eşikli)
  ust3: 1.552,          // 230
  alt3esiksiz: 0.867,   // 220
  alt4esiksiz: 1.156,   // 221
  yan2: 0.587,          // 214
  yan3: 0.792,          // 223
  baza: 0.643,          // 210
  kenet: 0.423,         // 212
  cekmeKol: 0.908,      // 215
  adapt8: 0.219         // 219
};

/***********************
 * DOM kısayolları
 ***********************/
const $ = (id) => document.getElementById(id);
const el = {
  genislik: $("genislik"),
  yukseklik: $("yukseklik"),
  camSayisi: $("camSayisi"),
  camOzelligi: $("camOzelligi"),
  acilim: $("acilim"),
  ray: $("ray"),
  profilRengi: $("profilRengi"),
  kilitSag: $("kilitSag"),
  kilitSol: $("kilitSol"),
  kilitSagO: $("kilitSagO"),
  kilitSolO: $("kilitSolO"),
  kilitOrtaO: $("kilitOrtaO"),
  kilitYandan: $("kilitYandan"),
  kilitOrtadan: $("kilitOrtadan"),
  acilimUyari: $("acilimUyari"),
  aktifAluFiyati: $("aktifAluFiyati"),
  hesaplaBtn: $("hesaplaBtn"),
  ozet: $("ozet"),
  // admin
  adminLoginBox: $("admin-login-box"),
  adminPanel: $("admin-panel"),
  adminUser: $("adminUser"),
  adminPin: $("adminPin"),
  btnAdminLogin: $("btnAdminLogin"),
  whoami: $("whoami"),
  btnLogout: $("btnLogout"),
  priceAluStd: $("priceAluStd"),
  priceAluRall: $("priceAluRall"),
  priceLabor: $("priceLabor"),
  wastePct: $("wastePct"),
  price8Clr: $("price8Clr"),
  price8Smoke: $("price8Smoke"),
  price20Clr: $("price20Clr"),
  price20Smoke: $("price20Smoke"),
  btnSavePrices: $("btnSavePrices"),
  newPin: $("newPin"),
  btnChangePin: $("btnChangePin"),
  newAdminUser: $("newAdminUser"),
  newAdminPin: $("newAdminPin"),
  btnAddAdmin: $("btnAddAdmin"),
};

/***********************
 * Yardımcılar
 ***********************/
const tl = (x) => x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hide = (n) => n.classList.add("hidden");
const show = (n) => n.classList.remove("hidden");

/***********************
 * Bulut veri yardımcıları
 ***********************/
async function ensureDefaults() {
  const adminsSnap = await db.ref("/app/admins").get();
  if (!adminsSnap.exists()) {
    await db.ref("/app/admins").set(DEFAULTS.admins);
  }
  const pricesSnap = await db.ref("/app/settings/prices").get();
  if (!pricesSnap.exists()) {
    await db.ref("/app/settings/prices").set(DEFAULTS.prices);
  }
}

async function getPrices() {
  const snap = await db.ref("/app/settings/prices").get();
  return snap.val();
}
async function setPrices(p) {
  await db.ref("/app/settings/prices").set(p);
}
async function getAdmins() {
  const snap = await db.ref("/app/admins").get();
  return snap.val() || {};
}
async function setAdmins(a) {
  await db.ref("/app/admins").set(a);
}

/***********************
 * UI kuralları
 ***********************/
function refreshAcilimKisit() {
  const n = parseInt(el.camSayisi.value || "0", 10);
  if (!n) return;
  // 2 veya tek sayıda 'ortadan' kapalı
  const disableOrtadan = (n === 2 || n % 2 === 1);
  el.acilim.querySelector('option[value="ortadan"]').disabled = disableOrtandan = disableOrtadan;
  if (disableOrtadan) {
    el.acilim.value = "yandan";
    el.acilimUyari.textContent = "Not: 2 cam veya tek sayıda camda ‘Ortadan Açılır’ kullanılamaz.";
  } else {
    el.acilimUyari.textContent = "";
  }
  // kilit panelleri
  if (el.acilim.value === "yandan") {
    show(el.kilitYandan); hide(el.kilitOrtadan);
  } else {
    hide(el.kilitYandan); show(el.kilitOrtadan);
  }
}
["camSayisi", "acilim"].forEach(id => $(id).addEventListener("change", refreshAcilimKisit));

function refreshAluBadge(prices) {
  const kgPrice = (el.profilRengi.value === "rall") ? prices.aluRall : prices.aluAgri;
  el.aktifAluFiyati.textContent = `Alüminyum: ${kgPrice} ₺/kg`;
}
el.profilRengi.addEventListener("change", async () => refreshAluBadge(await getPrices()));

/***********************
 * Baza & cam ölçüleri
 ***********************/
function bazaKesim(gen, n, acilim) {
  if (n === 2) return (gen - 190) / 2;
  if (n === 3) return (gen - 212) / 3;
  if (n === 4) return (acilim === "yandan") ? (gen - 236) / 4 : (gen - 336) / 4;
  if (n === 5) return (gen - 260) / 5;
  if (n === 6) return (acilim === "yandan") ? (gen - 280) / 6 : (gen - 336) / 6;
  if (n === 7) return (gen - 300) / 7;
  if (n === 8) return (acilim === "yandan") ? (gen - 324) / 8 : (gen - 448) / 8;
  if (n === 9) return (gen - 340) / 9;
  if (n === 10) return (acilim === "yandan") ? (gen - 360) / 10 : (gen - 480) / 10;
  if (n === 11) return (gen - 380) / 11;
  if (n === 12) return (acilim === "yandan") ? (gen - 400) / 12 : (gen - 560) / 12;
  return (gen - 200) / n;
}
function camYukseklik(yuk, ray, camTip) {
  const boy = yuk - (ray === "esiksiz" ? 138 : 148);
  return Math.round(boy + (camTip.startsWith("20_") ? 2 : 0));
}

/***********************
 * Modül dağıtımı
 ***********************/
function compose23(n) {
  let m3 = Math.floor(n / 3), rem = n - m3 * 3, m2 = 0;
  if (rem === 1) { if (m3 >= 1) { m3 -= 1; m2 += 2; } else { m2 = Math.ceil(n / 2); m3 = 0; } }
  else if (rem === 2) { m2 = 1; }
  return { m2, m3 };
}
function splitTopSlots(slots) {
  if (slots === 2) return { ust2: 1, ust3: 0 };
  if (slots === 3) return { ust2: 0, ust3: 1 };
  if (slots === 4) return { ust2: 2, ust3: 0 };
  const ust3 = Math.floor(slots / 3);
  const ust2 = (slots - ust3 * 3) / 2;
  return { ust2, ust3 };
}
function splitBottomSlots(slots, ray) {
  if (ray === "esiksiz" && slots === 4) return { alt2: 0, alt3: 0, alt4es: 1 };
  if (slots === 2) return { alt2: 1, alt3: 0, alt4es: 0 };
  if (slots === 3) return { alt2: 0, alt3: 1, alt4es: 0 };
  if (slots === 4) return { alt2: 2, alt3: 0, alt4es: 0 };
  const alt3 = Math.floor(slots / 3);
  const alt2 = (slots - alt3 * 3) / 2;
  return { alt2, alt3, alt4es: 0 };
}

/***********************
 * Hesaplama
 ***********************/
async function hesapla() {
  const prices = await getPrices();
  const gen = parseFloat(el.genislik.value);
  const yuk = parseFloat(el.yukseklik.value);
  const n = parseInt(el.camSayisi.value);
  const camTip = el.camOzelligi.value; // '8_seffaf' vb
  const acilim = el.acilim.value;
  const ray = el.ray.value;
  const renk = el.profilRengi.value;

  if (!gen || !yuk || !n) { alert("Lütfen genişlik, yükseklik ve cam sayısını girin."); return; }
  if ((n === 2 || n % 2 === 1) && acilim === "ortadan") { alert("2 veya tek sayıda camda ‘Ortadan Açılır’ kullanılamaz."); return; }

  const baza = Math.round(bazaKesim(gen, n, acilim));
  const camEn = Math.round(baza + (camTip.startsWith("20_") ? 26 : 24));
  const camBoy = camYukseklik(yuk, ray, camTip);
  const camAdet = n;

  // Uzunluklar
  const altUstLen = gen - 40;
  const yanLen = yuk - (ray === "esiksiz" ? 12 : 25);
  const kenetKolLen = yuk - (ray === "esiksiz" ? 89.6 : 102);
  const adaptDikeyLen = kenetKolLen - 72;

  // Alüminyum kg
  let aluKg = 0;

  // Baza + yatay adaptör
  const bazaAdet = n * 2;
  aluKg += bazaAdet * (baza / 1000) * KG.baza;

  const yatayAdaptAdet = camTip.startsWith("20_") ? 0 : bazaAdet;
  const yatayAdaptLen = Math.max(baza - 1, 0);
  aluKg += yatayAdaptAdet * (yatayAdaptLen / 1000) * KG.adapt8;

  // Kenet & çekme kol adetleri
  const kenetAdet = (acilim === "yandan") ? (n - 2) * 2 : 8;
  const kolAdet = (acilim === "yandan") ? 2 : 4;

  aluKg += kenetAdet * (kenetKolLen / 1000) * KG.kenet;
  aluKg += kolAdet * (kenetKolLen / 1000) * KG.cekmeKol;

  // 8 mm dikey adaptör (çift camda yok)
  const dikeyAdaptAdet = camTip.startsWith("20_") ? 0 : ((acilim === "yandan") ? 4 : 8);
  aluKg += dikeyAdaptAdet * (adaptDikeyLen / 1000) * KG.adapt8;

  // Kasa dağılımı
  let ust2 = 0, ust3 = 0, alt2 = 0, alt3 = 0, alt4es = 0, yan2 = 0, yan3 = 0;

  if (acilim === "yandan") {
    const c = compose23(n);
    const m2 = c.m2, m3 = c.m3;
    if (ray === "esiksiz") {
      if (n === 4) { alt4es = 1; } else { alt2 += m2; alt3 += m3; }
    } else {
      alt2 += m2; alt3 += m3;
    }
    ust2 += m2; ust3 += m3;
    yan2 += m2 * 2; yan3 += m3 * 2;
  } else {
    const slots = n / 2;
    const top = splitTopSlots(slots);
    const bot = splitBottomSlots(slots, ray);
    ust2 += top.ust2; ust3 += top.ust3;
    alt2 += bot.alt2; alt3 += bot.alt3; alt4es += bot.alt4es;

    if (slots === 2) { yan2 = 2; }
    else if (slots === 3) { yan3 = 2; }
    else if (slots === 4) { yan2 = 2; }
    else {
      const t = Math.floor(slots / 3);
      yan3 = 2 * t;
      yan2 = (slots - t * 3) ? 2 : 0;
    }
  }

  // Kasa kg
  aluKg += ust2 * (altUstLen / 1000) * KG.ust2;
  aluKg += ust3 * (altUstLen / 1000) * KG.ust3;
  if (ray === "esiksiz") {
    aluKg += alt4es * (altUstLen / 1000) * KG.alt4esiksiz;
    aluKg += alt3 * (altUstLen / 1000) * KG.alt3esiksiz;
    aluKg += alt2 * (altUstLen / 1000) * KG.alt2;
  } else {
    aluKg += alt3 * (altUstLen / 1000) * KG.alt3;
    aluKg += alt2 * (altUstLen / 1000) * KG.alt2;
  }
  aluKg += yan2 * (yanLen / 1000) * KG.yan2;
  aluKg += yan3 * (yanLen / 1000) * KG.yan3;

  // Fire
  const aluKgFireli = aluKg * (1 + prices.firePct / 100);

  // Aksesuarlar
  const A = prices.acc;
  let aksesuarTop = 0;

  // köşe takozu
  if (ray === "esiksiz") {
    const k2 = ust2 * 2, k3 = ust3 * 2;
    aksesuarTop += k2 * A.pss5 + k3 * A.pss6;
  } else {
    const k2 = (ust2 + alt2) * 2;
    const k3 = (ust3 + alt3) * 2;
    aksesuarTop += k2 * A.pss5 + k3 * A.pss6;
  }
  // teker
  aksesuarTop += (n * 2) * A.pss8;
  // çekme kol aksesuarı
  aksesuarTop += (kolAdet * 2) * A.pss1;
  // kenet aksesuarı üst/alt
  aksesuarTop += kenetAdet * A.pss2;
  aksesuarTop += kenetAdet * A.pss3;

  // kilit fiyatları
  function kilitFiyati(ad) {
    if (ad === "Klips Kol") return A.pss10;
    if (ad === "Multi Kilit") return A.pss9;
    if (ad === "Anahtarlı Kilit") return A.pss9;
    if (ad === "İspanyolet Kol") return A.zz126;
    return 0;
    // NOT: havuz kolu burada multi ile aynı kabul edildi.
  }
  if (acilim === "yandan") {
    aksesuarTop += kilitFiyati(el.kilitSag.value);
    aksesuarTop += kilitFiyati(el.kilitSol.value);
  } else {
    aksesuarTop += kilitFiyati(el.kilitSagO.value);
    aksesuarTop += kilitFiyati(el.kilitSolO.value);
    aksesuarTop += kilitFiyati(el.kilitOrtaO.value);
  }

  // sürme yalıtım
  aksesuarTop += ((n - 1) * 2) * A.pss12;

  // Fiyatlar
  const aluKgFiyat = (renk === "rall") ? prices.aluRall : prices.aluAgri;
  const aluTutar = aluKgFireli * aluKgFiyat;

  // cam m2 (CAMDAN)
  const camM2 = (camEn * camBoy * n) / 1_000_000;
  const camBirim = prices.glass[camTip];
  const camTutar = camM2 * camBirim;

  // işçilik (SİSTEM m2)
  const sistemM2 = (gen * yuk) / 1_000_000;
  const iscilikTutar = sistemM2 * prices.iscilik;

  const genelToplam = aluTutar + camTutar + aksesuarTop + iscilikTutar;

  // Çıkış
  el.ozet.innerHTML = `
    <div><strong>Cam ölçüleri (yaklaşık):</strong> ${camEn} × ${camBoy} mm × ${camAdet} adet</div>
    <div class="muted" style="margin-top:6px">Hesap bayi görünümü içindir; demonte fiyatlardır.</div>
    <hr style="border:none;border-top:1px dashed #94a3b8;margin:10px 0">
    <div><strong>Genel Toplam:</strong> ${tl(genelToplam)} ₺</div>
  `;
  show(el.ozet);

  // rozet güncelle
  refreshAluBadge(prices);
}

/***********************
 * Admin oturum
 ***********************/
let CURRENT_ADMIN = null;

function bindPricesToForm(p) {
  el.priceAluStd.value = p.aluAgri;
  el.priceAluRall.value = p.aluRall;
  el.priceLabor.value = p.iscilik;
  el.wastePct.value = p.firePct;
  el.price8Clr.value = p.glass["8_seffaf"];
  el.price8Smoke.value = p.glass["8_fume"];
  el.price20Clr.value = p.glass["20_seffaf"];
  el.price20Smoke.value = p.glass["20_fume"];
}
function collectPricesFromForm() {
  return {
    aluAgri: parseFloat(el.priceAluStd.value) || 215,
    aluRall: parseFloat(el.priceAluRall.value) || 270,
    iscilik: parseFloat(el.priceLabor.value) || 500,
    firePct: parseFloat(el.wastePct.value) || 15,
    glass: {
      "8_seffaf": parseFloat(el.price8Clr.value) || 1050,
      "8_fume": parseFloat(el.price8Smoke.value) || 1150,
      "20_seffaf": parseFloat(el.price20Clr.value) || 1600,
      "20_fume": parseFloat(el.price20Smoke.value) || 1750
    },
    acc: (DEFAULTS.prices.acc) // aksesuar sabit kalıyor; istersen form ekleyelim
  };
}

// Giriş
el.btnAdminLogin.addEventListener("click", async () => {
  const user = el.adminUser.value.trim();
  const pin = el.adminPin.value.trim();
  if (!user || !pin) return alert("Kullanıcı ve PIN girin.");

  try {
    const admins = await getAdmins();
    if (admins[user] && String(admins[user]) === String(pin)) {
      CURRENT_ADMIN = user;
      el.whoami.textContent = user;
      hide(el.adminLoginBox);
      show(el.adminPanel);

      const prices = await getPrices();
      bindPricesToForm(prices);
      refreshAluBadge(prices);
    } else {
      alert("Bilgiler hatalı.");
    }
  } catch (e) {
    console.error(e);
    alert("Sunucu hatası. Lütfen tekrar deneyin.");
  }
});

el.btnLogout.addEventListener("click", () => {
  CURRENT_ADMIN = null;
  show(el.adminLoginBox);
  hide(el.adminPanel);
});

// Fiyat kaydet
el.btnSavePrices.addEventListener("click", async () => {
  if (!CURRENT_ADMIN) return alert("Önce giriş yapın.");
  const p = collectPricesFromForm();
  await setPrices(p);
  alert("Fiyatlar kaydedildi.");
});

// PIN değiştir (aktif kullanıcı)
el.btnChangePin.addEventListener("click", async () => {
  if (!CURRENT_ADMIN) return alert("Önce giriş yapın.");
  const newPin = el.newPin.value.trim();
  if (!newPin) return alert("Yeni PIN girin.");
  const admins = await getAdmins();
  admins[CURRENT_ADMIN] = newPin;
  await setAdmins(admins);
  el.newPin.value = "";
  alert("PIN güncellendi.");
});

// Yeni yönetici ekle
el.btnAddAdmin.addEventListener("click", async () => {
  if (!CURRENT_ADMIN) return alert("Önce giriş yapın.");
  const u = el.newAdminUser.value.trim();
  const p = el.newAdminPin.value.trim();
  if (!u || !p) return alert("Kullanıcı ve PIN girin.");
  const admins = await getAdmins();
  admins[u] = p;
  await setAdmins(admins);
  el.newAdminUser.value = "";
  el.newAdminPin.value = "";
  alert("Yeni yönetici eklendi.");
});

/***********************
 * Olaylar ve ilk yük
 ***********************/
el.hesaplaBtn.addEventListener("click", hesapla);
["camSayisi","acilim"].forEach(id=>$(id).addEventListener("change", refreshAcilimKisit));

(async function init() {
  try {
    await ensureDefaults();
    const prices = await getPrices();
    refreshAluBadge(prices);
  } catch (e) {
    console.error("Init error:", e);
  }
  // Başlangıçta müşteri görünümü: admin kapalı
  show(el.adminLoginBox);
  hide(el.adminPanel);
  hide(el.ozet);
  refreshAcilimKisit();
})();
