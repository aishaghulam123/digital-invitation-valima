/* ============================================================
   AREEBA & ZAYAN — VALIMA
   "The Evening Awaits" — interaction & motion system
   Modules: smoothScroll · hero · memory · dateReveal · countdown
            venuePull · timeDial · eventInfo · finale · atmosphere
   ============================================================ */

/* No ES module imports — this file runs as a classic script so the
   invitation works when opened directly from disk (file://). */


const { gsap } = window;
gsap.registerPlugin(window.ScrollTrigger);
const ST = window.ScrollTrigger;

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const MOBILE = window.matchMedia("(max-width: 760px)").matches;
const EVENT_AT = new Date("2026-11-18T21:00:00+05:00").getTime();

const q = (s, r = document) => r.querySelector(s);
const qa = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ------------------------------------------------------------
   1. SMOOTH SCROLL (Lenis ↔ ScrollTrigger)
------------------------------------------------------------ */
let lenis = null;
function initSmoothScroll() {
  if (REDUCED || !window.Lenis) return;
  lenis = new window.Lenis({ duration: 1.25, smoothWheel: true, touchMultiplier: 1.4 });
  lenis.on("scroll", ST.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ------------------------------------------------------------
   2. HERO — light sweep reveal + scroll dissolve
------------------------------------------------------------ */
function initHero() {
  const video = q(".hero__video");
  if (video) {
    video.addEventListener("error", () => video.remove(), true);
    if (!video.currentSrc) setTimeout(() => { if (!video.currentSrc) video.remove(); }, 1200);
  }

  const words = qa(".sweep");
  const sweep = q(".hero__lightsweep");

  if (REDUCED) {
    gsap.set(words, { filter: "blur(0px)", opacity: 1 });
    gsap.set([q("#heroLine"), q(".hero__tag")], { opacity: 1 });
  } else {
    const tl = gsap.timeline({ delay: 0.35 });
    tl.set(sweep, { opacity: 1 })
      .fromTo(sweep, { xPercent: 0 }, { xPercent: 360, duration: 2.6, ease: "power2.inOut" }, 0)
      .to(sweep, { opacity: 0, duration: 0.5 }, 2.3);

    words.forEach((w, i) => {
      tl.to(w, {
        filter: "blur(0px)", opacity: 1, duration: 1.1, ease: "power2.out",
      }, 0.42 + i * 0.42);
      tl.fromTo(w, { letterSpacing: "0.12em" }, { letterSpacing: "0em", duration: 1.4, ease: "power3.out" }, 0.42 + i * 0.42);
    });

    tl.to("#heroLine", { opacity: 1, duration: 1.2 }, "-=0.6")
      .to(".hero__tag", { opacity: 1, duration: 1.2 }, "-=0.9");
  }

  // Film opening → invitation: the media world dissolves into pearl.
  gsap.timeline({
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
  })
    .to(".hero__media", { opacity: 0, scale: 1.12, ease: "none" }, 0)
    .to(".hero__inner", { yPercent: -34, opacity: 0, filter: "blur(6px)", ease: "none" }, 0)
    .to(".scroll-hint", { opacity: 0, ease: "none" }, 0);
}

/* ------------------------------------------------------------
   3. EDITORIAL LINE REVEALS (memory + celebration)
------------------------------------------------------------ */
function initLineReveals() {
  qa(".lineMask").forEach((mask, i) => {
    gsap.fromTo(mask.firstElementChild,
      { yPercent: 115, rotate: 1.5 },
      {
        yPercent: 0, rotate: 0, duration: 1.5, ease: "expo.out", delay: (i % 2) * 0.12,
        scrollTrigger: { trigger: mask, start: "top 88%" },
      });
  });

  gsap.to(".celebrate", {
    backgroundPositionY: "40%", ease: "none",
    scrollTrigger: { trigger: ".celebrate", start: "top bottom", end: "bottom top", scrub: true },
  });
}

/* ------------------------------------------------------------
   4. DATE — silk swipe reveal (pointer = mouse + touch + pen)
------------------------------------------------------------ */
let dateProgress = 0;
function initDateReveal(onRevealed) {
  const surface = q("#dateSurface");
  const silk = q("#dateSilk");
  const hint = q(".silk__hint");
  const micro = q("#dateMicro");
  if (!surface) return;

  let dragging = false, startX = 0, base = 0, done = false;

  const paint = (p) => {
    dateProgress = clamp(p, 0, 1);
    const cut = dateProgress * 100;
    silk.style.clipPath = `inset(0 0 0 ${cut}%)`;
    silk.style.filter = `blur(${dateProgress * 4}px)`;
    hint.style.opacity = String(1 - dateProgress * 2.2);
    if (!done && dateProgress > 0.72) { done = true; complete(); }
  };

  const complete = () => {
    gsap.to(silk, {
      clipPath: "inset(0 0 0 100%)", opacity: 0, duration: 1.1, ease: "expo.out",
      onComplete: () => { silk.style.pointerEvents = "none"; },
    });
    gsap.to(micro, { opacity: 0, duration: 0.6 });
    gsap.fromTo(".reveal-surface__under > *",
      { yPercent: 18, opacity: 0.2, filter: "blur(8px)" },
      { yPercent: 0, opacity: 1, filter: "blur(0px)", stagger: 0.12, duration: 1.2, ease: "power3.out" });
    onRevealed();
  };

  const down = (e) => {
    if (done) return;
    dragging = true; startX = e.clientX; base = dateProgress;
    surface.classList.add("is-dragging");
    surface.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!dragging) return;
    paint(base + (e.clientX - startX) / surface.clientWidth);
  };
  const up = () => {
    if (!dragging) return;
    dragging = false;
    surface.classList.remove("is-dragging");
    if (!done) gsap.to({ v: dateProgress }, { v: 0, duration: 0.9, ease: "power2.out", onUpdate() { paint(this.targets()[0].v); } });
  };

  surface.addEventListener("pointerdown", down);
  surface.addEventListener("pointermove", move);
  surface.addEventListener("pointerup", up);
  surface.addEventListener("pointercancel", up);

  paint(0);
}

/* ------------------------------------------------------------
   5. COUNTDOWN — vertical morphing numerals
------------------------------------------------------------ */
function initCountdown() {
  const section = q("#countdown");
  const cells = {};
  let timer = null, live = false;

  const rollTo = (host, str) => {
    while (host.children.length < str.length) {
      const roll = document.createElement("span");
      roll.className = "roll";
      roll.innerHTML = "<b></b>";
      host.appendChild(roll);
    }
    while (host.children.length > str.length) host.lastElementChild.remove();

    [...host.children].forEach((roll, i) => {
      // clean up any leftovers from a previous (possibly interrupted) animation
      while (roll.children.length > 1) {
        gsap.killTweensOf(roll.firstElementChild);
        roll.firstElementChild.remove();
      }
      const b = roll.firstElementChild;
      const next = str[i];
      if (b.textContent === next) return;
      if (b.textContent === "") { b.textContent = next; return; }

      const inc = document.createElement("b");
      inc.textContent = next;
      roll.appendChild(inc);
      gsap.killTweensOf(b);
      gsap.to(b, {
        yPercent: -100, opacity: 0, duration: 0.4, ease: "power2.inOut",
        onComplete: () => b.remove(),
      });
      gsap.fromTo(inc, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: "power2.inOut", clearProps: "opacity" });
    });
  };

  const tick = () => {
    const left = Math.max(0, EVENT_AT - Date.now());
    const s = Math.floor(left / 1000);
    const v = {
      days: Math.floor(s / 86400),
      hours: Math.floor((s % 86400) / 3600),
      minutes: Math.floor((s % 3600) / 60),
      seconds: s % 60,
    };
    Object.entries(v).forEach(([k, n]) => {
      const host = cells[k] || (cells[k] = q(`[data-unit="${k}"]`));
      if (!host) return;
      rollTo(host, String(n).padStart(2, "0"));
    });
  };

  const loop = () => {
    tick();
    // re-align to the next whole second to avoid drift / bunched updates
    timer = setTimeout(loop, 1000 - (Date.now() % 1000));
  };

  const onVisibility = () => { if (!document.hidden && live) { clearTimeout(timer); loop(); } };

  return function activate() {
    if (live) return;
    live = true;
    section.classList.remove("is-locked");
    section.removeAttribute("aria-hidden");
    loop();
    gsap.fromTo(section, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.4, ease: "expo.out" });
    ST.refresh();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", () => clearTimeout(timer), { once: true });
  };

}

