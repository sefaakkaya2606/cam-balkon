/* =========================================================
   Kasetli Sürme Cam Balkon — script.js (tam sürüm)
   ========================================================= */

/* ===== Ayarlar (localStorage ile kalıcı) ===== */
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
  // aksesuar adet fiyatları
  acc: {
    pss1: 10,   // çekme kol aksesuarı
    pss2: 7.5,  // kenet üst
    pss3: 7.5,  // kenet alt
    pss5: 15,   // 2'li köşe
    pss6: 20,   // 3'lü köşe
    pss8: 55,   // paslanmaz lüks teker
    pss9: 350,  // havuz/multi/anahtarlı (tek fiyat)
    pss10: 350, // klips kol
    pss11: 750, // kale 201F
    pss12: 5,   // sürme yalıtım
    zz126: 1500 // ispanyolet kol
  }
};

// kg/metre değerleri
const KG = {
  alt2: 0.974,          // 213  (2'li alt kasa)
  ust2: 1.120,          // 229  (2'li üst kasa)
  alt3: 1.333,          // 222  (3'lü alt kasa - eşikli)
  ust3: 1.552,          // 230  (3'lü üst kasa)
  alt3esiksiz: 0.867,   // 220  (3'lü alt kasa - eşiksiz)
  alt4esiksiz: 1.156,   // 221  (4'lü alt kasa - eşiksiz)
  yan2: 0.587,          // 214  (2'li yan kasa)
  yan3: 0.792,          // 223  (3'lü yan kasa)
  baza: 0.643,          // 210  (sürme baza profili)
  kenet: 0.423,         // 212
  cekmeKol: 0.908,      // 215
  adapt8: 0.219         // 219 (8 mm adaptör)
};

// ===== DOM kısayolları
const $ = (id) => document.getElementById(id);
const el = {
  // form
  genislik: $("genislik"),
  yukseklik: $("yukseklik"),
  camSayisi: $("camSayisi"),
  camOzelligi: $("camOzelligi"),   // 8_seffaf, 8_fume, 20_seffaf, 20_fume
  acilim: $("acilim"),             // yandan / ortadan
  ray: $("ray"),                   // esikli / esiksiz
  profilRengi: $("profilRengi"),   // agri / rall

  // kilitler
  kilitYandan: $("kilitYandan"),
  kilitOrtadan: $("kilitOrtadan"),
  kilitSag: $("kilitSag"),
  kilitSol: $("kilitSol"),
  kilitSagO: $("kilitSagO"),
  kilitSolO: $("kilitSolO"),
  kilitOrtaO: $("kilitOrtaO"),

  // diğer
  acilimUyari: $("acilimUyari"),
  aktifAluFiyati: $("aktifAluFiyati"),
  hesaplaBtn: $("hesaplaBtn"),
  ozet: $("ozet"),

  // admin giriş
  adminBox: $("adminBox"),
  adminPanel: $("adminPanel"),
  adminUser: $("adminUser"),
  adminPin: $("adminPin"),
  btnAdminLogin: $("btnAdminLogin"),
  btnAdminLogout: $("btnAdminLogout"),

  // fiyat ayarları (admin panel)
  pAluAgri: $("pAluAgri"),
  pAluRall: $("pAluRall"),
  pIscilik: $("pIscilik"),
  pFire: $("pFire"),
  p8Seffaf: $("p8Seffaf"),
  p8Fume: $("p8Fume"),
  p20Seffaf: $("p20Seffaf"),
  p20Fume: $("p20Fume"),
  kaydetBtn: $("kaydetBtn"),

  // güvenlik
  newPin: $("newPin"),
  btnPinUpdate: $("btnPinUpdate"),
  btnAddAdmin: $("btnAddAdmin") // opsiyonel (HTML’de olmayabilir)
};

// ===== State & helpers
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

function setSessionUser(u) {
  sessionStorage.setItem("adminUser", u);
}
function getSessionUser() {
  return sessionStorage.getItem("adminUser") || "";
}
function clearSessionUser() {
  sessionStorage.removeItem("adminUser");
}

// Netlify Function URL
const FN_URL = "/.netlify/functions/admin";

