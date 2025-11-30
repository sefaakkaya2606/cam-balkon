/* =========================================================
   Kasetli Sürme Cam Balkon — script.js (ID’ler index.html ile uyumlu)
   ========================================================= */

/* ===== Varsayılan fiyatlar ===== */
const DEFAULTS = {
  aluAgri: 215,   // ₺/kg (Antrasit)
  aluRall: 270,   // ₺/kg (RALL)
  iscilik: 500,   // ₺/m2
  firePct: 15,    // %
  glass: {
    "8_seffaf": 1050,
    "8_fume": 1150,
    "20_seffaf": 1600,
    "20_fume": 1750
  },
  acc: {
    pss1: 10,   // çekme kol aksesuarı
    pss2: 7.5,  // kenet üst
    pss3: 7.5,  // kenet alt
    pss5: 15,   // 2'li köşe
    pss6: 20,   // 3'lü köşe
    pss8: 55,   // paslanmaz lüks teker
    pss9: 350,  // multi/anahtarlı/havuz tek fiyat
    pss10: 350, // klips kol
    pss11: 750, // kale 201F (kullanırsan)
    pss12: 5,   // sürme yalıtım
    zz126: 1500 // ispanyolet kol
  }
};

/* ===== KG/metre ===== */
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

/* ===== Kısayol ===== */
const $ = id => document.getElementById(id);