/* ------------------------------------------------------------
   6. VENUE — pull panel aside
------------------------------------------------------------ */
function initVenuePull() {
  const wrap = q("#pull");
  const panel = q("#pullPanel");
  if (!wrap) return;

  let dragging = false, startX = 0, base = 0, x = 0, done = false;
  const width = () => wrap.clientWidth;

  const paint = (px) => {
    x = clamp(px, 0, width());
    panel.style.transform = `translate3d(${x}px,0,0)`;
    q(".pull__hint").style.opacity = String(1 - (x / width()) * 3);
  };

  const finish = () => {
    done = true;
    gsap.to(panel, { x: width(), duration: 1.2, ease: "expo.out", onComplete: () => (panel.style.pointerEvents = "none") });
    gsap.fromTo(".pull__text > *", { x: -26, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.14, duration: 1.1, ease: "power3.out", delay: 0.2 });
  };

  panel.addEventListener("pointerdown", (e) => {
    if (done) return;
    dragging = true; startX = e.clientX; base = x;
    panel.classList.add("is-dragging");
    panel.setPointerCapture(e.pointerId);
  });
  panel.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    paint(base + (e.clientX - startX));
    if (!done && x > width() * 0.55) { dragging = false; panel.classList.remove("is-dragging"); finish(); }
  });
  const release = () => {
    if (!dragging) return;
    dragging = false; panel.classList.remove("is-dragging");
    if (!done) gsap.to(panel, { x: 0, duration: 0.9, ease: "power3.out", onUpdate: () => { x = gsap.getProperty(panel, "x"); paint(x); } });
  };
  panel.addEventListener("pointerup", release);
  panel.addEventListener("pointercancel", release);

  window.addEventListener("resize", () => { if (done) gsap.set(panel, { x: width() }); });
}

