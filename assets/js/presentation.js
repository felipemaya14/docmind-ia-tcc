const totalSlides = 16;
let current = 0;
const deck = document.getElementById('deck');
const dotsWrap = document.getElementById('dots');

for(let i=0;i<totalSlides;i++){
  const d = document.createElement('div');
  d.className = 'dot' + (i===0?' active':'');
  d.onclick = () => goTo(i);
  dotsWrap.appendChild(d);
}

function render(){
  deck.style.transform = `translateX(-${current*100}vw)`;
  document.getElementById('progress').style.width = `${((current+1)/totalSlides)*100}%`;
  document.getElementById('slideCounter').textContent = String(current+1).padStart(2,'0') + ' / ' + totalSlides;
  document.querySelectorAll('.dot').forEach((d,i)=>d.classList.toggle('active', i===current));
}
function go(dir){ goTo(Math.min(totalSlides-1, Math.max(0, current+dir))); }
function goTo(i){ current = i; render(); }
render();

const glossary = [
  ["Amazon Cognito", "Serviço de identidade gerenciado da AWS — cuida de cadastro, login e emissão de token, sem precisar programar autenticação do zero."],
  ["Serverless", "Sem servidor fixo pra gerenciar. O código só \"liga\" no exato momento de uma requisição, e a AWS cuida do resto."],
  ["API Gateway", "A porta de entrada única do sistema — recebe cada pedido do cliente e confere quem está pedindo antes de deixar passar."],
  ["AWS Lambda", "Um pedaço de código que roda sob demanda, sem servidor dedicado. Paga-se só pelos segundos em que ele realmente executa."],
  ["Amazon S3", "O serviço de armazenamento de arquivos da AWS — o \"HD\" onde os documentos ficam guardados."],
  ["IAM", "O sistema de permissões da AWS — decide, regra por regra, quem pode fazer o quê em cada recurso."],
  ["Presigned URL", "Um link de acesso temporário e assinado digitalmente — funciona por poucos minutos e depois expira sozinho."],
  ["Lifecycle (S3)", "Uma regra automática que muda o arquivo de \"prateleira\" (classe de armazenamento) conforme o tempo passa — sem apagar nada."],
  ["Glacier Deep Archive", "A classe de armazenamento mais barata da AWS — ideal pra guardar dados por muito tempo, com acesso mais lento (~12h)."],
  ["Multi-tenant", "Vários clientes dividindo a mesma infraestrutura, mas isolados uns dos outros como se cada um tivesse a sua."],
  ["Free Tier", "A cota mensal gratuita que a AWS oferece pra cada serviço — renova todo mês, não é um bônus único."],
];
document.getElementById('glossaryGrid').innerHTML = glossary.map(([t,d])=>
  `<div class="gloss-item"><div class="gloss-term">${t}</div><div class="gloss-def">${d}</div></div>`
).join('');

document.addEventListener('keydown', (e)=>{
  if(e.key==='ArrowRight'||e.key===' ') go(1);
  if(e.key==='ArrowLeft') go(-1);
  if(e.key.toLowerCase()==='g'){ document.getElementById('glossaryPanel').classList.toggle('open'); }
});

