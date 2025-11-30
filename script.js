/* =========================
   Kasetli Sürme Cam Balkon
   - Fiyat/Ayar yönetimi (localStorage)
   - Yönetici (kullanıcı + PIN) giriş/çıkış
   - Hesaplama motoru
   ========================= */

/* ===== Varsayılan Ayarlar ===== */
const DEFAULTS = {
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
  // Aksesuar adet fiyatları (₺/adet)
  acc: {
    pss1: 10,    // çekme kol aksesuarı
    pss2: 7.5,   // kenet üst
    pss3: 7.5,   // kenet alt
    pss5: 15,    // 2'li köşe
    pss6: 20,    // 3'lü köşe
    pss8: 55,    // paslanmaz lüks teker
    pss9: 350,   // multi/havuz/anahtarlı (tek fiyat)
    pss10: 350,  // klips kol
    pss11: 750,  // kale 201F
    pss12: 5,    // sürme yalıtım
    zz126: 1500  // ispanyolet kol
  }
};

/* ===== Profil kg/metre değerleri ===== */
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

/* ===== DOM kısa yolları ===== */
const $ = (id) => document.getElementById(id);
const el = {
  // müşteri formu
  genislik: $("genislik"),
  yukseklik: $("yukseklik"),
  camSayisi: $("camSayisi"),
  camOzelligi: $("camOzelligi"),
  acilim: $("acilim"),
  ray: $("ray"),
  profilRengi: $("profilRengi"),

  // kilit alanları
  kilitYandan: $("kilitYandan"),
  kilitOrtadan: $("kilitOrtadan"),
  kilitSag: $("kilitSag"),
  kilitSol: $("kilitSol"),
  kilitSagO: $("kilitSagO"),
  kilitSolO: $("kilitSolO"),
  kilitOrtaO: $("kilitOrtaO"),

  // buton/çıktı
  hesaplaBtn: $("hesaplaBtn"),
  ozet: $("ozet"),
  acilimUyari: $("acilimUyari"),
  aktifAluFiyati: $("aktifAluFiyati"),

  // yönetici giriş
  adminLoginBox: $("admin-login-box"),
  adminPanel: $("admin-panel"),
  whoami: $("whoami"),
  adminUser: $("adminUser"),
  adminPin: $("adminPin"),
  btnAdminLogin: $("btnAdminLogin"),
  btnLogout: $("btnLogout"),

  // fiyat ayar inputları
  priceAluStd: $("priceAluStd"),
  priceAluRall: $("priceAluRall"),
  priceLabor: $("priceLabor"),
  wastePct: $("wastePct"),
  price8Clr: $("price8Clr"),
  price8Smoke: $("price8Smoke"),
  price20Clr: $("price20Clr"),
  price20Smoke: $("price20Smoke"),
  btnSavePrices: $("btnSavePrices"),

  // güvenlik
  newPin: $("newPin"),
  btnChangePin: $("btnChangePin"),
  newAdminUser: $("newAdminUser"),
  newAdminPin: $("newAdminPin"),
  btnAddAdmin: $("btnAddAdmin"),
};

/* ===== Config & Admin depolama ===== */
const CFG_KEY = "cfgCamBalkon";
const ADM_KEY = "cb_admins";
const SES_KEY = "cb_session_user";

function loadCfg() {
  const raw = localStorage.getItem(CFG_KEY);
  return raw ? JSON.parse(raw) : { ...DEFAULTS };
}
function saveCfg(cfg) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}
let CFG = loadCfg();

function getAdmins() {
  const raw = localStorage.getItem(ADM_KEY);
  if (raw) return JSON.parse(raw);
  // ilk kurulumda varsayılan admin
  const initial = [{ u: "admin", pin: "3482" }];
  localStorage.setItem(ADM_KEY, JSON.stringify(initial));
  return initial;
}
function saveAdmins(list) {
  localStorage.setItem(ADM_KEY, JSON.stringify(list));
}
function getSessionUser() {
  return localStorage.getItem(SES_KEY) || "";
}
function setSessionUser(u) {
  if (u) localStorage.setItem(SES_KEY, u);
  else localStorage.removeItem(SES_KEY);
}