/* ===== DOM (index.html ile bire bir) ===== */
const el = {
  genislik: $("genislik"),
  yukseklik: $("yukseklik"),
  camSayisi: $("camSayisi"),
  camOzelligi: $("camOzelligi"),
  acilim: $("acilim"),
  ray: $("ray"),
  profilRengi: $("profilRengi"),
  aktifAluFiyati: $("aktifAluFiyati"),

  kilitYandan: $("kilitYandan"),
  kilitOrtadan: $("kilitOrtandan"), // index'te id="kilitOrtadan" — dikkat!
  // düzeltiyorum:
  kilitOrtadanDiv: $("kilitOrtadan"),
  kilitSag: $("kilitSag"),
  kilitSol: $("kilitSol"),
  kilitSagO: $("kilitSagO"),
  kilitSolO: $("kilitSolO"),
  kilitOrtaO: $("kilitOrtaO"),

  acilimUyari: $("acilimUyari"),
  hesaplaBtn: $("hesaplaBtn"),
  ozet: $("ozet"),

  // ADMIN (index id’lerine tam uyum)
  adminLoginBox: $("admin-login-box"),
  adminPanel: $("admin-panel"),
  adminUser: $("adminUser"),
  adminPin: $("adminPin"),
  btnAdminLogin: $("btnAdminLogin"),
  btnLogout: $("btnLogout"),
  whoami: $("whoami"),

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

/* ===== Config storage ===== */
function loadCfg() {
  const raw = localStorage.getItem("cfgCamBalkon");
  return raw ? JSON.parse(raw) : { ...DEFAULTS };
}
function saveCfg(cfg) {
  localStorage.setItem("cfgCamBalkon", JSON.stringify(cfg));
}
let CFG = loadCfg();

function tl(x) {
  return x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ===== Admin storage (local) =====
   Tüm cihazlarda ortak olmasını istiyorsan backend gerekir.
   Şimdilik: her cihazda localStorage:
   admins = { "admin": "3482", ... }
*/
function ensureAdmins() {
  const raw = localStorage.getItem("adminsCamBalkon");
  if (raw) return JSON.parse(raw);
  const seed = { admin: "3482" }; // ilk kurulum
  localStorage.setItem("adminsCamBalkon", JSON.stringify(seed));
  return seed;
}
function saveAdmins(obj) {
  localStorage.setItem("adminsCamBalkon", JSON.stringify(obj));
}
let ADMINS = ensureAdmins();

function setSessionUser(u) { sessionStorage.setItem("adminUser", u); }
function getSessionUser() { return sessionStorage.getItem("adminUser") || ""; }
function clearSessionUser() { sessionStorage.removeItem("adminUser"); }

/* ===== UI ===== */
function refreshAluBadge() {
  const kgPrice = (el.profilRengi.value === "rall") ? CFG.aluRall : CFG.aluAgri;
  el.aktifAluFiyati.textContent = `Alüminyum: ${kgPrice} ₺/kg`;
}
function refreshAcilimKisit() {
  const n = parseInt(el.camSayisi.value || "0", 10);
  if (!n) return;
  const ortadanOpt = el.acilim.querySelector('option[value="ortadan"]');
  if (n === 2 || n % 2 === 1) {
    el.acilim.value = "yandan";
    if (ortadanOpt) ortadanOpt.disabled = true;
    el.acilimUyari.textContent = "Not: 2 cam veya tek sayıda camda ‘Ortadan Açılır’ kullanılamaz.";
  } else {
    if (ortadanOpt) ortadanOpt.disabled = false;
    el.acilimUyari.textContent = "";
  }
  if (el.acilim.value === "yandan") {
    el.kilitYandan.classList.remove("hidden");
    el.kilitOrtodan?.classList?.add("hidden"); // olası yazım hatasına karşı
    el.kilitOrtadanDiv.classList.add("hidden");
  } else {
    el.kilitYandan.classList.add("hidden");
    el.kilitOrtadanDiv.classList.remove("hidden");
  }
}

/* ===== Formüller ===== */
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
  return boy + (camTip.startsWith("20_") ? 2 : 0);
}

/* ===== Modül dağıtımı ===== */
function compose23(n) {
  let m3 = Math.floor(n / 3), rem = n - m3 * 3;
  let m2 = 0;
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

/* ===== Hesapla (müşteri görünümü) ===== */
function hesapla() {
  const gen = parseFloat(el.genislik.value);
  const yuk = parseFloat(el.yukseklik.value);
  const n = parseInt(el.camSayisi.value);
  const camTip = el.camOzelligi.value;
  const acilim = el.acilim.value;
  const ray = el.ray.value;
  const renk = el.profilRengi.value;

  if (!gen || !yuk || !n) { alert("Lütfen genişlik, yükseklik ve cam sayısını girin."); return; }
  if ((n === 2 || n % 2 === 1) && acilim === "ortadan") {
    alert("2 veya tek sayıda camda ‘Ortadan Açılır’ kullanılamaz.");
    return;
  }

  const baza = Math.round(bazaKesim(gen, n, acilim));
  const camEn = Math.round(baza + (camTip.startsWith("20_") ? 26 : 24));
  const camBoy = Math.round(camYukseklik(yuk, ray, camTip));

  // KG hesabı (özet için toplam fiyat)
  let aluKg = 0;
  const altUstLen = gen - 40;
  const yanLen = yuk - (ray === "esiksiz" ? 12 : 25);
  const kenetKolLen = yuk - (ray === "esiksiz" ? 89.6 : 102);
  const adaptDikeyLen = kenetKolLen - 72;

  // baza & yatay adaptör
  const bazaAdet = n * 2;
  aluKg += (bazaAdet * (baza / 1000) * KG.baza);
  const yatayAdaptAdet = camTip.startsWith("20_") ? 0 : bazaAdet;
  const yatayAdaptLen = Math.max(baza - 1, 0);
  aluKg += (yatayAdaptAdet * (yatayAdaptLen / 1000) * KG.adapt8);

  // dikey adaptör
  const dikeyAdaptAdet = camTip.startsWith("20_") ? 0 : ((acilim === "yandan") ? 4 : 8);
  aluKg += (dikeyAdaptAdet * (adaptDikeyLen / 1000) * KG.adapt8);

  // kenet & kol
  const kenetAdet = (acilim === "yandan") ? (n - 2) * 2 : 8;
  const kolAdet = (acilim === "yandan") ? 2 : 4;
  aluKg += (kenetAdet * (kenetKolLen / 1000) * KG.kenet);
  aluKg += (kolAdet * (kenetKolLen / 1000) * KG.cekmeKol);

  // kasalar & yan kasalar
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

  const aluKgFireli = aluKg * (1 + CFG.firePct / 100);

  // aksesuarlar (fiyat)
  const A = CFG.acc;
  let aksesuarTop = 0;
  if (ray === "esiksiz") {
    const k2 = ust2 * 2, k3 = ust3 * 2;
    aksesuarTop += k2 * A.pss5 + k3 * A.pss6;
  } else {
    const k2 = (ust2 + alt2) * 2;
    const k3 = (ust3 + alt3) * 2;
    aksesuarTop += k2 * A.pss5 + k3 * A.pss6;
  }
  aksesuarTop += (n * 2) * A.pss8;
  const kenetAdet = (acilim === "yandan") ? (n - 2) * 2 : 8;
  const kolAdet = (acilim === "yandan") ? 2 : 4;
  aksesuarTop += (kolAdet * 2) * A.pss1;
  aksesuarTop += kenetAdet * A.pss2;
  aksesuarTop += kenetAdet * A.pss3;
  function kilitFiyati(ad) {
    if (ad === "Klips Kol") return A.pss10;
    if (ad === "Multi Kilit") return A.pss9;
    if (ad === "Anahtarlı Kilit") return A.pss9;
    if (ad === "İspanyolet Kol") return A.zz126;
    return 0;
  }
  if (acilim === "yandan") {
    aksesuarTop += kilitFiyati(el.kilitSag.value);
    aksesuarTop += kilitFiyati(el.kilitSol.value);
  } else {
    aksesuarTop += kilitFiyati(el.kilitSagO.value);
    aksesuarTop += kilitFiyati(el.kilitSolO.value);
    aksesuarTop += kilitFiyati(el.kilitOrtaO.value);
  }
  aksesuarTop += ((n - 1) * 2) * A.pss12;

  // fiyatlar
  const aluKgFiyat = (el.profilRengi.value === "rall") ? CFG.aluRall : CFG.aluAgri;
  const aluTutar = aluKgFireli * aluKgFiyat;

  const camM2 = (camEn * camBoy * n) / 1_000_000;
  const camBirim = CFG.glass[camTip];
  const camTutar = camM2 * camBirim;

  const sistemM2 = (gen * yuk) / 1_000_000;
  const iscilikTutar = sistemM2 * CFG.iscilik;

  const genelToplam = aluTutar + camTutar + aksesuarTop + iscilikTutar;

  el.ozet.classList.remove("hidden");
  el.ozet.innerHTML = `
    <div><strong>Cam ölçüleri (yaklaşık):</strong> ${camEn} × ${camBoy} mm × ${n} adet</div>
    <div class="muted" style="margin-top:6px">Müşteri görünümüdür. Kırılımlar gizlidir.</div>
    <hr style="border:none;border-top:1px dashed #94a3b8;margin:10px 0">
    <div><strong>Genel Toplam:</strong> ${tl(genelToplam)} ₺</div>
  `;
  refreshAluBadge();
}

/* ===== Admin UI ===== */
function enterAdmin(u) {
  setSessionUser(u);
  el.adminLoginBox.classList.add("hidden");
  el.adminPanel.classList.remove("hidden");
  el.whoami.textContent = u;

  // fiyatları doldur
  el.priceAluStd.value = CFG.aluAgri;
  el.priceAluRall.value = CFG.aluRall;
  el.priceLabor.value = CFG.iscilik;
  el.wastePct.value = CFG.firePct;
  el.price8Clr.value = CFG.glass["8_seffaf"];
  el.price8Smoke.value = CFG.glass["8_fume"];
  el.price20Clr.value = CFG.glass["20_seffaf"];
  el.price20Smoke.value = CFG.glass["20_fume"];
}
function leaveAdmin() {
  clearSessionUser();
  el.adminPanel.classList.add("hidden");
  el.adminLoginBox.classList.remove("hidden");
  el.adminUser.value = "";
  el.adminPin.value = "";
  el.newPin.value = "";
}

/* ===== Admin events ===== */
el.btnAdminLogin.addEventListener("click", () => {
  const u = (el.adminUser.value || "").trim();
  const p = (el.adminPin.value || "").trim();
  if (!u || !p) { alert("Kullanıcı ve PIN girin."); return; }
  const ok = ADMINS[u] && ADMINS[u] === p;
  if (ok) enterAdmin(u);
  else alert("Bilgiler hatalı.");
});

el.btnLogout.addEventListener("click", leaveAdmin);

(function restoreSession(){
  const u = getSessionUser();
  if (u) enterAdmin(u); else leaveAdmin();
})();

/* Fiyat kaydet */
el.btnSavePrices.addEventListener("click", () => {
  CFG.aluAgri = parseFloat(el.priceAluStd.value) || CFG.aluAgri;
  CFG.aluRall = parseFloat(el.priceAluRall.value) || CFG.aluRall;
  CFG.iscilik = parseFloat(el.priceLabor.value) || CFG.iscilik;
  CFG.firePct = parseFloat(el.wastePct.value) || CFG.firePct;
  CFG.glass["8_seffaf"] = parseFloat(el.price8Clr.value) || CFG.glass["8_seffaf"];
  CFG.glass["8_fume"] = parseFloat(el.price8Smoke.value) || CFG.glass["8_fume"];
  CFG.glass["20_seffaf"] = parseFloat(el.price20Clr.value) || CFG.glass["20_seffaf"];
  CFG.glass["20_fume"] = parseFloat(el.price20Smoke.value) || CFG.glass["20_fume"];
  saveCfg(CFG);
  alert("Kaydedildi.");
  refreshAluBadge();
});

/* PIN değiştir (lokal) */
el.btnChangePin.addEventListener("click", () => {
  const u = getSessionUser();
  const np = (el.newPin.value || "").trim();
  if (!u || !np) { alert("Yeni PIN girin."); return; }
  ADMINS[u] = np;
  saveAdmins(ADMINS);
  el.newPin.value = "";
  alert("PIN güncellendi (bu cihazda). Diğer cihazlar için backend gerekir.");
});

/* Yeni yönetici ekle (lokal) */
el.btnAddAdmin.addEventListener("click", () => {
  const u = (el.newAdminUser.value || "").trim();
  const p = (el.newAdminPin.value || "").trim();
  if (!u || !p) { alert("Yeni kullanıcı ve PIN girin."); return; }
  ADMINS[u] = p;
  saveAdmins(ADMINS);
  el.newAdminUser.value = "";
  el.newAdminPin.value = "";
  alert("Yönetici eklendi (bu cihazda).");
});

/* ===== Events ===== */
el.hesaplaBtn.addEventListener("click", hesapla);
el.camSayisi.addEventListener("change", refreshAcilimKisit);
el.acilim.addEventListener("change", refreshAcilimKisit);
el.profilRengi.addEventListener("change", refreshAluBadge);

/* ===== İlk yükleme ===== */
refreshAcilimKisit();
refreshAluBadge();
