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
  const cleaned = String(val)
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]+/g, "");
  return parseFloat(cleaned) || 0;
}

function formatNumberOnly(num) {
  return num.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  const viewSelect = document.getElementById("view-mode-select");

  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const mode = viewSelect ? viewSelect.value : "bl"; // 'bl' | 'cnee' | 'invoice'

  // Filter rows based on search
  const filtered = rawRecords.filter((row) => {
    const bl = String(row[cols.bl] || "").toLowerCase();
    const cnee = String(row[cols.cnee] || "").toLowerCase();
    const inv = String(row[cols.invoiceNo] || "").toLowerCase();
    return bl.includes(query) || cnee.includes(query) || inv.includes(query);
  });

  // Dynamic Grouping based on View Mode selector
  const groups = {};
  filtered.forEach((row) => {
    let groupKey = "";
    if (mode === "cnee") {
      groupKey = row[cols.cnee] || "UNKNOWN_CNEE";
    } else if (mode === "invoice") {
      groupKey = row[cols.invoiceNo] || "UNKNOWN_INV";
    } else {
      groupKey = row[cols.bl] || "UNKNOWN_BL";
    }

    if (!groups[groupKey]) {
      groups[groupKey] = {
        key: groupKey,
        bl: row[cols.bl] || "",
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

    const invAmt = parseCurrency(row[cols.invoiceAmount]);
    const pphAmt = parseCurrency(row[cols.pph23]);

    groups[groupKey].totalGross += invAmt;
    if (pphAmt !== 0) groups[groupKey].pph23 = Math.abs(pphAmt);

    groups[groupKey].items.push({
      type: row[cols.type] || "INV",
      invoiceNo: row[cols.invoiceNo] || "-",
      amount: invAmt,
    });
  });

  const groupList = Object.values(groups);
  const modeLabels = {
    bl: "BL Group(s)",
    cnee: "Consignee Group(s)",
    invoice: "Invoice View",
  };
  if (countBadge)
    countBadge.textContent = `${groupList.length} ${modeLabels[mode] || "Group(s)"}`;

  if (groupList.length === 0) {
    container.innerHTML = `<div class="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">No matching records found.</div>`;
    return;
  }

  // Render cards using tables for immaculate grid/currency alignment
  container.innerHTML = groupList
    .map((group) => {
      const finalOutstanding = group.totalGross - group.pph23;
      const hasPph = group.pph23 > 0;
      const symbol = cfg.ui.currencySymbol;

      return `
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
        <!-- Card Header -->
        <div class="bg-slate-50 px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded">BL: ${group.bl || group.key}</span>
              <span class="font-bold text-slate-800">${group.cnee || "No Consignee"}</span>
            </div>
            <div class="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span>📅 Date: <strong>${formatDate(group.date)}</strong></span>
              <span>🚢 Vessel: ${group.vesVoy || "-"}</span>
              <span>⏳ Terms: ${group.estTransfer || "-"}</span>
              ${group.send ? `<span class="text-emerald-600 font-medium">🚚 ${group.send}</span>` : `<span class="text-amber-600 font-medium">⏳ Pending Send</span>`}
            </div>
          </div>

          <!-- Financial Summary Table -->
          <div class="flex flex-col sm:items-end justify-center">
            <table class="text-xs text-slate-600">
              <tr>
                <td class="pr-3 text-right text-slate-500">Total:</td>
                <td class="w-8 font-mono">${symbol}</td>
                <td class="text-right font-mono font-semibold text-slate-800">${formatNumberOnly(group.totalGross)}</td>
              </tr>
              ${
                hasPph
                  ? `
              <tr>
                <td class="pr-3 text-right text-rose-600">PPH 23:</td>
                <td class="w-8 font-mono text-rose-600">-${symbol}</td>
                <td class="text-right font-mono text-rose-600">${formatNumberOnly(group.pph23)}</td>
              </tr>
              <tr class="border-t border-slate-200 font-bold text-slate-900 text-sm">
                <td class="pr-3 text-right pt-1">Outstanding:</td>
                <td class="w-8 font-mono pt-1">${symbol}</td>
                <td class="text-right font-mono pt-1">${formatNumberOnly(finalOutstanding)}</td>
              </tr>
              `
                  : ""
              }
            </table>
          </div>
        </div>

        <!-- Line Items Table (Clean Column Alignment for RP & Numbers) -->
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <tbody class="divide-y divide-slate-100">
              ${group.items
                .map(
                  (item) => `
                <tr class="hover:bg-slate-50/50 transition-colors">
                  <td class="py-2.5 px-5 w-32">
                    <span class="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">${item.type}</span>
                  </td>
                  <td class="py-2.5 px-3 font-medium text-slate-700">
                    ${item.invoiceNo}
                  </td>
                  <td class="py-2.5 px-2 w-12 font-mono text-slate-400 text-right">${symbol}</td>
                  <td class="py-2.5 px-5 w-40 font-mono text-slate-800 text-right">${formatNumberOnly(item.amount)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
    })
    .join("");
}
