/* ========= Kalıcı Ayarlar (localStorage) ========= */
const DEFAULTS = {
  aluAgri: 215,       // ₺/kg (Antrasit)
  aluRall: 270,       // ₺/kg (RALL)
  iscilik: 500,       // ₺/m²
  firePct: 15,        // %
  glass: {            // ₺/m²
    "8_seffaf": 1050,
    "8_fume": 1150,
    "20_seffaf": 1600,
    "20_fume": 1750
  },
  acc: {              // aksesuar adet fiyatları
    pss1: 10,   // çekme kol aksesuarı
    pss2: 7.5,  // kenet üst
    pss3: 7.5,  // kenet alt
    pss5: 15,   // 2'li köşe
    pss6: 20,   // 3'lü köşe
    pss8: 55,   // paslanmaz lüks teker
    pss9: 350,  // multi/anahtarlı/havuz
    pss10: 350, // klips kol
    pss11: 750, // kale 201F (kullanılmıyor şimdilik)
    pss12: 5,   // sürme yalıtım
    zz126: 1500 // ispanyolet kol
  }
};
function loadCfg(){ const raw=localStorage.getItem("cfgCamBalkon"); return raw?JSON.parse(raw):structuredClone(DEFAULTS); }
function saveCfg(cfg){ localStorage.setItem("cfgCamBalkon", JSON.stringify(cfg)); }
let CFG = loadCfg();

/* ========= Yönetici (kullanıcı/PIN) ========= */
function getAdmins(){
  const raw = localStorage.getItem("adminsCam");
  if (raw) return JSON.parse(raw);
  // ilk kurulum: admin/3482
  const first = [{u:"admin", pin:"3482"}];
  localStorage.setItem("adminsCam", JSON.stringify(first));
  return first;
}
function setAdmins(list){ localStorage.setItem("adminsCam", JSON.stringify(list)); }
function setSessionUser(u){ localStorage.setItem("sessionCam",""+u); }
function getSessionUser(){ return localStorage.getItem("sessionCam"); }
function clearSession(){ localStorage.removeItem("sessionCam"); }

const $ = id => document.getElementById(id);
const el = {
  // hesap formu
  genislik: $("genislik"), yukseklik: $("yukseklik"),
  camSayisi: $("camSayisi"), camOzelligi: $("camOzelligi"),
  acilim: $("acilim"), ray: $("ray"),
  profilRengi: $("profilRengi"), aktifAluFiyati: $("aktifAluFiyati"),
  kilitYandan: $("kilitYandan"), kilitOrtadan: $("kilitOrtadan"),
  kilitSag: $("kilitSag"), kilitSol: $("kilitSol"),
  kilitSagO: $("kilitSagO"), kilitSolO: $("kilitSolO"), kilitOrtaO: $("kilitOrtaO"),
  acilimUyari: $("acilimUyari"), hesaplaBtn: $("hesaplaBtn"), ozet: $("ozet"),
  // admin giriş & panel
  adminLoginBox: $("admin-login-box"), adminPanel: $("admin-panel"),
  adminUser: $("adminUser"), adminPin: $("adminPin"),
  btnAdminLogin: $("btnAdminLogin"), btnLogout: $("btnLogout"), whoami: $("whoami"),
  // fiyat alanları
  priceAluStd: $("priceAluStd"), priceAluRall: $("priceAluRall"),
  priceLabor: $("priceLabor"), wastePct: $("wastePct"),
  price8Clr: $("price8Clr"), price8Smoke: $("price8Smoke"),
  price20Clr: $("price20Clr"), price20Smoke: $("price20Smoke"),
  btnSavePrices: $("btnSavePrices"),
  // güvenlik
  newPin: $("newPin"), btnChangePin: $("btnChangePin"),
  newAdminUser: $("newAdminUser"), newAdminPin: $("newAdminPin"),
  btnAddAdmin: $("btnAddAdmin"),
};

/* ========= KG/m değerleri ========= */
const KG = {
  alt2: 0.974,      // 213 — 2’li alt/üst kasa (uzunluk aynı kullanılıyor)
  ust2: 1.120,      // 229
  alt3: 1.333,      // 222 (eşikli)
  ust3: 1.552,      // 230
  alt3esiksiz: 0.867,  // 220
  alt4esiksiz: 1.156,  // 221
  yan2: 0.587,      // 214
  yan3: 0.792,      // 223
  baza: 0.643,      // 210
  kenet: 0.423,     // 212
  cekmeKol: 0.908,  // 215
  adapt8: 0.219     // 219
};

/* ========= Yardımcılar ========= */
function tl(x){ return x.toLocaleString("tr-TR",{minimumFractionDigits:2, maximumFractionDigits:2}); }

