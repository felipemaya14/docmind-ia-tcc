/* ---------- Pricing (mesmas constantes da calculadora do case, us-east-1, jul/2026) ---------- */
const PRICE = { s3Standard:0.023, s3Glacier:0.00099, s3Put:0.005, s3Get:0.0004 };

/* ---------- Estado ---------- */
const tenants = {
  alpha: { name:'Empresa Alpha', prefix:'usuario-alpha' },
  beta:  { name:'Empresa Beta',  prefix:'usuario-beta' }
};
let currentTenant = 'alpha';
let monthsElapsed = 0;
let docs = { alpha: [], beta: [] };
let requestCount = 0;
let docSeq = 0;

/* ---------- Terminal ---------- */
function log(html, color){
  const el = document.getElementById('terminalLog');
  const time = new Date().toLocaleTimeString('pt-BR');
  const line = document.createElement('div');
  line.className = 't-line';
  line.innerHTML = `<span class="tt">[${time}]</span><span style="color:${color||'inherit'}">${html}</span>`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  requestCount++;
}

/* ---------- Tenant ---------- */
function switchTenant(id){
  currentTenant = id;
  document.getElementById('tenantLabel').textContent = tenants[id].name;
  document.getElementById('prefixHint').textContent = `${tenants[id].prefix}/arquivo.pdf`;
  log(`<span style="color:var(--ice);">[IAM]</span> Sessão trocada — policy agora restringe acesso a <b>${tenants[id].prefix}/*</b>.`, null);
  renderDocs();
  renderCost();
}

/* ---------- Tempo / Lifecycle ---------- */
function setMonths(v){
  monthsElapsed = +v;
  const readout = document.getElementById('monthsReadout');
  let transitioned = 0;
  Object.keys(docs).forEach(t=>{
    docs[t].forEach(d=>{
      const wasGlacier = d.tier === 'glacier';
      d.tier = (monthsElapsed - d.uploadedMonth) >= 12 ? 'glacier' : 'standard';
      if(d.tier === 'glacier' && !wasGlacier) transitioned++;
    });
  });
  readout.textContent = `mês ${monthsElapsed} · ${monthsElapsed>=12 ? 'transição ativa' : 'janela de acesso ativo'}`;
  if(transitioned > 0){
    log(`<span style="color:var(--teal);">[S3_LIFECYCLE]</span> Regra automática migrou ${transitioned} objeto(s) pra Glacier Deep Archive — nenhuma ação manual.`, null);
  }
  renderDocs();
  renderCost();
}

/* ---------- Upload ---------- */
const dz = document.getElementById('dropzone');
['dragover','dragleave','drop'].forEach(evt=>{
  dz.addEventListener(evt, e=>{
    e.preventDefault();
    dz.classList.toggle('drag', evt==='dragover');
    if(evt==='drop') handleFiles(e.dataTransfer.files);
  });
});
function handleFiles(fileList){
  Array.from(fileList).forEach(file=>{
    const reader = new FileReader();
    reader.onload = ()=>{
      const blob = new Blob([reader.result], {type:file.type || 'application/octet-stream'});
      const doc = {
        id: 'doc'+(docSeq++),
        name: file.name,
        size: file.size,
        uploadedMonth: monthsElapsed,
        tier: 'standard',
        blob
      };
      docs[currentTenant].push(doc);
      const prefix = tenants[currentTenant].prefix;
      log(`<span style="color:var(--text);">[HTTPS_PUT]</span> Cliente envia <b>${file.name}</b> com token Bearer.`, null);
      log(`<span style="color:var(--ice);">[API_GATEWAY]</span> Token validado, roteando pra Lambda.`, null);
      log(`<span style="color:var(--accent);">[LAMBDA]</span> Gerando URL assinada restrita a <b>${prefix}/${file.name}</b> — expira em minutos.`, null);
      log(`<span style="color:var(--teal);">[S3_STANDARD]</span> Objeto armazenado (${formatSize(file.size)}).`, null);
      renderDocs();
      renderCost();
    };
    reader.readAsArrayBuffer(file);
  });
  document.getElementById('fileInput').value = '';
}