// basit fetch wrapper
async function api(action, payload = {}, withMaster = false) {
  const headers = { "Content-Type": "application/json" };
  if (withMaster && window.ADMIN_MASTER_KEY) {
    headers["Authorization"] = "Bearer " + window.ADMIN_MASTER_KEY;
  }
  const res = await fetch(FN_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, ...payload })
  });
  return res.json();
}

/* ========= UI Kuralları ========= */
function refreshAluBadge() {
  const kgPrice = (el.profilRengi.value === "rall") ? CFG.aluRall : CFG.aluAgri;
  el.aktifAluFiyati.textContent = `Alüminyum: ${kgPrice} ₺/kg`;
}

function refreshAcilimKisit() {
  const n = parseInt(el.camSayisi.value || "0", 10);
  if (!n) return;

  // 2 cam veya TEK sayıda cam → ortadan açılır yasak
  const ortadanOpt = el.acilim.querySelector('option[value="ortadan"]');
  if (n === 2 || n % 2 === 1) {
    el.acilim.value = "yandan";
    if (ortadanOpt) ortadanOpt.disabled = true;
    el.acilimUyari.textContent = "Not: 2 cam veya tek sayıda camda ‘Ortadan Açılır’ kullanılamaz.";
  } else {
    if (ortadanOpt) ortadanOpt.disabled = false;
    el.acilimUyari.textContent = "";
  }

  // kilit alanlarını göster/gizle
  if (el.acilim.value === "yandan") {
    el.kilitYandan.classList.remove("hide");
    el.kilitOrtadan.classList.add("hide");
  } else {
    el.kilitYandan.classList.add("hide");
    el.kilitOrtadan.classList.remove("hide");
  }
}

/* ========= Cam/Baza formülleri =========
   - 8 mm: camEn = baza + 24
   - Çift cam: camEn = baza + 26
   - baza (mm):
     2:  (gen - 190) / 2
     3:  (gen - 212) / 3
     4 yandan:  (gen - 236) / 4
     4 ortadan: (gen - 336) / 4
     5 yandan:  (gen - 260) / 5
     6 yandan:  (gen - 280) / 6
     6 ortadan: (gen - 336) / 6
     7 yandan:  (gen - 300) / 7
     8 yandan:  (gen - 324) / 8
     8 ortadan: (gen - 448) / 8
     9..12: pratik yakınsama; istenirse tablolaştırılır.
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
  // emniyet
  return (gen - 200) / n;
}

function camYukseklik(yuk, ray, camTip) {
  // eşikli: 2000 → 1852 (−148)
  // eşiksiz: 2000 → 1862 (−138)
  const boy = yuk - (ray === "esiksiz" ? 138 : 148);
  // çift cam +2 mm
  return boy + (camTip.startsWith("20_") ? 2 : 0);
}

/* ======= Yandan modül kompozisyonu (2'li & 3'lü) ======= */
function compose23(n) {
  let m3 = Math.floor(n / 3), rem = n - m3 * 3;
  let m2 = 0;
  if (rem === 1) {           // 3+3+…+1 → (3-1) + (2+2)
    if (m3 >= 1) { m3 -= 1; m2 += 2; }
    else { m2 = Math.ceil(n / 2); m3 = 0; } // 1 → 2 yakınsama
  } else if (rem === 2) { m2 = 1; }
  return { m2, m3 };
}
function splitTopSlots(slots) {          // ORTADAN: üst kasa
  if (slots === 2) return { ust2: 1, ust3: 0 };
  if (slots === 3) return { ust2: 0, ust3: 1 };
  if (slots === 4) return { ust2: 2, ust3: 0 };  // 4 = 2×2'li
  const ust3 = Math.floor(slots / 3);
  const ust2 = (slots - ust3 * 3) / 2;
  return { ust2, ust3 };
}
function splitBottomSlots(slots, ray) {  // ORTADAN: alt kasa
  if (ray === "esiksiz" && slots === 4) return { alt2: 0, alt3: 0, alt4es: 1 };
  if (slots === 2) return { alt2: 1, alt3: 0, alt4es: 0 };
  if (slots === 3) return { alt2: 0, alt3: 1, alt4es: 0 };
  if (slots === 4) return { alt2: 2, alt3: 0, alt4es: 0 }; // eşikli alt: 2×2'li
  const alt3 = Math.floor(slots / 3);
  const alt2 = (slots - alt3 * 3) / 2;
  return { alt2, alt3, alt4es: 0 };
}

