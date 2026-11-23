const fs = require('node:fs')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { hashPassword } = require('../backend/passwords')
const { ADDRESS_FIELDS, validateAddress, addressFingerprint, addressSnapshot } = require('../backend/addresses')
const { FIELDS, POLICY_VERSION, listingInput } = require('../backend/service-listings')
const { normalizeSpecifications } = require('../shared/product-specs.cjs')
const { sqlLiteral } = require('./demo-catalog-postgres.cjs')
const catalog = require('./fixtures/demo-catalog.cjs')

const seller = { username: 'vendedor_teste', email: 'vendedor@ehtech.example.test', name: 'Vendedor de teste', role: 'user' }
const buyer = { username: 'comprador_teste', email: 'comprador@ehtech.example.test', name: 'Comprador de teste', role: 'comprador' }
const resetTables = [
  'auth_tentativas', 'avaliacoes', 'avaliacoes_servico', 'bloqueios', 'certificados_usado', 'checkout_sessoes', 'combos_instalacao',
  'contratacoes_servico', 'denuncia_decisoes', 'denuncias', 'enderecos', 'favoritos', 'google_auth_desafios', 'google_oauth_fluxos',
  'mensagens', 'notificacoes', 'pagamento', 'passaporte_registros', 'passaportes', 'password_resets', 'pedido_entrega_eventos',
  'pedido_entregas', 'pedido_produto_itens', 'pedido_recebimento_codigos', 'pedidos', 'pedidos_produto', 'produtos', 'servicos',
  'usuario_identidades', 'usuarios',
]
const keepTables = ['componentes_tecnicos', 'ehtech_schema_versoes']
const demoProduct = (nome, categoria, preco, descricao, especificacoes) => ({ nome: `[DEMO] ${nome}`, categoria, preco, estoque: 3, descricao: `${catalog.notice}\n\n${descricao}`, especificacoes, imagem: [] })
const products = [
  demoProduct('Setup completo de estudo e jogos', 'setups', 2590, 'Inclui torre, monitor, teclado e mouse. Todos os itens fazem parte do valor simulado.', { condicao: 'Usado', modelo: 'Montagem personalizada', processador: 'AMD Ryzen 5 5600G', memoria_ram: '16 GB DDR4', armazenamento: 'SSD NVMe de 512 GB', monitor: 'IPS de 24 pol.', perifericos: 'Teclado ABNT2 e mouse USB' }),
  demoProduct('Teclado mecânico ABNT2 USB', 'teclados', 159, 'Teclado compacto de demonstração com cabo USB e teclas em português.', { condicao: 'Seminovo', layout: 'ABNT2', switch: 'Mecânico Brown', conexao: 'USB', itens_inclusos: 'Cabo USB' }),
  demoProduct('Monitor IPS de 24 pol. Full HD', 'monitores', 530, 'Monitor de demonstração com base e entrada HDMI. Acompanha cabo de energia.', { condicao: 'Usado', tela: '24 pol. Full HD', painel: 'IPS', frequencia: '75 Hz', conexao: 'HDMI' }),
  ...[0, 2, 4, 8, 9].map(index => {
    const original = catalog.products[index]
    const model = catalog.models[index]
    const category = index === 8 ? 'mouses' : index === 9 ? 'placas-de-video' : original.categoria
    return {
      ...demoProduct(model.name, category, original.preco, `${model.specs}\n\n${model.use}\n\n${original.descricao.split('\n\n').at(-1)}`, { condicao: 'Usado', modelo: model.name }),
      imagem: original.imagem,
    }
  }),
]
const services = [catalog.services[7], catalog.services[9]].map(service => ({
  ...service,
  descricao: `${service.descricao.split('\n\n').slice(0, 2).join('\n\n')}\n\nAtendimento e valores simulados para os testes da EHtech.`,
  regiao: service.modalidade === 'remoto' ? 'Remoto — Brasil' : 'São Paulo/SP (demonstração)',
}))

const literals = values => values.map(sqlLiteral).join(', ')