function refreshAluBadge(){
  const kg = (el.profilRengi.value==="rall") ? CFG.aluRall : CFG.aluAgri;
  el.aktifAluFiyati.textContent = `Alüminyum: ${kg} ₺/kg`;
}

function refreshAcilimKisit(){
  const n = parseInt(el.camSayisi.value||"0",10);
  if (!n) return;
  // 2 veya tek sayılı camda ortadan açılır KAPALI
  const ortadanOpt = [...el.acilim.options].find(o=>o.value==="ortadan");
  if (n===2 || (n%2===1)){
    el.acilim.value = "yandan";
    if (ortadanOpt) ortadanOpt.disabled = true;
    el.acilimUyari.textContent = "Not: 2 cam veya tek sayıda camda ‘Ortadan Açılır’ kullanılamaz.";
  }else{
    if (ortadanOpt) ortadanOpt.disabled = false;
    el.acilimUyari.textContent = "";
  }
  // kilit kutuları
  if (el.acilim.value==="yandan"){
    el.kilitYandan.classList.remove("hidden");
    el.kilitOrtadan.classList.add("hidden");
  }else{
    el.kilitYandan.classList.add("hidden");
    el.kilitOrtadan.classList.remove("hidden");
  }
}

/* ========= Cam ölçüleri ========= */
function bazaKesim(gen, n, acilim){
  if (n===2) return (gen - 190)/2;
  if (n===3) return (gen - 212)/3;
  if (n===4) return (acilim==="yandan") ? (gen - 236)/4 : (gen - 336)/4;
  if (n===5) return (gen - 260)/5;
  if (n===6) return (acilim==="yandan") ? (gen - 280)/6 : (gen - 336)/6;
  if (n===7) return (gen - 300)/7;
  if (n===8) return (acilim==="yandan") ? (gen - 324)/8 : (gen - 448)/8;
  if (n===9) return (gen - 340)/9;
  if (n===10) return (acilim==="yandan") ? (gen - 360)/10 : (gen - 480)/10;
  if (n===11) return (gen - 380)/11;
  if (n===12) return (acilim==="yandan") ? (gen - 400)/12 : (gen - 560)/12;
  return (gen - 200)/n;
}
function camYukseklik(yuk, ray, camTip){
  const boy = yuk - (ray==="esiksiz" ? 138 : 148);
  return boy + (camTip.startsWith("20_") ? 2 : 0); // çift cam +2 mm
}

/* ========= Modül kompozisyon yardımcıları ========= */
function compose23(n){
  let m3=Math.floor(n/3), rem=n-m3*3, m2=0;
  if (rem===1){ if (m3>=1){ m3-=1; m2+=2; } else { m2=Math.ceil(n/2); m3=0; } }
  else if (rem===2){ m2=1; }
  return {m2,m3};
}
function splitTopSlots(slots){
  if (slots===2) return {ust2:1, ust3:0};
  if (slots===3) return {ust2:0, ust3:1};
  if (slots===4) return {ust2:2, ust3:0};
  const ust3=Math.floor(slots/3); const ust2=(slots-ust3*3)/2; return {ust2,ust3};
}
function splitBottomSlots(slots, ray){
  if (ray==="esiksiz" && slots===4) return {alt2:0,alt3:0,alt4es:1};
  if (slots===2) return {alt2:1,alt3:0,alt4es:0};
  if (slots===3) return {alt2:0,alt3:1,alt4es:0};
  if (slots===4) return {alt2:2,alt3:0,alt4es:0};
  const alt3=Math.floor(slots/3); const alt2=(slots-alt3*3)/2; return {alt2,alt3,alt4es:0};
}

