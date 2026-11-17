(() => {
  const WA = "966566566977";
  // WhatsApp links with a prefilled message per button
  document.querySelectorAll("[data-wa]").forEach((a) => {
    a.href = "https://wa.me/" + WA + "?text=" + encodeURIComponent(a.dataset.wa);
    a.target = "_blank";
    a.rel = "noopener";
  });

  const yr = document.getElementById("yr");
  if (yr) yr.textContent = String(new Date().getFullYear());

  // chat demo: reveal messages one by one, calm pace, loop
  const chat = document.getElementById("chat");
  if (chat) {
    const msgs = [...chat.querySelectorAll(".msg")];
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) msgs.forEach((m) => m.classList.add("show"));
    else {
      let i = 0, timer = 0, visible = false;
      const step = () => {
        if (!visible) return;
        if (i < msgs.length) { msgs[i++].classList.add("show"); timer = setTimeout(step, 1600); }
        else { timer = setTimeout(() => { msgs.forEach((m) => m.classList.remove("show")); i = 0; timer = setTimeout(step, 900); }, 4200); }
      };
      new IntersectionObserver((e) => {
        visible = e[e.length - 1].isIntersecting;
        clearTimeout(timer);
        if (visible) timer = setTimeout(step, 500);
      }).observe(chat);
    }
  }

  // savings calculator: user's own numbers, honest difference
  const n = document.getElementById("c-n");
  if (n) {
    const s = document.getElementById("c-s"), p = document.getElementById("c-p");
    const fmt = (v) => new Intl.NumberFormat("ar-SA-u-nu-latn").format(Math.round(v)) + " ريال";
    const calc = () => {
      const count = Number(n.value) || 0;
      const salary = Math.max(0, Number(s.value) || 0);
      const plan = Number(p.value) || 390;
      const cost = count * salary;
      document.getElementById("c-n-out").textContent = String(count);
      document.getElementById("c-cost").textContent = fmt(cost);
      document.getElementById("c-plan").textContent = fmt(plan);
      document.getElementById("c-diff").textContent = (cost - plan < 0 ? "−" : "") + fmt(Math.abs(cost - plan));
    };
    [n, s, p].forEach((el) => el.addEventListener("input", calc));
    calc();
  }
})();
