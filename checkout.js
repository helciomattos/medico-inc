(function () {
  const config = window.CHECKOUT_CONFIG || {};

  const state = {
    step: 1,
    timeLeft: 15 * 60,
    bumps: (config.orderBumps || []).map((b) => ({ ...b, selected: !!b.selectedByDefault })),
    paymentMethod: "credit_card",
    idempotencyKey: (window.crypto && crypto.randomUUID && crypto.randomUUID()) || `id-${Date.now()}`,
    utm: Object.fromEntries(new URLSearchParams(window.location.search).entries())
  };
  const localApiBase = String(
    config.apiBase ||
      ((window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost")
        ? "http://127.0.0.1:8787"
        : "")
  ).replace(/\/$/, "");

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

  const money = (value) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  function track(event, payload = {}) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...payload });
    console.log(`[TRACK] ${event}`, payload);
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

  function renderBumps() {
    if (!bumpList) return;
    bumpList.innerHTML = "";

    state.bumps.forEach((bump, index) => {
      const row = document.createElement("label");
      row.className = `bump-item ${bump.selected ? "selected" : ""}`;
      row.innerHTML = `
        <input type="checkbox" ${bump.selected ? "checked" : ""} data-bump-index="${index}" />
        <div class="meta">
          <h4>${bump.name}</h4>
          <p>${bump.description}</p>
          <strong>+ ${money(Number(bump.price || 0))}</strong>
        </div>
      `;
      bumpList.appendChild(row);
    });

    bumpList.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const i = Number(e.target.getAttribute("data-bump-index"));
        state.bumps[i].selected = e.target.checked;
        renderBumps();
        renderSummary();
        track("AddToCart", {
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
    nextBtn.classList.toggle("hidden", state.step === 3);
    submitBtn.classList.toggle("hidden", state.step !== 3);

    if (state.step === 3) {
      track("AddPaymentInfo", { value: getTotal() });
    }
  }

  function setStatus(message, isError = false) {
    if (!statusBox) return;
    statusBox.classList.remove("hidden", "error");
    if (isError) statusBox.classList.add("error");
    statusBox.innerHTML = message;
  }

  function hideStatus() {
    if (!statusBox) return;
    statusBox.classList.add("hidden");
    statusBox.classList.remove("error");
  }

  function fillInstallments() {
    if (!installments) return;
    const max = Number(config.product?.installmentsMax || 1);
    installments.innerHTML = "";
    for (let i = 1; i <= max; i += 1) {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = `${i}x`;
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

  function updatePaymentMethodUI() {
    const selected = form.querySelector("input[name='paymentMethod']:checked")?.value || "credit_card";
    state.paymentMethod = selected;

    document.querySelectorAll(".pay-option").forEach((el) => {
      const radio = el.querySelector("input");
      el.classList.toggle("is-active", radio && radio.value === selected);
    });

    creditCardFields.classList.toggle("hidden", selected !== "credit_card");
    pixFields.classList.toggle("hidden", selected !== "pix");
    applePayFields.classList.toggle("hidden", selected !== "apple_pay");
  }

  function validateStep(step) {
    if (step === 1) {
      const required = [
        "input[name='name']",
        "input[name='email']",
        "input[name='phone']",
        "input[name='document']",
        "input[name='lgpd']"
      ];

      for (const selector of required) {
        const field = form.querySelector(selector);
        if (!field) continue;
        if (field.type === "checkbox" && !field.checked) {
          setStatus("Aceite os termos LGPD para continuar.", true);
          return false;
        }
        if (field.type !== "checkbox" && !String(field.value || "").trim()) {
          setStatus("Preencha os campos obrigatórios para avançar.", true);
          field.focus();
          return false;
        }
      }

      hideStatus();
      track("InitiateCheckout", { value: getTotal() });
      return true;
    }

    if (step === 3 && state.paymentMethod === "credit_card") {
      const ccRequired = [
        "input[name='cardHolder']",
        "input[name='cardNumber']",
        "input[name='cardExpiry']",
        "input[name='cardCvv']"
      ];

      for (const selector of ccRequired) {
        const field = form.querySelector(selector);
        if (!String(field?.value || "").trim()) {
          setStatus("Preencha os dados do cartão para continuar.", true);
          field?.focus();
          return false;
        }
      }
    }

    hideStatus();
    return true;
  }

  function saveDraft() {
    const payload = {
      step: state.step,
      paymentMethod: state.paymentMethod,
      bumps: state.bumps.map((b) => ({ id: b.id, selected: b.selected })),
      customer: {
        name: form.name?.value || "",
        email: form.email?.value || "",
        phone: form.phone?.value || "",
        documentType: form.documentType?.value || "CPF",
        document: form.document?.value || "",
        companyName: form.companyName?.value || ""
      },
      utm: state.utm,
      ts: Date.now()
    };

    localStorage.setItem("checkout_site_medico_draft", JSON.stringify(payload));
  }

  function loadDraft() {
    const raw = localStorage.getItem("checkout_site_medico_draft");
    if (!raw) return;

    try {
      const draft = JSON.parse(raw);
      if (draft?.customer) {
        form.name.value = draft.customer.name || "";
        form.email.value = draft.customer.email || "";
        form.phone.value = draft.customer.phone || "";
        form.documentType.value = draft.customer.documentType || "CPF";
        form.document.value = draft.customer.document || "";
        form.companyName.value = draft.customer.companyName || "";
      }

      if (Array.isArray(draft?.bumps)) {
        state.bumps = state.bumps.map((b) => {
          const found = draft.bumps.find((x) => x.id === b.id);
          return found ? { ...b, selected: !!found.selected } : b;
        });
      }

      if (draft?.paymentMethod) {
        const radio = form.querySelector(`input[name='paymentMethod'][value='${draft.paymentMethod}']`);
        if (radio) radio.checked = true;
      }

      applyDocumentMask();
      updatePaymentMethodUI();
      renderBumps();
      renderSummary();
    } catch (err) {
      console.warn("Falha ao carregar rascunho do checkout", err);
    }
  }

  function startTimer() {
    const tick = () => {
      state.timeLeft = Math.max(0, state.timeLeft - 1);
      const mm = String(Math.floor(state.timeLeft / 60)).padStart(2, "0");
      const ss = String(state.timeLeft % 60).padStart(2, "0");
      topTimer.textContent = `${mm}:${ss}`;

      if (state.timeLeft === 0) {
        setStatus("Tempo promocional encerrado. Recarregue para reiniciar a sessão.", true);
      }
    };

    setInterval(tick, 1000);
  }

  function sanitizeDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  async function submitCheckout(e) {
    e.preventDefault();

    if (!validateStep(3)) return;

    const selectedBumps = state.bumps
      .filter((b) => b.selected)
      .map((b) => ({ product_id: b.id, quantity: 1, amount: b.price }));

    const payload = {
      customer: {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: sanitizeDigits(form.phone.value),
        cpf: sanitizeDigits(form.document.value),
        documentType: form.documentType.value,
        companyName: form.companyName.value.trim() || null
      },
      amount: getTotal(),
      payment_method: state.paymentMethod,
      idempotencyKey: state.idempotencyKey,
      installments: Number(form.installments.value || 1),
      order_bumps: selectedBumps,
      utm_params: {
        utm_source: state.utm.utm_source || null,
        utm_medium: state.utm.utm_medium || null,
        utm_campaign: state.utm.utm_campaign || null,
        produto: state.utm.produto || null
      }
    };

    if (state.paymentMethod === "credit_card") {
      payload.cardData = {
        holder: form.cardHolder.value.trim(),
        number: form.cardNumber.value.replace(/\s+/g, ""),
        expiry: form.cardExpiry.value.trim(),
        cvv: form.cardCvv.value.trim()
      };
    }

    const endpoint =
      state.paymentMethod === "apple_pay"
        ? resolveEndpoint(config.gateways?.stripe?.endpoint)
        : resolveEndpoint(config.gateways?.mercadopago?.endpoint);

    if (!endpoint) {
      setStatus("Endpoint de pagamento não configurado.", true);
      return;
    }

    setStatus("Processando pagamento...", false);

    try {
      track("PurchaseAttempt", {
        value: payload.amount,
        payment_method: payload.payment_method,
        bumps_count: selectedBumps.length
      });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao processar checkout");
      }

      track("Purchase", {
        value: payload.amount,
        order_id: data.order_id || data.orderId || "sem-id",
        payment_method: payload.payment_method
      });

      localStorage.removeItem("checkout_site_medico_draft");
      setStatus(
        `Compra confirmada com sucesso.<br><strong>Pedido:</strong> ${
          data.order_id || data.orderId || "gerado"
        }<br>Nosso time enviará briefing e próximos passos no WhatsApp e email.`,
        false
      );
    } catch (err) {
      setStatus(
        `Não foi possível finalizar automaticamente agora.<br><strong>Detalhe:</strong> ${err.message}<br><br>Seu rascunho foi salvo.`,
        true
      );
      saveDraft();
    }
  }

  function bindEvents() {
    documentType.addEventListener("change", applyDocumentMask);
    documentInput.addEventListener("input", applyDocumentMask);

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
    form.addEventListener("input", saveDraft);
    form.addEventListener("change", saveDraft);
  }

  function init() {
    fillInstallments();
    renderBumps();
    renderSummary();
    renderSteps();
    applyDocumentMask();
    updatePaymentMethodUI();
    loadDraft();
    bindEvents();
    startTimer();

    track("ViewContent", {
      product_name: config.product?.name,
      value: config.product?.basePrice || 0,
      currency: "BRL"
    });
  }

  init();
})();