/* ========= Hesaplama ========= */
function hesapla(){
  const gen = parseFloat(el.genislik.value);
  const yuk = parseFloat(el.yukseklik.value);
  const n   = parseInt(el.camSayisi.value);
  const camTip = el.camOzelligi.value; // '8_seffaf' vb
  const acilim = el.acilim.value;
  const ray = el.ray.value;
  const renk = el.profilRengi.value;

  if (!gen || !yuk || !n){ alert("Lütfen genişlik, yükseklik ve cam sayısını girin."); return; }
  if ((n===2 || n%2===1) && acilim==="ortadan"){ alert("2 veya tek sayıda camda ‘Ortadan Açılır’ kullanılamaz."); return; }

  const baza = Math.round(bazaKesim(gen,n,acilim));
  const camEn = Math.round(baza + (camTip.startsWith("20_")?26:24));
  const camBoy = Math.round(camYukseklik(yuk, ray, camTip));
  const camAdet = n;

  // Alüminyum KG
  let aluKg = 0;
  const altUstLen = gen - 40;
  const yanLen = yuk - (ray==="esiksiz" ? 12 : 25);
  const kenetKolLen = yuk - (ray==="esiksiz" ? 89.6 : 102);
  const adaptDikeyLen = kenetKolLen - 72;

  // Baza + yatay adaptör
  const bazaAdet = n*2;
  aluKg += bazaAdet * (baza/1000) * KG.baza;
  const yatayAdaptAdet = camTip.startsWith("20_") ? 0 : bazaAdet;
  aluKg += yatayAdaptAdet * (Math.max(baza-1,0)/1000) * KG.adapt8;

  // Dikey adaptör (8mm)
  const dikeyAdaptAdet = camTip.startsWith("20_") ? 0 : ((acilim==="yandan")?4:8);
  aluKg += dikeyAdaptAdet * (adaptDikeyLen/1000) * KG.adapt8;

  // Kenet/kol adet
  const kenetAdet = (acilim==="yandan") ? (n-2)*2 : 8;
  const kolAdet   = (acilim==="yandan") ? 2 : 4;
  aluKg += kenetAdet * (kenetKolLen/1000) * KG.kenet;
  aluKg += kolAdet   * (kenetKolLen/1000) * KG.cekmeKol;

  // Kasa/yan kasa sayıları
  let ust2=0,ust3=0,alt2=0,alt3=0,alt4es=0,yan2=0,yan3=0;
  if (acilim==="yandan"){
    const {m2,m3}=compose23(n);
    if (ray==="esiksiz"){ if (n===4) alt4es=1; else {alt2+=m2; alt3+=m3;} }
    else { alt2+=m2; alt3+=m3; }
    ust2+=m2; ust3+=m3;
    yan2+=m2*2; yan3+=m3*2;
  }else{
    const slots = n/2;
    const top = splitTopSlots(slots);
    const bot = splitBottomSlots(slots,ray);
    ust2+=top.ust2; ust3+=top.ust3;
    alt2+=bot.alt2; alt3+=bot.alt3; alt4es+=bot.alt4es;
    if (slots===2) yan2=2; else if (slots===3) yan3=2; else if (slots===4) yan2=2;
    else { const t=Math.floor(slots/3); yan3=2*t; yan2=(slots-t*3)?2:0; }
  }

  // KG toplam
  aluKg += ust2*(altUstLen/1000)*KG.ust2;
  aluKg += ust3*(altUstLen/1000)*KG.ust3;
  if (ray==="esiksiz"){
    aluKg += alt4es*(altUstLen/1000)*KG.alt4esiksiz;
    aluKg += alt3*(altUstLen/1000)*KG.alt3esiksiz;
    aluKg += alt2*(altUstLen/1000)*KG.alt2;
  }else{
    aluKg += alt3*(altUstLen/1000)*KG.alt3;
    aluKg += alt2*(altUstLen/1000)*KG.alt2;
  }
  aluKg += yan2*(yanLen/1000)*KG.yan2;
  aluKg += yan3*(yanLen/1000)*KG.yan3;

  // Fireli
  const aluKgFireli = aluKg*(1+CFG.firePct/100);

  // Aksesuarlar
  const A = CFG.acc;
  let aksesuarTop = 0;
  if (ray==="esiksiz"){ // alt köşeler yok
    const k2=ust2*2, k3=ust3*2; aksesuarTop += k2*A.pss5 + k3*A.pss6;
  }else{
    const k2=(ust2+alt2)*2, k3=(ust3+alt3)*2; aksesuarTop += k2*A.pss5 + k3*A.pss6;
  }
  aksesuarTop += (n*2)*A.pss8;                 // teker
  aksesuarTop += (kolAdet*2)*A.pss1;           // çekme kol aksesuarı
  aksesuarTop += kenetAdet*A.pss2 + kenetAdet*A.pss3; // kenet üst/alt

  // kilit fiyatları
  function kilitFiyati(ad){
    if (ad==="Klips Kol") return A.pss10;
    if (ad==="Multi Kilit") return A.pss9;
    if (ad==="Anahtarlı Kilit") return A.pss9;
    if (ad==="İspanyolet Kol") return A.zz126;
    return 0;
  }
  if (acilim==="yandan"){
    aksesuarTop += kilitFiyati(el.kilitSag.value) + kilitFiyati(el.kilitSol.value);
  }else{
    aksesuarTop += kilitFiyati(el.kilitSagO.value)+kilitFiyati(el.kilitSolO.value)+kilitFiyati(el.kilitOrtaO.value);
  }
  aksesuarTop += ((n-1)*2)*A.pss12; // sürme yalıtım

  // Tutarlar
  const aluFiyatKg = (renk==="rall")?CFG.aluRall:CFG.aluAgri;
  const aluTutar = aluKgFireli*aluFiyatKg;

  const camM2 = (camEn*camBoy*n)/1_000_000;
  const camTutar = camM2 * CFG.glass[camTip];

  const sistemM2 = (gen*yuk)/1_000_000;
  const iscilikTutar = sistemM2 * CFG.iscilik;

  const genelToplam = aluTutar + camTutar + aksesuarTop + iscilikTutar;

  // Çıktı (müşteri görünümü)
  el.ozet.innerHTML = `
    <div><strong>Cam ölçüleri (yaklaşık):</strong> ${camEn} × ${camBoy} mm × ${camAdet} adet</div>
    <div class="muted" style="margin-top:6px">Kırım detayları gösterilmez.</div>
    <hr>
    <div><strong>Genel Toplam:</strong> ${tl(genelToplam)} ₺</div>
  `;
  el.ozet.classList.remove("hidden");

  refreshAluBadge();
}

