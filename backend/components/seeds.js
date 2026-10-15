// Fichas resumidas revisadas nas fontes dos fabricantes em 06/10/2026.
// INSERT IGNORE preserva revisões feitas pelo administrador.
const source = (titulo, url) => ({ titulo, url })
const cpu = (slug, modelo, socket, ram, max, video, url) => ({ slug, tipo: 'processador', marca: 'AMD', modelo,
  especificacoes: { socket, memoria_tipos: [ram], memoria_max_gb: max, video_integrado: video }, fontes: [source('Ficha técnica AMD', url)] })
const b550Support = 'https://www.asus.com/motherboards-components/motherboards/prime/prime-b550m-a/helpdesk_cpu?model2Name=PRIME-B550M-A'
const b650Support = 'https://www.asus.com/id/motherboards-components/motherboards/prime/prime-b650m-a-ii/helpdesk_cpu/?model2Name=PRIME-B650M-A-II'

const SEEDS = [
  cpu('amd-ryzen-5-5600', 'Ryzen 5 5600', 'AM4', 'DDR4', 128, false, 'https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-5000-series/amd-ryzen-5-5600.html'),
  cpu('amd-ryzen-5-7600', 'Ryzen 5 7600', 'AM5', 'DDR5', 128, true, 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-5-7600.html'),
  { slug: 'asus-prime-b550m-a', tipo: 'placa_mae', marca: 'ASUS', modelo: 'PRIME B550M-A',
    especificacoes: { socket: 'AM4', memoria_tipo: 'DDR4', memoria_formato: 'UDIMM', memoria_slots: 4, memoria_max_gb: 128,
      bios_versoes: ['0307', '1004', '1212', '1401', '2407', '2423', '2803', '3621', '3636'], suporte_cpu: { 'amd-ryzen-5-5600': { bios_minima: '2423' } } },
    fontes: [source('Lista de processadores e BIOS ASUS', b550Support), source('Especificações ASUS', 'https://www.asus.com/uk/motherboards-components/motherboards/prime/prime-b550m-a/techspec/')] },
  { slug: 'asus-prime-b650m-a-ii', tipo: 'placa_mae', marca: 'ASUS', modelo: 'PRIME B650M-A II',
    especificacoes: { socket: 'AM5', memoria_tipo: 'DDR5', memoria_formato: 'UDIMM', memoria_slots: 4, memoria_max_gb: 192,
      bios_versoes: ['0602', '1409', '1807', '2613', '3263', '3602'], suporte_cpu: { 'amd-ryzen-5-7600': { bios_minima: '0602' } } },
    fontes: [source('Lista de processadores e BIOS ASUS', b650Support), source('Especificações ASUS', 'https://www.asus.com/motherboards-components/motherboards/prime/prime-b650m-a-ii/techspec/')] },
  { slug: 'kingston-kf432c16bbk2-16', tipo: 'memoria', marca: 'Kingston', modelo: 'FURY Beast KF432C16BBK2/16 (2 × 8 GB)',
    especificacoes: { memoria_tipo: 'DDR4', memoria_formato: 'UDIMM', modulos: 2, capacidade_gb: 16, velocidade_padrao_mts: 2400, velocidade_perfil_mts: 3200, perfil: 'XMP' },
    fontes: [source('Datasheet Kingston', 'https://www.kingston.com/datasheets/KF432C16BBK2_16.pdf')] },
  { slug: 'kingston-kf560c36bbek2-16', tipo: 'memoria', marca: 'Kingston', modelo: 'FURY Beast KF560C36BBEK2-16 (2 × 8 GB)',
    especificacoes: { memoria_tipo: 'DDR5', memoria_formato: 'UDIMM', modulos: 2, capacidade_gb: 16, velocidade_padrao_mts: 4800, velocidade_perfil_mts: 6000, perfil: 'EXPO' },
    fontes: [source('Datasheet Kingston', 'https://www.kingston.com/datasheets/KF560C36BBEK2-16.pdf')] }
]

module.exports = { SEEDS }
