/* Trance Logistics — shared front-end logic
   Reads content.json and renders it into whichever page is loaded. */

(function () {
  const CONTENT_URL = "content.json";

  // Fixed layout positions for known port codes, used by the hero route map.
  // Abstract network diagram, not a real projection.
  const NODE_POS = {
    KLA: { x: 90,  y: 250, label: "Kampala" },
    MBA: { x: 190, y: 300, label: "Mombasa" },
    DXB: { x: 340, y: 150, label: "Dubai" },
    SHA: { x: 560, y: 110, label: "Shanghai" },
    RTM: { x: 300, y: 40,  label: "Rotterdam" },
  };

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  async function loadContent() {
    const res = await fetch(CONTENT_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("content.json not found");
    return res.json();
  }

  function initNav() {
    const toggle = document.querySelector(".nav-toggle");
    const links = document.querySelector(".nav-links");
    if (!toggle || !links) return;
    toggle.addEventListener("click", () => links.classList.toggle("open"));

    // mark active link
    const path = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a").forEach((a) => {
      if (a.getAttribute("href") === path) a.classList.add("active");
    });
  }

  function initReveal() {
    const targets = document.querySelectorAll(".reveal, .service-card");
    if (!("IntersectionObserver" in window)) {
      targets.forEach((t) => t.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((t) => io.observe(t));
  }

  function animateCount(elNode, targetText) {
    const match = targetText.match(/^([\d,]+)(.*)$/);
    if (!match) {
      elNode.textContent = targetText;
      return;
    }
    const target = parseInt(match[1].replace(/,/g, ""), 10);
    const suffix = match[2] || "";
    const dur = 1100;
    const start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = Math.round(target * eased);
      elNode.textContent = current.toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------------- Renderers (each is a no-op if its container isn't on the page) ---------------- */

  function renderSiteBasics(data) {
    document.querySelectorAll("[data-site-name]").forEach((n) => (n.textContent = data.site.name));
    document.querySelectorAll("[data-site-phone]").forEach((n) => (n.textContent = data.site.phone));
    document.querySelectorAll("[data-site-email]").forEach((n) => (n.textContent = data.site.email));
    document.querySelectorAll("[data-site-address]").forEach((n) => (n.textContent = data.site.address));
    document.querySelectorAll("[data-site-mark]").forEach((n) => (n.textContent = data.site.name.split(" ").map(w => w[0]).join("").slice(0,2)));
  }

  function renderHero(data) {
    const wrap = document.querySelector("[data-hero]");
    if (!wrap) return;
    wrap.querySelector("[data-hero-eyebrow]").textContent =
      "B/L NO. " + data.site.bl_number + " · " + data.hero.eyebrow;
    wrap.querySelector("[data-hero-headline]").textContent = data.hero.headline;
    wrap.querySelector("[data-hero-sub]").textContent = data.hero.sub;

    const svgHost = wrap.querySelector("[data-hero-map]");
    if (svgHost) svgHost.innerHTML = buildRouteMapSVG(data.hero.routes);
  }

  function buildRouteMapSVG(routes) {
    const nodes = routes.map((r) => ({ ...NODE_POS[r.code], code: r.code })).filter((n) => n.x);
    if (!nodes.length) return "";

    let grid = "";
    for (let x = 0; x <= 640; x += 80) grid += `<line class="route-grid-line" x1="${x}" y1="0" x2="${x}" y2="360"/>`;
    for (let y = 0; y <= 360; y += 60) grid += `<line class="route-grid-line" x1="0" y1="${y}" x2="640" y2="${y}"/>`;

    let paths = "";
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      const midx = (a.x + b.x) / 2, midy = Math.min(a.y, b.y) - 40;
      paths += `<path class="route-path ${i % 2 ? "alt" : ""}" d="M${a.x},${a.y} Q${midx},${midy} ${b.x},${b.y}"/>`;
    }

    let nodeMarks = "";
    nodes.forEach((n, i) => {
      nodeMarks += `
        <g>
          <circle class="route-node-ring ${i % 3 === 1 ? "t2" : i % 3 === 2 ? "t3" : ""}" cx="${n.x}" cy="${n.y}" r="6"/>
          <circle class="route-node" cx="${n.x}" cy="${n.y}" r="3.5"/>
          <text class="route-label" x="${n.x + 9}" y="${n.y + 4}">${n.code}</text>
        </g>`;
    });

    return `<svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid meet">${grid}${paths}${nodeMarks}</svg>`;
  }

  function renderStats(data) {
    const host = document.querySelector("[data-stats]");
    if (!host) return;
    host.innerHTML = "";
    data.stats.forEach((s) => {
      const stat = el("div", "stat");
      stat.innerHTML = `<div class="value" data-count="${s.value}">0</div><div class="label">${s.label}</div>`;
      host.appendChild(stat);
    });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            host.querySelectorAll("[data-count]").forEach((n) => animateCount(n, n.getAttribute("data-count")));
            io.disconnect();
          }
        });
      }, { threshold: 0.4 });
      io.observe(host);
    } else {
      host.querySelectorAll("[data-count]").forEach((n) => (n.textContent = n.getAttribute("data-count")));
    }
  }

  const ICONS = {
    ship: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 17l1.5 3h15L21 17"/><path d="M5 17l1-8h12l1 8"/><path d="M9 9V5h6v4"/></svg>`,
    plane: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 13l9-2 3-8 2 1-2 7 6 2v2l-6-1-2 6h-2l1-6-6 1z"/></svg>`,
    truck: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="1" y="8" width="12" height="8"/><path d="M13 11h4l4 3v2h-8z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>`,
    warehouse: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 10l10-6 10 6"/><path d="M4 10v10h16V10"/><path d="M9 20v-6h6v6"/></svg>`,
    stamp: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="3" width="14" height="10" rx="1"/><path d="M9 13l-2 8h10l-2-8"/><path d="M8 7h8"/></svg>`,
    crane: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 21V5l14 4"/><path d="M18 9v4"/><path d="M4 21h6"/><path d="M14 21l1-6"/></svg>`,
  };

  function renderServices(data, opts = {}) {
    const host = document.querySelector("[data-services]");
    if (!host) return;
    host.innerHTML = "";
    const list = opts.limit ? data.services.slice(0, opts.limit) : data.services;
    list.forEach((s) => {
      const card = el("div", "service-card reveal");
      card.id = s.name.toLowerCase().split(" ")[0];
      card.innerHTML = `
        <div class="code mono">${s.code}</div>
        <div class="icon" style="color:var(--teal)">${ICONS[s.icon] || ""}</div>
        <h3>${s.name}</h3>
        <p>${s.desc}</p>`;
      host.appendChild(card);
    });
  }

  function renderLanes(data) {
    const host = document.querySelector("[data-lanes]");
    if (!host) return;
    host.innerHTML = "";
    data.lanes.forEach((l) => {
      const row = el("tr");
      row.innerHTML = `<td>${l.origin}</td><td>${l.destination}</td><td><span class="tag">${l.mode}</span></td><td>${l.transit}</td>`;
      host.appendChild(row);
    });
  }

  function renderTestimonials(data) {
    const host = document.querySelector("[data-testimonials]");
    const dotsHost = document.querySelector("[data-t-dots]");
    if (!host) return;
    host.innerHTML = "";
    if (dotsHost) dotsHost.innerHTML = "";
    data.testimonials.forEach((t, i) => {
      const slide = el("div", "t-slide" + (i === 0 ? " active" : ""));
      slide.innerHTML = `<blockquote>&ldquo;${t.quote}&rdquo;</blockquote><div class="attrib">${t.author} — ${t.company}</div>`;
      host.appendChild(slide);
      if (dotsHost) {
        const dot = el("button", i === 0 ? "active" : "");
        dot.setAttribute("aria-label", "Show testimonial " + (i + 1));
        dot.addEventListener("click", () => showSlide(i));
        dotsHost.appendChild(dot);
      }
    });

    let current = 0;
    let timer;
    function showSlide(i) {
      const slides = host.querySelectorAll(".t-slide");
      const dots = dotsHost ? dotsHost.querySelectorAll("button") : [];
      slides.forEach((s, idx) => s.classList.toggle("active", idx === i));
      dots.forEach((d, idx) => d.classList.toggle("active", idx === i));
      current = i;
    }
    function next() {
      showSlide((current + 1) % data.testimonials.length);
    }
    if (data.testimonials.length > 1) {
      timer = setInterval(next, 5500);
    }
  }

  function renderOffices(data) {
    const host = document.querySelector("[data-offices]");
    if (!host) return;
    host.innerHTML = "";
    data.offices.forEach((o) => {
      const card = el("div", "office-card reveal");
      card.innerHTML = `<div class="city">${o.city}</div><div class="coords mono">${o.coords}</div><div class="role">${o.role} · ${o.country}</div>`;
      host.appendChild(card);
    });
  }

  function renderAbout(data) {
    const host = document.querySelector("[data-about]");
    if (!host) return;
    host.querySelector("[data-about-eyebrow]").textContent = data.about.eyebrow;
    host.querySelector("[data-about-headline]").textContent = data.about.headline;
    host.querySelector("[data-about-story]").textContent = data.about.story;
    host.querySelector("[data-about-mission]").textContent = data.about.mission;

    const valuesHost = document.querySelector("[data-values]");
    if (valuesHost) {
      valuesHost.innerHTML = "";
      data.about.values.forEach((v) => {
        const card = el("div", "value-card reveal");
        card.innerHTML = `<h3>${v.title}</h3><p>${v.desc}</p>`;
        valuesHost.appendChild(card);
      });
    }
  }

  function renderContactInfo(data) {
    const host = document.querySelector("[data-contact-info]");
    if (!host) return;
    host.innerHTML = `
      <div class="row"><div class="label">Email</div><div>${data.site.email}</div></div>
      <div class="row"><div class="label">Phone</div><div>${data.site.phone}</div></div>
      <div class="row"><div class="label">Head office</div><div>${data.site.address}</div></div>
      <div class="row"><div class="label">Hours</div><div>Operations desk staffed 24/7</div></div>`;
  }

  function renderFooter(data) {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    const companyHost = document.querySelector("[data-footer-company]");
    if (companyHost) {
      companyHost.innerHTML = data.footerNav.company
        .map((l) => `<li><a href="${l.href}">${l.label}</a></li>`)
        .join("");
    }
    const servicesHost = document.querySelector("[data-footer-services]");
    if (servicesHost) {
      servicesHost.innerHTML = data.footerNav.services
        .map((l) => `<li><a href="${l.href}">${l.label}</a></li>`)
        .join("");
    }
    const addr = document.querySelector("[data-footer-address]");
    if (addr) addr.textContent = data.site.address;
  }

  /* ---------------- Boot ---------------- */

  document.addEventListener("DOMContentLoaded", async () => {
    initNav();
    try {
      const data = await loadContent();
      renderSiteBasics(data);
      renderHero(data);
      renderStats(data);
      renderServices(data, { limit: document.body.dataset.serviceLimit ? Number(document.body.dataset.serviceLimit) : undefined });
      renderLanes(data);
      renderTestimonials(data);
      renderOffices(data);
      renderAbout(data);
      renderContactInfo(data);
      renderFooter(data);
      window.__TL_CONTENT__ = data; // exposed for track.html's demo lookup
    } catch (err) {
      console.error("Failed to load content.json", err);
    }
    initReveal();
    document.dispatchEvent(new Event("tl:content-ready"));
  });
})();
