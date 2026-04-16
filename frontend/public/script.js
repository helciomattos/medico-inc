(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ─── Timer da oferta ──────────────────────────────────────────────────────────
  // Usa sessionStorage para que o timer seja consistente entre renders/abas
  // da mesma sessão, mas resete ao fechar o navegador.
  function initTimer() {
    const countdownEl = $("#countdown");
    if (!countdownEl) return;

    const TIMER_KEY = "medico_inc_offer_end";
    const SESSION_HOURS = 24; // oferta válida por 24h dentro da sessão

    let end = Number(sessionStorage.getItem(TIMER_KEY) || 0);
    if (!end || end <= Date.now()) {
      // Novo visitante ou sessão expirada: define fim do dia corrente
      const now = new Date();
      const eod = new Date(now);
      eod.setHours(23, 59, 59, 999);
      end = eod.getTime();
      sessionStorage.setItem(TIMER_KEY, String(end));
    }

    const pad = (n) => String(n).padStart(2, "0");

    const render = () => {
      const diff = Math.max(0, end - Date.now());
      const total = Math.floor(diff / 1000);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      countdownEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;

      if (diff === 0) {
        countdownEl.closest(".top-ribbon")?.classList.add("expired");
      }
    };

    render();
    setInterval(render, 1000);
  }

  // ─── Efeito tilt nos cards ────────────────────────────────────────────────────
  function initTiltCards() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    $$(".tilt-card").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - y) * 8;
        const ry = (x - 0.5) * 8;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
      });
    });
  }

  // ─── Fluxo hero animado ───────────────────────────────────────────────────────
  function initHeroFlow() {
    const flow = $("#heroFlow");
    if (!flow) return;

    const steps = $$(".hero-step", flow);
    const bar = $("#heroFlowBar", flow);
    const patientsEl = $("#heroPatients", flow);
    const revenueEl = $("#heroRevenue", flow);
    if (!steps.length || !bar || !patientsEl || !revenueEl) return;

    const stages = [
      { patients: 0, revenue: 0 },
      { patients: 6, revenue: 5400 },
      { patients: 19, revenue: 16700 },
      { patients: 34, revenue: 29400 }
    ];

    const state = { patients: 0, revenue: 0 };
    const formatRevenue = (v) => `R$${Math.round(v).toLocaleString("pt-BR")}`;
    const render = () => {
      patientsEl.textContent = `+${Math.round(state.patients)}`;
      revenueEl.textContent = formatRevenue(state.revenue);
    };

    let current = 0;
    const activate = (index) => {
      current = index % steps.length;
      steps.forEach((step, i) => step.classList.toggle("is-active", i === current));

      const width = `${((current + 1) / steps.length) * 100}%`;
      if (window.gsap) {
        window.gsap.to(bar, { width, duration: 0.55, ease: "power2.out" });
      } else {
        bar.style.width = width;
      }

      const target = stages[current] || stages[stages.length - 1];
      if (window.gsap) {
        window.gsap.to(state, {
          patients: target.patients,
          revenue: target.revenue,
          duration: 0.62,
          ease: "power2.out",
          onUpdate: render
        });
      } else {
        state.patients = target.patients;
        state.revenue = target.revenue;
        render();
      }
    };

    render();
    activate(0);
    setInterval(() => activate((current + 1) % steps.length), 2300);
  }

  // ─── Benchmark ────────────────────────────────────────────────────────────────
  function initBenchmarkFlow() {
    const section = $("#benchmark");
    if (!section) return;
    const cards = $$(".bench-flow-card", section);
    if (!cards.length) return;
    cards.forEach((card, i) => card.classList.toggle("is-active", i === 0));
  }

  // ─── Botões magnéticos ────────────────────────────────────────────────────────
  function initMagneticButtons() {
    if (window.matchMedia("(max-width: 960px)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    $$(".btn-primary").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const rect = btn.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        btn.style.transform = `translate(${x * 7}px, ${y * 5}px)`;
      });
      btn.addEventListener("pointerleave", () => {
        btn.style.transform = "";
      });
    });
  }

  // ─── Scroll reveal ────────────────────────────────────────────────────────────
  function initTailorScrollEffect() {
    const targets = [$("#encontrabilidade"), $("#sites-entregues")].filter(Boolean);
    if (!targets.length) return;

    targets.forEach((el) => el.classList.add("tb-section-fx"));

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -12% 0px" }
    );

    targets.forEach((t) => observer.observe(t));
  }

  // ─── GSAP animations ─────────────────────────────────────────────────────────
  function initGsap() {
    if (!window.gsap) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    gsap.from(".hero-copy .kicker", { y: 20, opacity: 0, duration: 0.6, ease: "power2.out" });
    gsap.from(".hero-copy h1", { y: 34, opacity: 0, duration: 0.9, delay: 0.1, ease: "power3.out" });
    gsap.from(".hero-copy .lead", { y: 20, opacity: 0, duration: 0.75, delay: 0.2, ease: "power2.out" });
    gsap.from(".hero-copy .hero-cta-row", { y: 14, opacity: 0, duration: 0.7, delay: 0.3, ease: "power2.out" });
    gsap.from(".hero-note", { y: 10, opacity: 0, duration: 0.6, delay: 0.42, ease: "power2.out" });
    gsap.from(".hero-stage", { y: 26, opacity: 0, duration: 1, delay: 0.16, ease: "power3.out" });

    $$(".reveal").forEach((el, i) => {
      gsap.from(el, {
        y: 24,
        duration: 0.8,
        delay: i === 0 ? 0.05 : 0,
        ease: "power2.out",
        scrollTrigger: ScrollTrigger ? { trigger: el, start: "top 84%" } : undefined
      });
    });

    if (ScrollTrigger) {
      $$(".stack-panel").forEach((panel) => {
        gsap.from(panel, {
          y: 24,
          duration: 0.75,
          ease: "power2.out",
          scrollTrigger: { trigger: panel, start: "top 75%" }
        });
      });

      [
        ".bench-flow-card",
        ".visual-block",
        ".find-card",
        ".platform-item",
        ".live-card",
        ".checkout-copy",
        ".cart-box",
        ".hero-stage-metrics article",
        ".how-it-works .hero-flow"
      ].forEach((selector) => {
        const items = $$(selector);
        if (!items.length) return;
        gsap.from(items, {
          y: 24,
          duration: 0.75,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: items[0].closest("section") || items[0],
            start: "top 76%"
          }
        });
      });
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────
  initTimer();
  initTiltCards();
  initHeroFlow();
  initBenchmarkFlow();
  initMagneticButtons();
  initTailorScrollEffect();
  initGsap();
})();