/* ---------- Timer ---------- */
let timeLeft = 15*60, timerRunning=false, timerInterval=null;
function fmt(s){ const m=Math.floor(s/60), sec=s%60; return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0'); }
function toggleTimer(){
  timerRunning = !timerRunning;
  if(timerRunning){
    timerInterval = setInterval(()=>{
      timeLeft = Math.max(0,timeLeft-1);
      document.getElementById('timerLabel').textContent = fmt(timeLeft);
      document.getElementById('timerBox').classList.toggle('warn', timeLeft<=60);
    },1000);
  } else { clearInterval(timerInterval); }
}

/* ---------- Diagram interactivity ---------- */
const diagramData = {
  client: {t:"Cliente", d:["Envia o PDF/imagem junto com sua identificação (token de autenticação).","Do lado do cliente, tudo parece uma chamada HTTPS simples — toda a complexidade de segurança fica escondida atrás do API Gateway."]},
  cognito: {t:"Amazon Cognito", d:["Acontece uma única vez, antes do cliente começar a enviar qualquer arquivo — login, verificação e emissão do token, sem nenhuma senha guardada à mão pela aplicação.","O token (JWT) fica com o cliente e é reaproveitado em cada upload/download — não é preciso passar pelo Cognito de novo a cada requisição."]},
  api: {t:"Amazon API Gateway", d:["Primeira parada de toda requisição. Valida o token do usuário antes de deixar qualquer coisa passar.","Repassa para a Lambda já com o ID do usuário autenticado extraído do token — nunca de um campo livre do formulário."]},
  lambda: {t:"AWS Lambda", d:["Monta a chave usuario-{id}/arquivo.pdf usando o ID vindo do token, nunca de um input do cliente.","Gera uma URL assinada (presigned) de curtíssima duração, restrita a esse único objeto."]},
  s3standard: {t:"S3 Standard", d:["Guarda os documentos dos últimos 12 meses — a janela de acesso ativo do cliente.","Acesso instantâneo, ideal para quando o cliente ainda consulta o arquivo com frequência."]},
  glacier: {t:"S3 Glacier Deep Archive", d:["Recebe automaticamente, via Lifecycle, tudo que passou de 365 dias — sem intervenção manual.","23x mais barato que o Standard. O dado nunca é apagado, só muda de 'prateleira'."]},
};
const cliMessages = {
  client: '<span style="color:var(--text);">[HTTPS_REQUEST]</span> Cliente autenticado envia requisição com token Bearer no header.',
  cognito: '<span style="color:var(--ice);">[COGNITO]</span> (Passo único, prévio) Credenciais validadas no User Pool. Token JWT emitido — sub do usuário embutido e assinado.',
  api: '<span style="color:#8C4FFF;">[API_GATEWAY]</span> Token validado na borda. ID do usuário extraído e injetado no contexto — requisição roteada para a Lambda.',
  lambda: '<span style="color:var(--accent);">[LAMBDA]</span> Execução iniciada. Gerando URL assinada restrita a <span style="color:var(--accent);">usuario-{id}/*</span> — expira em minutos.',
  s3standard: '<span style="color:var(--teal);">[S3_STANDARD]</span> Objeto localizado na camada quente. Upload/download liberado via link temporário.',
  glacier: '<span style="color:var(--teal);">[S3_LIFECYCLE]</span> Objeto completou 365 dias — regra de Lifecycle migra automaticamente para Glacier Deep Archive.',
};
function cliLog(target){
  const log = document.getElementById('cliLog');
  const time = new Date().toLocaleTimeString('pt-BR');
  const line = document.createElement('div');
  line.className = 'cli-line';
  line.innerHTML = `<span class="cli-time">[${time}]</span>${cliMessages[target]}`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}
document.querySelectorAll('.node').forEach(node=>{
  node.addEventListener('click', ()=>{
    document.querySelectorAll('.node').forEach(n=>n.classList.remove('active'));
    node.classList.add('active');
    const data = diagramData[node.dataset.target];
    document.getElementById('detailPanel').innerHTML = `<div class="d-eyebrow">Componente selecionado</div><h3>${data.t}</h3>${data.d.map(p=>`<p>${p}</p>`).join('')}`;
    cliLog(node.dataset.target);
  });
});
document.getElementById('node-client').click();

/* ---------- Cost calculator ---------- */
const PRICE = {
  s3Standard: 0.023, s3Glacier: 0.00099, s3Put: 0.005, s3Get: 0.0004,
  lambdaReq: 0.20, lambdaFreeReq: 1000000, lambdaGBsX86: 0.0000166667, lambdaGBsArm: 0.0000133334, lambdaFreeGBs: 400000,
  apiRest: 3.50, apiHttp: 1.00,
  transferFreeGB: 100, transferRate: 0.09
};
let apiType = 'REST';
function setApi(t){
  apiType = t;
  document.getElementById('btnRest').classList.toggle('active', t==='REST');
  document.getElementById('btnHttp').classList.toggle('active', t==='HTTP');
  updateCalc();
}
function money(v){ return '$' + v.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}); }

