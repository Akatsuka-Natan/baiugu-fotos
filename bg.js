(() => {
const RAW = 'https://raw.githubusercontent.com/Akatsuka-Natan/baiugu-fotos/main/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const leaf = (txt, root = document) => [...root.querySelectorAll('*')].filter(e => e.childElementCount === 0 && e.textContent.trim() === txt && e.offsetParent !== null);
const waitFor = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { const v = fn(); if (v) return v; await sleep(250); } return null; };
const setVal = (inp, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(inp, String(v)); inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); inp.dispatchEvent(new Event('blur', { bubbles: true })); };
const item = label => { const l = leaf(label)[0]; if (!l) return null; let p = l; for (let k = 0; k < 8; k++) { p = p.parentElement; if (p.querySelector('input,.eds-selector,.eds-switch')) return p; } return null; };
const pickSelect = async (label, optText) => {
  const it = item(label); if (!it) return label + ':noitem';
  const sel = it.querySelector('.eds-selector') || it.querySelector('[class*=selector]'); sel.click();
  const opt = await waitFor(() => leaf(optText).find(e => e.closest('.eds-popover__popper,.eds-dropdown,.eds-select__options,[class*=popper],[class*=option]')) || leaf(optText).slice(-1)[0], 5000);
  if (!opt) return label + ':noopt'; opt.click(); await sleep(400); return label + ':ok';
};
window.bgData = window.bgData || null;
window.bgStep1 = async (code) => {
  if (!bgData) bgData = await (await fetch(RAW + 'listings.json?' + Date.now())).json();
  const L = bgData.find(x => x.c === code);
  const inp = await waitFor(() => document.querySelector('input[type=file][accept="image/*"]'));
  const dt = new DataTransfer();
  for (let i = 1; i <= 6; i++) { const b = await (await fetch(`${RAW}${code}/${code}_${i}.jpg`)).blob(); dt.items.add(new File([b], `${code}_${i}.jpg`, { type: 'image/jpeg' })); }
  inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(1500);
  const ob = leaf('Obter')[0]; if (ob) ob.click();
  const name = await waitFor(() => document.querySelector('input[placeholder^="Nome da marca"]'));
  setVal(name, L.title);
  await waitFor(() => document.querySelectorAll('.shopee-image-manager__itembox, [class*=image-item]').length >= 6 || null, 8000);
  await sleep(800);
  for (let k = 0; k < 20; k++) {
    const ns = [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Next Step');
    if (!ns) break;
    if (!ns.disabled && !/disabled/.test(ns.className)) ns.click();
    await sleep(1000);
  }
  const done = await waitFor(() => item('Descrição do produto'), 15000);
  return 'step1 ' + code + (done ? ' ok' : ' NEXT_FAIL');
};
window.bgStep2 = async (code) => {
  const L = bgData.find(x => x.c === code);
  const r = [];
  const catOk = await waitFor(() => { const it = item('Categoria'); const t = it && it.innerText; return t && t.includes('Moda Infantil') ? t : null; }, 15000);
  const want = L.cat === 'Vestido feminino' ? 'Roupas de Meninas > Vestidos' : L.cat === 'Conjunto masculino' ? 'Roupas de Meninos > Trajes e Conjuntos' : 'Roupas de Meninas > Trajes e Conjuntos';
  const curCat = (item('Categoria')?.innerText || '').split('\n').find(s => s.includes('>')) || '';
  r.push('cat=' + curCat);
  if (!curCat.includes(want)) { const rec = leaf('Moda Infantil > ' + want)[0]; if (rec) { rec.click(); await sleep(1500); r.push('catfix'); } else r.push('CAT_MISMATCH want ' + want); }
  await waitFor(() => item('Descrição do produto'), 10000);
  await sleep(1500);
  const v1 = leaf('Variação1')[0];
  if (v1) { let c = v1; for (let k = 0; k < 4; k++) c = c.parentElement; const x = [...c.querySelectorAll('i,svg,button,span')].find(e => /close|delete|remove/i.test((e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) + '')); if (x) { (x.closest('button,i,span') || x).dispatchEvent(new MouseEvent('click', { bubbles: true })); await sleep(1200); } r.push(leaf('Variação1')[0] ? 'VARIATION_STILL' : 'var-removed'); }
  const g = leaf('Item sem GTIN')[0]; if (g) { const cb = g.closest('label') || g; const ci = cb.querySelector('input'); if (!ci || !ci.checked) cb.click(); }
  r.push(await pickSelect('Marca', 'Sem marca'));
  const q = document.querySelector('.ql-container').__quill; q.setText(L.desc);
  const pr = item('Preço').querySelector('input.eds-input__input'); setVal(pr, L.price.toFixed(2).replace('.', ','));
  const st = item('Estoque').querySelector('input.eds-input__input'); setVal(st, L.stock);
  const ins = [...document.querySelectorAll('input.eds-input__input')];
  const kg = ins.find(i => /^kg$/.test((i.parentElement.parentElement.parentElement.innerText || '').trim()));
  const ix = ins.indexOf(kg); setVal(kg, '0,2'); setVal(ins[ix + 1], '25'); setVal(ins[ix + 2], '20'); setVal(ins[ix + 3], '4');
  await sleep(800);
  const cor = leaf('Correios')[0]; let row = cor; for (let k = 0; k < 6 && row && !row.querySelector('.eds-switch'); k++) row = row.parentElement;
  const sw = row && row.querySelector('.eds-switch'); if (sw && !/open|checked|on/.test(sw.className)) sw.click(); r.push('sw=' + (sw ? sw.className : 'none'));
  r.push(await pickSelect('Condição', 'Novo'));
  const sk = item('SKU principal')?.querySelector('input'); if (sk) setVal(sk, code);
  await sleep(500);
  const vals = [...document.querySelectorAll('input.eds-input__input')].map(i => i.value).filter(Boolean);
  r.push(JSON.stringify(vals));
  r.push('desc=' + q.getText().length);
  return r.join(' | ');
};
window.bgPublish = async () => {
  const b = [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Salvar e Publicar'); b.click();
  const ok = await waitFor(() => location.pathname.includes('/product/list') ? 'OK' : null, 20000);
  if (ok) return ok;
  const errs = [...document.querySelectorAll('.eds-form-item__extra, [class*=error]')].map(e => e.innerText.trim()).filter(Boolean);
  return 'FAIL ' + JSON.stringify(errs.slice(0, 8));
};
window.bgRun = async (code) => {
  const L = (bgData || []).find(x => x.c === code);
  if (!location.pathname.endsWith('/product/new')) {
    const a = [...document.querySelectorAll('a')].find(a => /\/portal\/product\/new(\?|\/?$)/.test(a.getAttribute('href') || ''));
    if (a) a.click(); else return 'NO_NEW_LINK';
    await waitFor(() => document.querySelector('input[type=file][accept="image/*"]') && document.querySelector('input[placeholder^="Nome da marca"]'), 15000);
    await sleep(1500);
  }
  const s1 = await bgStep1(code);
  if (!s1.endsWith('ok')) return s1;
  const s2 = await bgStep2(code);
  const L2 = bgData.find(x => x.c === code);
  const want = L2.cat === 'Vestido feminino' ? 'Vestidos' : L2.cat === 'Conjunto masculino' ? 'Roupas de Meninos' : 'Roupas de Meninas > Trajes';
  const cat = (item('Categoria')?.innerText || '');
  const bad = [];
  if (!cat.split('\n').find(x => x.includes('>') )?.includes(want)) bad.push('cat');
  if (/VARIATION_STILL|noitem|noopt|CAT_MISMATCH/.test(s2)) bad.push('s2');
  if (!s2.includes(L2.price.toFixed(2).replace('.', ','))) bad.push('price');
  if (document.querySelector('.ql-container').__quill.getText().length < 100) bad.push('desc');
  await sleep(1000);
  const sw = document.querySelector('.eds-switch'); if (!sw || !/open/.test(sw.className)) bad.push('ship');
  if (bad.length) return 'HOLD ' + code + ' ' + bad.join(',') + ' :: ' + s2;
  const p = await bgPublish();
  return code + ' ' + p + ' :: ' + (cat.split('\n').find(x => x.includes('>')) || '');
};
return 'loaded';
})()
