/* Trance Logistics — Admin CMS
   Everything here runs client-side. The GitHub token you enter is kept in
   memory (or, if you opt in, localStorage on this device only) and is used
   solely to call api.github.com directly from your browser. It is never
   sent anywhere else. */

(function () {
  const API = "https://api.github.com";
  const CONTENT_PATH = "content.json";
  const ICON_OPTIONS = ["ship", "plane", "truck", "warehouse", "stamp", "crane"];
  const PORT_OPTIONS = ["KLA", "MBA", "DXB", "SHA", "RTM"];

  let state = { owner: "", repo: "", branch: "main", token: "", content: null, sha: null };

  /* ---------------- base64 helpers (UTF-8 safe) ---------------- */
  function b64Encode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode("0x" + p1)));
  }
  function b64Decode(str) {
    return decodeURIComponent(
      atob(str.replace(/\n/g, ""))
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  }

  /* ---------------- GitHub API ---------------- */
  async function ghRequest(path, options = {}) {
    const res = await fetch(`${API}/repos/${state.owner}/${state.repo}/${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${state.token}`,
        Accept: "application/vnd.github+json",
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `GitHub API error (${res.status})`);
    }
    return res.json();
  }

  async function ghGetFile(path) {
    return ghRequest(`contents/${path}?ref=${encodeURIComponent(state.branch)}`);
  }

  async function ghPutFile(path, base64Content, message, sha) {
    return ghRequest(`contents/${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        content: base64Content,
        branch: state.branch,
        ...(sha ? { sha } : {}),
      }),
    });
  }

  /* ---------------- Connect ---------------- */
  function setStatus(elId, msg, ok) {
    const e = document.getElementById(elId);
    e.textContent = msg;
    e.className = ok ? "status-ok" : "status-err";
  }

  document.getElementById("connect-btn").addEventListener("click", async () => {
    state.owner = document.getElementById("gh-owner").value.trim();
    state.repo = document.getElementById("gh-repo").value.trim();
    state.branch = document.getElementById("gh-branch").value.trim() || "main";
    state.token = document.getElementById("gh-token").value.trim();

    if (!state.owner || !state.repo || !state.token) {
      setStatus("connect-status", "Fill in owner, repo and token first.", false);
      return;
    }

    try {
      setStatus("connect-status", "Connecting…", true);
      const file = await ghGetFile(CONTENT_PATH);
      state.sha = file.sha;
      state.content = JSON.parse(b64Decode(file.content));

      if (document.getElementById("gh-remember").checked) {
        localStorage.setItem(
          "tl_admin_conn",
          JSON.stringify({ owner: state.owner, repo: state.repo, branch: state.branch, token: state.token })
        );
      }

      setStatus("connect-status", "Connected. Loaded content.json.", true);
      document.getElementById("app").style.display = "block";
      renderAll();
    } catch (err) {
      setStatus("connect-status", "Couldn't connect: " + err.message, false);
    }
  });

  // Auto-fill from a remembered connection, if any (still requires clicking Connect).
  window.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("tl_admin_conn");
    if (saved) {
      try {
        const c = JSON.parse(saved);
        document.getElementById("gh-owner").value = c.owner || "";
        document.getElementById("gh-repo").value = c.repo || "";
        document.getElementById("gh-branch").value = c.branch || "main";
        document.getElementById("gh-token").value = c.token || "";
        document.getElementById("gh-remember").checked = true;
      } catch (e) {}
    }
  });

  /* ---------------- Tabs ---------------- */
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "advanced") {
        document.getElementById("raw-json").value = JSON.stringify(state.content, null, 2);
      }
    });
  });

  /* ---------------- Field builders ---------------- */
  function fieldRow(label, value, onChange, type = "text") {
    const row = document.createElement("div");
    row.className = "field-row";
    const l = document.createElement("label");
    l.textContent = label;
    const input = document.createElement(type === "textarea" ? "textarea" : "input");
    input.value = value || "";
    input.addEventListener("input", () => onChange(input.value));
    row.appendChild(l);
    row.appendChild(input);
    return row;
  }

  function renderSimpleFields(containerId, obj, schema) {
    const host = document.getElementById(containerId);
    host.innerHTML = "";
    schema.forEach(({ key, label, type }) => {
      host.appendChild(fieldRow(label, obj[key], (v) => (obj[key] = v), type));
    });
  }

  function renderArrayList(containerId, arr, schema, opts = {}) {
    const host = document.getElementById(containerId);
    host.innerHTML = "";
    arr.forEach((item, idx) => {
      const card = document.createElement("div");
      card.className = "array-item";

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = "&times;";
      removeBtn.title = "Remove";
      removeBtn.addEventListener("click", () => {
        arr.splice(idx, 1);
        renderArrayList(containerId, arr, schema, opts);
      });
      card.appendChild(removeBtn);

      schema.forEach(({ key, label, type, options }) => {
        if (type === "select") {
          const row = document.createElement("div");
          row.className = "field-row";
          const l = document.createElement("label");
          l.textContent = label;
          const select = document.createElement("select");
          options.forEach((o) => {
            const opt = document.createElement("option");
            opt.value = o;
            opt.textContent = o;
            if (item[key] === o) opt.selected = true;
            select.appendChild(opt);
          });
          select.addEventListener("change", () => (item[key] = select.value));
          row.appendChild(l);
          row.appendChild(select);
          card.appendChild(row);
        } else {
          card.appendChild(fieldRow(label, item[key], (v) => (item[key] = v), type));
        }
      });

      host.appendChild(card);
    });
  }

  /* ---------------- Render everything ---------------- */
  function renderAll() {
    const c = state.content;

    renderSimpleFields("site-fields", c.site, [
      { key: "name", label: "Company name" },
      { key: "tagline", label: "Tagline" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
      { key: "bl_number", label: "B/L number" },
    ]);

    renderSimpleFields("hero-fields", c.hero, [
      { key: "eyebrow", label: "Eyebrow" },
      { key: "headline", label: "Headline" },
      { key: "sub", label: "Subhead", type: "textarea" },
    ]);
    const heroRoutesHost = document.createElement("div");
    heroRoutesHost.id = "hero-routes-list";
    document.getElementById("hero-fields").appendChild(heroRoutesHost);
    const addRouteBtn = document.createElement("button");
    addRouteBtn.className = "add-btn";
    addRouteBtn.textContent = "+ Add route point";
    addRouteBtn.addEventListener("click", () => {
      c.hero.routes.push({ code: "KLA", label: "" });
      renderArrayList("hero-routes-list", c.hero.routes, [
        { key: "code", label: "Port code", type: "select", options: PORT_OPTIONS },
        { key: "label", label: "City name" },
      ]);
    });
    document.getElementById("hero-fields").appendChild(addRouteBtn);
    renderArrayList("hero-routes-list", c.hero.routes, [
      { key: "code", label: "Port code", type: "select", options: PORT_OPTIONS },
      { key: "label", label: "City name" },
    ]);

    renderArrayList("stats-list", c.stats, [
      { key: "value", label: "Value" },
      { key: "label", label: "Label" },
    ]);
    document.getElementById("add-stat").onclick = () => {
      c.stats.push({ value: "", label: "" });
      renderArrayList("stats-list", c.stats, [
        { key: "value", label: "Value" },
        { key: "label", label: "Label" },
      ]);
    };

    const serviceSchema = [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "desc", label: "Description", type: "textarea" },
      { key: "icon", label: "Icon", type: "select", options: ICON_OPTIONS },
    ];
    renderArrayList("services-list", c.services, serviceSchema);
    document.getElementById("add-service").onclick = () => {
      c.services.push({ code: "", name: "", desc: "", icon: "ship" });
      renderArrayList("services-list", c.services, serviceSchema);
    };

    const laneSchema = [
      { key: "origin", label: "Origin" },
      { key: "destination", label: "Destination" },
      { key: "mode", label: "Mode" },
      { key: "transit", label: "Transit time" },
    ];
    renderArrayList("lanes-list", c.lanes, laneSchema);
    document.getElementById("add-lane").onclick = () => {
      c.lanes.push({ origin: "", destination: "", mode: "Ocean", transit: "" });
      renderArrayList("lanes-list", c.lanes, laneSchema);
    };

    const testimonialSchema = [
      { key: "quote", label: "Quote", type: "textarea" },
      { key: "author", label: "Author" },
      { key: "company", label: "Company" },
    ];
    renderArrayList("testimonials-list", c.testimonials, testimonialSchema);
    document.getElementById("add-testimonial").onclick = () => {
      c.testimonials.push({ quote: "", author: "", company: "" });
      renderArrayList("testimonials-list", c.testimonials, testimonialSchema);
    };

    const officeSchema = [
      { key: "city", label: "City" },
      { key: "country", label: "Country" },
      { key: "coords", label: "Coordinates" },
      { key: "role", label: "Role" },
    ];
    renderArrayList("offices-list", c.offices, officeSchema);
    document.getElementById("add-office").onclick = () => {
      c.offices.push({ city: "", country: "", coords: "", role: "" });
      renderArrayList("offices-list", c.offices, officeSchema);
    };

    renderSimpleFields("about-fields", c.about, [
      { key: "eyebrow", label: "Eyebrow" },
      { key: "headline", label: "Headline" },
      { key: "story", label: "Story", type: "textarea" },
      { key: "mission", label: "Mission", type: "textarea" },
    ]);
    const valueSchema = [
      { key: "title", label: "Title" },
      { key: "desc", label: "Description", type: "textarea" },
    ];
    renderArrayList("values-list", c.about.values, valueSchema);
    document.getElementById("add-value").onclick = () => {
      c.about.values.push({ title: "", desc: "" });
      renderArrayList("values-list", c.about.values, valueSchema);
    };

    document.getElementById("sha-indicator").textContent = "content.json · " + state.branch + " · " + state.sha.slice(0, 7);
  }

  /* ---------------- Raw JSON tab ---------------- */
  document.getElementById("apply-raw").addEventListener("click", () => {
    try {
      state.content = JSON.parse(document.getElementById("raw-json").value);
      renderAll();
      setStatus("save-status", "Raw JSON applied to form fields. Review the tabs, then Publish changes.", true);
    } catch (err) {
      setStatus("save-status", "That's not valid JSON: " + err.message, false);
    }
  });

  /* ---------------- Save ---------------- */
  document.getElementById("save-btn").addEventListener("click", async () => {
    try {
      setStatus("save-status", "Publishing…", true);
      const json = JSON.stringify(state.content, null, 2);
      const result = await ghPutFile(CONTENT_PATH, b64Encode(json), "Update site content via admin panel", state.sha);
      state.sha = result.content.sha;
      document.getElementById("sha-indicator").textContent = "content.json · " + state.branch + " · " + state.sha.slice(0, 7);
      setStatus("save-status", "Published. GitHub Pages will rebuild in about a minute — refresh the live site to see it.", true);
    } catch (err) {
      setStatus("save-status", "Couldn't publish: " + err.message, false);
    }
  });

  /* ---------------- Image upload ---------------- */
  document.getElementById("upload-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const resultBox = document.getElementById("upload-result");
    resultBox.style.display = "block";
    resultBox.innerHTML = `<span class="mono" style="color:var(--text-on-dark-muted); font-size:12px;">Uploading…</span>`;

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const safeName = Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9.\-_]/g, "");
      const path = "assets/uploads/" + safeName;
      const result = await ghPutFile(path, base64, "Upload image via admin panel");
      resultBox.innerHTML = `
        <div class="field-row"><label>Path</label><input readonly value="${path}" onclick="this.select()"></div>
        <div class="field-row"><label>Raw URL</label><input readonly value="${result.content.download_url}" onclick="this.select()"></div>
      `;
    } catch (err) {
      resultBox.innerHTML = `<span style="color:var(--amber); font-family:var(--font-mono); font-size:12px;">Upload failed: ${err.message}</span>`;
    }
  });
})();
