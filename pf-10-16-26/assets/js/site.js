/* PowerFlag site script. Reads window.PF_CONFIG. No dependencies. */
(function () {
  "use strict";
  var C = window.PF_CONFIG || {};
  var doc = document;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var track = window.pfTrack || function () {};

  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function money(n) { return "$" + Number(n).toLocaleString("en-US"); }

  /* ---------- config binding ---------- */
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function openDateLabel(long) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(C.DEPOSITS_OPEN || "");
    if (!m) return long ? "November 11" : "Nov 11";
    return (long ? MONTHS_LONG : MONTHS)[parseInt(m[2], 10) - 1] + " " + parseInt(m[3], 10);
  }

  function bindText() {
    var tiers = C.TIERS || [];
    var vals = {
      email: C.SUPPORT_EMAIL || "",
      deposit: money(C.DEPOSIT || 49),
      retail: money(C.RETAIL_ESTIMATE || 399),
      "open-date": openDateLabel(),
      "open-date-long": openDateLabel(true),
      "price-low": tiers.length ? money(tiers[0].price) : "",
      "price-high": tiers.length ? money(tiers[tiers.length - 1].price) : "",
      "total-cap": tiers.length ? String(tiers[tiers.length - 1].cap) : "200"
    };
    $$("[data-pf]").forEach(function (el) {
      var k = el.getAttribute("data-pf");
      if (!(k in vals)) return;
      el.textContent = vals[k];
      if (k === "email" && el.tagName === "A") el.setAttribute("href", "mailto:" + vals[k]);
    });
    $$("[data-pf-mailto]").forEach(function (el) {
      el.setAttribute("href", "mailto:" + (C.SUPPORT_EMAIL || ""));
    });
    // The deposits-open row only reads while the Stripe link is a placeholder.
    $$("[data-pf-open-row]").forEach(function (el) { el.hidden = isLive(); });
  }

  function renderCounter(reserved) {
    var tiers = C.TIERS || [];
    if (!tiers.length) return;
    var total = tiers[tiers.length - 1].cap;
    reserved = clamp(Math.floor(Number(reserved) || 0), 0, total);
    var openIdx = -1;
    for (var i = 0; i < tiers.length; i++) { if (reserved < tiers[i].cap) { openIdx = i; break; } }

    // At zero, lead with the size of the run instead of a "0 claimed" line.
    var line = reserved > 0
      ? reserved + " of " + total + " first-run reservations claimed. "
      : total + " units in the first production run. ";
    line += openIdx >= 0
      ? tiers[openIdx].name + " is open at " + money(tiers[openIdx].price) + "."
      : "First-run reservations are full. Estimated retail is " + money(C.RETAIL_ESTIMATE || 399) + ".";
    $$("[data-pf-counter]").forEach(function (el) { el.textContent = line; });
    $$("[data-pf-bar]").forEach(function (el) { el.style.width = (total ? (reserved / total) * 100 : 0) + "%"; });

    var html = "";
    var ledger = "";
    tiers.forEach(function (t, idx) {
      var prev = idx ? tiers[idx - 1].cap : 0;
      var state = reserved >= t.cap ? "Full" : (idx === openIdx ? "Open" : "Next");
      var left = idx === openIdx ? " " + (t.cap - Math.max(reserved, prev)) + " left at this price." : "";
      var cls = "tier" + (idx === openIdx ? " is-open" : "") + (state === "Full" ? " is-full" : "");
      var range = "Reservations " + (prev + 1) + " to " + t.cap + ". <span class=\"t-state\">" + state + "." + left + "</span>";
      html += '<li class="' + cls + '"><span class="t-name">' + t.name + '</span><span class="t-price">' + money(t.price) +
        '</span><span class="t-range">' + range + "</span></li>";
      ledger += '<li class="' + cls.replace("tier", "ledger-row") + '"><span class="t-name">' + t.name + '</span><span class="t-price">' + money(t.price) +
        '</span><span class="t-range">' + range + '</span><span class="t-act">' +
        (idx === openIdx ? '<a class="btn js-reserve" href="#list" data-where="ledger">Reserve for ' + money(C.DEPOSIT || 49) + "</a>" : "") + "</span></li>";
    });
    $$("[data-pf-tiers]").forEach(function (el) { el.innerHTML = html; });
    $$("[data-pf-ledger]").forEach(function (el) { el.innerHTML = ledger; });

    // Current tier readouts (reservation box, sticky bar). Progress shows only once
    // there is a real reservation to show, and never a made-up number.
    var cur = tiers[openIdx >= 0 ? openIdx : tiers.length - 1];
    var curPrev = openIdx > 0 ? tiers[openIdx - 1].cap : 0;
    var leftNow = openIdx >= 0 ? cur.cap - Math.max(reserved, curPrev) : 0;
    var vals = {
      name: openIdx >= 0 ? cur.name : "First run full",
      price: openIdx >= 0 ? money(cur.price) : money(C.RETAIL_ESTIMATE || 399),
      left: openIdx >= 0 ? leftNow + " left at this price." : "First-run reservations are full."
    };
    $$("[data-pf-tier]").forEach(function (el) {
      var k = el.getAttribute("data-pf-tier");
      if (k in vals) el.textContent = vals[k];
    });
    var tierSpan = cur.cap - curPrev;
    var tierDone = clamp(reserved - curPrev, 0, tierSpan);
    $$("[data-pf-tbar]").forEach(function (el) { el.style.width = (tierSpan ? (tierDone / tierSpan) * 100 : 0) + "%"; });
    $$("[data-pf-progress]").forEach(function (el) { el.hidden = !(reserved > 0); });
    wireReserve();
  }

  function loadCount() {
    renderCounter(C.RESERVED_COUNT || 0);
    try {
      fetch("assets/reservations.json", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j && typeof j.reserved === "number") renderCounter(j.reserved); })
        .catch(function () {});
    } catch (e) {}
  }

  /* ---------- reserve buttons ---------- */
  function isLive() { var l = C.STRIPE_PAYMENT_LINK || ""; return l && l.charAt(0) !== "#"; }

  function wireReserve() {
    $$(".js-reserve").forEach(function (a) {
      if (isLive()) a.setAttribute("href", C.STRIPE_PAYMENT_LINK);
      if (a.getAttribute("data-wired")) return;
      a.setAttribute("data-wired", "1");
      a.addEventListener("click", function (ev) {
        track("reserve_click", { location: a.getAttribute("data-where") || "page" });
        if (isLive()) return;
        ev.preventDefault();
        var scope = a.closest("[data-reserve-scope]");
        var box = (scope && $(".notice", scope)) || $("[data-reserve-scope] .notice") || $("#reserve .notice");
        if (!box) return;
        box.hidden = false;
        var r = box.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) {
          box.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
        }
        var f = $("input[type=email]", box);
        if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
      });
    });
  }

  /* ---------- forms ---------- */
  function wireForms() {
    $$("form[data-pf-form]").forEach(function (form) {
      form.addEventListener("submit", function (ev) {
        var hp = form.elements["bot-field"];
        var msg = $(".form-msg", form);
        var kind = form.getAttribute("data-pf-form");
        var dest = "thanks.html?from=" + encodeURIComponent(kind);
        if (hp && hp.value) { ev.preventDefault(); window.location.href = dest; return; }
        if (!window.fetch) return; // plain POST fallback
        ev.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        if (C.DEMO_MODE) { window.location.href = dest; return; }
        var btn = $("button[type=submit]", form);
        if (btn) btn.disabled = true;
        if (msg) msg.textContent = "Sending.";
        var fd = new FormData(form);
        var req;
        if (C.FORM_ENDPOINT) {
          req = fetch(C.FORM_ENDPOINT, { method: "POST", body: fd, headers: { Accept: "application/json" } });
        } else {
          req = fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(fd).toString()
          });
        }
        req.then(function (r) {
          if (!r.ok) throw new Error("status " + r.status);
          track("signup", { form: kind, source: form.elements.source ? form.elements.source.value : "" });
          try { localStorage.setItem("pf_exit_seen", "1"); } catch (e) {}
          window.location.href = dest;
        }).catch(function () {
          if (btn) btn.disabled = false;
          if (msg) msg.textContent = "That did not go through. Email " + (C.SUPPORT_EMAIL || "us") + " and we will add you by hand.";
        });
      });
    });
  }

  /* ---------- hero media ---------- */
  var HERO_ALT = "PowerFlag column mounted on a stucco wall beside a window, a flag flying from its angled pole in afternoon light. Product render.";
  function initHero() {
    var frame = $("[data-hero]");
    if (!frame) return;
    var cap = $("figcaption", frame);
    function showPoster() {
      if (!C.HERO_POSTER) return;
      var img = doc.createElement("img");
      img.className = "media-el";
      img.src = C.HERO_POSTER;
      img.alt = HERO_ALT;
      img.decoding = "async";
      frame.insertBefore(img, cap);
    }
    if (!C.HERO_VIDEO) { showPoster(); return; }
    var v = doc.createElement("video");
    v.className = "media-el";
    v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("loop", ""); v.setAttribute("autoplay", "");
    v.preload = "metadata";
    if (C.HERO_POSTER) v.poster = C.HERO_POSTER;
    v.setAttribute("aria-label", HERO_ALT);
    v.src = C.HERO_VIDEO;
    frame.insertBefore(v, cap);
    var snd = doc.createElement("button");
    snd.type = "button";
    snd.className = "media-sound";
    snd.textContent = "Turn sound on";
    snd.addEventListener("click", function () {
      v.muted = !v.muted;
      snd.textContent = v.muted ? "Turn sound on" : "Turn sound off";
      if (!v.muted && v.paused) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
    });
    frame.appendChild(snd);
    v.addEventListener("error", function () {
      if (v.parentNode) v.parentNode.removeChild(v);
      if (snd.parentNode) snd.parentNode.removeChild(snd);
      showPoster();
    });
  }

  /* ---------- dawn / dusk demo ---------- */
  var DEMO_STATUS = {
    dawn: "Sealed. Waiting for morning.",
    deploying: "Raising the flag.",
    flying: "Flying. The column stays sealed until dusk.",
    stowing: "Bringing it in.",
    night: "Stowed for the night."
  };

  function initDemo() {
    var stage = $("[data-demo-stage]");
    var D = C.DEMO;
    if (!stage || !D || !D.DAWN_STOWED || !D.DAWN_FLYING) return;
    var cap = $("figcaption", stage);
    var status = $("[data-demo-status]");
    var btn = { dawn: $('[data-demo="dawn"]'), dusk: $('[data-demo="dusk"]') };
    var HS = D.HOTSPOT || {};
    var hsStowed = HS.stowed || [50, 45];
    var hsFlying = HS.flying || hsStowed;
    var focus = D.FOCUS || hsStowed;

    // Layers: four stills and, when configured, two videos, stacked in the stage.
    var defs = [
      ["ds", D.DAWN_STOWED, "img"],
      ["df", D.DAWN_FLYING, "img"],
      ["uf", D.DUSK_FLYING || D.DAWN_FLYING, "img"],
      ["ns", D.NIGHT_STOWED || D.DAWN_STOWED, "img"],
      ["vd", D.DEPLOY_VIDEO, "video"],
      ["vs", D.STOW_VIDEO, "video"]
    ];
    var layers = {};
    defs.forEach(function (d) {
      if (!d[1]) return;
      var el = doc.createElement(d[2] === "video" ? "video" : "img");
      el.className = "demo-layer";
      el.setAttribute("aria-hidden", "true");
      el.style.opacity = 0;
      if (d[2] === "video") {
        el.muted = true; el.playsInline = true; el.preload = "none";
        el.setAttribute("muted", ""); el.setAttribute("playsinline", "");
        el.setAttribute("data-src", d[1]);
      } else {
        el.alt = "";
        el.decoding = "async";
        el.setAttribute("data-src", d[1]);
      }
      layers[d[0]] = el;
      stage.insertBefore(el, cap);
    });
    function load(name) {
      var el = layers[name];
      if (el && !el.getAttribute("src")) { el.setAttribute("src", el.getAttribute("data-src")); if (el.tagName === "VIDEO") el.load(); }
    }
    load("ds");
    layers.ds.style.opacity = 1;
    layers.ds.style.zIndex = 1;
    layers.ds.addEventListener("load", layout);

    var hot = doc.createElement("button");
    hot.type = "button";
    hot.className = "demo-hot";
    hot.innerHTML = '<span class="demo-hot-label"></span>';
    stage.appendChild(hot);
    var hotLabel = $(".demo-hot-label", hot);

    var state = "dawn";
    var busy = false;

    function wait(ms) { return new Promise(function (r) { window.setTimeout(r, ms); }); }

    // Bring a layer to the top and fade it in. Everything else is cleared once it lands.
    function show(name, ms) {
      var el = layers[name];
      if (!el) return Promise.resolve();
      load(name);
      el.style.transition = "none";
      el.style.opacity = 0;
      el.style.zIndex = 2;
      void el.offsetWidth;
      el.style.transition = ms ? "opacity " + ms + "ms ease" : "none";
      el.style.opacity = 1;
      return wait(ms || 0).then(function () {
        Object.keys(layers).forEach(function (k) {
          var l = layers[k];
          if (k === name) { l.style.zIndex = 1; return; }
          l.style.transition = "none"; l.style.opacity = 0; l.style.zIndex = 0;
          if (l.tagName === "VIDEO" && l.getAttribute("src")) l.pause();
        });
      });
    }

    // Resolves true when the video played through, false on any failure.
    function playVideo(name) {
      var v = layers[name];
      if (!v) return Promise.resolve(false);
      return new Promise(function (resolve) {
        var done = false, timer;
        function fin(ok) {
          if (done) return; done = true;
          window.clearTimeout(timer);
          v.removeEventListener("playing", onPlaying);
          v.removeEventListener("ended", onEnded);
          v.removeEventListener("error", onError);
          resolve(ok);
        }
        function onPlaying() {
          window.clearTimeout(timer);
          show(name, 0);
          var len = isFinite(v.duration) && v.duration > 0 ? v.duration : 90;
          timer = window.setTimeout(function () { fin(false); }, (len + 4) * 1000);
        }
        function onEnded() { fin(true); }
        function onError() { fin(false); }
        v.addEventListener("playing", onPlaying);
        v.addEventListener("ended", onEnded);
        v.addEventListener("error", onError);
        timer = window.setTimeout(function () { fin(false); }, 5000);
        load(name);
        try { v.currentTime = 0; } catch (e) {}
        var pr = v.play();
        if (pr && pr.catch) pr.catch(function () { fin(false); });
      });
    }

    function setState(s) {
      state = s;
      if (status) status.textContent = DEMO_STATUS[s];
      if (btn.dawn) btn.dawn.setAttribute("aria-pressed", (s === "deploying" || s === "flying") ? "true" : "false");
      if (btn.dusk) btn.dusk.setAttribute("aria-pressed", (s === "stowing" || s === "night") ? "true" : "false");
      var flying = s === "flying";
      var label = flying ? "Bring it in" : "Raise the flag";
      hotLabel.textContent = label;
      hot.setAttribute("aria-label", label);
      placeHot();
    }

    function setBusy(b) {
      busy = b;
      stage.classList.toggle("is-busy", b);
      hot.disabled = b;
    }

    // Cover-crop math. Hotspot points are % of the picture; the crop is centered on
    // the stowed point so the product stays in frame on a narrow stage. The same crop
    // serves every layer, so nothing jumps between states.
    var crop = { ox: 0, oy: 0, sw: 1, sh: 1, W: 1, H: 1 };
    function layout() {
      var W = stage.clientWidth, H = stage.clientHeight;
      if (!W || !H) return;
      var ref = layers.ds;
      var ia = ref.naturalWidth && ref.naturalHeight ? ref.naturalWidth / ref.naturalHeight : 16 / 9;
      var sw, sh;
      if (ia > W / H) { sh = H; sw = H * ia; } else { sw = W; sh = W / ia; }
      var ox = 0, oy = 0, px = 50, py = 50;
      if (sw - W > 0.5) { ox = clamp(focus[0] / 100 * sw - W / 2, 0, sw - W); px = ox / (sw - W) * 100; }
      if (sh - H > 0.5) { oy = clamp(focus[1] / 100 * sh - H / 2, 0, sh - H); py = oy / (sh - H) * 100; }
      crop = { ox: ox, oy: oy, sw: sw, sh: sh, W: W, H: H };
      Object.keys(layers).forEach(function (k) { layers[k].style.objectPosition = px + "% " + py + "%"; });
      placeHot();
    }
    function placeHot() {
      var pt = state === "flying" ? hsFlying : hsStowed;
      var x = (pt[0] / 100 * crop.sw - crop.ox) / crop.W * 100;
      var y = (pt[1] / 100 * crop.sh - crop.oy) / crop.H * 100;
      hot.style.left = clamp(x, 6, 94) + "%";
      hot.style.top = clamp(y, 6, 94) + "%";
      hot.classList.toggle("label-left", x > 62);
    }

    function dawn() {
      if (busy || state === "deploying" || state === "flying") return;
      track("demo_dawn", {});
      var fromNight = state === "night";
      setBusy(true);
      setState("deploying");
      var p;
      if (reduced) {
        p = show("df", 0);
      } else {
        p = (fromNight ? show("ds", 600) : Promise.resolve()).then(function () {
          if (!layers.vd) return show("df", 1400);
          return playVideo("vd").then(function (ok) { return show("df", ok ? 150 : 1400); });
        });
      }
      p.then(function () { setBusy(false); setState("flying"); });
    }

    function dusk() {
      if (busy || state === "stowing" || state === "night") return;
      track("demo_dusk", {});
      var wasFlying = state === "flying";
      setBusy(true);
      var p;
      if (!wasFlying) {
        // Already stowed: dusk simply falls on the sealed column.
        p = show("ns", reduced ? 0 : 1400);
      } else {
        setState("stowing");
        if (reduced) {
          p = show("ns", 0);
        } else {
          p = show("uf", 600).then(function () {
            if (!layers.vs) return show("ns", 1400);
            return playVideo("vs").then(function (ok) { return show("ns", ok ? 150 : 1400); });
          });
        }
      }
      p.then(function () { setBusy(false); setState("night"); });
    }

    if (btn.dawn) btn.dawn.addEventListener("click", dawn);
    if (btn.dusk) btn.dusk.addEventListener("click", dusk);
    hot.addEventListener("click", function () { if (state === "flying") dusk(); else dawn(); });

    setState("dawn");
    layout();
    window.addEventListener("resize", layout);
    function preload() {
      Object.keys(layers).forEach(function (k) { if (layers[k].tagName === "IMG") load(k); });
      Object.keys(layers).forEach(function (k) {
        var l = layers[k];
        if (l.tagName === "VIDEO") { l.preload = "auto"; load(k); }
      });
    }
    if (doc.readyState === "complete") preload(); else window.addEventListener("load", preload);
    stage.classList.add("is-live");
  }

  /* ---------- scroll entrances with failsafe ---------- */
  var rvs = [];
  function sweep() {
    var vh = window.innerHeight;
    rvs = rvs.filter(function (el) {
      if (el.getBoundingClientRect().top < vh * 0.92) { el.classList.remove("rv-hide"); return false; }
      return true;
    });
  }
  function initReveal() {
    if (reduced) return;
    var all = $$(".rv");
    all.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.92) { el.classList.add("rv-hide"); rvs.push(el); }
    });
    window.setTimeout(sweep, 2500);
    // Last resort: a frozen or throttled tab must never leave content invisible.
    window.setTimeout(function () { all.forEach(function (el) { el.classList.remove("rv-hide"); }); rvs = []; }, 9000);
  }

  /* ---------- sticky bar ---------- */
  var sticky, stickyAfter, stickyHide;
  function initSticky() {
    sticky = $(".sticky-cta");
    stickyAfter = $("[data-sticky-after]");
    stickyHide = $("[data-sticky-hide]");
  }
  function updateSticky() {
    if (!sticky || !stickyAfter) return;
    var past = stickyAfter.getBoundingClientRect().bottom < 0;
    var near = stickyHide ? stickyHide.getBoundingClientRect().top < window.innerHeight * 0.85 : false;
    sticky.classList.toggle("is-on", past && !near);
  }

  /* ---------- scroll loop ---------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      sweep(); updateSticky();
    });
  }

  /* ---------- exit intent, desktop only, once per visitor ---------- */
  function initExit() {
    var dlg = $("dialog.exit");
    if (!dlg || typeof dlg.showModal !== "function") return;
    var seen = false;
    try { seen = !!localStorage.getItem("pf_exit_seen"); } catch (e) {}
    if (seen) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.innerWidth < 960) return;
    var t0 = Date.now();
    var shown = false;
    function show() {
      if (shown) return; shown = true;
      try { localStorage.setItem("pf_exit_seen", "1"); } catch (e) {}
      dlg.showModal();
      var f = $("input[type=email]", dlg); if (f) f.focus();
    }
    doc.addEventListener("mouseout", function (e) {
      if (e.relatedTarget || e.clientY > 0 || Date.now() - t0 < 6000) return;
      if ($(".notice:not([hidden])")) return;
      show();
    });
    $$("[data-exit-close]", dlg).forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* ---------- thanks page copy ---------- */
  function initThanks() {
    var box = $("[data-thanks]");
    if (!box) return;
    var from = (new URLSearchParams(window.location.search)).get("from") || "list";
    var el = $("[data-thanks-" + from + "]", box) || $("[data-thanks-list]", box);
    $$("[data-thanks-list],[data-thanks-reserve],[data-thanks-business]", box).forEach(function (n) { n.hidden = true; });
    if (el) el.hidden = false;
  }

  /* ---------- init ---------- */
  function init() {
    try { bindText(); loadCount(); wireReserve(); wireForms(); initThanks(); initExit(); } catch (e) {}
    try { initHero(); } catch (e) {}
    try { initDemo(); } catch (e) {}
    try { initSticky(); initReveal(); updateSticky(); } catch (e) {}
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("load", onScroll);
    window.addEventListener("hashchange", onScroll);
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();
