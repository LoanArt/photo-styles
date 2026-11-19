(function () {
  const PLANS = ["unit", "pack", "sub"];
  const params = new URLSearchParams(location.search);
  if (params.get("session_id")) {
    localStorage.setItem("mz_pass", params.get("session_id"));
    history.replaceState(null, "", "/#studio");
  }
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

  const bar = document.createElement("p");
  bar.className = "chosen";
  document.querySelector("#studio .panel").appendChild(bar);

  async function refresh() {
    try {
      const r = await fetch("/credits?pass=" + encodeURIComponent(getPass()) + "&admin=" + encodeURIComponent(getAdmin()));
      const d = await r.json();
      bar.innerHTML = d.admin
        ? "🔓 Accès admin : illimité"
        : d.left > 0
          ? "💎 Crédits restants : " + d.left + ""
          : 'Aucun crédit — voir les tarifs';
    } catch (e) {
      bar.innerHTML = "";
    }
    bar.innerHTML += ' · J\'ai un code';
    document.getElementById("mzcode").onclick = (e) => {
      e.preventDefault();
      const c = prompt("Ton code :");
      if (c !== null) { localStorage.setItem("mz_admin", c.trim()); refresh(); }
    };
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
    out.innerHTML = ' Création de ton œuvre… 30 s à 1 min';
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
        out.innerHTML = '';
        dlbox.innerHTML = '⬇️ Télécharger';
      }
    } catch (e) {
      out.textContent = "❌ " + (e.message || "Une erreur est survenue");
    }
    check();
    refresh();
  };
})();
