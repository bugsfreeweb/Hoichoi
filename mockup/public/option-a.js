/* =====================================================================
   HOICHOI DESK · Option-A — PURE JAVASCRIPT
   No React, no framework, no build step. Vanilla DOM + fetch only.
   Live data: GET /api/option-a (Postgres). Offline: embedded demo data.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------------- helpers ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var BN = "০১২৩৪৫৬৭৮৯";
  function toBn(v) { return String(v).replace(/\d/g, function (d) { return BN[+d]; }); }
  function pad(n) { return String(n).padStart(2, "0"); }

  var fmtTime = new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: true });
  var fmtClock = new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  function bnTime(d) { if (!d) return "—"; try { return fmtTime.format(new Date(d)); } catch (e) { return "—"; } }
  function agoBn(d) {
    if (!d) return "—";
    var mins = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 60000));
    if (mins < 60) return toBn(mins) + " মিনিট আগে";
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return toBn(hrs) + " ঘণ্টা আগে";
    return toBn(Math.round(hrs / 24)) + " দিন আগে";
  }

  var CAT_LABEL = { crime: "অপরাধ", child: "শিশু সুরক্ষা", family: "পরিবার ও সমাজ", viral: "ভাইরাল ও তথ্য" };
  var CAT_DOT = { crime: "#d2202c", child: "#60a5fa", family: "#2dd4bf", viral: "#fbbf24" };
  var KIND_BN = { page: "পেজ", group: "গ্রুপ" };
  var SCOPE_BN = { desktop: "ডেস্কটপ", web: "ওয়েব", both: "উভয়" };
  var SCOPE_CLS = { desktop: "sp-sky", web: "sp-violet", both: "sp-lime-o" };
  var SVC_ICON = { facebook: "i-radio", llm: "i-spark", github: "i-git", vercel: "i-term", database: "i-db", storage: "i-inbox", vault: "i-key" };

  /* ---------------- demo fallback (offline) ---------------- */
  var NOW = Date.now();
  function hrsAgo(h) { return new Date(NOW - h * 3600000).toISOString(); }
  function minAgo(m) { return new Date(NOW - m * 60000).toISOString(); }

  var DEMO = {
    articles: [
      { id: 1, title: "নিখোঁজের ছয় ঘণ্টায় ফিরে পেল বাবা-মা: সিসি ক্যামেরা আর প্রতিবেশীর সতর্কতায় উদ্ধার শিশু", category: "child", location: "ঢাকা · মিরপুর", sourceName: "মিরপুর আপডেট", hash: "a1f3c9e2d4b7", readingMinutes: 4, status: "published", collectedAt: hrsAgo(7), publishedAt: hrsAgo(6) },
      { id: 2, title: "ভাইরাল ভিডিওতেই ধরা পড়ল ছিনতাইকারী: ফেসবুকের একটি পোস্ট যেভাবে হয়ে গেল প্রমাণ", category: "crime", location: "ঢাকা · ধানমন্ডি", sourceName: "ঢাকা ট্রাফিক অ্যালার্ট", hash: "b7d2e81f0a34", readingMinutes: 3, status: "published", collectedAt: hrsAgo(9), publishedAt: hrsAgo(8) },
      { id: 3, title: "সন্দেহে ভাঙনের মুখে যাওয়া সংসার বাঁচাল তিন মাসের কাউন্সেলিং", category: "family", location: "রাজশাহী", sourceName: "রাজশাহীভুবন", hash: "c9e47a1b5d80", readingMinutes: 4, status: "published", collectedAt: hrsAgo(12), publishedAt: hrsAgo(11) },
      { id: 4, title: "নারীর ওপর হেনস্তার ভিডিও ভাইরালের পর: আইন কী বলে, ভুক্তভোগীর করণীয়", category: "crime", location: "ঢাকা", sourceName: "আইনি সহায়তা বাংলা", hash: "d4f8902c7e15", readingMinutes: 4, status: "published", collectedAt: hrsAgo(15), publishedAt: hrsAgo(14) },
      { id: 5, title: "চট্টগ্রামের ভাইরাল সড়ক দুর্ঘটনার ভিডিও: তথ্য যাচাই চলছে", category: "viral", location: "চট্টগ্রাম", sourceName: "চট্টগ্রাম লাইভ", hash: "d9f28b4e6a15", readingMinutes: 2, status: "pending", collectedAt: hrsAgo(2), publishedAt: null },
      { id: 6, title: "মিরপুরে নিখোঁজ শিশু উদ্ধার — পুনঃসংগ্রহে হ্যাশ মিল, ডুপ্লিকেট ব্লকড", category: "child", location: "ঢাকা · মিরপুর", sourceName: "ঢাকা কমিউনিটি অ্যালার্ট", hash: "e3b07c91f5d8", readingMinutes: 2, status: "duplicate", collectedAt: hrsAgo(4), publishedAt: null }
    ],
    runs: [
      { id: 1, startedAt: minAgo(26), trigger: "cron", status: "success", collected: 5, duplicates: 1, published: 3, durationSec: 268 },
      { id: 2, startedAt: hrsAgo(2.4), trigger: "cron", status: "success", collected: 4, duplicates: 2, published: 2, durationSec: 249 },
      { id: 3, startedAt: hrsAgo(4.4), trigger: "cron", status: "success", collected: 6, duplicates: 1, published: 4, durationSec: 302 },
      { id: 4, startedAt: hrsAgo(6.4), trigger: "manual", status: "success", collected: 3, duplicates: 0, published: 3, durationSec: 214 }
    ],
    keys: [
      { id: 1, label: "Facebook Graph টোকেন", service: "facebook", envName: "FB_GRAPH_TOKEN", maskedValue: "EAAx••••••••X7q2", revealValue: "EAADEMOxK7q2mZq9vL0demo", scope: "desktop", status: "rotate", rotatedAt: "৩৪ দিন আগে", note: "পেজ রিড-স্কোপ" },
      { id: 2, label: "OpenAI API কী (রিরাইট)", service: "llm", envName: "OPENAI_API_KEY", maskedValue: "sk-proj-••••••8F3d", revealValue: "sk-proj-demo4xK9rT7bMzQ8F3d", scope: "desktop", status: "active", rotatedAt: "৯ দিন আগে", note: "gpt-4o-mini · temp 0.3" },
      { id: 3, label: "GitHub PAT (কনটেন্ট)", service: "github", envName: "GITHUB_CONTENT_PAT", maskedValue: "ghp_••••••9aKl", revealValue: "ghp_demo9aKlPRm2xQwe7Tn", scope: "desktop", status: "active", rotatedAt: "১৮ দিন আগে", note: "রিপো: hoichoi-content" },
      { id: 4, label: "Turso ডাটাবেস URL", service: "database", envName: "TURSO_DATABASE_URL", maskedValue: "libsql://••••turso.io", revealValue: "libsql://hoichoi-demo.turso.io", scope: "both", status: "active", rotatedAt: "৪৫ দিন আগে", note: "libSQL · এজ-রিপ্লিকেটেড" },
      { id: 5, label: "ভল্ট মাস্টার কী", service: "vault", envName: "VAULT_MASTER_KEY", maskedValue: "•••••••• (শুধু env)", revealValue: "DEMO-MASTER-32B-F8A1C4E7", scope: "both", status: "active", rotatedAt: "৯০ দিন আগে", note: "AES-256" }
    ],
    sources: [
      { id: 1, name: "মিরপুর আপডেট", kind: "page", fbId: "1744552188412", handle: "@mirpur-update", topics: "শিশু · স্থানীয়", lastChecked: minAgo(26), status: "watching", postsToday: 3, health: 98 },
      { id: 2, name: "ঢাকা ট্রাফিক অ্যালার্ট", kind: "group", fbId: "9921880317101", handle: "@dhaka-traffic", topics: "অপরাধ · রাস্তা", lastChecked: minAgo(26), status: "watching", postsToday: 4, health: 94 },
      { id: 3, name: "রাজশাহীভুবন", kind: "page", fbId: "4481209930012", handle: "@rajshahibhuvan", topics: "পরিবার · সমাজ", lastChecked: minAgo(28), status: "watching", postsToday: 1, health: 91 },
      { id: 4, name: "কুমিল্লা টক", kind: "group", fbId: "6100299338841", handle: "@cumilla-talk", topics: "ভাইরাল · গুজব", lastChecked: minAgo(34), status: "watching", postsToday: 6, health: 72 },
      { id: 5, name: "সিলেট সংবাদচক্র", kind: "page", fbId: "8810221993004", handle: "@sylhet-songbad", topics: "পরিবার · সালিশ", lastChecked: hrsAgo(2), status: "paused", postsToday: 0, health: 80 },
      { id: 6, name: "ঢাকা কমিউনিটি অ্যালার্ট", kind: "group", fbId: "5501882299001", handle: "@dhaka-alert", topics: "শিশু · পুনরাবৃত্তি", lastChecked: minAgo(12), status: "error", postsToday: 1, health: 41 }
    ],
    logs: [
      { id: 1, ts: minAgo(2), level: "ok", stage: "SHIP", message: "Vercel READY · hoichoi.vercel.app · ISR 8.1s" },
      { id: 2, ts: minAgo(4), level: "ok", stage: "LLM", message: "পুনর্লিখন সম্পন্ন · fact-gate 0.94 · 18s" },
      { id: 3, ts: minAgo(6), level: "ok", stage: "DEDUP", message: "simhash 0.41 · PASS · unique" },
      { id: 4, ts: minAgo(7), level: "warn", stage: "DEDUP", message: "simhash 0.91 · BLOCK · মিরপুর নিখোঁজ পুনরাবৃত্তি" },
      { id: 5, ts: minAgo(8), level: "ok", stage: "HASH", message: "sha256 a1f3c9e2 · NEW" },
      { id: 6, ts: minAgo(9), level: "ok", stage: "SHOT", message: "Playwright capture shot_0011.png · 1440×900" },
      { id: 7, ts: minAgo(11), level: "ok", stage: "FETCH", message: "মিরপুর আপডেট · 2 new · ঢাকা ট্রাফিক · 1 video" },
      { id: 8, ts: minAgo(14), level: "info", stage: "CRON", message: "scheduled tick · 0 */2 * * * · Asia/Dhaka" }
    ]
  };

  var RUN_SCRIPT = [
    { level: "info", stage: "CRON", message: "ম্যানুয়াল রান শুরু · Asia/Dhaka" },
    { level: "info", stage: "WATCH", message: "ওয়াচলিস্ট স্ক্যান · ১০ সোর্স" },
    { level: "ok", stage: "FETCH", message: "মিরপুর আপডেট · ২টি নতুন পোস্ট" },
    { level: "ok", stage: "FETCH", message: "ঢাকা ট্রাফিক অ্যালার্ট · ১টি ভিডিও" },
    { level: "info", stage: "SHOT", message: "Playwright headless · 1440×900" },
    { level: "ok", stage: "SHOT", message: "screenshot saved · shot_0012.png · 1.1s" },
    { level: "ok", stage: "HASH", message: "sha256 7c91e2ab · NEW" },
    { level: "warn", stage: "DEDUP", message: "simhash 0.91 · নিকট-দ্বৈত · BLOCK" },
    { level: "ok", stage: "DEDUP", message: "দ্বিতীয় আইটেম পাস · cosine 0.44" },
    { level: "info", stage: "LLM", message: "gpt-4o-mini · style-guide v2.4 · temp 0.3" },
    { level: "ok", stage: "LLM", message: "পুনর্লিখন সম্পন্ন · fact-gate 0.94" },
    { level: "ok", stage: "GIT", message: "commit 3fa91c · hoichoi-content/main" },
    { level: "ok", stage: "SHIP", message: "Vercel READY · 7.8s · ISR revalidate" },
    { level: "ok", stage: "DONE", message: "রান শেষ · +১ প্রকাশিত · ১ ডুপ্লিকেট ব্লক" }
  ];

  /* ---------------- state ---------------- */
  var DB = { articles: [], runs: [], keys: [], sources: [], logs: [] };
  var liveDb = false;
  var DB_LABEL = "TURSO";
  var wl = { q: "", kind: "all", paused: {}, extra: [], open: false };
  var q = { tab: "all", q: "" };
  var revealed = {};
  var run = { on: false, step: 0, timer: null, live: [] };
  var uid = 100000;

  /* ---------------- theme (dark / light toggle) ---------------- */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("hoichoi-theme", t); } catch (e) { /* private mode */ }
    var sw = $("#themeToggle");
    if (sw) {
      sw.setAttribute("aria-checked", t === "light" ? "true" : "false");
      sw.title = t === "light" ? "লাইট থিম চালু · ক্লিকে ডার্ক" : "ডার্ক থিম চালু · ক্লিকে লাইট";
    }
  }
  function initTheme() {
    var t = "dark";
    try {
      t = localStorage.getItem("hoichoi-theme") ||
        (window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    } catch (e) { /* noop */ }
    applyTheme(t);
  }

  /* ---------------- toast ---------------- */
  var toastTimer = null;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }

  function copyText(text, msg) {
    function done() { toast(msg || "কপি হয়েছে"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast("কপি ব্যর্থ"); }
      document.body.removeChild(ta);
    }
  }

  /* ---------------- tabs ---------------- */
  var ORDER = ["dashboard", "watchlist", "queue", "collector", "vault", "settings"];
  function setTab(id) {
    if (ORDER.indexOf(id) < 0) return;
    $$("#sideNav button, #mTabs button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === id);
    });
    ORDER.forEach(function (t) { $("#pane-" + t).hidden = (t !== id); });
  }

  /* ---------------- window ---------------- */
  function setWin(mode) {
    var win = $("#win"), dock = $("#dockRestore");
    if (mode === "min") { win.hidden = true; dock.hidden = false; }
    else {
      win.hidden = false; dock.hidden = true;
      win.classList.toggle("max", mode === "max");
    }
  }

  /* ---------------- dashboard ---------------- */
  function renderDashboard() {
    var arts = DB.articles, runs = DB.runs, srcs = DB.sources;
    var published = arts.filter(function (a) { return a.status === "published"; }).length;
    var collected = runs.reduce(function (s, r) { return s + (r.collected || 0); }, 0);
    var dups = runs.reduce(function (s, r) { return s + (r.duplicates || 0); }, 0);
    var avg = runs.length ? Math.round(runs.reduce(function (s, r) { return s + (r.durationSec || 0); }, 0) / runs.length) : 0;
    var watching = srcs.filter(function (s) { return effStatus(s) === "watching"; }).length;

    $("#stCollected").textContent = toBn(collected);
    $("#stPublished").textContent = toBn(published);
    $("#stDups").textContent = toBn(dups);
    $("#stAvg").textContent = toBn(Math.floor(avg / 60)) + "ম " + toBn(pad(avg % 60)) + "সে";

    var last = runs[0] || null;
    $("#lastRunAt").textContent = last ? bnTime(last.startedAt) : "—";
    $("#lastResult").textContent = last ? ("+" + toBn(last.published) + " live · " + toBn(last.duplicates) + " dup") : "—";
    $("#watchCount").textContent = toBn(watching) + "/" + toBn(srcs.length) + " সোর্স";
    $("#sideWatch").textContent = toBn(watching) + " সোর্স সক্রিয়";

    $("#srcHealth").innerHTML = srcs.slice(0, 6).map(function (s) {
      var st = effStatus(s);
      var dot = st === "watching" ? "dot-ok" : st === "error" ? "dot-err" : "dot-off";
      return '<li><span class="' + dot + '"></span><span class="nm">' + esc(s.name) + '</span><span class="hp">' + toBn(s.health) + '%</span></li>';
    }).join("") || '<li><span class="nm dim">কোনো সোর্স নেই</span></li>';

    $("#dashLogs").innerHTML = DB.logs.slice(0, 6).map(function (l) {
      return '<li><span class="t">' + bnTime(l.ts) + '</span><span class="s lv-' + l.level + '">' + esc(l.stage) + '</span><span class="m">' + esc(l.message) + "</span></li>";
    }).join("");

    $("#dashQueue").innerHTML = arts.slice(0, 5).map(function (a) {
      var cls = a.status === "published" ? "sp-green" : a.status === "pending" ? "sp-amber" : "sp-rose";
      return '<li><span class="n">' + pad(a.id) + '</span><span class="t">' + esc(a.title) + '</span><span class="c">' + esc(CAT_LABEL[a.category] || a.category) + '</span><span class="status-pill ' + cls + '">' + a.status.toUpperCase() + "</span></li>";
    }).join("");
  }

  /* ---------------- countdown ring ---------------- */
  var TWO_H = 2 * 60 * 60 * 1000, RING_C = 307.9;
  function tickCountdown() {
    var runs = DB.runs;
    var base = runs.length && runs[0].startedAt ? new Date(runs[0].startedAt).getTime() : Date.now();
    var now = Date.now(), next = base + TWO_H;
    while (next <= now) next += TWO_H;
    var rem = Math.max(0, next - now);
    var frac = 1 - rem / TWO_H;
    var s = Math.floor(rem / 1000);
    $("#cdTime").textContent = toBn(pad(Math.floor(s / 3600))) + ":" + toBn(pad(Math.floor((s % 3600) / 60))) + ":" + toBn(pad(s % 60));
    $("#ringFg").style.strokeDashoffset = String(RING_C * (1 - frac));
    try {
      $("#nextRunAt").textContent = new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit" }).format(new Date(next)) + " (ঢাকা)";
    } catch (e) { /* noop */ }
  }

  /* ---------------- watchlist ---------------- */
  function effStatus(s) {
    if (s.status === "error") return "error";
    if (wl.paused[s.id] !== undefined) return wl.paused[s.id] ? "paused" : "watching";
    return s.status === "paused" ? "paused" : "watching";
  }
  function allSources() { return DB.sources.concat(wl.extra); }

  function renderWatchlist() {
    var term = wl.q.trim().toLowerCase();
    var rows = allSources().filter(function (s) {
      var okQ = !term || s.name.toLowerCase().indexOf(term) >= 0 || (s.handle || "").toLowerCase().indexOf(term) >= 0;
      var okK = wl.kind === "all" || s.kind === wl.kind;
      return okQ && okK;
    });
    if (!rows.length) {
      $("#wlBody").innerHTML = '<tr class="empty-row"><td colspan="7">কোনো সোর্স মিললো না — খোঁজ বদলে দেখুন।</td></tr>';
      return;
    }
    $("#wlBody").innerHTML = rows.map(function (s) {
      var st = effStatus(s);
      var pill = st === "watching"
        ? '<span class="status-pill sp-green"><svg class="ic"><use href="#i-radio"/></svg>পর্যবেক্ষণ</span>'
        : st === "error"
          ? '<span class="status-pill sp-rose"><svg class="ic"><use href="#i-warn"/></svg>ত্রুটি</span>'
          : '<span class="status-pill sp-gray"><svg class="ic"><use href="#i-pause"/></svg>বিরতি</span>';
      var btn = st === "error" ? "" :
        '<button class="icon-btn" data-pause="' + s.id + '" title="' + (st === "paused" ? "চালু" : "বিরতি") + '"><svg class="ic"><use href="#i-' + (st === "paused" ? "play" : "pause") + '"/></svg></button>';
      var hc = s.health > 80 ? "var(--lime)" : s.health > 50 ? "var(--amber)" : "var(--rose-dk)";
      return "<tr><td><p class=\"cell-main\">" + esc(s.name) + "</p><p class=\"cell-sub\">" + esc(s.handle || "") + " · " + esc(s.fbId) + "</p></td>" +
        "<td class=\"cell-mid\">" + (KIND_BN[s.kind] || s.kind) + "</td>" +
        "<td class=\"cell-mid\">" + esc(s.topics || "—") + "</td>" +
        "<td class=\"cell-mono\">" + agoBn(s.lastChecked) + "</td>" +
        "<td class=\"cell-mono\" style=\"font-size:12px;color:rgba(255,255,255,.8)\">" + toBn(s.postsToday || 0) + "</td>" +
        "<td><span class=\"healthbar\"><span class=\"track\"><span class=\"fill\" style=\"width:" + s.health + "%;background:" + hc + "\"></span></span><span class=\"v\">" + toBn(s.health) + "</span></span></td>" +
        "<td><div class=\"row-actions\">" + pill + btn + "</div></td></tr>";
    }).join("");
  }

  /* ---------------- queue ---------------- */
  function statusPill(st) {
    if (st === "published") return '<span class="status-pill sp-green"><svg class="ic"><use href="#i-check"/></svg>প্রকাশিত</span>';
    if (st === "pending") return '<span class="status-pill sp-amber"><svg class="ic"><use href="#i-timer"/></svg>রিভিউ অপেক্ষায়</span>';
    return '<span class="status-pill sp-rose"><svg class="ic"><use href="#i-x"/></svg>ডুপ্লিকেট ব্লক</span>';
  }
  function renderQueue() {
    var rows = DB.articles, c = { all: rows.length, published: 0, pending: 0, duplicate: 0 };
    rows.forEach(function (r) { if (c[r.status] !== undefined) c[r.status]++; });
    $("#cAll").textContent = toBn(c.all); $("#cPub").textContent = toBn(c.published);
    $("#cPen").textContent = toBn(c.pending); $("#cDup").textContent = toBn(c.duplicate);

    var term = q.q.trim().toLowerCase();
    var shown = rows.filter(function (r) {
      var okT = q.tab === "all" || r.status === q.tab;
      var okQ = !term || r.title.toLowerCase().indexOf(term) >= 0 || (r.sourceName || "").toLowerCase().indexOf(term) >= 0;
      return okT && okQ;
    });
    if (!shown.length) {
      $("#qBody").innerHTML = '<tr class="empty-row"><td colspan="6">কোনো আইটেম মিললো না — ফিল্টার বদলে দেখুন।</td></tr>';
      return;
    }
    $("#qBody").innerHTML = shown.map(function (r) {
      var open = r.status === "published"
        ? '<a class="icon-btn lime" href="/news/' + r.id + '" title="পড়ুন"><svg class="ic"><use href="#i-eye"/></svg></a>'
        : '<span class="cell-sub">—</span>';
      return "<tr><td><div style=\"display:flex;gap:12px;align-items:center\"><span class=\"cell-mono\">" + pad(r.id) + "</span><div style=\"min-width:0\"><p class=\"cell-main\" style=\"white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:340px\">" + esc(r.title) + "</p><p class=\"cell-sub\"><span class=\"catdot\" style=\"background:" + (CAT_DOT[r.category] || "#d2202c") + "\"></span>" + esc(CAT_LABEL[r.category] || r.category) + "</p></div></div></td>" +
        "<td class=\"cell-mid\">" + esc(r.sourceName || "—") + "</td>" +
        "<td class=\"cell-mono\">" + bnTime(r.collectedAt) + "</td>" +
        "<td class=\"hashcell\">" + esc((r.hash || "").slice(0, 8)) + "</td>" +
        "<td>" + statusPill(r.status) + "</td>" +
        "<td><div class=\"row-actions\">" + open + "</div></td></tr>";
    }).join("");
  }

  /* ---------------- collector ---------------- */
  function renderLogs() {
    $("#logList").innerHTML = run.live.map(function (l) {
      return '<li><span class="t">' + bnTime(l.ts) + '</span><span class="s lv-' + l.level + '">' + esc(l.stage) + '</span><span class="m">' + esc(l.message) + "</span></li>";
    }).join("");
  }
  function startRun() {
    if (run.on) return;
    run.on = true; run.step = 0;
    $("#runBtn").hidden = true; $("#stopBtn").hidden = false;
    $("#runBarWrap").hidden = false; $("#scanline").hidden = false;
    $("#runStage").hidden = false; $("#colIcon").classList.add("live");
    toast("কালেক্টর রান শুরু");
    var i = 0;
    run.timer = setInterval(function () {
      var row = RUN_SCRIPT[i];
      if (!row) { stopRun(true); return; }
      run.live.unshift({ id: ++uid, ts: new Date().toISOString(), level: row.level, stage: row.stage, message: row.message });
      i++; run.step = i;
      $("#runStage").textContent = "STAGE " + pad(i) + "/" + pad(RUN_SCRIPT.length);
      $("#runBar").style.width = Math.round((i / RUN_SCRIPT.length) * 100) + "%";
      renderLogs();
      $("#term").scrollTop = 0;
    }, 720);
  }
  function stopRun(done) {
    if (run.timer) clearInterval(run.timer);
    run.timer = null; run.on = false;
    $("#runBtn").hidden = false; $("#stopBtn").hidden = true;
    $("#runBarWrap").hidden = true; $("#scanline").hidden = true;
    $("#runStage").hidden = true; $("#colIcon").classList.remove("live");
    if (done) { toast("রান শেষ · +১ প্রকাশিত · ১ ডুপ্লিকেট ব্লক"); renderDashboard(); }
  }

  /* ---------------- vault ---------------- */
  function renderVault() {
    $("#vaultBody").innerHTML = DB.keys.map(function (k) {
      var open = !!revealed[k.id];
      var st = k.status === "rotate"
        ? '<span class="status-pill sp-amber">রোটেশন দরকার</span>'
        : '<span class="status-pill sp-green"><span class="dot-ok"></span>সক্রিয়</span>';
      return "<tr><td><div class=\"svc\"><span class=\"svc-ic\"><svg class=\"ic\"><use href=\"#" + (SVC_ICON[k.service] || "i-key") + "\"/></svg></span><div><p>" + esc(k.label) + "</p><small>" + esc(k.note || "") + "</small></div></div></td>" +
        "<td class=\"cell-mono\">" + esc(k.envName) + "</td>" +
        "<td><code class=\"code\">" + esc(open ? k.revealValue : k.maskedValue) + "</code> " +
        '<button class="icon-btn" data-reveal="' + k.id + '" title="' + (open ? "লুকান" : "দেখান") + '"><svg class="ic"><use href="#i-eye' + (open ? "off" : "") + '"/></svg></button> ' +
        '<button class="icon-btn lime" data-copy="' + k.id + '" title="কপি"><svg class="ic"><use href="#i-copy"/></svg></button></td>' +
        '<td><span class="status-pill ' + (SCOPE_CLS[k.scope] || "sp-lime-o") + '">' + (SCOPE_BN[k.scope] || k.scope) + "</span></td>" +
        "<td>" + st + "</td>" +
        "<td class=\"r cell-mono\">" + esc(k.rotatedAt || "—") + "</td></tr>";
    }).join("") || '<tr class="empty-row"><td colspan="6">ভল্ট খালি।</td></tr>';
  }

  /* ---------------- render all ---------------- */
  function renderAll() {
    renderDashboard(); renderWatchlist(); renderQueue(); renderVault(); renderLogs();
    var ds = $("#dataSrc"), db = $("#dbState");
    if (liveDb) {
      ds.textContent = "ডেটা: লাইভ " + DB_LABEL; ds.classList.add("live");
      db.innerHTML = '<svg class="ic"><use href="#i-db"/></svg>' + DB_LABEL + " · CONNECTED";
      db.style.color = "var(--t-lime)";
    } else {
      ds.textContent = "ডেটা: ডেমো (অফলাইন)"; ds.classList.remove("live");
      db.innerHTML = '<svg class="ic"><use href="#i-db"/></svg>DB · DEMO MODE';
      db.style.color = "var(--t-amber)";
    }
  }

  /* ---------------- load ---------------- */
  function load() {
    fetch("/api/option-a", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (j) {
        if (j && j.ok && j.articles) {
          DB.articles = j.articles; DB.runs = j.runs || [];
          DB.keys = j.keys || []; DB.sources = j.sources || []; DB.logs = j.logs || [];
          if (j.driverLabel) DB_LABEL = j.driverLabel;
          liveDb = true;
        } else { throw new Error("bad payload"); }
      })
      .catch(function () {
        DB.articles = DEMO.articles; DB.runs = DEMO.runs; DB.keys = DEMO.keys;
        DB.sources = DEMO.sources; DB.logs = DEMO.logs; liveDb = false;
      })
      .then(function () {
        run.live = DB.logs.slice();
        renderAll(); tickCountdown();
      });
  }

  /* ---------------- wire up ---------------- */
  function init() {
    // tabs
    $$("[data-tab]").forEach(function (b) {
      b.addEventListener("click", function () { setTab(b.getAttribute("data-tab")); });
    });
    $$("[data-goto]").forEach(function (b) {
      b.addEventListener("click", function () { setTab(b.getAttribute("data-goto")); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      var i = ["1", "2", "3", "4", "5", "6"].indexOf(e.key);
      if (i >= 0) setTab(ORDER[i]);
    });

    // theme toggle
    initTheme();
    $("#themeToggle").addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme") || "dark";
      var nxt = cur === "dark" ? "light" : "dark";
      applyTheme(nxt);
      toast(nxt === "light" ? "লাইট থিম চালু ☀" : "ডার্ক থিম চালু ☾");
    });

    // window
    $("#btnMin").addEventListener("click", function () { setWin("min"); });
    $("#btnMin2").addEventListener("click", function () { setWin("min"); });
    $("#btnMax").addEventListener("click", function () { setWin($("#win").classList.contains("max") ? "normal" : "max"); });
    $("#btnMax2").addEventListener("click", function () { setWin($("#win").classList.contains("max") ? "normal" : "max"); });
    $("#btnClose").addEventListener("click", function () { window.location.href = "/"; });
    $("#dockRestore").addEventListener("click", function () { setWin("normal"); });

    // watchlist
    $("#wlQ").addEventListener("input", function (e) { wl.q = e.target.value; renderWatchlist(); });
    $$("[data-kind]").forEach(function (b) {
      b.addEventListener("click", function () {
        wl.kind = b.getAttribute("data-kind");
        $$("[data-kind]").forEach(function (x) { x.classList.toggle("active", x === b); });
        renderWatchlist();
      });
    });
    $("#wlAddBtn").addEventListener("click", function () {
      wl.open = !wl.open; $("#wlForm").hidden = !wl.open;
    });
    $("#wlSave").addEventListener("click", function () {
      var name = $("#wlName").value.trim(), fbId = $("#wlFbId").value.trim();
      if (!name || !fbId) { toast("নাম ও Facebook ID দিন"); return; }
      wl.extra.push({
        id: 900 + wl.extra.length, name: name, kind: $("#wlKind").value, fbId: fbId,
        handle: "@" + name.replace(/\s+/g, "-").toLowerCase(), topics: "নতুন",
        lastChecked: new Date().toISOString(), status: "watching", postsToday: 0, health: 100
      });
      $("#wlName").value = ""; $("#wlFbId").value = "";
      wl.open = false; $("#wlForm").hidden = true;
      renderWatchlist(); renderDashboard(); toast("সোর্স যোগ হয়েছে");
    });
    $("#wlBody").addEventListener("click", function (e) {
      var b = e.target.closest("[data-pause]");
      if (!b) return;
      var id = +b.getAttribute("data-pause");
      var s = allSources().find(function (x) { return x.id === id; });
      if (!s || s.status === "error") return;
      var cur = effStatus(s) === "paused";
      wl.paused[id] = !cur ? true : false;
      if (!wl.paused[id] && s.status !== "paused") delete wl.paused[id];
      if (wl.paused[id] === false && s.status === "paused") wl.paused[id] = false;
      renderWatchlist(); renderDashboard();
    });

    // queue
    $$("#qTabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        q.tab = b.getAttribute("data-qtab");
        $$("#qTabs button").forEach(function (x) { x.classList.toggle("active", x === b); });
        renderQueue();
      });
    });
    $("#qQ").addEventListener("input", function (e) { q.q = e.target.value; renderQueue(); });

    // collector
    $("#runBtn").addEventListener("click", startRun);
    $("#stopBtn").addEventListener("click", function () { stopRun(false); });

    // vault
    $("#vaultBody").addEventListener("click", function (e) {
      var r = e.target.closest("[data-reveal]");
      if (r) {
        var id = +r.getAttribute("data-reveal");
        revealed[id] = !revealed[id];
        renderVault(); return;
      }
      var c = e.target.closest("[data-copy]");
      if (c) {
        var k = DB.keys.find(function (x) { return x.id === +c.getAttribute("data-copy"); });
        if (k) copyText(k.envName + "=" + k.revealValue, k.envName + " কপি হয়েছে");
      }
    });
    $("#copyAll").addEventListener("click", function () {
      copyText(DB.keys.map(function (k) { return k.envName + "=" + k.revealValue; }).join("\n"), "সব কী .env ফরম্যাটে কপি হয়েছে");
      var lbl = $("#copyAll span");
      if (lbl) { var old = lbl.textContent; lbl.textContent = "কপি হয়েছে (.env)"; setTimeout(function () { lbl.textContent = old; }, 1800); }
    });

    // settings
    $("#temp").addEventListener("input", function (e) { $("#tempVal").textContent = (+e.target.value).toFixed(2); });
    $("#gate").addEventListener("input", function (e) {
      var v = +e.target.value;
      $("#gateVal").textContent = "০." + toBn(v);
    });
    $("#toggles").addEventListener("click", function (e) {
      var b = e.target.closest("[data-toggle]");
      if (b) b.classList.toggle("on");
    });

    // clocks
    function tickClock() {
      try { $("#clock").textContent = fmtClock.format(new Date()); } catch (e) { /* noop */ }
    }
    tickClock(); setInterval(tickClock, 1000);
    setInterval(tickCountdown, 1000);

    load();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
