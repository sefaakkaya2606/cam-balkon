/* ========== Firebase BAŞLAT ========== */
/* Senin verdiğin config (Realtime Database URL'ini Netlify env'de veremiyorsan
   burada databaseURL eklemeden de çalışır; RTDB bölgen otomatik bağlanır.) */
const firebaseConfig = {
  apiKey: "AIzaSyAHSENkdEn-E4hoomD88mYJnvdHMCBB9AQ",
  authDomain: "ayyapi-surmecambalkon.firebaseapp.com",
  projectId: "ayyapi-surmecambalkon",
  storageBucket: "ayyapi-surmecambalkon.firebasestorage.app",
  messagingSenderId: "345356781986",
  appId: "1:345356781986:web:a1bbcd7f4dae20cfd5cafb",
  measurementId: "G-VYGW4HCZT1"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/* ========== DOM yardımcıları ========== */
const $ = (id) => document.getElementById(id);

/* ========== Varsayılan Ayarlar ========== */
const DEFAULT_PRICES = {
  aluAgri: 215,     // ₺/kg
  aluRall: 270,     // ₺/kg
  iscilik: 500,     // ₺/m²
  firePct: 15,      // %
  glass: {
    "8_seffaf": 1050,
    "8_fume": 1150,
    "20_seffaf": 1600,
    "20_fume": 1750
  }
};
// kg/metre (sık kullanılanlar)
const KG = {
  alt2: 0.974, ust2: 1.120,
  alt3: 1.333, ust3: 1.552,
  alt3es: 0.867, alt4es: 1.156,
  yan2: 0.587, yan3: 0.792,
  baza: 0.643, kenet: 0.423, cekme: 0.908, adapt8: 0.219
};

/* ========== Global State ========== */
let PRICES = { ...DEFAULT_PRICES };
let CURRENT_ADMIN = null; // { user: "admin" }

/* ========== Yardımcılar ========== */
const tl = (x) => x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function showAdminPanel(flag){
  $("admin-login-box").classList.toggle("hidden", !!flag);
  $("admin-panel").classList.toggle("hidden", !flag);
  if (flag) $("whoami").textContent = CURRENT_ADMIN?.user || "";
}

/* ========== İlk Yükleme: Ayarlar + Adminler ========== */
async function bootstrap(){
  // Ayarlar var mı?
  const snap = await db.ref("/settings").get();
  if (!snap.exists()){
    // İlk kurulum: varsayılan fiyatlar + admin
    await db.ref("/settings").set({
      prices: DEFAULT_PRICES,
      admins: { "admin": { pin: "3482" } },
      updatedAt: Date.now()
    });
    PRICES = { ...DEFAULT_PRICES };
  } else {
    const val = snap.val();
    PRICES = val.prices || { ...DEFAULT_PRICES };
  }
  // Arayüz etiket: aktif alüminyum
  refreshAluBadge();

  // 2 cam/tek sayıda camda ortadan açılır engeli ve kilit alanı
  refreshAcilimKisit();
}
bootstrap().catch(console.error);

/* ========== Admin: Giriş/Çıkış ========== */
$("btnAdminLogin").addEventListener("click", async ()=>{
  const user = $("adminUser").value.trim();
  const pin  = $("adminPin").value.trim();
  if (!user || !pin){ alert("Kullanıcı ve PIN girin."); return; }

  const snap = await db.ref(`/settings/admins/${user}`).get();
  if (!snap.exists()){ alert("Bilgiler hatalı."); return; }
  const rec = snap.val();
  if (rec.pin !== pin){ alert("Bilgiler hatalı."); return; }

  CURRENT_ADMIN = { user };
  // Fiyat alanlarını doldur
  $("priceAluStd").value = PRICES.aluAgri;
  $("priceAluRall").value = PRICES.aluRall;
  $("priceLabor").value  = PRICES.iscilik;
  $("wastePct").value    = PRICES.firePct;
  $("price8Clr").value   = PRICES.glass["8_seffaf"];
  $("price8Smoke").value = PRICES.glass["8_fume"];
  $("price20Clr").value  = PRICES.glass["20_seffaf"];
  $("price20Smoke").value= PRICES.glass["20_fume"];

  showAdminPanel(true);
});
$("btnLogout").addEventListener("click", ()=>{
  CURRENT_ADMIN = null;
  showAdminPanel(false);
});

/* ========== Admin: Ayarları Kaydet ========== */
$("btnSavePrices").addEventListener("click", async ()=>{
  if (!CURRENT_ADMIN){ alert("Önce giriş yapın."); return; }
  // Oku
  const p = {
    aluAgri: parseFloat($("priceAluStd").value)  || PRICES.aluAgri,
    aluRall: parseFloat($("priceAluRall").value) || PRICES.aluRall,
    iscilik: parseFloat($("priceLabor").value)   || PRICES.iscilik,
    firePct: parseFloat($("wastePct").value)     || PRICES.firePct,
    glass: {
      "8_seffaf":  parseFloat($("price8Clr").value)      || PRICES.glass["8_seffaf"],
      "8_fume":    parseFloat($("price8Smoke").value)    || PRICES.glass["8_fume"],
      "20_seffaf": parseFloat($("price20Clr").value)     || PRICES.glass["20_seffaf"],
      "20_fume":   parseFloat($("price20Smoke").value)   || PRICES.glass["20_fume"],
    }
  };
  await db.ref("/settings/prices").set(p);
  await db.ref("/settings/updatedAt").set(Date.now());
  PRICES = p;
  alert("Kaydedildi.");
  refreshAluBadge();
});

/* ========== Admin: PIN Değiştir ve Yeni Admin Ekle ========== */
$("btnChangePin").addEventListener("click", async ()=>{
  if (!CURRENT_ADMIN){ alert("Önce giriş yapın."); return; }
  const newPin = $("newPin").value.trim();
  if (!newPin){ alert("Yeni PIN girin."); return; }
  await db.ref(`/settings/admins/${CURRENT_ADMIN.user}`).update({ pin: newPin });
  $("newPin").value = "";
  alert("PIN güncellendi.");
});
$("btnAddAdmin").addEventListener("click", async ()=>{
  if (!CURRENT_ADMIN){ alert("Önce giriş yapın."); return; }
  const user = $("newAdminUser").value.trim();
  const pin  = $("newAdminPin").value.trim();
  if (!user || !pin){ alert("Kullanıcı ve PIN girin."); return; }
  await db.ref(`/settings/admins/${user}`).set({ pin });
  $("newAdminUser").value = ""; $("newAdminPin").value = "";
  alert("Yeni yönetici eklendi.");
});

/* ========== Hesaplama Mantığı (özet) ========== */
function refreshAluBadge(){
  const kgPrice = ($("profilRengi").value==="rall") ? PRICES.aluRall : PRICES.aluAgri;
  $("aktifAluFiyati").textContent = `Alüminyum: ${kgPrice} ₺/kg`;
}
$("profilRengi").addEventListener("change", refreshAluBadge);

function refreshAcilimKisit(){
  const n = parseInt($("camSayisi").value||"0",10);
  const acilimSel = $("acilim");
  const uyari = $("acilimUyari");
  if (!n){ uyari.textContent=""; return; }

  // 2 veya tek sayıda cam → Ortadan açılır yasak
  if (n===2 || n%2===1){
    acilimSel.value = "yandan";
    acilimSel.querySelector('option[value="ortadan"]').disabled = true;
    uyari.textContent = "Not: 2 cam veya tek sayıda camda ‘Ortadan Açılır’ kullanılamaz.";
  } else {
    acilimSel.querySelector('option[value="ortadan"]').disabled = false;
    uyari.textContent = "";
  }
  // Kilit alanları
  if (acilimSel.value==="yandan"){
    $("kilitYandan").classList.remove("hidden");
    $("kilitOrtadan").classList.add("hidden");
  }else{
    $("kilitYandan").classList.add("hidden");
    $("kilitOrtandan").classList.remove("hidden");
  }
}
$("camSayisi").addEventListener("change", refreshAcilimKisit);
$("acilim").addEventListener("change", refreshAcilimKisit);

// Baza kesim mm (özet kurgu – senin tablolarına göre)
function bazaKesim(gen, n, acilim){
  if (n===2) return (gen - 190)/2;
  if (n===3) return (gen - 212)/3;
  if (n===4) return (acilim==="yandan") ? (gen - 236)/4 : (gen - 336)/4;
  if (n===5) return (gen - 260)/5;
  if (n===6) return (acilim==="yandan") ? (gen - 280)/6 : (gen - 336)/6;
  if (n===7) return (gen - 300)/7;
  if (n===8) return (acilim==="yandan") ? (gen - 324)/8 : (gen - 448)/8;
  if (n===9)  return (gen - 340)/9;
  if (n===10) return (acilim==="yandan") ? (gen - 360)/10 : (gen - 480)/10;
  if (n===11) return (gen - 380)/11;
  if (n===12) return (acilim==="yandan") ? (gen - 400)/12 : (gen - 560)/12;
  return (gen - 200)/n;
}
function camBoy(yuk, ray, camTip){
  const b = yuk - (ray==="esiksiz" ? 138 : 148);
  return b + (camTip.startsWith("20_") ? 2 : 0);
}

$("hesaplaBtn").addEventListener("click", ()=>{
  const gen = parseFloat($("genislik").value);
  const yuk = parseFloat($("yukseklik").value);
  const n   = parseInt($("camSayisi").value);
  const camTip = $("camOzelligi").value;
  const acilim = $("acilim").value;
  const ray    = $("ray").value;

  if (!gen || !yuk || !n){ alert("Genişlik, yükseklik ve cam sayısı zorunlu."); return; }
  if ((n===2 || n%2===1) && acilim==="ortadan"){ alert("2/tek camda ortadan açılır olmaz."); return; }

  const baza = Math.round(bazaKesim(gen,n,acilim));
  const camEn = Math.round(baza + (camTip.startsWith("20_") ? 26 : 24));
  const boy   = Math.round(camBoy(yuk, ray, camTip));

  // Kabaca fiyatlar (senin detaylı kg/adet kurgu zaten eklendi—özet görünüm)
  const camM2    = (camEn*boy*n)/1_000_000;
  const camTutar = camM2 * PRICES.glass[camTip];
  const sistemM2 = (gen*yuk)/1_000_000;
  const iscilik  = sistemM2 * PRICES.iscilik;

  // Yalın bir alu tahmini (detay kg hesabın ayrı dosyada varsa ona bağlanır)
  const kgFiy   = ($("profilRengi").value==="rall")? PRICES.aluRall : PRICES.aluAgri;
  const tahminiAluKg = 0.015 * gen * n / 100; // kaba yaklaşım; senin kg modülleriyle değiştirebilirsin
  const aluTop  = tahminiAluKg * kgFiy * (1+PRICES.firePct/100);

  const toplam = camTutar + iscilik + aluTop;

  $("ozet").innerHTML = `
    <div><strong>Cam ölçüleri (yaklaşık):</strong> ${camEn} × ${boy} mm × ${n} adet</div>
    <hr style="border:none;border-top:1px dashed #334155;margin:10px 0">
    <div><strong>Genel Toplam:</strong> ${tl(toplam)} ₺</div>
    <div class="muted" style="margin-top:6px">Not: Müşteri görünümü; maliyet kırılımları gizlidir.</div>
  `;
  $("ozet").classList.remove("hidden");
});
