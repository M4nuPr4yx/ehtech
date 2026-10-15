const fs = require('node:fs/promises')
const path = require('node:path')
const crypto = require('node:crypto')

const REVISION = 'c52a04ca9465c83997ed335f7767b09a2005dd26'
const SOURCE = 'https://github.com/docyx/pc-part-dataset'
const CATEGORIES = { processador: 'cpu', placa_mae: 'motherboard', memoria: 'memory', placa_video: 'video-card', armazenamento: 'internal-hard-drive', fonte: 'power-supply', gabinete: 'case', cooler: 'cpu-cooler' }

async function download(file) {
  const response = await fetch(`https://raw.githubusercontent.com/docyx/pc-part-dataset/${REVISION}/${file}`, { signal: AbortSignal.timeout(30000), redirect: 'error' })
  if (!response.ok) throw new Error(`Falha ao baixar ${file}: HTTP ${response.status}`)
  return response.text()
}

async function main() {
  const items = [], counts = {}, sourceCounts = {}
  for (const [tipo, filename] of Object.entries(CATEGORIES)) {
    const rows = JSON.parse(await download(`data/json/${filename}.json`))
    if (!Array.isArray(rows) || !rows.length) throw new Error(`Catálogo vazio: ${filename}`)
    sourceCounts[tipo] = rows.length
    const seen = new Set()
    for (const row of rows) {
      if (typeof row.name !== 'string' || !row.name.trim() || row.name.length > 250) throw new Error(`Nome inválido: ${filename}`)
      if (tipo === 'processador' && !/^(Intel|AMD)\s/i.test(row.name)) continue
      const especificacoes = Object.fromEntries(Object.entries(row).filter(([key]) => !['name', 'price', 'price_per_gb'].includes(key)).sort(([first], [second]) => first.localeCompare(second)))
      const identity = JSON.stringify([tipo, row.name.trim(), especificacoes])
      if (seen.has(identity)) continue
      seen.add(identity)
      items.push({ id: crypto.createHash('sha256').update(identity).digest('hex').slice(0, 20), tipo, modelo: row.name.trim(), especificacoes })
    }
    counts[tipo] = seen.size
  }
  items.sort((first, second) => first.tipo.localeCompare(second.tipo) || first.modelo.localeCompare(second.modelo, 'en') || first.id.localeCompare(second.id))
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('Colisão de identificadores.')
  const license = await download('LICENSE')
  if (!license.startsWith('MIT License') || !license.includes('Doc Oliver')) throw new Error('Licença da fonte mudou; revise antes de importar.')
  const directory = path.join(__dirname, '../backend/components/data')
  await fs.mkdir(directory, { recursive: true })
  await fs.writeFile(path.join(directory, 'catalog.json'), JSON.stringify({ fonte: SOURCE, revisao: REVISION, data_fonte: '2025-07-23', licenca: 'MIT', contagens_fonte: sourceCounts, contagens: counts, items }) + '\n')
  await fs.writeFile(path.join(directory, 'LICENSE.pc-part-dataset.txt'), license)
  console.log(JSON.stringify({ total: items.length, contagens: counts, revisao: REVISION }, null, 2))
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1 })
