/**
 * ACT Global — tunable settings & column name mappings.
 * Prevents hardcoding and ensures spreadsheet schema updates don't break logic.
 */
window.ACT_REMINDER_CONFIG = {
  appName: 'Outstanding Freight Reminder',
  webAppUrl: 'https://script.google.com/macros/s/AKfycbzVlUCdwFQ016LdE__jFjXb_jNiQMPJT0fqM7IkuCGcN-TtZs_yvq0DhVyJfCTcwMXh/exec',
  
  // Column header names mapping directly to Google Sheet headers (Configurable)
  columns: {
    bl: 'BL',
    cnee: 'CNEE',
    date: 'DATE',
    vesVoy: 'VesVoy',
    type: 'TYPE',
    invoiceNo: 'NO INV',
    invoiceAmount: 'INV',
    pph23: 'PPH 23',
    send: 'Send',
    estTransfer: 'EST. TRANSFER'
  },
  
  ui: {
    defaultViewMode: 'bl', // 'bl' | 'cnee' | 'invoice'
    currencySymbol: 'Rp '
  }
};