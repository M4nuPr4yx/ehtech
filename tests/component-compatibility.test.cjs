const { test } = require('node:test')
const assert = require('node:assert/strict')
const { normalizeSelection, verify } = require('../backend/components/check')
const { normalizeInput } = require('../backend/components/catalog')
const { SEEDS } = require('../backend/components/seeds')

function catalogue() {
  return structuredClone(SEEDS).map((item, index) => ({ ...item, id: index + 1, status: 'verificado', ativo: true, revisao: 1, revisado_em: '2026-10-06' }))
}
const base = { processador_id: 1, placa_mae_id: 3, memorias: [{ componente_id: 5, quantidade: 1 }], bios: '2423' }
const check = (selection = base, models = catalogue()) => verify(selection, models)

test('os seis modelos iniciais têm identificação e especificações válidas', () => {
  assert.equal(SEEDS.length, 6)
  for (const item of catalogue()) assert.ok(normalizeInput(item), item.slug)
})
test('AM4 e AM5 aprovam somente os requisitos cobertos com BIOS declarada', () => {
  const am4 = check()
  assert.equal(am4.status, 'compativel')
  assert.equal(am4.memoria_total_gb, 16)
  assert.equal(am4.modulos_total, 2)
  assert.match(am4.observacoes[0], /vídeo dedicada/)
  assert.ok(am4.verificacoes.every(item => item.fontes.length))
  assert.equal(check({ processador_id: 2, placa_mae_id: 4, memorias: [{ componente_id: 6, quantidade: 1 }], bios: '0602' }).status, 'compativel')
})
test('BIOS ausente ou anterior exige confirmação; versão desconhecida não aprova', () => {
  for (const bios of [null, '2407']) assert.equal(check({ ...base, bios }).status, 'condicional')
  assert.equal(check({ ...base, bios: '9999' }).status, 'nao_verificado')
  assert.equal(check({ ...base, bios: '3636' }).status, 'compativel')
})
test('socket ou DDR divergente identifica incompatibilidade mesmo com dados pendentes', () => {
  assert.equal(check({ ...base, processador_id: 2, bios: null }).status, 'incompativel')
  assert.equal(check({ ...base, memorias: [{ componente_id: 6, quantidade: 1 }] }).status, 'incompativel')
  const models = catalogue()
  models[4].especificacoes.memoria_formato = 'SODIMM'
  assert.equal(check(base, models).status, 'incompativel')
})
test('kits somam módulos e capacidade; excesso de slots ou GB reprova', () => {
  assert.equal(check({ ...base, memorias: [{ componente_id: 5, quantidade: 2 }] }).status, 'condicional')
  const excess = check({ ...base, memorias: [{ componente_id: 5, quantidade: 3 }] })
  assert.equal(excess.modulos_total, 6)
  assert.equal(excess.status, 'incompativel')
  const models = catalogue()
  models[4].especificacoes.capacidade_gb = 256
  assert.equal(check(base, models).status, 'incompativel')
})
test('ausência no suporte oficial da base não é prova de incompatibilidade', () => {
  const models = catalogue()
  models[2].especificacoes.suporte_cpu = {}
  const result = check(base, models)
  assert.equal(result.status, 'nao_verificado')
  assert.equal(result.verificacoes.find(item => item.codigo === 'suporte_cpu').status, 'nao_verificado')
})
test('fichas parciais, rascunhos, inativos e seleções incompletas nunca ficam verdes', () => {
  const missing = check({ processador_id: null, placa_mae_id: null, memorias: [], bios: null })
  assert.equal(missing.status, 'nao_verificado')
  for (const mutate of [models => { models[0].status = 'rascunho' }, models => { models[2].ativo = false }, models => { models[4].especificacoes.modulos = null }, models => { models[4].especificacoes.capacidade_gb = null }, models => { models[0].especificacoes.memoria_tipos = null }]) {
    const models = catalogue(); mutate(models)
    assert.equal(check(base, models).status, 'nao_verificado')
  }
  const models = catalogue(); models[0].status = 'rascunho'
  assert.ok(!check(base, models).componentes.some(item => item.id === 1), 'Rascunhos não são divulgados na análise pública')
  assert.equal(check({ ...base, processador_id: 999 }).status, 'nao_verificado')
})
test('entrada rejeita IDs, BIOS, kits repetidos e quantidades inválidas', () => {
  assert.deepEqual(normalizeSelection({ ...base, processador_id: '1' }), base)
  for (const partial of [{ processador_id: '1abc' }, { bios: 2423 }, { bios: 'v2423' }, { memorias: null }, { memorias: [{ componente_id: 5, quantidade: 1.5 }] }, { memorias: [{ componente_id: 5, quantidade: 0 }] }, { memorias: [{ componente_id: 5 }, { componente_id: 5 }] }]) assert.equal(normalizeSelection({ ...base, ...partial }), null)
})
test('publicação requer fontes HTTPS e não aceita campos técnicos desconhecidos', () => {
  const model = catalogue()[0]
  for (const partial of [{ fontes: [] }, { fontes: [{ titulo: 'Exemplo', url: 'javascript:alert(1)' }] }, { fontes: [{ titulo: 'Exemplo', url: 'https://user:password@example.invalid' }] }, { especificacoes: { socket: 123 } }, { especificacoes: { dado_inventado: true } }]) assert.equal(normalizeInput({ ...model, ...partial }), null)
  assert.ok(normalizeInput({ ...model, status: 'rascunho', especificacoes: {}, fontes: [] }))
})
