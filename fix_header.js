const fs = require('fs');
const c = fs.readFileSync('src/app/complements/Header.js', 'utf8');
const lines = c.split('\n');

// Fix requireAuth template literal
const idxRL = lines.findIndex(l => l.includes('router.push(/?login'));
if(idxRL > -1) {
  lines[idxRL] = "      router.push(`/?login=1&next=${encodeURIComponent(path)}`);";
  console.log('Fixed requireAuth at', idxRL);
}

// Fix handleSearchSubmit template literal
const idxST = lines.findIndex(l => l.includes('router.push(/produtos?search='));
if(idxST > -1) {
  lines[idxST] = "      router.push(`/produtos?search=${encodeURIComponent(searchTerm.trim())}`);";
  console.log('Fixed search at', idxST);
}

// Remove garbage lines after return (<>
const retIdx = lines.findIndex((l,i) => i > 200 && l.trim() === 'return (');
console.log('return( at:', retIdx);
if(retIdx > -1) {
  const afterGt = retIdx + 2;
  const trustBarIdx = lines.findIndex((l, i) => i > afterGt && l.includes('bg-[#050705]') && l.includes('border-b'));
  console.log('Trust bar at:', trustBarIdx, '| garbage from:', afterGt);
  if(trustBarIdx > -1 && trustBarIdx > afterGt) {
    lines.splice(afterGt, trustBarIdx - afterGt);
    console.log('Removed garbage lines');
  }
}

// Fix missing closing brace for if(nextPath) block
const replIdx = lines.findIndex((l,i) => i > 200 && l.includes('router.replace(nextPath)'));
if(replIdx > -1) {
  console.log('router.replace at', replIdx, '| next:', lines[replIdx+1] && lines[replIdx+1].trim().substring(0,30));
  if(!lines[replIdx+1] || !lines[replIdx+1].trim().startsWith('}')) {
    lines.splice(replIdx+1, 0, '        }');
    console.log('Inserted } after router.replace');
  }
}

fs.writeFileSync('src/app/complements/Header.js', lines.join('\n'), 'utf8');
console.log('Done. Lines:', lines.length);
