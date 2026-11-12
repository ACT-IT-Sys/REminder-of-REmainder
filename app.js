/**
 * Frontend Application Engine for GitHub Pages
 */
document.addEventListener('DOMContentLoaded', async () => {
  const cfg = window.ACT_REMINDER_CONFIG;
  const container = document.getElementById('dashboard-container');
  
  if (!container) return;
  
  try {
    const response = await fetch(cfg.webAppUrl);
    const json = await response.json();
    
    if (json.error) {
      container.innerHTML = `<p class="text-red-500">Error loading data: ${json.error}</p>`;
      return;
    }
    
    renderDashboard(json.data, cfg);
  } catch (err) {
    container.innerHTML = `<p class="text-red-500">Failed to connect to backend endpoint.</p>`;
    console.error(err);
  }
});

function renderDashboard(data, cfg) {
  // Group rows by BL or CNEE based on configuration / user selection
  const cols = cfg.columns;
  const groups = {};
  
  data.forEach(row => {
    const blKey = row[cols.bl] || 'UNKNOWN_BL';
    if (!groups[blKey]) {
      groups[blKey] = {
        bl: blKey,
        cnee: row[cols.cnee],
        date: row[cols.date],
        vesVoy: row[cols.vesVoy],
        estTransfer: row[cols.estTransfer],
        items: [],
        pph23: 0,
        totalGross: 0
      };
    }
    
    const invVal = parseFloat(String(row[cols.invoiceAmount] || '0').replace(/[^0-9,-]+/g, "").replace(',', '.')) || 0;
    const pphVal = parseFloat(String(row[cols.pph23] || '0').replace(/[^0-9,-]+/g, "").replace(',', '.')) || 0;
    
    if (pphVal > 0) groups[blKey].pph23 = pphVal;
    groups[blKey].totalGross += invVal;
    
    groups[blKey].items.push({
      type: row[cols.type],
      invoiceNo: row[cols.invoiceNo],
      invAmount: row[cols.invoiceAmount],
      send: row[cols.send]
    });
  });
  
  // Render cards cleanly...
  console.log('Processed Groupings:', groups);
}