function buildReset({ database, hashes, production = false }) {
  if (database !== 'neondb' || !production) {
    if (!/^ehtech_test_\d+_\d+$/.test(database || '') || production) throw Error('Selecione o banco de teste ou confirme o alvo de produção neondb.')
  }
  for (const user of [seller, buyer]) {
    if (typeof hashes?.[user.username] !== 'string' || !hashes[user.username].startsWith('scrypt$')) throw Error('Forneça os dois hashes scrypt individuais.')
  }
  const users = [seller, buyer].map(user => `(${literals([user.username, user.email, hashes[user.username], user.name, user.role])})`)
  const address = validateAddress(catalog.users[0].address).value
  const fingerprint = addressFingerprint(address)
  const productRows = products.map(product => {
    const specs = normalizeSpecifications(product.categoria, product.especificacoes, true)
    if (!specs) throw Error(`Ficha inválida: ${product.nome}`)
    return `(${literals([product.nome, product.descricao, product.preco, product.estoque, product.categoria, JSON.stringify(product.imagem), JSON.stringify(specs)])})`
  })
  const serviceRows = services.map(service => {
    const data = Object.fromEntries(FIELDS.map(field => [field, service[field]]))
    const validated = listingInput({ ...data, politicas_versao: POLICY_VERSION })
    const fields = FIELDS.map(field => field === 'destaques' ? JSON.stringify(validated[field]) : validated[field])
    return `(${literals([...fields, `teste-${service.key}`])})`
  })
  return `DO $ehtech_reset$
DECLARE
  tabelas text;
  demo_seller_id integer;
  demo_origin_id integer;
BEGIN
  PERFORM set_config('lock_timeout', '8s', true);
  IF current_database() <> ${sqlLiteral(database)} THEN RAISE EXCEPTION 'Banco incorreto'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('ehtech-reset-marketplace'));
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN (${literals([...resetTables, ...keepTables])})) THEN
    RAISE EXCEPTION 'Tabela inesperada no schema public';
  END IF;
  LOCK TABLE public.usuarios IN ACCESS EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public.usuarios WHERE email IN (${literals([seller.email, buyer.email])})) THEN
    RAISE EXCEPTION 'As contas de teste já existem. Nenhum dado foi removido';
  END IF;
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ' ORDER BY tablename) INTO tabelas
    FROM pg_tables WHERE schemaname = 'public' AND tablename IN (${literals(resetTables)});
  EXECUTE 'TRUNCATE TABLE ' || tabelas || ' CONTINUE IDENTITY RESTRICT';
  ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS especificacoes TEXT;
  INSERT INTO public.usuarios (username, email, senha, nome, role) VALUES ${users.join(',\n    ')};
  SELECT id_usuario INTO STRICT demo_seller_id FROM public.usuarios WHERE email = ${sqlLiteral(seller.email)};
  INSERT INTO public.enderecos (usuario_id, ${ADDRESS_FIELDS.join(', ')}, fingerprint, confirmado_em)
    VALUES (demo_seller_id, ${literals(ADDRESS_FIELDS.map(field => address[field]))}, ${sqlLiteral(fingerprint)}, CURRENT_TIMESTAMP) RETURNING id INTO demo_origin_id;
  INSERT INTO public.produtos (nome, descricao, preco, estoque, categoria, imagem, especificacoes, vendedor, vendedor_id,
    status_aprovacao, exige_entrega, origem_endereco_id, origem_snapshot, origem_uf, origem_cidade)
    SELECT p.*, ${sqlLiteral(seller.username)}, demo_seller_id, 'aprovado', TRUE, demo_origin_id, ${literals([JSON.stringify(addressSnapshot(address)), address.uf, address.cidade])}
    FROM (VALUES ${productRows.join(',\n    ')}) AS p (nome, descricao, preco, estoque, categoria, imagem, especificacoes);
  INSERT INTO public.servicos (${FIELDS.join(', ')}, slug, prestador_id, status, status_aprovacao, origem, politicas_versao)
    SELECT s.*, demo_seller_id, 'ativo', 'aprovado', 'usuario', ${sqlLiteral(POLICY_VERSION)}
    FROM (VALUES ${serviceRows.join(',\n    ')}) AS s (${FIELDS.join(', ')}, slug);
  IF (SELECT count(*) FROM public.usuarios) <> 2
    OR (SELECT count(*) FROM public.produtos WHERE vendedor_id = demo_seller_id) <> ${products.length}
    OR (SELECT count(*) FROM public.servicos WHERE prestador_id = demo_seller_id) <> ${services.length} THEN
    RAISE EXCEPTION 'Contagens ou propriedade inesperadas. Operação revertida';
  END IF;
END
$ehtech_reset$;\n`
}

async function generate() {
  if (process.argv.slice(2).join(' ') !== '--preparar-reset-neondb') throw Error('Use --preparar-reset-neondb para gerar os arquivos locais sem executar o reset.')
  const output = fs.mkdtempSync(path.join(__dirname, '../scratch/reset-marketplace-'))
  const accounts = [seller, buyer].map(user => ({ ...user, password: randomBytes(18).toString('base64url') }))
  const hashes = Object.fromEntries(await Promise.all(accounts.map(async user => [user.username, await hashPassword(user.password)])))
  fs.writeFileSync(path.join(output, 'reset.sql'), buildReset({ database: 'neondb', hashes, production: true }), { flag: 'wx' })
  fs.writeFileSync(path.join(output, 'acessos.txt'), accounts.map(user => `${user.name}\nE-mail: ${user.email}\nSenha: ${user.password}\n`).join('\n'), { flag: 'wx' })
  console.log(output)
}

if (require.main === module) generate().catch(error => { console.error(error.message); process.exitCode = 1 })
module.exports = { buildReset, seller, buyer, products, services, resetTables, keepTables }
