// ============================
// Feuille de temps (JS) - TOTAL CUMULÉ PAR SEMAINES
// - Lundi→Dimanche
// - Chaque semaine a ses heures
// - Le total affiché = SOMME de toutes les semaines (ex: 16 + 16 = 32)
// - Quand tu changes de semaine: les jours reviennent à 0 (ou se rechargent si déjà saisis)
// ============================

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

// ----------------------------
// ✅ Stockage en mémoire par semaine
// key = weekStart (YYYY-MM-DD)
// value = { Mon: 0, Tue: 0, ... }
// ----------------------------
const timesheetsByWeek = Object.create(null);
let currentWeekKey = "";

// ----------------------------
// UI Build
// ----------------------------
function buildDaysTable() {
  const body = $("daysBody");
  body.innerHTML = "";

  for (const d of DAYS) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="dayName">${d.labelFr}</td>
      <td>
        <input class="hoursInput" data-day="${d.key}" type="number" min="0" step="0.25" placeholder="0" value="0" />
      </td>
    `;
    body.appendChild(tr);
  }
}

// ----------------------------
// Week helpers
// ----------------------------
function ensureWeekExists(weekKey) {
  if (!timesheetsByWeek[weekKey]) {
    const blank = {};
    for (const d of DAYS) blank[d.key] = 0;
    timesheetsByWeek[weekKey] = blank;
  }
}

function saveInputsToWeek(weekKey) {
  ensureWeekExists(weekKey);
  for (const d of DAYS) {
    const inp = document.querySelector(`input[data-day="${d.key}"]`);
    timesheetsByWeek[weekKey][d.key] = Math.max(0, readNumber(inp.value));
  }
}

function loadWeekIntoInputs(weekKey) {
  ensureWeekExists(weekKey);
  for (const d of DAYS) {
    const inp = document.querySelector(`input[data-day="${d.key}"]`);
    inp.value = String(timesheetsByWeek[weekKey][d.key] || 0);
  }
}

// ----------------------------
// ✅ TOTAL CUMULÉ (toutes semaines)
// ----------------------------
function computeWeekTotalFromStore(weekKey) {
  const w = timesheetsByWeek[weekKey];
  if (!w) return 0;
  let sum = 0;
  for (const d of DAYS) sum += readNumber(w[d.key]);
  return round2(sum);
}

function computeGrandTotalHours() {
  let grand = 0;
  for (const weekKey of Object.keys(timesheetsByWeek)) {
    grand += computeWeekTotalFromStore(weekKey);
  }
  return round2(grand);
}

function updateTotalsUI() {
  const total = computeGrandTotalHours();
  $("totalHours").textContent = String(total);

  const rate = readNumber($("hourlyRate").value);
  if (rate > 0) {
    $("estimatedPay").textContent = ` • Paie estimée: ${moneyCAD(round2(total * rate))}`;
  } else {
    $("estimatedPay").textContent = "";
  }
}

// ----------------------------
// Timesheet data + Summary (pour la semaine courante)
// ----------------------------
function buildTimesheetForCurrentWeek() {
  const employeeName = $("fullName").value.trim();
  const weekStart = $("weekStart").value;

  const hourlyRate = readNumber($("hourlyRate").value);

  if (!employeeName) {
    alert("Entre ton nom complet.");
    return null;
  }
  if (!weekStart) {
    alert("Choisis la date de début de semaine.");
    return null;
  }

  // garantir la semaine courante
  currentWeekKey = weekStart;
  ensureWeekExists(currentWeekKey);
  saveInputsToWeek(currentWeekKey);

  const days = DAYS.map((d) => {
    return { labelFr: d.labelFr, hours: timesheetsByWeek[currentWeekKey][d.key] };
  });

  const weekTotal = computeWeekTotalFromStore(currentWeekKey);

  return {
    employeeName,
    weekStart: currentWeekKey,
    hourlyRate: hourlyRate > 0 ? hourlyRate : null,
    days,
    weekTotal,
    grandTotal: computeGrandTotalHours(),
  };
}

function renderSummary(ts) {
  const lines = [];
  lines.push("FEUILLE DE TEMPS (SEMAINE)");
  lines.push(`Employé: ${ts.employeeName}`);
  lines.push(`Semaine début: ${ts.weekStart}`);
  lines.push("------------------------------");

  for (const d of ts.days) lines.push(`${d.labelFr}: ${d.hours} h`);

  lines.push("------------------------------");
  lines.push(`Total semaine: ${ts.weekTotal} h`);
  lines.push(`TOTAL CUMULÉ: ${ts.grandTotal} h`);

  if (ts.hourlyRate) {
    lines.push(`Taux: ${ts.hourlyRate} $/h`);
    lines.push(`Paie estimée (cumulée): ${moneyCAD(round2(ts.grandTotal * ts.hourlyRate))}`);
  }

  return lines.join("\n");
}

function setResult(text, muted) {
  const res = $("result");
  res.textContent = text;
  if (muted) res.classList.add("muted");
  else res.classList.remove("muted");
}

// ----------------------------
// Events
// ----------------------------
function onWeekChange() {
  const newWeek = $("weekStart").value;
  if (!newWeek) return;

  // sauvegarder l'ancienne semaine si elle existe
  if (currentWeekKey) saveInputsToWeek(currentWeekKey);

  // passer à la nouvelle semaine
  currentWeekKey = newWeek;
  ensureWeekExists(currentWeekKey);
  loadWeekIntoInputs(currentWeekKey);

  // total cumulé ne doit PAS reset
  updateTotalsUI();

  setResult("Le résumé apparaîtra ici après soumission.", true);
}

function onAnyInput(e) {
  const t = e.target;
  const isHours = t instanceof HTMLInputElement && t.hasAttribute("data-day");
  const isRate = t instanceof HTMLInputElement && t.id === "hourlyRate";

  if (isHours) {
    const weekStart = $("weekStart").value;
    if (!weekStart) {
      // Empêche d'entrer des heures sans semaine
      t.value = "0";
      alert("Choisis d'abord une semaine (date de début).");
      return;
    }

    // Assurer semaine courante + sauvegarde immédiate
    currentWeekKey = weekStart;
    ensureWeekExists(currentWeekKey);

    const dayKey = t.getAttribute("data-day");
    timesheetsByWeek[currentWeekKey][dayKey] = Math.max(0, readNumber(t.value));

    updateTotalsUI();
    return;
  }

  if (isRate) {
    updateTotalsUI();
  }
}

function onSubmit() {
  const ts = buildTimesheetForCurrentWeek();
  if (!ts) return;

  updateTotalsUI();
  setResult(renderSummary(ts), false);
}

async function onCopy() {
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
}

function onReset() {
  $("fullName").value = "";
  $("weekStart").value = "";
  $("hourlyRate").value = "";

  for (const k of Object.keys(timesheetsByWeek)) delete timesheetsByWeek[k];
  currentWeekKey = "";

  // reset inputs jours
  document.querySelectorAll('input[data-day]').forEach((i) => (i.value = "0"));

  updateTotalsUI();
  setResult("Le résumé apparaîtra ici après soumission.", true);
}

// ----------------------------
// Init
// ----------------------------
buildDaysTable();
updateTotalsUI();

document.addEventListener("input", onAnyInput);
$("weekStart").addEventListener("change", onWeekChange);
$("submitBtn").addEventListener("click", onSubmit);
$("copyBtn").addEventListener("click", onCopy);
$("resetBtn").addEventListener("click", onReset);
