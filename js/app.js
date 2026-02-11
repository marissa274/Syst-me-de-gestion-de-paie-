// Days list (French)
const DAYS = [
  { key: "Mon", labelFr: "Lundi" },
  { key: "Tue", labelFr: "Mardi" },
  { key: "Wed", labelFr: "Mercredi" },
  { key: "Thu", labelFr: "Jeudi" },
  { key: "Fri", labelFr: "Vendredi" },
  { key: "Sat", labelFr: "Samedi" },
  { key: "Sun", labelFr: "Dimanche" },
];

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function readNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function moneyCAD(n) {
  return n.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
}

function buildDaysTable() {
  const body = $("daysBody");
  body.innerHTML = "";

  for (const d of DAYS) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="dayName">${d.labelFr}</td>
      <td>
        <input class="hoursInput" data-day="${d.key}" type="number" min="0" step="0.25" placeholder="0" />
      </td>
    `;
    body.appendChild(tr);
  }
}

function computeTotalHours() {
  const inputs = document.querySelectorAll('input[data-day]');
  let total = 0;

  inputs.forEach((inp) => {
    const h = readNumber(inp.value);
    if (h >= 0) total += h;
  });

  return round2(total);
}

function updateTotalsUI() {
  const total = computeTotalHours();
  $("totalHours").textContent = String(total);

  const rateValue = $("hourlyRate").value;
  const rate = readNumber(rateValue);

  if (rate > 0) {
    const estimated = round2(total * rate);
    $("estimatedPay").textContent = ` • Paie estimée: ${moneyCAD(estimated)}`;
  } else {
    $("estimatedPay").textContent = "";
  }
}

function buildTimesheet() {
  const employeeName = $("fullName").value.trim();
  const weekStart = $("weekStart").value;

  const hourlyRateRaw = $("hourlyRate").value;
  const hourlyRate = readNumber(hourlyRateRaw);

  if (!employeeName) {
    alert("Entre ton nom complet.");
    return null;
  }
  if (!weekStart) {
    alert("Choisis la date de début de semaine.");
    return null;
  }

  const days = DAYS.map((d) => {
    const inp = document.querySelector(`input[data-day="${d.key}"]`);
    const hours = Math.max(0, readNumber(inp.value));
    return { labelFr: d.labelFr, hours };
  });

  const totalHours = round2(days.reduce((sum, x) => sum + x.hours, 0));
  const estimatedPay = hourlyRate > 0 ? round2(totalHours * hourlyRate) : null;

  return {
    employeeName,
    weekStart,
    hourlyRate: hourlyRate > 0 ? hourlyRate : null,
    days,
    totalHours,
    estimatedPay,
  };
}

function renderSummary(ts) {
  const lines = [];
  lines.push("FEUILLE DE TEMPS");
  lines.push(`Employé: ${ts.employeeName}`);
  lines.push(`Semaine début: ${ts.weekStart}`);
  lines.push("------------------------------");

  for (const d of ts.days) {
    lines.push(`${d.labelFr}: ${d.hours} h`);
  }

  lines.push("------------------------------");
  lines.push(`Total: ${ts.totalHours} h`);

  if (ts.hourlyRate && ts.estimatedPay != null) {
    lines.push(`Taux: ${ts.hourlyRate} $/h`);
    lines.push(`Paie estimée: ${moneyCAD(ts.estimatedPay)}`);
  }

  return lines.join("\n");
}

function setResult(text, muted) {
  const res = $("result");
  res.textContent = text;

  if (muted) res.classList.add("muted");
  else res.classList.remove("muted");
}

// --- Init ---
buildDaysTable();
updateTotalsUI();

// Update totals when hours or rate changes
document.addEventListener("input", (e) => {
  const t = e.target;
  const isHours = t instanceof HTMLInputElement && t.hasAttribute("data-day");
  const isRate = t instanceof HTMLInputElement && t.id === "hourlyRate";

  if (isHours || isRate) updateTotalsUI();
});

// Submit
$("submitBtn").addEventListener("click", () => {
  const ts = buildTimesheet();
  if (!ts) return;

  const summary = renderSummary(ts);
  setResult(summary, false);
});

// Copy summary
$("copyBtn").addEventListener("click", async () => {
  const text = $("result").textContent || "";
  if (!text || text.includes("Le résumé apparaîtra")) {
    alert("Soumets d'abord la semaine pour générer le résumé.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    alert("Résumé copié ✅");
  } catch {
    alert("Copie manuellement (Ctrl/Cmd + C).");
  }
});

// Reset
$("resetBtn").addEventListener("click", () => {
  $("fullName").value = "";
  $("weekStart").value = "";
  $("hourlyRate").value = "";

  document.querySelectorAll('input[data-day]').forEach((i) => (i.value = ""));

  updateTotalsUI();
  setResult("Le résumé apparaîtra ici après soumission.", true);
});