/* ===== Yardımcılar ===== */
function tl(x) {
  return x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function show(elm) { elm.classList.remove("hidden"); }
function hide(elm) { elm.classList.add("hidden"); }

/* ===== Yönetici UI ===== */
function fillPriceForm() {
  el.priceAluStd.value = CFG.aluAgri;
  el.priceAluRall.value = CFG.aluRall;
  el.priceLabor.value = CFG.iscilik;
  el.wastePct.value = CFG.firePct;
  el.price8Clr.value = CFG.glass["8_seffaf"];
  el.price8Smoke.value = CFG.glass["8_fume"];
  el.price20Clr.value = CFG.glass["20_seffaf"];
  el.price20Smoke.value = CFG.glass["20_fume"];
}
function applyActiveAluBadge() {
  const price = (el.profilRengi.value === "rall") ? CFG.aluRall : CFG.aluAgri;
  el.aktifAluFiyati.textContent = `Alüminyum: ${price} ₺/kg`;
}
function enterAdmin(u) {
  setSessionUser(u);
  el.whoami.textContent = u;
  hide(el.adminLoginBox);
  show(el.adminPanel);
  fillPriceForm();
}
function exitAdmin() {
  setSessionUser("");
  hide(el.adminPanel);
  show(el.adminLoginBox);
  el.adminUser.value = "";
  el.adminPin.value = "";
}

/* ===== Yönetici Olayları ===== */
el.btnAdminLogin?.addEventListener("click", () => {
  const u = (el.adminUser.value || "").trim();
  const p = (el.adminPin.value || "").trim();
  if (!u || !p) return alert("Kullanıcı ve PIN giriniz.");

  const admins = getAdmins();
  const ok = admins.find(a => a.u === u && a.pin === p);
  if (!ok) return alert("Giriş başarısız. Bilgileri kontrol edin.");

  enterAdmin(u);
});
el.btnLogout?.addEventListener("click", exitAdmin);

el.btnSavePrices?.addEventListener("click", () => {
  CFG.aluAgri = parseFloat(el.priceAluStd.value) || CFG.aluAgri;
  CFG.aluRall = parseFloat(el.priceAluRall.value) || CFG.aluRall;
  CFG.iscilik = parseFloat(el.priceLabor.value) || CFG.iscilik;
  CFG.firePct = parseFloat(el.wastePct.value) || CFG.firePct;
  CFG.glass["8_seffaf"] = parseFloat(el.price8Clr.value) || CFG.glass["8_seffaf"];
  CFG.glass["8_fume"] = parseFloat(el.price8Smoke.value) || CFG.glass["8_fume"];
  CFG.glass["20_seffaf"] = parseFloat(el.price20Clr.value) || CFG.glass["20_seffaf"];
  CFG.glass["20_fume"] = parseFloat(el.price20Smoke.value) || CFG.glass["20_fume"];
  saveCfg(CFG);
  applyActiveAluBadge();
  alert("Fiyatlar kaydedildi.");
});

el.btnChangePin?.addEventListener("click", () => {
  const u = getSessionUser();
  if (!u) return alert("Önce yönetici girişi yapın.");
  const np = (el.newPin.value || "").trim();
  if (np.length < 3) return alert("PIN en az 3 haneli olmalı.");

  const admins = getAdmins();
  const idx = admins.findIndex(a => a.u === u);
  if (idx >= 0) {
    admins[idx].pin = np;
    saveAdmins(admins);
    el.newPin.value = "";
    alert("PIN güncellendi.");
  }
});

el.btnAddAdmin?.addEventListener("click", () => {
  const u = (el.newAdminUser.value || "").trim();
  const p = (el.newAdminPin.value || "").trim();
  if (!u || !p) return alert("Yeni yönetici adı ve PIN girin.");
  const admins = getAdmins();
  if (admins.some(a => a.u === u)) return alert("Bu kullanıcı zaten var.");

  admins.push({ u, pin: p });
  saveAdmins(admins);
  el.newAdminUser.value = "";
  el.newAdminPin.value = "";
  alert("Yeni yönetici eklendi.");
});

/* ===== Müşteri UI kuralları ===== */
function refreshAcilimKisit() {
  const n = parseInt(el.camSayisi.value || "0", 10);
  if (!n) return;

  // 2 cam veya tek sayıda cam → ortadan açılır devre dışı
  const ortadanOpt = el.acilim.querySelector('option[value="ortadan"]');
  if (n === 2 || n % 2 === 1) {
    el.acilim.value = "yandan";
    if (ortadanOpt) ortadanOpt.disabled = true;
    el.acilimUyari.textContent = "Not: 2 cam veya tek sayıda camda ‘Ortadan Açılır’ kullanılamaz.";
  } else {
    if (ortadanOpt) ortadanOpt.disabled = false;
    el.acilimUyari.textContent = "";
  }

  // kilit kutuları görünürlüğü
  if (el.acilim.value === "yandan") {
    show(el.kilitYandan);
    hide(el.kilitOrtadan);
  } else {
    hide(el.kilitYandan);
    show(el.kilitOrtadan);
  }
}
["camSayisi", "acilim"].forEach(id => $(id)?.addEventListener("change", refreshAcilimKisit));
el.profilRengi?.addEventListener("change", applyActiveAluBadge);

/* ===== Cam/Baza Formülleri =====
   8 mm : camEn = baza + 24
   20 mm: camEn = baza + 26
*/
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
  return (gen - 200) / n; // emniyet
}
function camYukseklik(yuk, ray, camTip) {
  // eşikli: −148, eşiksiz: −138 ; çift camda +2 mm
  const boy = yuk - (ray === "esiksiz" ? 138 : 148);
  return boy + (camTip.startsWith("20_") ? 2 : 0);
}

