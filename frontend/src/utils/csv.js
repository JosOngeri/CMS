/**
 * Tiny CSV parser for the platform import wizards (5.3, 7.3).
 * Handles quoted cells with escaped quotes; no dependency needed.
 */

export const parseCsv = (text) => {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1 } else { inQuotes = false }
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell); cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      row.push(cell); cell = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else {
      cell += ch
    }
  }
  row.push(cell)
  if (row.length > 1 || row[0] !== '') rows.push(row)
  return rows
}

/** Rows -> objects using the header row; keys lowercased + underscored. */
export const csvToObjects = (text) => {
  const rows = parseCsv(text)
  if (rows.length < 2) return { headers: [], objects: [] }
  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''))
  const objects = rows.slice(1).map((r) => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (r[i] || '').trim() })
    return obj
  })
  return { headers, objects }
}
