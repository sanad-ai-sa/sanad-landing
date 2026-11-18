// لوحة مشتركي سَنَد — الدخول عبر Firebase Auth (قوقل + بريد)، والبيانات من Firestore.
// مهم: هذا الملف واجهة فقط. اللي يمنع أي أحد يشوف بيانات غيره أو يدخل بدون تفعيل هي قواعد firestore.rules على الخادم.
import { firebaseConfig } from "./firebase-config.js";

const V = "10.12.0";
const $ = (id) => document.getElementById(id);
const views = ["v-loading", "v-off", "v-auth", "v-verify", "v-choose", "v-dash", "v-error"];
const show = (id) => views.forEach((v) => $(v).classList.toggle("hidden", v !== id));
const WA = "966566566977";
const Q = new URLSearchParams(location.search);
const PLANS = { stores: "باقة المتاجر", social: "باقة البائع الاجتماعي" };
const accountCode = (uid) => "SND-" + String(uid).replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase();
const num = (v) => (typeof v === "number" && isFinite(v) ? new Intl.NumberFormat("ar-SA-u-nu-latn").format(v) : "—");
const txt = (el, v) => { el.textContent = v == null || v === "" ? "—" : String(v); };

const AR = {
  "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
  "auth/missing-password": "اكتب كلمة المرور.",
  "auth/weak-password": "كلمة المرور لازم تكون 8 أحرف على الأقل.",
  "auth/email-already-in-use": "هذا البريد مسجل. استخدم «دخول».",
  "auth/invalid-credential": "البريد أو كلمة المرور غير صحيحة.",
  "auth/user-disabled": "هذا الحساب موقوف.",
  "auth/too-many-requests": "محاولات كثيرة. انتظر شوي وحاول مرة ثانية.",
  "auth/popup-closed-by-user": "تم إغلاق نافذة قوقل قبل إكمال الدخول.",
  "auth/network-request-failed": "تأكد من اتصالك بالإنترنت.",
  "auth/account-exists-with-different-credential": "بريدك مسجل عندنا بطريقة ثانية. ادخل بقوقل أو بالبريد.",
  "fb/no-email": "حساب فيسبوك هذا ما فيه بريد إلكتروني. ادخل بقوقل أو بالبريد.",
  "auth/unauthorized-domain": "هذا النطاق غير مصرّح له بالدخول بعد.",
};
const errText = (e) => AR[e && e.code] || "ما قدرنا نكمل الطلب. حاول مرة ثانية.";

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  show("v-off");
} else {
  start().catch((e) => { console.error(e); $("x-msg").textContent = "تعذّر تحميل نظام الدخول. حدّث الصفحة."; show("v-error"); });
}