/* ===== Modül kompozisyonu yardımcıları ===== */
// yandan açılırda 2'li/3'lü modüllere dağıtım
function compose23(n) {
  let m3 = Math.floor(n / 3), rem = n - m3 * 3, m2 = 0;
  if (rem === 1) {
    if (m3 >= 1) { m3 -= 1; m2 += 2; }
    else { m2 = Math.ceil(n / 2); m3 = 0; }
  } else if (rem === 2) { m2 = 1; }
  return { m2, m3 };
}
// ortadan açılır için üst/alt slot bölüşümü
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
  if (slots === 4) return { alt2: 2, alt3: 0, alt4es: 0 }; // eşikli alt: 2×2'li
  const alt3 = Math.floor(slots / 3);
  const alt2 = (slots - alt3 * 3) / 2;
  return { alt2, alt3, alt4es: 0 };
}

/* ===== Hesapla ===== */
function hesapla() {
  const gen = parseFloat(el.genislik.value);
  const yuk = parseFloat(el.yukseklik.value);
  const n = parseInt(el.camSayisi.value);
  const camTip = el.camOzelligi.value; // 8_seffaf vb.
  const acilim = el.acilim.value;
  const ray = el.ray.value;
  const renk = el.profilRengi.value;

  if (!gen || !yuk || !n) return alert("Lütfen genişlik, yükseklik ve cam sayısını girin.");
  if ((n === 2 || n % 2 === 1) && acilim === "ortadan")
    return alert("2 veya tek sayıda camda ‘Ortadan Açılır’ kullanılamaz.");

  // cam/baza ölçüleri
  const baza = Math.round(bazaKesim(gen, n, acilim));
  const camEn = Math.round(baza + (camTip.startsWith("20_") ? 26 : 24));
  const camBoy = Math.round(camYukseklik(yuk, ray, camTip));

  // Alüminyum kg hesabı
  let aluKg = 0;
  const altUstLen = gen - 40;
  const yanLen = yuk - (ray === "esiksiz" ? 12 : 25);
  const kenetKolLen = yuk - (ray === "esiksiz" ? 89.6 : 102);
  const adaptDikeyLen = kenetKolLen - 72; // 8mm için

  // baza & yatay adaptör (çift camda yatay/dikey adaptör yok)
  const bazaAdet = n * 2;
  aluKg += (bazaAdet * (baza / 1000) * KG.baza);
  const yatayAdaptAdet = camTip.startsWith("20_") ? 0 : bazaAdet;
  aluKg += (yatayAdaptAdet * ((Math.max(baza - 1, 0)) / 1000) * KG.adapt8);

  // 8mm dikey adaptör
  const dikeyAdaptAdet = camTip.startsWith("20_") ? 0 : ((acilim === "yandan") ? 4 : 8);
  aluKg += (dikeyAdaptAdet * (adaptDikeyLen / 1000) * KG.adapt8);

  // kenet/kol adetleri
  const kenetAdet = (acilim === "yandan") ? (n - 2) * 2 : 8;
  const kolAdet = (acilim === "yandan") ? 2 : 4;

  aluKg += (kenetAdet * (kenetKolLen / 1000) * KG.kenet);
  aluKg += (kolAdet * (kenetKolLen / 1000) * KG.cekmeKol);

  // kasalar ve yan kasalar
  let ust2 = 0, ust3 = 0, alt2 = 0, alt3 = 0, alt4es = 0, yan2 = 0, yan3 = 0;

  if (acilim === "yandan") {
    const c = compose23(n);
    if (ray === "esiksiz") {
      if (n === 4) alt4es = 1;
      else { alt2 += c.m2; alt3 += c.m3; }
    } else { alt2 += c.m2; alt3 += c.m3; }
    ust2 += c.m2; ust3 += c.m3;
    yan2 += c.m2 * 2; yan3 += c.m3 * 2;
  } else {
    const slots = n / 2;
    const top = splitTopSlots(slots);
    const bot = splitBottomSlots(slots, ray);
    ust2 += top.ust2; ust3 += top.ust3;
    alt2 += bot.alt2; alt3 += bot.alt3; alt4es += bot.alt4es;

    if (slots === 2) yan2 = 2;
    else if (slots === 3) yan3 = 2;
    else if (slots === 4) yan2 = 2;
    else {
      const t = Math.floor(slots / 3);
      yan3 = 2 * t;
      yan2 = (slots - t * 3) ? 2 : 0;
    }
  }

  // kg topla
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

  // fire
  const aluKgFireli = aluKg * (1 + CFG.firePct / 100);

  // aksesuarlar
  const A = CFG.acc;
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

  // kenet aksesuarları
  aksesuarTop += kenetAdet * A.pss2;
  aksesuarTop += kenetAdet * A.pss3;

  // kilit fiyatları
  const kilitFiyati = (ad) => {
    if (ad === "Klips Kol") return A.pss10;
    if (ad === "Multi Kilit") return A.pss9;
    if (ad === "Anahtarlı Kilit") return A.pss9;
    if (ad === "İspanyolet Kol") return A.zz126;
    return 0;
  };
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

  // fiyatlar
  const aluKgFiyat = (renk === "rall") ? CFG.aluRall : CFG.aluAgri;
  const aluTutar = aluKgFireli * aluKgFiyat;

  const camM2 = (camEn * camBoy * n) / 1_000_000;
  const camBirim = CFG.glass[camTip];
  const camTutar = camM2 * camBirim;

  const sistemM2 = (gen * yuk) / 1_000_000;
  const iscilikTutar = sistemM2 * CFG.iscilik;

  const genelToplam = aluTutar + camTutar + aksesuarTop + iscilikTutar;

  // çıktı (müşteri görünümü)
  el.ozet.innerHTML = `
    <div><strong>Cam ölçüleri (yaklaşık):</strong> ${camEn} × ${camBoy} mm × ${n} adet</div>
    <div class="muted" style="margin-top:6px">Hesap bayi içindir; demonte fiyatlar, kırılımlar müşteriye gösterilmez.</div>
    <hr style="border:none;border-top:1px dashed #94a3b8;margin:10px 0">
    <div><strong>Genel Toplam:</strong> ${tl(genelToplam)} ₺</div>
  `;
  el.ozet.classList.remove("hidden");

  applyActiveAluBadge();
}

/* ===== Olay bağlama ===== */
el.hesaplaBtn?.addEventListener("click", hesapla);
el.camSayisi?.addEventListener("change", refreshAcilimKisit);
el.acilim?.addEventListener("change", refreshAcilimKisit);

/* ===== İlk yükleme ===== */
applyActiveAluBadge();
refreshAcilimKisit();

// Oturum açık ise admin panelini göster
const sessionU = getSessionUser();
if (sessionU) enterAdmin(sessionU);