/* ------------------------------------------------------------
   7. TIME — rotating editorial dial
------------------------------------------------------------ */
function initTimeDial() {
  const dial = q("#dial");
  const prog = q(".dial__prog");
  const handle = q("#dialHandle");
  const face = q("#dialTime");
  const hint = q("#dialHint");
  const ticks = q("#dialTicks");
  if (!dial) return;

  const LEN = 2 * Math.PI * 126;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r1 = i % 5 === 0 ? 112 : 119, r2 = 126;
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", 150 + Math.cos(a) * r1); l.setAttribute("y1", 150 + Math.sin(a) * r1);
    l.setAttribute("x2", 150 + Math.cos(a) * r2); l.setAttribute("y2", 150 + Math.sin(a) * r2);
    ticks.appendChild(l);
  }

  let value = 0, prevAngle = null, dragging = false;

  const paint = () => {
    prog.style.strokeDashoffset = String(LEN * (1 - value));
    const a = -Math.PI / 2 + value * Math.PI * 2;
    const r = dial.clientWidth * 0.42;
    handle.style.transform = `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px)`;
    face.style.opacity = String(clamp(value * 1.25, 0, 1));
    face.style.filter = `blur(${(1 - clamp(value * 1.25, 0, 1)) * 10}px)`;
    hint.style.opacity = String(1 - value * 2);
    dial.setAttribute("aria-valuenow", String(Math.round(value * 100)));
  };

  const angleOf = (e) => {
    const r = dial.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  };

  dial.addEventListener("pointerdown", (e) => {
    dragging = true; prevAngle = angleOf(e);
    dial.classList.add("is-dragging"); dial.setPointerCapture(e.pointerId);
  });
  dial.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const a = angleOf(e);
    let d = a - prevAngle;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    prevAngle = a;
    value = clamp(value + d / (Math.PI * 2), 0, 1);
    paint();
    if (value >= 0.98) { dragging = false; dial.classList.remove("is-dragging"); }
  });
  const stop = () => { dragging = false; dial.classList.remove("is-dragging"); };
  dial.addEventListener("pointerup", stop);
  dial.addEventListener("pointercancel", stop);
  dial.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { value = clamp(value + 0.06, 0, 1); paint(); e.preventDefault(); }
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { value = clamp(value - 0.06, 0, 1); paint(); e.preventDefault(); }
  });

  window.addEventListener("resize", paint);
  paint();
}

/* ------------------------------------------------------------
   8. EVENT INFO — three different reveal languages
------------------------------------------------------------ */
function initEventInfo() {
  if (!q("#info")) return;
  const base = { scrollTrigger: { trigger: "#info", start: "top 65%" } };
  gsap.to('[data-anim="mask"]', { clipPath: "inset(0 0% 0 0)", duration: 1.5, stagger: 0.2, ease: "expo.out", ...base });
  gsap.to('[data-anim="vertical"]', { y: 0, opacity: 1, duration: 1.2, delay: 0.35, ease: "power3.out", ...base });
  gsap.to('[data-anim="horizontal"]', { x: 0, opacity: 1, duration: 1.3, delay: 0.55, stagger: 0.15, ease: "power3.out", ...base });
  gsap.to(".info__rule line", { strokeDashoffset: 0, duration: 1.8, delay: 0.8, ease: "power2.inOut", ...base });
}