/* ---------- Download ---------- */
function handleDownload(id){
  const doc = docs[currentTenant].find(d=>d.id===id);
  if(!doc) return;
  const prefix = tenants[currentTenant].prefix;
  log(`<span style="color:var(--text);">[HTTPS_GET]</span> Cliente solicita download de <b>${doc.name}</b>.`, null);
  log(`<span style="color:var(--ice);">[API_GATEWAY]</span> Token validado.`, null);
  log(`<span style="color:var(--accent);">[LAMBDA]</span> Gerando URL assinada de leitura restrita a <b>${prefix}/${doc.name}</b>.`, null);
  if(doc.tier === 'glacier'){
    log(`<span style="color:var(--ice);">[S3_GLACIER]</span> Objeto em camada fria — restore iniciado (no mundo real leva de 3 a 12h).`, null);
    log(`<span style="color:var(--ice);">[S3_GLACIER]</span> Restore concluído (simulado). Link liberado.`, null);
  } else {
    log(`<span style="color:var(--teal);">[S3_STANDARD]</span> Link liberado imediatamente.`, null);
  }
  const url = URL.createObjectURL(doc.blob);
  const a = document.createElement('a');
  a.href = url; a.download = doc.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
  renderCost();
}

function removeDoc(id){
  docs[currentTenant] = docs[currentTenant].filter(d=>d.id!==id);
  log(`<span style="color:var(--red);">[S3_DELETE]</span> Objeto removido manualmente da simulação (fora do fluxo real — no case, nada é deletado).`, null);
  renderDocs();
  renderCost();
}

/* ---------- Teste de isolamento IAM ---------- */
function attemptCrossTenant(){
  const otherId = currentTenant === 'alpha' ? 'beta' : 'alpha';
  const other = tenants[otherId];
  log(`<span style="color:var(--red);">[S3_GET]</span> Tentando ler <b>${other.prefix}/qualquer-arquivo.pdf</b> a partir da sessão de ${tenants[currentTenant].name}...`, null);
  log(`<span style="color:var(--red);">[IAM] AccessDenied</span> — a policy da role só permite ação em <b>${tenants[currentTenant].prefix}/*</b>. Requisição negada antes de tocar no S3.`, null);
}

/* ---------- Render ---------- */
function formatSize(bytes){
  if(bytes < 1024) return bytes + ' B';
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1024/1024).toFixed(2) + ' MB';
}
function renderDocs(){
  const body = document.getElementById('docsBody');
  const list = docs[currentTenant];
  if(list.length === 0){
    body.innerHTML = `<tr class="empty-row"><td colspan="5">Nenhum documento ainda para ${tenants[currentTenant].name}.<br>Envie o primeiro arquivo acima pra ver upload, Lifecycle e download funcionando de verdade.</td></tr>`;
    return;
  }
  body.innerHTML = list.map(d=>`
    <tr>
      <td><div class="doc-name"><span class="fi">📄</span>${d.name}</div></td>
      <td>${formatSize(d.size)}</td>
      <td>mês ${d.uploadedMonth}</td>
      <td>${d.tier==='glacier'
        ? '<span class="tier-pill glacier">❄ Glacier Deep Archive</span>'
        : '<span class="tier-pill standard">☀ S3 Standard</span>'}</td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="btn-dl" onclick="handleDownload('${d.id}')">Baixar</button>
        <button class="btn-rm" onclick="removeDoc('${d.id}')" title="Remover da simulação">✕</button>
      </td>
    </tr>
  `).join('');
}
function renderCost(){
  let storageCost = 0, requestCost = 0, puts=0, gets=0;
  Object.values(docs).flat().forEach(d=>{
    const gb = d.size / (1024**3);
    storageCost += gb * (d.tier==='glacier' ? PRICE.s3Glacier : PRICE.s3Standard);
    puts++;
  });
  requestCost = (puts/1000)*PRICE.s3Put;
  document.getElementById('costStorage').textContent = '$' + storageCost.toFixed(6);
  document.getElementById('costRequests').textContent = '$' + requestCost.toFixed(6);
  document.getElementById('costTotal').textContent = '$' + (storageCost+requestCost).toFixed(2);
}

/* ---------- Init ---------- */
log('<span style="color:var(--text-dim);">[SYS_INIT]</span> Ambiente carregado. Selecione um tenant e envie um arquivo pra começar.', null);
renderDocs();
renderCost();
