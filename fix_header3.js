const fs = require('fs');
const c = fs.readFileSync('src/app/complements/Header.js', 'utf8');
const lines = c.split('\n');

// After line 268 (<>) we have garbage lines 269-292
// The actual JSX Trust Bar div starts at line 293 "{feedback && ("
// But wait - we also need the outer <div className="bg-[#050705]"> wrapper
// Looking at line 293: "{feedback && (" - that means we're missing the trust bar div!
// The trust bar div should come BEFORE the feedback toast.
// 
// The current structure after return (<>:
// 269: garbage
// 270-292: middle of trust bar (missing opening div!)
// 293: blank line
// 294: {feedback && (  <-- feedback toast
// 295-299: feedback toast
// 300: blank
// 301: <header>  <-- main header
//
// We need to INSERT the trust bar opening div before line 270 and close it properly
// Lines 270-292 are actually the INNER content of the trust bar (from </span> onward)
// We need to prefix with the complete opening markup

// First, remove garbage lines 269 ('}')
// Then insert the complete trust bar wrapper before line 270

const retIdx = lines.findIndex(l => l.trim() === 'return (');
const arrowIdx = retIdx + 1; // '<>'
const garbageStart = retIdx + 2; // first garbage line

// Line 269 = garbageStart = '        }'
// Line 270 = '            </span>'  -- this is the closing of a span that had the pulse dot

// The garbage from 269-292 is the TAIL of the trust bar content starting from </span>
// We need to:
// 1. Remove line 269 (the stray '}')
// 2. Prepend the complete opening of the trust bar before line 270

// Check: line 270 is </span> closing the "Marketplace de Tecnologia..." span
// So we need to insert everything before it:
// <div className="bg-...">
//   <div className="mx-auto ...">
//     <div className="flex items-center gap-4">
//       <span className="flex items-center gap-1.5 text-gray-300">
//         <span className="h-1.5 w-1.5 ..."></span>
//         Marketplace de Tecnologia Direto & Seguro

// Also need to fix <Link href="/anunciar"> in line 289 to use button+goToAnunciar

// Step 1: remove stray '}' at garbageStart
if(lines[garbageStart].trim() === '}') {
  lines.splice(garbageStart, 1);
  console.log('Removed stray } at', garbageStart);
}

// Step 2: insert trust bar opening before the first </span>
const insertBefore = lines.findIndex((l, i) => i >= garbageStart && l.includes('</span>'));
console.log('First </span> at:', insertBefore);

const trustBarOpening = [
  '      <div className="bg-[#050705] border-b border-white/[0.06] text-[11px] text-gray-400 py-1.5 px-4 hidden sm:block">',
  '        <div className="mx-auto max-w-7xl flex justify-between items-center">',
  '          <div className="flex items-center gap-4">',
  '            <span className="flex items-center gap-1.5 text-gray-300">',
  '              <span className="h-1.5 w-1.5 rounded-full bg-[#ABDB25] animate-pulse"></span>',
  '              Marketplace de Tecnologia Direto &amp; Seguro',
];
lines.splice(insertBefore, 0, ...trustBarOpening);
console.log('Inserted trust bar opening.');

// Step 3: Fix <Link href="/anunciar"> -> button with goToAnunciar
// This is in the trust bar "Quero Vender" link
const linkIdx = lines.findIndex((l, i) => i > insertBefore && l.includes('href="/anunciar"') && l.includes('Quero Vender'));
console.log('Quero Vender link at:', linkIdx, lines[linkIdx] && lines[linkIdx].substring(0, 80));
if(linkIdx > -1) {
  lines[linkIdx] = '            <button type="button" onClick={goToAnunciar} className="text-[#ABDB25] font-semibold hover:underline bg-transparent border-none cursor-pointer">Quero Vender</button>';
  console.log('Fixed Quero Vender link -> button');
}

// Step 4: Fix carrinho Link -> button in the header
const carrinhoLinkIdx = lines.findIndex((l, i) => i > 300 && l.includes('href="/carrinho"') && l.includes('Carrinho de Compras'));
console.log('Carrinho link at:', carrinhoLinkIdx);
if(carrinhoLinkIdx > -1) {
  lines[carrinhoLinkIdx] = '              <button type="button" onClick={goToCarrinho} className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/10 bg-[#121612] text-gray-300 hover:border-[#ABDB25]/60 hover:text-[#ABDB25] transition-all" aria-label="Carrinho de Compras" title="Meu Carrinho">';
  // Also need to change closing </Link> to </button>
  const carrinhoCloseIdx = lines.findIndex((l, i) => i > carrinhoLinkIdx && l.trim() === '</Link>');
  if(carrinhoCloseIdx > -1) {
    lines[carrinhoCloseIdx] = '              </button>';
    console.log('Fixed carrinho close tag at', carrinhoCloseIdx);
  }
  console.log('Fixed carrinho link -> button');
}

// Step 5: Fix anunciar Link -> button in the header nav
const anunciarBtnIdx = lines.findIndex((l, i) => i > 300 && l.includes('href="/anunciar"') && l.includes('Anunciar'));
console.log('Anunciar btn at:', anunciarBtnIdx);
if(anunciarBtnIdx > -1) {
  lines[anunciarBtnIdx] = '              <button type="button" onClick={goToAnunciar} className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#ABDB25]/40 bg-[#ABDB25]/10 px-3.5 py-1.5 text-xs font-bold text-[#d7f58d] hover:bg-[#ABDB25] hover:text-black transition-all duration-200">';
  const anunciarCloseIdx = lines.findIndex((l, i) => i > anunciarBtnIdx && l.trim() === '</Link>');
  if(anunciarCloseIdx > -1) {
    lines[anunciarCloseIdx] = '              </button>';
    console.log('Fixed anunciar close tag at', anunciarCloseIdx);
  }
}

// Step 6: Fix mensagens Link -> button in the logged-in section
const mensagensLinkIdx = lines.findIndex((l, i) => i > 350 && l.includes('href="/mensagens"') && l.includes('Mensagens do Marketplace'));
console.log('Mensagens link at:', mensagensLinkIdx);
if(mensagensLinkIdx > -1) {
  lines[mensagensLinkIdx] = '                  <button type="button" onClick={goToMensagens} className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/10 bg-[#121612] text-gray-300 hover:border-[#ABDB25]/60 hover:text-[#ABDB25] transition-all" aria-label="Mensagens" title="Mensagens do Marketplace">';
  const mensagensCloseIdx = lines.findIndex((l, i) => i > mensagensLinkIdx && l.trim() === '</Link>');
  if(mensagensCloseIdx > -1) {
    lines[mensagensCloseIdx] = '                  </button>';
    console.log('Fixed mensagens close tag at', mensagensCloseIdx);
  }
}

fs.writeFileSync('src/app/complements/Header.js', lines.join('\n'), 'utf8');
console.log('Saved. Total lines:', lines.length);
