const { integer } = require('../validation')

const TYPES = ['processador', 'placa_mae', 'memoria']
const LABELS = { processador: 'Processador', placa_mae: 'Placa-mãe', memoria: 'Memória' }
const validSlug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 140
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null
const memoryType = value => ['DDR3', 'DDR4', 'DDR5'].includes(value)
const biosVersion = value => typeof value === 'string' && /^\d{4}$/.test(value)

function specsFor(type, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const allowed = {
    processador: ['socket', 'memoria_tipos', 'memoria_max_gb', 'video_integrado'],
    placa_mae: ['socket', 'memoria_tipo', 'memoria_formato', 'memoria_slots', 'memoria_max_gb', 'bios_versoes', 'suporte_cpu'],
    memoria: ['memoria_tipo', 'memoria_formato', 'modulos', 'capacidade_gb', 'velocidade_padrao_mts', 'velocidade_perfil_mts', 'perfil']
  }[type]
  if (!allowed || Object.keys(value).some(key => !allowed.includes(key))) return null
  for (const [key, item] of Object.entries(value)) {
    if (item === null) continue
    if (key === 'socket' && (typeof item !== 'string' || !/^[A-Z0-9_-]{2,24}$/.test(item))) return null
    if (key === 'memoria_tipo' && !memoryType(item)) return null
    if (key === 'memoria_tipos' && (!Array.isArray(item) || !item.length || item.length > 3 || !item.every(memoryType))) return null
    if (key === 'memoria_formato' && !['UDIMM', 'SODIMM'].includes(item)) return null
    if (['memoria_max_gb', 'capacidade_gb'].includes(key) && (!Number.isInteger(item) || item < 1 || item > 4096)) return null
    if (['memoria_slots', 'modulos'].includes(key) && (!Number.isInteger(item) || item < 1 || item > 16)) return null
    if (['velocidade_padrao_mts', 'velocidade_perfil_mts'].includes(key) && (!Number.isInteger(item) || item < 800 || item > 16000)) return null
    if (key === 'perfil' && !['XMP', 'EXPO', 'XMP/EXPO', 'Nenhum'].includes(item)) return null
    if (key === 'video_integrado' && typeof item !== 'boolean') return null
    if (key === 'bios_versoes' && (!Array.isArray(item) || item.length > 100 || !item.every(biosVersion))) return null
    if (key === 'suporte_cpu') {
      if (typeof item !== 'object' || Array.isArray(item) || Object.keys(item).length > 300) return null
      for (const [slug, support] of Object.entries(item)) {
        if (!validSlug(slug) || !support || typeof support !== 'object' || Array.isArray(support) || Object.keys(support).some(name => name !== 'bios_minima') || !biosVersion(support.bios_minima)) return null
      }
    }
  }
  return value
}

function normalizeInput(body) {
  if (!TYPES.includes(body.tipo) || !validSlug(body.slug)) return null
  const marca = text(body.marca, 60), modelo = text(body.modelo, 140)
  const specifications = specsFor(body.tipo, body.especificacoes)
  if (!marca || !modelo || !specifications || !['rascunho', 'verificado'].includes(body.status) || typeof body.ativo !== 'boolean') return null
  if (!Array.isArray(body.fontes) || body.fontes.length > 8 || (body.status === 'verificado' && !body.fontes.length)) return null
  const fontes = []
  for (const source of body.fontes) {
    const titulo = text(source?.titulo, 140), url = text(source?.url, 600)
    if (!titulo || !url) return null
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null
    } catch { return null }
    fontes.push({ titulo, url })
  }
  return { slug: body.slug, tipo: body.tipo, marca, modelo, especificacoes: specifications, fontes, status: body.status, ativo: body.ativo }
}

function decode(row) {
  return { id: Number(row.id), slug: row.slug, tipo: row.tipo, marca: row.marca, modelo: row.modelo,
    especificacoes: JSON.parse(row.especificacoes), fontes: JSON.parse(row.fontes),
    status: row.status, ativo: row.ativo === true || Number(row.ativo) === 1,
    revisao: Number(row.revisao), revisado_em: row.revisado_em }
}

async function findComponent(pool, rawId) {
  const id = integer(rawId)
  if (!Number.isInteger(id) || id < 1) return null
  const [rows] = await pool.execute("SELECT * FROM componentes_tecnicos WHERE id = ? AND ativo = TRUE AND status = 'verificado'", [id])
  return rows.length ? decode(rows[0]) : null
}

module.exports = { TYPES, LABELS, biosVersion, normalizeInput, decode, findComponent }