function updateCalc(){
  const files = +document.getElementById('rngFiles').value;
  const size = +document.getElementById('rngSize').value;
  const months = +document.getElementById('rngMonths').value;
  const downloadsPerFile = +document.getElementById('rngDownloads').value;
  document.getElementById('lblFiles').textContent = files.toLocaleString('pt-BR');
  document.getElementById('lblSize').textContent = size.toFixed(1);
  document.getElementById('lblMonths').textContent = months;
  document.getElementById('lblDownloads').textContent = downloadsPerFile.toFixed(1);

  // ---- Armazenamento (sempre presente, independe de download) ----
  const monthlyGB = (files*size)/1000;
  const stdMonths = Math.min(months,12);
  const glMonths = Math.max(months-12,0);
  const stdGB = stdMonths*monthlyGB;
  const glGB = glMonths*monthlyGB;
  const storageCost = stdGB*PRICE.s3Standard + glGB*PRICE.s3Glacier;
  const noLifecycle = months*monthlyGB*PRICE.s3Standard;

  // ---- Upload vs Download, cada um com sua fatia de S3 + Lambda + API ----
  const puts = files;
  const gets = files*downloadsPerFile;
  const totalReq = puts+gets;

  const s3PutCost = (puts/1000)*PRICE.s3Put;
  const s3GetCost = (gets/1000)*PRICE.s3Get;

  const memoryGb = 512/1024;
  const lambdaRate = PRICE.lambdaGBsX86;
  const billableReq = Math.max(totalReq-PRICE.lambdaFreeReq,0);
  const gbSeconds = totalReq*memoryGb*0.3;
  const billableGBs = Math.max(gbSeconds-PRICE.lambdaFreeGBs,0);
  const lambdaCostTotal = (billableReq/1000000)*PRICE.lambdaReq + billableGBs*lambdaRate;

  const apiRate = apiType==='REST'?PRICE.apiRest:PRICE.apiHttp;
  const apiCostTotal = (totalReq/1000000)*apiRate;

  // Rateia Lambda + API Gateway proporcionalmente entre upload e download
  const putShare = totalReq>0 ? puts/totalReq : 0;
  const getShare = totalReq>0 ? gets/totalReq : 0;
  const lambdaUpload = lambdaCostTotal*putShare, lambdaDownload = lambdaCostTotal*getShare;
  const apiUpload = apiCostTotal*putShare, apiDownload = apiCostTotal*getShare;

  const downloadGB = (gets*size)/1000;
  const billableTransferGB = Math.max(downloadGB-PRICE.transferFreeGB,0);
  const transferCost = billableTransferGB*PRICE.transferRate;

  const uploadCost = s3PutCost + lambdaUpload + apiUpload;
  const readCost = s3GetCost + lambdaDownload + apiDownload;

  const keepRunning = storageCost + uploadCost;
  const downloadTotal = readCost + transferCost;

  const total = keepRunning + downloadTotal;
  const totalNoLifecycle = (noLifecycle+uploadCost) + downloadTotal;

  document.getElementById('resultTotal').innerHTML = money(total)+'<span>/mês total</span>';
  document.getElementById('valKeepRunning').textContent = money(keepRunning);
  document.getElementById('valDownload').textContent = money(downloadTotal);
  document.getElementById('valStorage').textContent = money(storageCost);
  document.getElementById('valUpload').textContent = money(uploadCost);
  document.getElementById('valRead').textContent = money(readCost) + (readCost < 0.005 ? ' · Free Tier' : '');
  document.getElementById('valTransfer').textContent = money(transferCost);
  document.getElementById('valNoLifecycle').textContent = money(totalNoLifecycle);

  const savingsPct = totalNoLifecycle>0 ? Math.round((1-total/totalNoLifecycle)*100) : 0;
  document.getElementById('valSavings').textContent = 'economia de ' + Math.max(savingsPct,0) + '%';

  const totalForBars = total || 0.0001;
  document.getElementById('barStorage').style.width = (storageCost/totalForBars*100)+'%';
  document.getElementById('barUpload').style.width = Math.max((uploadCost/totalForBars*100),1)+'%';
  document.getElementById('barRead').style.width = Math.max((readCost/totalForBars*100),1)+'%';
  document.getElementById('barTransfer').style.width = (transferCost/totalForBars*100)+'%';
}
['rngFiles','rngSize','rngMonths','rngDownloads'].forEach(id=>document.getElementById(id).addEventListener('input', updateCalc));
updateCalc();
