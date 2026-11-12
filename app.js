let rawRecords = [];

document.addEventListener("DOMContentLoaded", async () => {
  const cfg = window.ACT_REMINDER_CONFIG;
  const container = document.getElementById("dashboard-container");
  const countBadge = document.getElementById("record-count");
  const viewSelect = document.getElementById("view-mode-select");
  const searchInput = document.getElementById("search-input");

  if (!cfg || !cfg.webAppUrl) {
    container.innerHTML = `
      <div class="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-xl">
        <h3 class="font-bold mb-1">Missing Configuration</h3>
        <p class="text-sm">Make sure <code>config.js</code> is loaded properly and contains your Web App URL.</p>
      </div>`;
    countBadge.textContent = "Not connected";
    return;
  }

  try {
    const response = await fetch(cfg.webAppUrl);
    const json = await response.json();

    if (json.error) {
      throw new Error(json.error);
    }

    rawRecords = json.data || [];
    renderView();

    if (viewSelect) viewSelect.addEventListener("change", renderView);
    if (searchInput) searchInput.addEventListener("input", renderView);
  } catch (err) {
    container.innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl">
        <h3 class="font-bold mb-1">Connection Failed</h3>
        <p class="text-sm">${err.message}</p>
      </div>`;
    countBadge.textContent = "Error";
    console.error(err);
  }
});

function parseCurrency(val) {
  if (typeof val === "number") return val;
  if (!val) return 0;
  // Handles Indonesian formatting e.g. 82.423.291,50
  const cleaned = String(val)
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]+/g, "");
  return parseFloat(cleaned) || 0;
}

function formatCurrency(num, symbol) {
  return (
    symbol +
    num.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatDate(dateVal) {
  if (!dateVal) return "-";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function renderView() {
  const cfg = window.ACT_REMINDER_CONFIG;
  const cols = cfg.columns;
  const container = document.getElementById("dashboard-container");
  const countBadge = document.getElementById("record-count");
  const searchInput = document.getElementById("search-input");

  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

  // Filter rows based on search
  const filtered = rawRecords.filter((row) => {
    const bl = String(row[cols.bl] || "").toLowerCase();
    const cnee = String(row[cols.cnee] || "").toLowerCase();
    const inv = String(row[cols.invoiceNo] || "").toLowerCase();
    return bl.includes(query) || cnee.includes(query) || inv.includes(query);
  });

  // Group records by BL to keep financial math accurate
  const blGroups = {};
  filtered.forEach((row) => {
    const blKey = row[cols.bl];
    if (!blKey) return;

    if (!blGroups[blKey]) {
      blGroups[blKey] = {
        bl: blKey,
        cnee: row[cols.cnee] || "",
        date: row[cols.date] || "",
        vesVoy: row[cols.vesVoy] || "",
        estTransfer: row[cols.estTransfer] || "",
        send: row[cols.send] || "",
        items: [],
        totalGross: 0,
        pph23: 0,
      };
    }

    if (!blGroups[blKey].cnee && row[cols.cnee])
      blGroups[blKey].cnee = row[cols.cnee];
    if (!blGroups[blKey].estTransfer && row[cols.estTransfer])
      blGroups[blKey].estTransfer = row[cols.estTransfer];
    if (!blGroups[blKey].send && row[cols.send])
      blGroups[blKey].send = row[cols.send];

    const invAmt = parseCurrency(row[cols.invoiceAmount]);
    const pphAmt = parseCurrency(row[cols.pph23]);

    blGroups[blKey].totalGross += invAmt;
    if (pphAmt !== 0) blGroups[blKey].pph23 = Math.abs(pphAmt);

    blGroups[blKey].items.push({
      type: row[cols.type] || "INV",
      invoiceNo: row[cols.invoiceNo] || "-",
      amount: invAmt,
    });
  });

  const groupList = Object.values(blGroups);
  if (countBadge) countBadge.textContent = `${groupList.length} BL Group(s)`;

  if (groupList.length === 0) {
    container.innerHTML = `<div class="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">No matching records found.</div>`;
    return;
  }

  // Render cards (grouped by BL)
  container.innerHTML = groupList
    .map((group) => {
      const finalOutstanding = group.totalGross - group.pph23;
      const hasPph = group.pph23 > 0;

      return `
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
        <!-- Card Header -->
        <div class="bg-slate-50 px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded">${group.bl}</span>
              <span class="font-bold text-slate-800">${group.cnee || "No Consignee"}</span>
            </div>
            <div class="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span>📅 Date: <strong>${formatDate(group.date)}</strong></span>
              <span>🚢 Vessel: ${group.vesVoy || "-"}</span>
              <span>⏳ Terms: ${group.estTransfer || "-"}</span>
              ${group.send ? `<span class="text-emerald-600 font-medium">🚚 ${group.send}</span>` : `<span class="text-amber-600 font-medium">⏳ Pending Send</span>`}
            </div>
          </div>

          <!-- Financials -->
          <div class="flex flex-col sm:items-end justify-between gap-2">
            <div class="text-right">
              <div class="text-xs text-slate-500">Total: <span class="font-semibold text-slate-700">${formatCurrency(group.totalGross, cfg.ui.currencySymbol)}</span></div>
              ${
                hasPph
                  ? `
                <div class="text-xs text-rose-600">PPH 23: -${formatCurrency(group.pph23, cfg.ui.currencySymbol)}</div>
                <div class="text-sm font-bold text-slate-900 mt-0.5">Total Outstanding: ${formatCurrency(finalOutstanding, cfg.ui.currencySymbol)}</div>
              `
                  : ""
              }
            </div>
          </div>
        </div>

        <!-- Line Items -->
        <div class="divide-y divide-slate-100">
          ${group.items
            .map(
              (item) => `
            <div class="px-5 py-2.5 flex justify-between items-center text-sm hover:bg-slate-50/50">
              <div class="flex items-center gap-3">
                <span class="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">${item.type}</span>
                <span class="font-medium text-slate-700">${item.invoiceNo}</span>
              </div>
              <span class="font-mono text-slate-800">${formatCurrency(item.amount, cfg.ui.currencySymbol)}</span>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
    })
    .join("");
}
