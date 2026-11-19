(function () {
  const PLANS = ["unit", "pack", "sub"];
  const params = new URLSearchParams(location.search);
  if (params.get("session_id")) localStorage.setItem("mz_pass", params.get("session_id"));
  if (params.get("code")) localStorage.setItem("mz_admin", params.get("code").trim());
  if (params.get("session_id") || params.get("code")) history.replaceState(null, "", "/#studio");

  const getPass = () => localStorage.getItem("mz_pass") || "";
  const getAdmin = () => localStorage.getItem("mz_admin") || "";

  document.querySelectorAll("#prix .price .btn").forEach((b, i) => {
    b.onclick = async (e) => {
      e.preventDefault();
      b.textContent = "Redirection…";
      try {
        const r = await fetch("/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: PLANS[i] })
        });
        const d = await r.json();
        if (d.url) location.href = d.url;
        else throw new Error(d.error);
      } catch (err) {
        alert(err.message || "Erreur de paiement");
        b.textContent = "Choisir";
      }
    };
  });

  const panel = document.querySelector("#studio .panel");

  const info = document.createElement("p");
  info.className = "chosen";
  panel.appendChild(info);

  const box = document.createElement("div");
  box.style.cssText = "display:flex;gap:8px;margin-top:12px";
  box.innerHTML =
    '<input id="mzcode" type="text" placeholder="Code d\'accès" autocomplete="off" ' +
    'style="flex:1;padding:12px;border-radius:12px;border:1px solid #2a2244;background:#0d0a18;color:#f4f1ff;font-size:16px">' +
    '<button id="mzok" type="button" class="btn btn-ghost" style="padding:12px 18px">Valider</button>';
  panel.appendChild(box);

  document.getElementById("mzok").addEventListener("click", () => {
    localStorage.setItem("mz_admin", document.getElementById("mzcode").value.trim());
    refresh();
  });

  async function refresh() {
    try {
      const r = await fetch("/credits?pass=" + encodeURIComponent(getPass()) + "&admin=" + encodeURIComponent(getAdmin()));
      const d = await r.json();
      if (d.admin) {
        info.innerHTML = "🔓 <b>Accès admin : illimité</b>";
        box.style.display = "none";
      } else {
        info.innerHTML = d.left > 0
          ? "💎 Crédits restants : <b>" + d.left + "</b>"
          : 'Aucun crédit — <a href="#prix" style="color:#ff6ec4;text-decoration:underline">voir les tarifs</a>';
        box.style.display = "flex";
      }
    } catch (e) {
      info.textContent = "";
    }
  }
  refresh();

  document.getElementById("go").onclick = async () => {
    const out = document.getElementById("out");
    const dlbox = document.getElementById("dlbox");
    const go = document.getElementById("go");
    const fd = new FormData();
    fd.append("photo", file);
    fd.append("style", current);
    fd.append("pass", getPass());
    fd.append("admin", getAdmin());
    go.disabled = true;
    dlbox.innerHTML = "";
    out.innerHTML = '<div><div class="loader"></div>Création de ton œuvre…<br><small>30 s à 1 min</small></div>';
    out.scrollIntoView({ behavior: "smooth", block: "center" });
    try {
      const r = await fetch("/transform", { method: "POST", body: fd });
      const d = await r.json();
      if (r.status === 402) {
        out.textContent = "💎 " + d.error;
        setTimeout(() => document.getElementById("prix").scrollIntoView({ behavior: "smooth" }), 1200);
      } else if (!r.ok) {
        throw new Error(d.error);
      } else {
        out.innerHTML = '<img src="' + d.image + '">';
        dlbox.innerHTML = '<a class="btn btn-main" href="' + d.image + '" download="metamorphoz.png">⬇️ Télécharger</a>';
      }
    } catch (e) {
      out.textContent = "❌ " + (e.message || "Une erreur est survenue");
    }
    check();
    refresh();
  };
})();
