// netlify/functions/admin.js
import { getStore } from "@netlify/blobs";

const store = getStore("admin-store"); // Netlify Blobs alanı

async function readAdmins() {
  const data = await store.get("admins", { type: "json" });
  if (data && Array.isArray(data.users)) return data;
  // ilk tohum
  const first = { users: [{ u: "admin", pin: "3482" }] };
  await store.set("admins", JSON.stringify(first));
  return first;
}

async function writeAdmins(data) {
  await store.set("admins", JSON.stringify(data));
}

export default async (req, context) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "POST kullanın" }, 405);
  }

  let body;
  try { body = await req.json(); } catch (e) {
    return json({ ok: false, error: "Geçersiz JSON" }, 400);
  }

  const { action } = body || {};
  const admins = await readAdmins();

  // ---- LOGIN ----
  if (action === "login") {
    const user = (body.user || "").toLowerCase().trim();
    const pin  = (body.pin  || "").trim();
    const ok = admins.users.some(a => a.u.toLowerCase() === user && a.pin === pin);
    return json({ ok });
  }

  // ---- UPDATE PIN ---- (master key gerekli)
  if (action === "updatePin") {
    const master = req.headers.get("authorization")?.replace("Bearer ", "") || "";
    if (master !== process.env.ADMIN_MASTER_KEY) {
      return json({ ok: false, error: "Yetkisiz" }, 401);
    }
    const user = (body.user || "").trim();
    const newPin = (body.newPin || "").trim();
    if (!user || !newPin) return json({ ok:false, error:"Eksik alan" }, 400);

    const idx = admins.users.findIndex(a => a.u.toLowerCase() === user.toLowerCase());
    if (idx === -1) admins.users.push({ u: user, pin: newPin });
    else admins.users[idx].pin = newPin;

    await writeAdmins(admins);
    return json({ ok: true });
  }

  // ---- ADD ADMIN ---- (master key gerekli)
  if (action === "addAdmin") {
    const master = req.headers.get("authorization")?.replace("Bearer ", "") || "";
    if (master !== process.env.ADMIN_MASTER_KEY) {
      return json({ ok: false, error: "Yetkisiz" }, 401);
    }
    const user = (body.user || "").trim();
    const pin  = (body.pin  || "").trim();
    if (!user || !pin) return json({ ok:false, error:"Eksik alan" }, 400);

    if (!admins.users.some(a => a.u.toLowerCase() === user.toLowerCase())) {
      admins.users.push({ u: user, pin });
      await writeAdmins(admins);
    }
    return json({ ok: true });
  }

  return json({ ok:false, error:"Bilinmeyen action" }, 400);
};

function json(obj, status=200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    }
  });
}
