export const THEMES = [
  { id: 'system', name: 'Automático', description: 'Acompanha seu dispositivo', color: 'linear-gradient(135deg, #f7f8fa 50%, #151b23 50%)' },
  { id: 'light', name: 'Claro', description: 'Leve e luminoso', color: '#f7f8fa' },
  { id: 'dark', name: 'Escuro', description: 'Conforto em pouca luz', color: '#151b23' },
  { id: 'ocean', name: 'Oceano', description: 'Azul e tranquilo', color: '#126a91' },
  { id: 'aurora', name: 'Aurora', description: 'Violeta com personalidade', color: '#8968df' },
];

export const THEME_KEY = 'ehtechTheme';

// Executado antes do conteúdo para evitar a troca de cores após a primeira pintura.
export const themeBootstrap = `(function(){try{var p=localStorage.getItem('${THEME_KEY}');if(!['system','light','dark','ocean','aurora'].includes(p))p='system';document.documentElement.dataset.theme=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;}catch(e){document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}})();`;