/* ========= Yönetici UI akışı ========= */
function enterAdmin(username){
  el.adminLoginBox.classList.add("hidden");
  el.adminPanel.classList.remove("hidden");
  el.whoami.textContent = username;

  // fiyat alanlarını doldur
  el.priceAluStd.value = CFG.aluAgri;
  el.priceAluRall.value = CFG.aluRall;
  el.priceLabor.value  = CFG.iscilik;
  el.wastePct.value    = CFG.firePct;
  el.price8Clr.value   = CFG.glass["8_seffaf"];
  el.price8Smoke.value = CFG.glass["8_fume"];
  el.price20Clr.value  = CFG.glass["20_seffaf"];
  el.price20Smoke.value= CFG.glass["20_fume"];
}
function exitAdmin(){
  el.adminPanel.classList.add("hidden");
  el.adminLoginBox.classList.remove("hidden");
  el.adminUser.value = ""; el.adminPin.value = "";
  el.whoami.textContent = "";
}

/* ========= Eventler ========= */
el.hesaplaBtn.addEventListener("click", hesapla);
["camSayisi","acilim"].forEach(id=>$(id).addEventListener("change", refreshAcilimKisit));
el.profilRengi.addEventListener("change", refreshAluBadge);

// admin login
el.btnAdminLogin.addEventListener("click", ()=>{
  const u = (el.adminUser.value||"").trim();
  const p = (el.adminPin.value||"").trim();
  if (!u || !p){ alert("Kullanıcı ve PIN girin."); return; }
  const list = getAdmins();
  const ok = list.find(a=>a.u===u && a.pin===p);
  if (!ok){ alert("Bilgiler hatalı."); return; }
  setSessionUser(u);
  enterAdmin(u);
});
// logout
el.btnLogout.addEventListener("click", ()=>{
  clearSession();
  exitAdmin();
});

// fiyatları kaydet
el.btnSavePrices.addEventListener("click", ()=>{
  CFG.aluAgri = parseFloat(el.priceAluStd.value)||CFG.aluAgri;
  CFG.aluRall = parseFloat(el.priceAluRall.value)||CFG.aluRall;
  CFG.iscilik = parseFloat(el.priceLabor.value)||CFG.iscilik;
  CFG.firePct = parseFloat(el.wastePct.value)||CFG.firePct;
  CFG.glass["8_seffaf"]  = parseFloat(el.price8Clr.value)||CFG.glass["8_seffaf"];
  CFG.glass["8_fume"]    = parseFloat(el.price8Smoke.value)||CFG.glass["8_fume"];
  CFG.glass["20_seffaf"] = parseFloat(el.price20Clr.value)||CFG.glass["20_seffaf"];
  CFG.glass["20_fume"]   = parseFloat(el.price20Smoke.value)||CFG.glass["20_fume"];
  saveCfg(CFG);
  alert("Fiyatlar kaydedildi.");
  refreshAluBadge();
});

// PIN değiştir
el.btnChangePin.addEventListener("click", ()=>{
  const u = getSessionUser();
  if (!u){ alert("Önce giriş yapın."); return; }
  const np = (el.newPin.value||"").trim();
  if (!np){ alert("Yeni PIN girin."); return; }
  const list = getAdmins();
  const me = list.find(a=>a.u===u);
  me.pin = np; setAdmins(list);
  el.newPin.value=""; alert("PIN güncellendi.");
});

// yeni yönetici ekle
el.btnAddAdmin.addEventListener("click", ()=>{
  const u = (el.newAdminUser.value||"").trim();
  const p = (el.newAdminPin.value||"").trim();
  if (!u || !p){ alert("Kullanıcı ve PIN girin."); return; }
  const list = getAdmins();
  if (list.find(a=>a.u===u)){ alert("Bu kullanıcı mevcut."); return; }
  list.push({u, pin:p}); setAdmins(list);
  el.newAdminUser.value=""; el.newAdminPin.value="";
  alert("Yönetici eklendi.");
});

/* ========= İlk yükleme ========= */
exitAdmin();                 // sayfa açılışında panel gizli
const sessionU = getSessionUser(); if (sessionU) enterAdmin(sessionU);
refreshAluBadge();
refreshAcilimKisit();
