const groups = [
  ['Computadores e componentes', [
    ['setups', 'Setups completos'], ['computadores', 'Computadores e desktops'], ['notebooks', 'Notebooks'],
    ['monitores', 'Monitores'], ['componentes', 'Componentes de PC'], ['processadores', 'Processadores'],
    ['placas-mae', 'Placas-mãe'], ['memorias', 'Memórias RAM'], ['placas-de-video', 'Placas de vídeo'],
    ['armazenamento', 'SSDs, HDs e armazenamento'], ['fontes', 'Fontes de alimentação'],
    ['gabinetes', 'Gabinetes'], ['refrigeracao', 'Coolers e refrigeração'],
  ]],
  ['Periféricos e escritório', [
    ['teclados', 'Teclados'], ['mouses', 'Mouses'], ['mousepads', 'Mousepads'], ['audio', 'Áudio, fones e headsets'],
    ['webcams', 'Webcams'], ['impressoras', 'Impressoras e scanners'], ['redes', 'Redes e Wi-Fi'],
    ['energia', 'Nobreaks e estabilizadores'], ['mobiliario', 'Mesas, cadeiras e suportes'],
    ['acessorios', 'Cabos, adaptadores e acessórios'],
  ]],
  ['Eletrônicos', [
    ['smartphones', 'Smartphones'], ['tablets', 'Tablets'], ['smartwatches', 'Smartwatches'],
    ['games', 'Games e consoles'], ['controles', 'Controles e acessórios para games'], ['cameras', 'Câmeras e fotografia'],
    ['tv', 'TV e vídeo'], ['gadgets', 'Gadgets e automação'], ['outros', 'Outros'],
  ]],
]

const aliases = {
  audio: ['áudio', 'fones de ouvido'],
  cameras: ['câmeras digitais', 'cameras digitais', 'câmeras'],
  acessorios: ['acessórios', 'perifericos', 'periféricos'],
  'placas-de-video': ['placas de vídeo', 'placas de video'],
}

function categoryKey(value) {
  if (typeof value !== 'string') return ''
  const key = value.trim().toLowerCase().replace(/\s+/g, ' ')
  const alias = Object.entries(aliases).find(([, values]) => values.includes(key))
  return alias?.[0] || key.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

module.exports = { groups, aliases, categoryKey }