/* ================== HESAPLA ================== */
function hesapla() {
  const gen = parseFloat(el.genislik.value);
  const yuk = parseFloat(el.yukseklik.value);
  const n = parseInt(el.camSayisi.value);
  const camTip = el.camOzelligi.value; // '8_seffaf' vs
  const acilim = el.acilim.value;      // yandan/ortadan
  const ray = el.ray.value;            // esikli/esiksiz
  const renk = el.profilRengi.value;   // agri/rall

  if (!gen || !yuk || !n) { alert("Lütfen genişlik, yükseklik ve cam sayısını girin."); return; }
  if ((n === 2 || n % 2 === 1) && acilim === "ortadan") {
    alert("2 veya tek sayıda camda ‘Ortadan Açılır’ kullanılamaz.");
    return;
  }

  // Baza, cam en ve cam boy
  const baza = Math.round(bazaKesim(gen, n, acilim));
  const camEn = Math.round(baza + (camTip.startsWith("20_") ? 26 : 24));
  const camBoy = Math.round(camYukseklik(yuk, ray, camTip));
  const camAdet = n;

  // ——— Alüminyum KG hesabı ———
  let aluKg = 0;
  const altUstLen = gen - 40;
  const yanLen = yuk - (ray === "esiksiz" ? 12 : 25);
  const kenetKolLen = yuk - (ray === "esiksiz" ? 89.6 : 102);
  const adaptDikeyLen = kenetKolLen - 72; // 8 mm için

  // baza & yatay adaptör
  const bazaAdet = n * 2;
  aluKg += (bazaAdet * (baza / 1000) * KG.baza);
  const yatayAdaptAdet = camTip.startsWith("20_") ? 0 : bazaAdet;
  const yatayAdaptLen = Math.max(baza - 1, 0);
  aluKg += (yatayAdaptAdet * (yatayAdaptLen / 1000) * KG.adapt8);

  // 8 mm dikey adaptör (çift camda yok)
  const dikeyAdaptAdet = camTip.startsWith("20_") ? 0 : ((acilim === "yandan") ? 4 : 8);
  aluKg += (dikeyAdaptAdet * (adaptDikeyLen / 1000) * KG.adapt8);

  // kenet & çekme kol adetleri
  const kenetAdet = (acilim === "yandan") ? (n - 2) * 2 : 8;
  const kolAdet = (acilim === "yandan") ? 2 : 4;

  aluKg += (kenetAdet * (kenetKolLen / 1000) * KG.kenet);
  aluKg += (kolAdet * (kenetKolLen / 1000) * KG.cekmeKol);

  // kasalar & yan kasalar
  let ust2 = 0, ust3 = 0, alt2 = 0, alt3 = 0, alt4es = 0, yan2 = 0, yan3 = 0;

  if (acilim === "yandan") {
    const c = compose23(n);
    const m2 = c.m2, m3 = c.m3;
    // alt
    if (ray === "esiksiz") {
      if (n === 4) { alt4es = 1; } else { alt2 += m2; alt3 += m3; }
    } else {
      alt2 += m2; alt3 += m3;
    }
    // üst
    ust2 += m2; ust3 += m3;
    // yan
    yan2 += m2 * 2; yan3 += m3 * 2;
  } else {
    const slots = n / 2;
    const top = splitTopSlots(slots);
    const bot = splitBottomSlots(slots, ray);
    ust2 += top.ust2; ust3 += top.ust3;
    alt2 += bot.alt2; alt3 += bot.alt3; alt4es += bot.alt4es;
    // yan
    if (slots === 2) { yan2 = 2; }
    else if (slots === 3) { yan3 = 2; }
    else if (slots === 4) { yan2 = 2; }
    else {
      const t = Math.floor(slots / 3);
      yan3 = 2 * t;
      yan2 = (slots - t * 3) ? 2 : 0;
    }
  }

  // kg dökümü
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

  // ——— Aksesuarlar ———
  const A = CFG.acc;
  let aksesuarTop = 0;

  // köşe takozu
  if (ray === "esiksiz") {
    const k2 = ust2 * 2, k3 = ust3 * 2; // alt köşeler yok
    aksesuarTop += k2 * A.pss5 + k3 * A.pss6;
  } else {
    const k2 = (ust2 + alt2) * 2;
    const k3 = (ust3 + alt3) * 2;
    aksesuarTop += k2 * A.pss5 + k3 * A.pss6;
  }

  // teker: cam sayısı * 2
  aksesuarTop += (n * 2) * A.pss8;

  // çekme kol aksesuarı: kolAdet*2
  aksesuarTop += (kolAdet * 2) * A.pss1;

  // kenet üst/alt
  aksesuarTop += kenetAdet * A.pss2;
  aksesuarTop += kenetAdet * A.pss3;

  // kilit fiyatları
  function kilitFiyati(ad) {
    if (ad === "Klips Kol") return A.pss10;
    if (ad === "Multi Kilit") return A.pss9;
    if (ad === "Anahtarlı Kilit") return A.pss9;
    if (ad === "İspanyolet Kol") return A.zz126;
    return 0;
    // (PSS11 Kale 201F de istenirse seçeneklere eklenebilir)
  }
  if (acilim === "yandan") {
    aksesuarTop += kilitFiyati(el.kilitSag.value);
    aksesuarTop += kilitFiyati(el.kilitSol.value);
  } else {
    aksesuarTop += kilitFiyati(el.kilitSagO.value);
    aksesuarTop += kilitFiyati(el.kilitSolO.value);
    aksesuarTop += kilitFiyati(el.kilitOrtaO.value);
  }

  // sürme yalıtım: (camSayısı−1)*2
  aksesuarTop += ((n - 1) * 2) * A.pss12;

  // ——— Fiyatlar ———
  const aluKgFiyat = (renk === "rall") ? CFG.aluRall : CFG.aluAgri;
  const aluTutar = aluKgFireli * aluKgFiyat;

  // cam m²: (camEn*camBoy*n)/1e6  — cam birim fiyata göre
  const camM2 = (camEn * camBoy * n) / 1_000_000;
  const camBirim = CFG.glass[camTip];
  const camTutar = camM2 * camBirim;

  // işçilik: sistem m²
  const sistemM2 = (gen * yuk) / 1_000_000;
  const iscilikTutar = sistemM2 * CFG.iscilik;

  const genelToplam = aluTutar + camTutar + aksesuarTop + iscilikTutar;

  // ——— Çıkış (müşteri görünümü) ———
  el.ozet.innerHTML = `
    <div><strong>Cam ölçüleri (yaklaşık):</strong> ${camEn} × ${camBoy} mm × ${camAdet} adet</div>
    <div class="muted" style="margin-top:6px">Hesap müşteri görünümü içindir; maliyet kırılımları gizlidir.</div>
    <hr style="border:none;border-top:1px dashed #94a3b8;margin:10px 0">
    <div><strong>Genel Toplam:</strong> ${tl(genelToplam)} ₺</div>
  `;
  el.ozet.classList.remove("hide");

  refreshAluBadge();
}