async function start() {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  auth.languageCode = "ar";
  const db = F.getFirestore(app);
  let mode = "in";

  // ── auth UI ──
  const setMode = (m) => {
    mode = m;
    $("t-in").setAttribute("aria-selected", String(m === "in"));
    $("t-up").setAttribute("aria-selected", String(m === "up"));
    $("fld-name").classList.toggle("hidden", m !== "up");
    $("a-submit").textContent = m === "up" ? "إنشاء حساب" : "دخول";
    $("a-pass").autocomplete = m === "up" ? "new-password" : "current-password";
    $("a-reset").classList.toggle("hidden", m === "up");
    $("a-err").textContent = "";
  };
  $("t-in").onclick = () => setMode("in");
  $("t-up").onclick = () => setMode("up");

  $("g-btn").onclick = async () => {
    $("a-err").textContent = "";
    const p = new A.GoogleAuthProvider();
    p.setCustomParameters({ prompt: "select_account" });
    try { await A.signInWithPopup(auth, p); }
    catch (e) {
      if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") await A.signInWithRedirect(auth, p);
      else $("a-err").textContent = errText(e);
    }
  };

  $("f-btn").onclick = async () => {
    $("a-err").textContent = "";
    const p = new A.FacebookAuthProvider();
    p.addScope("email");
    try { await A.signInWithPopup(auth, p); }
    catch (e) {
      if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") await A.signInWithRedirect(auth, p);
      else $("a-err").textContent = errText(e);
    }
  };

  $("f-auth").onsubmit = async (ev) => {
    ev.preventDefault();
    const email = $("a-email").value.trim(), pass = $("a-pass").value, name = $("a-name").value.trim();
    $("a-err").textContent = "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return ($("a-err").textContent = AR["auth/invalid-email"]);
    if (pass.length < 8) return ($("a-err").textContent = AR["auth/weak-password"]);
    if (mode === "up" && name.length < 2) return ($("a-err").textContent = "اكتب اسمك.");
    $("a-submit").disabled = true;
    try {
      if (mode === "up") {
        const cred = await A.createUserWithEmailAndPassword(auth, email, pass);
        await A.updateProfile(cred.user, { displayName: name });
        await A.sendEmailVerification(cred.user);
      } else await A.signInWithEmailAndPassword(auth, email, pass);
    } catch (e) { $("a-err").textContent = errText(e); }
    finally { $("a-submit").disabled = false; }
  };

  $("a-reset").onclick = async () => {
    const email = $("a-email").value.trim();
    if (!email) return ($("a-err").textContent = "اكتب بريدك أولاً، وبعدين اضغط «نسيت كلمة المرور».");
    try { await A.sendPasswordResetEmail(auth, email); alertOk("إذا البريد مسجل، يوصلك رابط إعادة التعيين خلال دقائق."); }
    catch (e) { $("a-err").textContent = errText(e); }
  };
  const alertOk = (m) => { const e = $("a-err"); e.textContent = m; e.className = "ok"; setTimeout(() => (e.className = "err"), 6000); };

  $("v-resend").onclick = async () => {
    try { await A.sendEmailVerification(auth.currentUser); $("v-msg").textContent = "أرسلنا الرابط مرة ثانية."; }
    catch (e) { $("v-msg").textContent = errText(e); }
  };
  $("v-done").onclick = async () => {
    await A.reload(auth.currentUser);
    if (auth.currentUser.emailVerified) { await auth.currentUser.getIdToken(true); route(auth.currentUser); }
    else $("v-msg").textContent = "ما تأكد البريد للحين. افتح الرابط اللي وصلك.";
  };
  $("signout").onclick = () => A.signOut(auth);

  // ── routing by auth state ──
  A.onAuthStateChanged(auth, (u) => route(u));

  // إذا سجّل دخوله من هذي الصفحة بدون ما يختار باقة، نرجعه للموقع عادي.
  let sawAuth = false;
  async function route(u) {
    $("who").classList.toggle("hidden", !u);
    $("signout").classList.toggle("hidden", !u);
    if (!u) { sawAuth = true; setMode("in"); return show("v-auth"); }
    txt($("who"), u.email);
    const prov = (u.providerData[0] && u.providerData[0].providerId) || "password";
    if (prov === "facebook.com" && !u.email) { await A.signOut(auth); setTimeout(() => { $("a-err").textContent = AR["fb/no-email"]; }, 300); return; }
    if (prov === "password" && !u.emailVerified) { txt($("v-email"), u.email); return show("v-verify"); }
    show("v-loading");
    try {
      const prof = await ensureProfile(u);
      let m = null;
      try { m = await F.getDoc(F.doc(db, "merchants", u.uid)); }
      catch (e) { if (!(e && e.code === "permission-denied")) throw e; }   // ما عنده ملف مشترك بعد
      if (!m || !m.exists() || m.data().active !== true) {
        if (sawAuth && !Q.get("plan")) { location.replace("./"); return; }
        return choose(u, prof);
      }
      await dashboard(u, m.data());
    } catch (e) {
      console.error(e); show("v-error");
    }
  }

  async function ensureProfile(u) {
    const ref = F.doc(db, "profiles", u.uid);
    const snap = await F.getDoc(ref);
    if (snap.exists()) return snap.data();
    const data = {
      email: u.email || "",
      name: (u.displayName || "").slice(0, 60),
      provider: (u.providerData[0] && u.providerData[0].providerId) || "password",
      createdAt: F.serverTimestamp(),
    };
    await F.setDoc(ref, data);
    return data;
  }

  // بعد الدخول وقبل التفعيل: يختار الباقة وطريقة البدء، وبعدها يكمل مع سند في الواتساب برمز حسابه.
  function choose(u, prof) {
    const code = accountCode(u.uid);
    $("c-code").textContent = code;
    const first = String(u.displayName || (prof && prof.name) || "").trim().split(/\s+/)[0];
    $("c-state").textContent = prof && prof.plan ? "اخترت " + (PLANS[prof.plan] || "باقة") + " · بانتظار التفعيل" : (first ? "أهلاً " + first : "أهلاً بك");
    const want = Q.get("plan") || (prof && prof.plan);
    document.querySelectorAll('#v-choose input[name="plan"]').forEach((r) => { r.checked = r.value === want; });
    $("c-err").textContent = "";
    $("c-go").onclick = async () => {
      const plan = (document.querySelector('#v-choose input[name="plan"]:checked') || {}).value;
      if (!PLANS[plan]) return ($("c-err").textContent = "اختر الباقة أولاً.");
      $("c-go").disabled = true;
      try {
        await F.updateDoc(F.doc(db, "profiles", u.uid), { plan, intent: "subscribe", chosenAt: F.serverTimestamp() });
      } catch (e) { console.warn("profile choice not saved", e && e.code); }   // ما يوقف التحويل للواتساب
      const name = String(u.displayName || (prof && prof.name) || "").slice(0, 60);
      const msg = "السلام عليكم، أبغى أشترك في " + PLANS[plan] + "."
        + (name ? "\nاسمي: " + name : "") + "\nبريدي: " + u.email + "\nرمز حسابي: " + code;
      location.href = "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg);
      setTimeout(() => { $("c-go").disabled = false; }, 4000);
    };
    show("v-choose");
  }

  async function dashboard(u, m) {
    const s = m.summary || {};
    txt($("d-store"), m.storeName || "لوحتك");
    txt($("d-plan"), ["social", "195", "290", "690"].includes(String(m.plan)) ? "باقة البائع الاجتماعي" : "باقة المتاجر");
    const up = s.updatedAt && s.updatedAt.toDate ? s.updatedAt.toDate() : null;
    $("d-updated").textContent = "آخر تحديث: " + (up ? up.toLocaleString("ar-SA-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }) : "—");
    txt($("k-msgs"), num(s.today && s.today.messages));
    txt($("k-cust"), num(s.today && s.today.customers));
    txt($("k-quotes"), num(s.month && s.month.quotes));
    txt($("k-rev"), num(s.month && s.month.revenue));

    const low = $("l-low"); low.replaceChildren();
    (Array.isArray(s.lowStock) ? s.lowStock : []).slice(0, 20).forEach((it) => {
      const li = document.createElement("li"); li.className = "row";
      const a = document.createElement("span"); a.textContent = String(it.name || "صنف");
      const b = document.createElement("b"); b.textContent = "المتبقي " + num(it.qty);
      li.append(a, b); low.append(li);
    });
    $("e-low").classList.toggle("hidden", low.children.length > 0);

    const days = await F.getDocs(F.query(F.collection(db, "merchants", u.uid, "daily"), F.orderBy(F.documentId(), "desc"), F.limit(14)));
    const tb = $("t-daily"); tb.replaceChildren();
    days.forEach((d) => {
      const v = d.data(), tr = document.createElement("tr");
      [d.id, num(v.messages), num(v.customers), num(v.orders), num(v.revenue)].forEach((c) => { const td = document.createElement("td"); td.textContent = c; tr.append(td); });
      tb.append(tr);
    });
    $("e-daily").classList.toggle("hidden", !days.empty);

    const reps = await F.getDocs(F.query(F.collection(db, "merchants", u.uid, "reports"), F.orderBy("createdAt", "desc"), F.limit(12)));
    const rl = $("l-reports"); rl.replaceChildren();
    reps.forEach((r) => {
      const v = r.data(), box = document.createElement("article");
      box.className = "card"; box.style.background = "var(--bg)";
      const h = document.createElement("b"); h.textContent = String(v.title || "تقرير");
      const p = document.createElement("div"); p.className = "fine"; p.style.margin = "2px 0 8px"; p.textContent = String(v.period || "");
      const ul = document.createElement("ul"); ul.style.margin = "0"; ul.style.paddingInlineStart = "18px";
      (Array.isArray(v.lines) ? v.lines : []).slice(0, 12).forEach((l) => { const li = document.createElement("li"); li.textContent = String(l); ul.append(li); });
      box.append(h, p, ul); rl.append(box);
    });
    $("e-reports").classList.toggle("hidden", !reps.empty);
    show("v-dash");
  }
}