/* ------------------------------------------------------------
   9. FINALE — magnetic CTA + calendar file
------------------------------------------------------------ */
function initFinale() {
  gsap.from(".final > *", {
    y: 30, opacity: 0, duration: 1.3, stagger: 0.12, ease: "power3.out",
    scrollTrigger: { trigger: ".final", start: "top 70%" },
  });

  const cta = q("#saveDate");
  if (!MOBILE) {
    cta.addEventListener("pointermove", (e) => {
      const r = cta.getBoundingClientRect();
      gsap.to(cta, { x: (e.clientX - (r.left + r.width / 2)) * 0.3, y: (e.clientY - (r.top + r.height / 2)) * 0.4, duration: 0.6, ease: "power3.out" });
    });
    cta.addEventListener("pointerleave", () => gsap.to(cta, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1,0.5)" }));
  }

  cta.addEventListener("click", () => {
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Areeba and Zayan//Valima//EN",
      "BEGIN:VEVENT", "UID:valima-areeba-zayan-2026@invitation",
      "DTSTART:20261118T160000Z", "DTEND:20261118T200000Z",
      "SUMMARY:Valima — Areeba & Zayan",
      "LOCATION:The Garden Courtyard, Karachi",
      "DESCRIPTION:An evening to remember. #AreebaFoundHerZayan",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url; a.download = "Valima-Areeba-Zayan.ics";
    a.click();
    URL.revokeObjectURL(url);
    q("#saveDate span").textContent = "Saved · see you there";
  });
}

/* ------------------------------------------------------------
   10. ATMOSPHERE — canvas veils of light & drifting dust
------------------------------------------------------------ */
function initAtmosphere() {
  const canvas = q("#atmosphere");
  if (!canvas || REDUCED) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const DPR = Math.min(window.devicePixelRatio || 1, MOBILE ? 1 : 1.6);
  let W = 0, H = 0;
  const resize = () => {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const TONES = ["#683c57", "#c9a24d", "#c98fae", "#3d2237", "#8f5476"];
  const veils = TONES.map((color, i) => ({
    color,
    base: 0.13 - i * 0.016,
    x: 0.2 + i * 0.16,
    y: i % 2 ? 0.34 : 0.68,
    r: 0.5 + i * 0.1,
    depth: 1 + i * 0.5,
    phase: i * 1.3,
  }));

  const COUNT = MOBILE ? 60 : 140;
  const dust = Array.from({ length: COUNT }, () => ({
    x: Math.random(), y: Math.random(),
    z: 0.3 + Math.random() * 0.7,
    r: 0.4 + Math.random() * 1.1,
    a: 0.15 + Math.random() * 0.4,
    s: 0.00006 + Math.random() * 0.00016,
    p: Math.random() * Math.PI * 2,
  }));

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  let scrollDepth = 0;
  const onScroll = () => {
    const max = document.body.scrollHeight - window.innerHeight;
    scrollDepth = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  let raf = 0;
  const start = performance.now();
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const t = (now - start) / 1000;
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    veils.forEach((v, i) => {
      const drift = Math.sin(t * 0.2 + v.phase);
      const cx = (v.x + pointer.x * 0.035 * v.depth) * W + drift * 26;
      const cy = (v.y - pointer.y * 0.025 * v.depth + scrollDepth * 0.12 * (i % 2 ? 1 : -1)) * H + drift * 18;
      const rad = v.r * Math.max(W, H) * (0.75 + 0.08 * Math.sin(t * 0.25 + i));
      const alpha = Math.max(0, v.base * (0.65 + 0.35 * Math.sin(t * 0.25 + i)));
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, hexA(v.color, alpha));
      g.addColorStop(1, hexA(v.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    });

    dust.forEach((d) => {
      d.y -= d.s * (1 + scrollDepth);
      if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); }
      const x = (d.x + Math.sin(t * 0.25 + d.p) * 0.008 + pointer.x * 0.01 * d.z) * W;
      const y = (d.y - pointer.y * 0.008 * d.z) * H;
      ctx.fillStyle = hexA("#e8cfa0", d.a * (0.55 + 0.45 * Math.sin(t * 0.8 + d.p)));
      ctx.beginPath();
      ctx.arc(x, y, d.r * d.z * 1.4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = "source-over";
  };
  raf = requestAnimationFrame(loop);
  canvas.classList.add("is-on");

  window.addEventListener("pagehide", () => cancelAnimationFrame(raf));
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}


/* ------------------------------------------------------------
   BOOT
------------------------------------------------------------ */
function boot() {
  initSmoothScroll();
  initHero();
  initLineReveals();
  const activateCountdown = initCountdown();
  initDateReveal(activateCountdown);
  initVenuePull();
  initTimeDial();
  initEventInfo();
  initFinale();
  try { initAtmosphere(); } catch (e) { console.warn("Atmosphere unavailable:", e.message); }

  if (window.AOS) AOS.init({ once: true, duration: 1200, easing: "ease-out-quart", disable: REDUCED });
  ST.refresh();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