/* ================== ADMIN — GİRİŞ/ÇIKIŞ ================== */
function enterAdmin(u) {
  setSessionUser(u);
  el.adminBox.classList.add("hide");
  el.adminPanel.classList.remove("hide");
  // fiyat alanlarını doldur
  el.pAluAgri.value = CFG.aluAgri;
  el.pAluRall.value = CFG.aluRall;
  el.pIscilik.value = CFG.iscilik;
  el.pFire.value = CFG.firePct;
  el.p8Seffaf.value = CFG.glass["8_seffaf"];
  el.p8Fume.value = CFG.glass["8_fume"];
  el.p20Seffaf.value = CFG.glass["20_seffaf"];
  el.p20Fume.value = CFG.glass["20_fume"];
}
function leaveAdmin() {
  clearSessionUser();
  el.adminPanel.classList.add("hide");
  el.adminBox.classList.remove("hide");
  el.adminUser.value = "";
  el.adminPin.value = "";
  el.newPin.value = "";
}

// giriş
if (el.btnAdminLogin) {
  el.btnAdminLogin.addEventListener("click", async () => {
    const user = (el.adminUser.value || "").trim();
    const pin = (el.adminPin.value || "").trim();
    if (!user || !pin) { alert("Kullanıcı adı ve PIN girin."); return; }

    const r = await api("login", { user, pin });
    if (r && r.ok) enterAdmin(user);
    else alert("Bilgiler hatalı.");
  });
}
// çıkış
if (el.btnAdminLogout) {
  el.btnAdminLogout.addEventListener("click", () => {
    leaveAdmin();
  });
}

