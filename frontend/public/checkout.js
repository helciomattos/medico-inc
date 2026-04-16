(function () {
  "use strict";

  // ─── Validadores ─────────────────────────────────────────────────────────────

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());
  }

  function isValidCPF(raw) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
    let r = (sum * 10) % 11;
    if (r === 10 || r === 11) r = 0;
    if (r !== Number(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
    r = (sum * 10) % 11;
    if (r === 10 || r === 11) r = 0;
    return r === Number(digits[10]);
  }

  function isValidCNPJ(raw) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
    const calc = (d, n) => {
      let sum = 0;
      let pos = n - 7;
      for (let i = n; i >= 1; i--) {
        sum += Number(d[n - i]) * pos--;
        if (pos < 2) pos = 9;
      }
      const r = sum % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return (
      calc(digits, 12) === Number(digits[12]) &&
      calc(digits, 13) === Number(digits[13])
    );
  }

  // ─── Config e estado ──────────────────────────────────────────────────────────

  const config = window.CHECKOUT_CONFIG || {};

  // idempotencyKey persiste na sessão para evitar duplicatas se usuário navegar
  // entre passos, mas reseta ao recarregar a página (comportamento correto).
  const IDEM_KEY = "co_idem_" + (config.product?.id || "product");
  let idempotencyKey = sessionStorage.getItem(IDEM_KEY);
  if (!idempotencyKey) {
    idempotencyKey =
      (window.crypto?.randomUUID?.()) ||
      `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(IDEM_KEY, idempotencyKey);
  }

  const state = {
    step: 1,
    timeLeft: 15 * 60,
    bumps: (config.orderBumps || []).map((b) => ({ ...b, selected: false })),
    paymentMethod: "credit_card",
    idempotencyKey,
    utm: Object.fromEntries(new URLSearchParams(window.location.search).entries())
  };

  const localApiBase = String(
    config.apiBase ||
      ((window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "localhost")
        ? "http://127.0.0.1:8787"
        : "")
  ).replace(/\/$/, "");

  // ─── Elementos DOM ────────────────────────────────────────────────────────────

  const form = document.getElementById("checkoutForm");
  const stepButtons = Array.from(document.querySelectorAll(".step"));
  const panels = Array.from(document.querySelectorAll("[data-panel]"));
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");
  const bumpList = document.getElementById("bumpList");
  const summaryBumps = document.getElementById("summaryBumps");
  const totalValue = document.getElementById("totalValue");
  const topTimer = document.getElementById("topTimer");
  const statusBox = document.getElementById("statusBox");
  const documentType = document.getElementById("documentType");
  const documentLabel = document.getElementById("documentLabel");
  const documentInput = document.getElementById("document");
  const installments = document.getElementById("installments");
  const creditCardFields = document.getElementById("creditCardFields");
  const pixFields = document.getElementById("pixFields");
  const applePayFields = document.getElementById("applePayFields");
  const applePayOption = document.getElementById("applePayOption");

  // ─── Utilitários ─────────────────────────────────────────────────────────────

  const money = (value) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  function track(event, payload = {}) {
    // Google Tag Manager / GA4
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...payload });

    // gtag direto (se disponível)
    if (typeof window.gtag === "function") {
      window.gtag("event", event, payload);
    }
  }

  function resolveEndpoint(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return `${localApiBase}${path}`;
  }

  function getTotal() {
    const base = Number(config.product?.basePrice || 0);
    const bumpsTotal = state.bumps
      .filter((b) => b.selected)
      .reduce((sum, b) => sum + Number(b.price || 0), 0);
    return base + bumpsTotal;
  }

  // ─── Renderização ─────────────────────────────────────────────────────────────

  function renderBumps() {
    if (!bumpList) return;
    bumpList.innerHTML = "";

    state.bumps.forEach((bump, index) => {
      const row = document.createElement("label");
      row.className = `bump-item ${bump.selected ? "selected" : ""}`;
      row.innerHTML = `
        <span class="bump-check">
          <input type="checkbox" ${bump.selected ? "checked" : ""} data-bump-index="${index}" />
        </span>
        <span class="bump-body">
          <span class="bump-title">${bump.name}</span>
          <span class="bump-desc">${bump.description}</span>
          <span class="bump-price">+ ${money(Number(bump.price || 0))}</span>
        </span>
      `;
      bumpList.appendChild(row);
    });

    bumpList.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const i = Number(e.target.getAttribute("data-bump-index"));
        state.bumps[i].selected = e.target.checked;
        renderBumps();
        renderSummary();
        track("bump_toggle", {
          bump_id: state.bumps[i].id,
          selected: state.bumps[i].selected,
          value: getTotal()
        });
      });
    });
  }

  function renderSummary() {
    if (!summaryBumps || !totalValue) return;
    summaryBumps.innerHTML = "";

    state.bumps
      .filter((b) => b.selected)
      .forEach((b) => {
        const line = document.createElement("div");
        line.className = "line";
        line.innerHTML = `<span>${b.name}</span><strong>${money(Number(b.price || 0))}</strong>`;
        summaryBumps.appendChild(line);
      });

    totalValue.textContent = money(getTotal());
  }

  function renderSteps() {
    panels.forEach((panel) => {
      panel.classList.toggle("hidden", Number(panel.getAttribute("data-panel")) !== state.step);
    });

    stepButtons.forEach((btn) => {
      btn.classList.toggle("is-active", Number(btn.getAttribute("data-step")) === state.step);
    });

    prevBtn.classList.toggle("hidden", state.step === 1);
    nextBtn.classList.toggle("hidden", state.step >= 3);
    submitBtn.classList.toggle("hidden", state.step !== 3);

    if (state.step === 3) {
      track("checkout_payment_step", { value: getTotal() });
    }
  }

  function setStatus(message, isError = false) {
    if (!statusBox) return;
    statusBox.classList.remove("hidden", "error");
    if (isError) statusBox.classList.add("error");
    statusBox.innerHTML = message;
    statusBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideStatus() {
    if (!statusBox) return;
    statusBox.classList.add("hidden");
    statusBox.classList.remove("error");
  }

  function fillInstallments() {
    if (!installments) return;
    const max = Number(config.product?.installmentsMax || 1);
    const base = Number(config.product?.basePrice || 0);
    installments.innerHTML = "";
    for (let i = 1; i <= max; i++) {
      const option = document.createElement("option");
      option.value = String(i);
      const value = i === 1 ? base : (base / i);
      option.textContent = i === 1
        ? `1x de ${money(base)} (à vista)`
        : `${i}x de ${money(value)} sem juros`;
      installments.appendChild(option);
    }
  }

  function applyDocumentMask() {
    const type = documentType.value;
    documentLabel.textContent = type;
    const digits = documentInput.value.replace(/\D/g, "");

    if (type === "CNPJ") {
      documentInput.placeholder = "00.000.000/0000-00";
      documentInput.value = digits
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2")
        .slice(0, 18);
    } else {
      documentInput.placeholder = "000.000.000-00";
      documentInput.value = digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1-$2")
        .slice(0, 14);
    }
  }

  function applyCardNumberMask() {
    const field = form.querySelector("input[name='cardNumber']");
    if (!field) return;
    const digits = field.value.replace(/\D/g, "").slice(0, 16);
    field.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  }

  function applyCardExpiryMask() {
    const field = form.querySelector("input[name='cardExpiry']");
    if (!field) return;
    const digits = field.value.replace(/\D/g, "").slice(0, 4);
    field.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  }

  function isApplePayAvailable() {
    if (typeof window.ApplePaySession === "undefined") return false;
    try {
      return window.ApplePaySession.canMakePayments();
    } catch {
      return false;
    }
  }

  /** Exibe Apple Pay só em dispositivos compatíveis; roda no carregamento da página. */
  function initApplePayVisibility() {
    if (!applePayOption) return;
    const available = isApplePayAvailable();
    if (available) {
      applePayOption.classList.remove("hidden");
    } else {
      applePayOption.classList.add("hidden");
      const radio = applePayOption.querySelector("input[value='apple_pay']");
      if (radio?.checked) {
        const cc = form.querySelector("input[name='paymentMethod'][value='credit_card']");
        if (cc) cc.checked = true;
        state.paymentMethod = "credit_card";
      }
    }
  }

  function updatePaymentMethodUI() {
    const selected =
      form.querySelector("input[name='paymentMethod']:checked")?.value || "credit_card";
    state.paymentMethod = selected;

    document.querySelectorAll(".pay-option").forEach((el) => {
      if (el.classList.contains("hidden")) return;
      const radio = el.querySelector("input");
      el.classList.toggle("is-active", radio && radio.value === selected);
    });

    creditCardFields.classList.toggle("hidden", selected !== "credit_card");
    pixFields.classList.toggle("hidden", selected !== "pix");
    applePayFields.classList.toggle("hidden", selected !== "apple_pay");
  }

  // ─── Validação ────────────────────────────────────────────────────────────────

  function showFieldError(field, message) {
    field.classList.add("has-error");
    let err = field.parentElement.querySelector(".field-error");
    if (!err) {
      err = document.createElement("span");
      err.className = "field-error";
      field.parentElement.appendChild(err);
    }
    err.textContent = message;
    field.focus();
  }

  function clearFieldErrors() {
    form.querySelectorAll(".has-error").forEach((el) => el.classList.remove("has-error"));
    form.querySelectorAll(".field-error").forEach((el) => el.remove());
  }

  function validateStep(step) {
    clearFieldErrors();

    if (step === 1) {
      const nameField = form.querySelector("input[name='name']");
      const emailField = form.querySelector("input[name='email']");
      const phoneField = form.querySelector("input[name='phone']");
      const documentField = form.querySelector("input[name='document']");
      const lgpdField = form.querySelector("input[name='lgpd']");

      if (!nameField.value.trim() || nameField.value.trim().length < 3) {
        setStatus("Informe seu nome completo.", true);
        showFieldError(nameField, "Nome obrigatório");
        return false;
      }

      if (!isValidEmail(emailField.value)) {
        setStatus("Informe um email válido (ex: voce@clinica.com.br).", true);
        showFieldError(emailField, "Email inválido");
        return false;
      }

      const phoneDigits = phoneField.value.replace(/\D/g, "");
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        setStatus("Informe um WhatsApp válido com DDD.", true);
        showFieldError(phoneField, "Telefone inválido");
        return false;
      }

      const docType = documentType.value;
      const docValue = documentField.value;
      if (docType === "CPF" && !isValidCPF(docValue)) {
        setStatus("CPF inválido. Verifique os dígitos.", true);
        showFieldError(documentField, "CPF inválido");
        return false;
      }
      if (docType === "CNPJ" && !isValidCNPJ(docValue)) {
        setStatus("CNPJ inválido. Verifique os dígitos.", true);
        showFieldError(documentField, "CNPJ inválido");
        return false;
      }

      if (!lgpdField.checked) {
        setStatus("Aceite os termos LGPD para continuar.", true);
        return false;
      }

      hideStatus();
      track("checkout_step_1_complete", { value: getTotal() });
      return true;
    }

    if (step === 2) {
      hideStatus();
      track("checkout_step_2_complete", {
        bumps_selected: state.bumps.filter((b) => b.selected).map((b) => b.id),
        value: getTotal()
      });
      return true;
    }

    if (step === 3 && state.paymentMethod === "credit_card") {
      const cardHolder = form.querySelector("input[name='cardHolder']");
      const cardNumber = form.querySelector("input[name='cardNumber']");
      const cardExpiry = form.querySelector("input[name='cardExpiry']");
      const cardCvv = form.querySelector("input[name='cardCvv']");

      if (!cardHolder.value.trim()) {
        setStatus("Informe o nome impresso no cartão.", true);
        showFieldError(cardHolder, "Obrigatório");
        return false;
      }
      const cardDigits = cardNumber.value.replace(/\D/g, "");
      if (cardDigits.length < 13 || cardDigits.length > 19) {
        setStatus("Número de cartão inválido.", true);
        showFieldError(cardNumber, "Número inválido");
        return false;
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry.value.trim())) {
        setStatus("Validade inválida. Use o formato MM/AA.", true);
        showFieldError(cardExpiry, "Formato MM/AA");
        return false;
      }
      const cvvDigits = cardCvv.value.replace(/\D/g, "");
      if (cvvDigits.length < 3 || cvvDigits.length > 4) {
        setStatus("CVV inválido.", true);
        showFieldError(cardCvv, "CVV inválido");
        return false;
      }
    }

    hideStatus();
    return true;
  }

  // ─── Rascunho — somente dados não-sensíveis, sessionStorage ──────────────────

  const DRAFT_KEY = "co_draft_" + (config.product?.id || "product");

  function saveDraft() {
    // SEGURANÇA: Nunca salvar CPF/CNPJ, CVV ou dados de cartão.
    // sessionStorage é automaticamente limpo ao fechar a aba.
    const payload = {
      step: state.step,
      paymentMethod: state.paymentMethod,
      bumps: state.bumps.map((b) => ({ id: b.id, selected: b.selected })),
      customer: {
        name: form.name?.value || "",
        email: form.email?.value || ""
        // Telefone e documento intencionalmente omitidos por LGPD/privacidade
      },
      utm: state.utm,
      ts: Date.now()
    };

    sessionStorage.removeItem(DRAFT_KEY); // limpa anterior antes de salvar
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));

    // Persiste rascunho no backend (email + bumps = suficiente para recuperação)
    const saveDraftEndpoint = resolveEndpoint(config.endpoints?.saveDraft);
    if (saveDraftEndpoint) {
      fetch(saveDraftEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload })
      }).catch(() => {}); // silencioso — draft é best-effort
    }
  }

  function loadDraft() {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw);

      // Descarta drafts com mais de 2 horas
      if (draft.ts && Date.now() - draft.ts > 2 * 60 * 60 * 1000) {
        sessionStorage.removeItem(DRAFT_KEY);
        return;
      }

      if (draft?.customer) {
        if (form.name) form.name.value = draft.customer.name || "";
        if (form.email) form.email.value = draft.customer.email || "";
      }

      // Não restaurar seleção de order bumps do rascunho — sempre começar sem adicionais no carrinho.

      if (draft?.paymentMethod) {
        const radio = form.querySelector(
          `input[name='paymentMethod'][value='${draft.paymentMethod}']`
        );
        const isAppleDraft = draft.paymentMethod === "apple_pay";
        const appleRowVisible =
          applePayOption && !applePayOption.classList.contains("hidden");
        if (radio && (!isAppleDraft || appleRowVisible)) {
          radio.checked = true;
        } else {
          const cc = form.querySelector("input[name='paymentMethod'][value='credit_card']");
          if (cc) cc.checked = true;
        }
      }

      applyDocumentMask();
      updatePaymentMethodUI();
      renderBumps();
      renderSummary();
    } catch (_) {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  }

  // ─── Timer de sessão ──────────────────────────────────────────────────────────

  function startTimer() {
    if (!topTimer) return;

    const tick = () => {
      state.timeLeft = Math.max(0, state.timeLeft - 1);
      const mm = String(Math.floor(state.timeLeft / 60)).padStart(2, "0");
      const ss = String(state.timeLeft % 60).padStart(2, "0");
      topTimer.textContent = `${mm}:${ss}`;

      if (state.timeLeft === 0) {
        setStatus(
          "Tempo da sessão encerrado. <a href='checkout.html'>Clique aqui para reiniciar</a>.",
          true
        );
        if (submitBtn) submitBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
      }
    };

    setInterval(tick, 1000);
  }

  function sanitizeDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  // ─── Submissão segura ─────────────────────────────────────────────────────────

  async function submitCheckout(e) {
    e.preventDefault();

    if (!validateStep(3)) return;

    const selectedBumps = state.bumps
      .filter((b) => b.selected)
      .map((b) => ({ product_id: b.id, quantity: 1, amount: b.price }));

    // SEGURANÇA: Dados de cartão NUNCA são enviados em plaintext.
    // Em produção, utilize Stripe.js (stripe.createPaymentMethod) ou
    // MercadoPago.js (mp.createCardToken) para obter um token seguro.
    // O token (nunca os dados brutos) é enviado ao backend.
    const payload = {
      customer: {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: sanitizeDigits(form.phone.value),
        cpf: sanitizeDigits(form.document.value),
        documentType: form.documentType.value,
        companyName: form.companyName?.value.trim() || null
      },
      amount: getTotal(),
      payment_method: state.paymentMethod,
      idempotencyKey: state.idempotencyKey,
      installments: Number(form.installments?.value || 1),
      order_bumps: selectedBumps,
      utm_params: {
        utm_source: state.utm.utm_source || null,
        utm_medium: state.utm.utm_medium || null,
        utm_campaign: state.utm.utm_campaign || null,
        produto: state.utm.produto || null
      }
      // cardData omitido intencionalmente — tokenização via SDK do gateway
    };

    const endpoint =
      state.paymentMethod === "apple_pay"
        ? resolveEndpoint(config.gateways?.stripe?.endpoint)
        : resolveEndpoint(config.gateways?.mercadopago?.endpoint);

    if (!endpoint) {
      setStatus("Endpoint de pagamento não configurado. Tente novamente.", true);
      return;
    }

    // Desabilita botão para prevenir duplo clique
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Processando…";
    }

    setStatus("Processando seu pedido…", false);

    try {
      track("purchase_attempt", {
        value: payload.amount,
        payment_method: payload.payment_method,
        bumps_count: selectedBumps.length,
        currency: "BRL"
      });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `Erro ${res.status} ao processar pedido`);
      }

      // Limpa sessão após compra confirmada
      sessionStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(IDEM_KEY);

      track("purchase", {
        value: payload.amount,
        order_id: data.order_id || data.orderId || "",
        payment_method: payload.payment_method,
        currency: "BRL"
      });

      const orderId = data.order_id || data.orderId || "";
      setStatus(
        `✅ <strong>Compra confirmada!</strong><br>
        Pedido <strong>${orderId}</strong> registrado.<br>
        Nosso time entrará em contato via WhatsApp e email em até 1 hora para iniciar o briefing.`,
        false
      );

      // Redireciona para página de obrigado se configurado
      const successUrl = config.successUrl || "";
      if (successUrl) {
        setTimeout(() => {
          window.location.href = successUrl + (orderId ? `?order_id=${orderId}` : "");
        }, 3000);
      }
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "CONFIRMAR COMPRA E INICIAR PROJETO";
      }
      setStatus(
        `❌ <strong>Não foi possível finalizar agora.</strong><br>
        ${err.message}<br><br>
        <a href="https://wa.me/5521979863949" target="_blank" rel="noopener noreferrer">
          Fale conosco no WhatsApp
        </a> e resolveremos imediatamente.`,
        true
      );
      saveDraft();
    }
  }

  // ─── Eventos ──────────────────────────────────────────────────────────────────

  function bindEvents() {
    documentType.addEventListener("change", applyDocumentMask);
    documentInput.addEventListener("input", applyDocumentMask);

    const cardNumberField = form.querySelector("input[name='cardNumber']");
    const cardExpiryField = form.querySelector("input[name='cardExpiry']");
    if (cardNumberField) cardNumberField.addEventListener("input", applyCardNumberMask);
    if (cardExpiryField) cardExpiryField.addEventListener("input", applyCardExpiryMask);

    // Validação inline on blur
    const emailField = form.querySelector("input[name='email']");
    if (emailField) {
      emailField.addEventListener("blur", () => {
        if (emailField.value && !isValidEmail(emailField.value)) {
          showFieldError(emailField, "Email inválido");
        }
      });
    }

    form.querySelectorAll("input[name='paymentMethod']").forEach((radio) => {
      radio.addEventListener("change", updatePaymentMethodUI);
    });

    prevBtn.addEventListener("click", () => {
      state.step = Math.max(1, state.step - 1);
      renderSteps();
      saveDraft();
    });

    nextBtn.addEventListener("click", () => {
      if (!validateStep(state.step)) return;
      state.step = Math.min(3, state.step + 1);
      renderSteps();
      saveDraft();
    });

    stepButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const requested = Number(btn.getAttribute("data-step"));
        if (requested > state.step && !validateStep(state.step)) return;
        state.step = requested;
        renderSteps();
      });
    });

    form.addEventListener("submit", submitCheckout);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    initApplePayVisibility();
    fillInstallments();
    renderBumps();
    renderSummary();
    renderSteps();
    applyDocumentMask();
    updatePaymentMethodUI();
    loadDraft();
    bindEvents();
    startTimer();

    track("checkout_view", {
      product_name: config.product?.name,
      value: config.product?.basePrice || 0,
      currency: "BRL"
    });
  }

  init();
})();