// sayfa yenilendiğinde oturum kontrolü
(function restoreAdminSession() {
  const u = getSessionUser();
  if (u) enterAdmin(u);
  else leaveAdmin();
})();

/* ======= Admin — Fiyatları kaydet ======= */
if (el.kaydetBtn) {
  el.kaydetBtn.addEventListener("click", () => {
    CFG.aluAgri = parseFloat(el.pAluAgri.value) || CFG.aluAgri;
    CFG.aluRall = parseFloat(el.pAluRall.value) || CFG.aluRall;
    CFG.iscilik = parseFloat(el.pIscilik.value) || CFG.iscilik;
    CFG.firePct = parseFloat(el.pFire.value) || CFG.firePct;
    CFG.glass["8_seffaf"] = parseFloat(el.p8Seffaf.value) || CFG.glass["8_seffaf"];
    CFG.glass["8_fume"] = parseFloat(el.p8Fume.value) || CFG.glass["8_fume"];
    CFG.glass["20_seffaf"] = parseFloat(el.p20Seffaf.value) || CFG.glass["20_seffaf"];
    CFG.glass["20_fume"] = parseFloat(el.p20Fume.value) || CFG.glass["20_fume"];
    saveCfg(CFG);
    alert("Kaydedildi.");
    refreshAluBadge();
  });
}

/* ======= Admin — PIN Güncelle (master key gerekir) ======= */
if (el.btnPinUpdate) {
  el.btnPinUpdate.addEventListener("click", async () => {
    const user = getSessionUser();
    const newPin = (el.newPin.value || "").trim();
    if (!user || !newPin) { alert("Yeni PIN girin."); return; }

    if (!window.ADMIN_MASTER_KEY) {
      const k = prompt("Master anahtarı girin (tek seferlik):");
      if (!k) return;
      window.ADMIN_MASTER_KEY = k;
    }

    const r = await api("updatePin", { user, newPin }, true);
    if (r && r.ok) {
      alert("PIN güncellendi. Tüm cihazlarda geçerli.");
      el.newPin.value = "";
    } else {
      alert("Güncellenemedi: " + (r && r.error ? r.error : "bilinmeyen hata"));
    }
  });
}

/* ======= Admin — Yeni Yönetici Ekle (opsiyonel) ======= */
if (el.btnAddAdmin) {
  el.btnAddAdmin.addEventListener("click", async () => {
    if (!window.ADMIN_MASTER_KEY) {
      const k = prompt("Master anahtarı girin:");
      if (!k) return; window.ADMIN_MASTER_KEY = k;
    }
    const u = prompt("Yeni yönetici adı:");
    const p = prompt("Yeni PIN:");
    if (!u || !p) return;
    const r = await api("addAdmin", { user: u, pin: p }, true);
    alert(r && r.ok ? "Yönetici eklendi." : ("Hata: " + (r && r.error ? r.error : "bilinmeyen")));
  });
}

/* ======= Events: hesapla & diğerleri ======= */
if (el.hesaplaBtn) el.hesaplaBtn.addEventListener("click", hesapla);

["camSayisi", "acilim"].forEach(id => $(id)?.addEventListener("change", refreshAcilimKisit));
el.profilRengi?.addEventListener("change", refreshAluBadge);

// İlk kurulum
refreshAcilimKisit();
refreshAluBadge();
