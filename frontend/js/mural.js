/**
 * Módulo do Mural: Feed, Carrossel de Destaques e Modais de Publicação
 */

let tipoOrdenacao = 'recent';
let listaPublicacoes = [];
let idPublicacaoAtualDetalhes = null;

let destaquesAtuais = [];
let indiceSlideDestaque = 0;
let temporizadorCarrosselDestaques = null;
const INTERVALO_SLIDE_DESTAQUES = 10000;

function definirOrdenacao(tipo) {
  tipoOrdenacao = tipo;
  document.querySelectorAll('#sortFilterGroup button').forEach(botao => {
    botao.classList.toggle('active', botao.getAttribute('data-sort') === tipo);
  });
  carregarPublicacoes();
}

async function carregarPublicacoes() {
  const container = document.getElementById('postsContainer');
  container.innerHTML = `
    <div class="col-12 text-center py-5 text-muted">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2 small">Carregando...</p>
    </div>
  `;

  const filtroCategoria = ['home', 'perfil', 'calendario', 'usuarios'].includes(abaAtual) ? '' : abaAtual;
  const termoBusca = document.getElementById('globalSearchInput')?.value || '';

  try {
    const publicacoes = await servicoApi.obterPublicacoes(filtroCategoria, termoBusca, tipoOrdenacao);
    listaPublicacoes = Array.isArray(publicacoes) ? publicacoes : [];
    renderizarPublicacoes(listaPublicacoes);

    if (abaAtual === 'home' && !termoBusca) {
      renderizarDestaques(listaPublicacoes);
    } else {
      pararTemporizadorDestaques();
      document.getElementById('destaquesView')?.classList.add('d-none');
    }
  } catch {
    pararTemporizadorDestaques();
    document.getElementById('destaquesView')?.classList.add('d-none');
    exibirAlerta('Não foi possível conectar ao servidor Flask (verifique se a API está rodando na porta 5000).', 'warning');
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-exclamation-triangle fs-1 text-warning"></i>
        <h5 class="mt-3">Servidor Backend Desconectado</h5>
        <p class="text-muted small">Inicie a API em <code>backend/run.py</code> para carregar as publicações reais.</p>
      </div>
    `;
  }
}

function gerarHtmlCardPublicacao(post, exibirAcoesDono = false) {
  const configCategoria = MAPA_CATEGORIAS[post.category] || { label: 'Aviso', class: 'badge-secondary', pin: 'pino-editais' };
  const foiCurtido = publicacoesCurtidas.has(post.id);
  const foiSalvo = publicacoesSalvas.has(post.id);
  const ehAchados = post.category === 'achados';

  return `
    <div class="col-md-6 col-xl-4">
      <div class="card card-mural h-100 p-3 shadow-sm" onclick="abrirModalDetalhes(${post.id})" title="Clique para ver detalhes">
        <span class="indicador-pino ${configCategoria.pin}"></span>
        
        ${post.image_url ? `
          <div class="card-mural-imagem mb-2 rounded-3 overflow-hidden border">
            <img src="${escaparHTML(post.image_url)}" alt="${escaparHTML(post.title)}" class="w-100 object-fit-cover" style="height: 140px;" loading="lazy">
          </div>
        ` : ''}

        <div class="d-flex align-items-center gap-2 mb-2">
          <span class="badge ${configCategoria.class} rounded-pill px-2 py-1">${configCategoria.label}</span>
          ${post.sub_type ? `<span class="badge bg-body-secondary text-body border">${escaparHTML(post.sub_type)}</span>` : ''}
          ${post.is_pinned ? '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"><i class="bi bi-pin-fill"></i> Fixado</span>' : ''}
        </div>

        <h5 class="card-title fw-bold fs-6 mb-2">${escaparHTML(post.title)}</h5>
        <p class="card-text text-muted small flex-grow-1">${escaparHTML(post.description)}</p>

        ${post.price ? `<div class="fw-bold text-success mb-2">${escaparHTML(post.price)}</div>` : ''}
        ${exibirAcoesDono && post.deadline ? `<div class="small fw-semibold text-primary mb-2"><i class="bi bi-calendar-range me-1"></i>Período: ${escaparHTML(post.deadline)}</div>` : ''}

        <div class="d-flex justify-content-between align-items-center pt-2 mt-2 border-top text-muted small">
          <span><i class="bi bi-geo-alt me-1"></i>${escaparHTML(post.location || 'Campus Lapa')}</span>
          
          <div class="d-flex align-items-center gap-2">
            ${exibirAcoesDono && podeEditarPublicacao(post) ? `
              <button class="btn btn-sm btn-outline-warning py-0 px-2" onclick="event.stopPropagation(); abrirModalEdicaoPublicacao(${post.id})" title="Editar">
                <i class="bi bi-pencil"></i>
              </button>
            ` : ''}

            ${exibirAcoesDono ? `
              <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="event.stopPropagation(); excluirPublicacao(${post.id})" title="Excluir">
                <i class="bi bi-trash"></i>
              </button>
            ` : ''}

            ${!exibirAcoesDono && post.contact_wpp ? `
              <a href="https://wa.me/${post.contact_wpp}" target="_blank" class="btn btn-sm btn-outline-success py-0 px-2" title="Contato via WhatsApp" onclick="event.stopPropagation();">
                <i class="bi bi-whatsapp"></i>
              </a>
            ` : ''}

            <button class="btn btn-sm ${foiSalvo ? 'btn-warning text-dark' : 'btn-outline-secondary'} py-0 px-2" onclick="event.stopPropagation(); alternarSalvar(${post.id}, this)" title="${foiSalvo ? 'Remover dos salvos' : 'Salvar publicação'}">
              <i class="bi ${foiSalvo ? 'bi-bookmark-fill' : 'bi-bookmark'}"></i>
            </button>

            ${!ehAchados ? `
              <button class="btn btn-sm ${foiCurtido ? 'btn-danger' : 'btn-outline-danger'} py-0 px-2" onclick="event.stopPropagation(); aoCurtir(${post.id}, this)" title="Curtir">
                <i class="bi ${foiCurtido ? 'bi-heart-fill' : 'bi-heart'}"></i>
                <span class="contador-curtidas">${post.likes_count || 0}</span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderizarPublicacoes(publicacoes) {
  const container = document.getElementById('postsContainer');
  if (!publicacoes || publicacoes.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5 text-muted">
        <i class="bi bi-inbox fs-1"></i>
        <p class="mt-2">Nenhuma publicação encontrada nesta categoria.</p>
      </div>
    `;
    return;
  }
  container.innerHTML = publicacoes.map(p => gerarHtmlCardPublicacao(p, false)).join('');
}

/* --- CARROSSEL DE DESTAQUES --- */
function renderizarDestaques(publicacoes) {
  const containerPrincipal = document.getElementById('cardDestaquePrincipal');
  const viewDestaques = document.getElementById('destaquesView');
  if (!containerPrincipal || !viewDestaques) return;

  const fixados = publicacoes.filter(p => p.is_pinned);
  const restantes = publicacoes.filter(p => !p.is_pinned).sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
  destaquesAtuais = [...fixados, ...restantes].slice(0, 5);

  if (destaquesAtuais.length === 0) {
    pararTemporizadorDestaques();
    viewDestaques.classList.add('d-none');
    return;
  }

  viewDestaques.classList.remove('d-none');
  indiceSlideDestaque = 0;
  exibirSlideDestaque(0);
  renderizarListaLateralDestaques();
  iniciarTemporizadorDestaques();
}

function exibirSlideDestaque(indice) {
  if (!destaquesAtuais.length) return;
  indiceSlideDestaque = (indice + destaquesAtuais.length) % destaquesAtuais.length;
  const post = destaquesAtuais[indiceSlideDestaque];
  const containerPrincipal = document.getElementById('cardDestaquePrincipal');
  if (!containerPrincipal) return;

  const configCategoria = MAPA_CATEGORIAS[post.category] || { label: 'Aviso Institucional', class: 'etiqueta-editais' };
  const bannerBgHtml = post.image_url
    ? `<img src="${escaparHTML(post.image_url)}" alt="${escaparHTML(post.title)}" class="card-destaque-img-bg" loading="lazy">`
    : `<div class="card-destaque-fallback-bg"><div class="text-white text-center opacity-25"><i class="bi bi-mortarboard-fill display-1"></i></div></div>`;

  const indicadoresHtml = destaquesAtuais.map((_, i) => `
    <span class="indicador-slide ${i === indiceSlideDestaque ? 'ativo' : ''}" onclick="event.stopPropagation(); irParaSlideDestaque(${i})" title="Ir para notícia ${i + 1}"></span>
  `).join('');

  containerPrincipal.innerHTML = `
    ${bannerBgHtml}
    <div class="card-destaque-overlay">
      <div class="card-destaque-conteudo">
        <div class="d-flex align-items-center gap-2 mb-2">
          <span class="badge ${configCategoria.class} rounded-pill px-2 py-1" style="font-size: 0.7rem;">
            ${post.is_pinned ? '<i class="bi bi-pin-fill me-1"></i>' : ''}${configCategoria.label}
          </span>
          ${post.sub_type ? `<span class="badge bg-dark bg-opacity-50 text-white border border-light border-opacity-25" style="font-size:0.7rem;">${escaparHTML(post.sub_type)}</span>` : ''}
        </div>
        <h3 class="card-destaque-titulo-principal">${escaparHTML(post.title)}</h3>
        ${post.description ? `<p class="card-destaque-subtexto mb-0">${escaparHTML(post.description)}</p>` : ''}
      </div>
    </div>
    <div class="card-destaque-indicadores">${indicadoresHtml}</div>
  `;

  containerPrincipal.onclick = () => abrirModalDetalhes(post.id);
  document.querySelectorAll('.item-noticia-lateral').forEach((el, i) => {
    el.classList.toggle('ativo-lateral', i === indiceSlideDestaque);
  });
}

function renderizarListaLateralDestaques() {
  const containerLista = document.getElementById('destaquesListaLateral');
  if (!containerLista) return;

  containerLista.innerHTML = destaquesAtuais.map((post, i) => `
    <div class="item-noticia-lateral ${i === indiceSlideDestaque ? 'ativo-lateral' : ''}" onclick="irParaSlideDestaque(${i})">
      <div class="item-noticia-titulo">${escaparHTML(post.title)}</div>
      <div class="item-noticia-meta d-flex align-items-center justify-content-between">
        <span><i class="bi bi-geo-alt me-1"></i>${escaparHTML(post.location || 'Campus Lapa')}</span>
        ${post.category !== 'achados' ? `<span><i class="bi bi-heart me-1"></i>${post.likes_count || 0}</span>` : ''}
      </div>
    </div>
  `).join('');
}

function irParaSlideDestaque(indice) {
  exibirSlideDestaque(indice);
  iniciarTemporizadorDestaques();
}

function iniciarTemporizadorDestaques() {
  pararTemporizadorDestaques();
  if (destaquesAtuais.length <= 1) return;
  temporizadorCarrosselDestaques = setInterval(() => exibirSlideDestaque(indiceSlideDestaque + 1), INTERVALO_SLIDE_DESTAQUES);
}

function pararTemporizadorDestaques() {
  if (temporizadorCarrosselDestaques) {
    clearInterval(temporizadorCarrosselDestaques);
    temporizadorCarrosselDestaques = null;
  }
}

function configurarCarrosselDestaques() {
  const viewDestaques = document.getElementById('destaquesView');
  if (!viewDestaques) return;
  viewDestaques.addEventListener('mouseenter', pararTemporizadorDestaques);
  viewDestaques.addEventListener('mouseleave', () => {
    if (abaAtual === 'home') iniciarTemporizadorDestaques();
  });
}

function rolarParaMural(evento) {
  if (evento) evento.preventDefault();
  document.getElementById('postsContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* --- PERMISSÕES, DETALHES, EDIÇÃO E EXCLUSÃO --- */
function podeEditarPublicacao(post) {
  const u = obterUsuarioSessao();
  if (!u || u.role === 'guest') return false;
  if (u.role === 'admin' || u.role === 'dev') return true;
  const ehDono = (post.user_id && Number(post.user_id) === Number(u.id)) ||
                 ((post.author || '').trim().toLowerCase() === (u.name || '').trim().toLowerCase());
  if (!ehDono || !post.created_at) return false;
  const diffMin = (Date.now() - new Date(post.created_at + (post.created_at.endsWith('Z') ? '' : 'Z')).getTime()) / 60000;
  return diffMin <= 30;
}

function podeExcluirPublicacao(post) {
  const u = obterUsuarioSessao();
  if (!u || u.role === 'guest') return false;
  if (u.role === 'admin' || u.role === 'dev') return true;
  return (post.user_id && Number(post.user_id) === Number(u.id)) ||
         ((post.author || '').trim().toLowerCase() === (u.name || '').trim().toLowerCase());
}

async function abrirModalDetalhes(idPublicacao) {
  let publicacao = listaPublicacoes.find(p => Number(p.id) === Number(idPublicacao));
  if (!publicacao) {
    try {
      publicacao = await servicoApi.obterPublicacaoPorId(idPublicacao);
      if (publicacao) listaPublicacoes.push(publicacao);
    } catch {}
  }
  if (!publicacao) return;

  idPublicacaoAtualDetalhes = publicacao.id;
  const configCategoria = MAPA_CATEGORIAS[publicacao.category] || { label: 'Aviso', class: 'badge-secondary' };
  const ehAchados = publicacao.category === 'achados';
  const foiCurtido = publicacoesCurtidas.has(publicacao.id);
  const foiSalvo = publicacoesSalvas.has(publicacao.id);

  const badge = document.getElementById('postModalBadge');
  badge.className = `badge rounded-pill px-3 py-1 ${configCategoria.class}`;
  badge.textContent = configCategoria.label;

  const subTipo = document.getElementById('postModalSubType');
  subTipo.textContent = publicacao.sub_type || '';
  subTipo.classList.toggle('d-none', !publicacao.sub_type);

  document.getElementById('postModalPinned')?.classList.toggle('d-none', !publicacao.is_pinned);

  const containerImagem = document.getElementById('postModalImageContainer');
  const elementoImagem = document.getElementById('postModalImage');
  elementoImagem.src = publicacao.image_url || '';
  containerImagem.classList.toggle('d-none', !publicacao.image_url);

  document.getElementById('postModalTitle').textContent = publicacao.title;
  document.getElementById('postModalDesc').textContent = publicacao.description || 'Nenhum detalhe adicional informado.';
  document.getElementById('postModalAuthor').innerHTML = `<i class="bi bi-person me-1"></i>${escaparHTML(publicacao.author || 'Membro do IF')}`;
  document.getElementById('postModalLocation').innerHTML = `<i class="bi bi-geo-alt me-1"></i>${escaparHTML(publicacao.location || 'Campus Lapa')}`;

  let textoData = 'Recente';
  if (publicacao.created_at) {
    const dt = new Date(publicacao.created_at + (publicacao.created_at.endsWith('Z') ? '' : 'Z'));
    textoData = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  document.getElementById('postModalDate').innerHTML = `<i class="bi bi-clock me-1"></i>${textoData}`;

  const destaque = document.getElementById('postModalHighlight');
  if (publicacao.price) {
    destaque.className = 'p-3 rounded-3 bg-success-subtle text-success-emphasis border border-success-subtle d-flex align-items-center gap-2 fw-bold mb-3';
    destaque.innerHTML = `<i class="bi bi-tag-fill fs-5"></i><span>Valor: ${escaparHTML(publicacao.price)}</span>`;
  } else if (publicacao.deadline) {
    destaque.className = 'p-3 rounded-3 bg-warning-subtle text-warning-emphasis border border-warning-subtle d-flex align-items-center gap-2 fw-bold mb-3';
    destaque.innerHTML = `<i class="bi bi-calendar-event fs-5"></i><span>Prazo limite: até ${escaparHTML(publicacao.deadline)}</span>`;
  } else {
    destaque.className = 'd-none';
    destaque.innerHTML = '';
  }

  const containerWpp = document.getElementById('postModalWppContainer');
  if (publicacao.contact_wpp) {
    document.getElementById('postModalWppBtn').href = `https://wa.me/${publicacao.contact_wpp}`;
    containerWpp.classList.remove('d-none');
  } else {
    containerWpp.classList.add('d-none');
  }

  atualizarBotaoSalvarModal(foiSalvo);

  const containerCurtidas = document.getElementById('postModalLikesContainer');
  containerCurtidas.classList.toggle('d-none', ehAchados);
  if (!ehAchados) {
    document.getElementById('postModalLikeCount').textContent = publicacao.likes_count || 0;
    const botaoCurtir = document.getElementById('postModalLikeBtn');
    botaoCurtir.className = `btn ${foiCurtido ? 'btn-danger' : 'btn-outline-danger'} d-flex align-items-center gap-2`;
    botaoCurtir.onclick = () => curtirNoModal(publicacao.id);
    document.getElementById('postModalLikeIcon').className = `bi ${foiCurtido ? 'bi-heart-fill' : 'bi-heart'}`;
    document.getElementById('postModalLikeText').textContent = foiCurtido ? 'Curtido' : 'Curtir';
  }

  const modContainer = document.getElementById('postModalModerationActions');
  let botoesMod = '';
  if (podeEditarPublicacao(publicacao)) {
    botoesMod += `<button type="button" class="btn btn-outline-warning btn-sm" onclick="abrirModalEdicaoPublicacao(${publicacao.id})"><i class="bi bi-pencil-square me-1"></i>Editar</button>`;
  }
  if (podeExcluirPublicacao(publicacao)) {
    botoesMod += `<button type="button" class="btn btn-outline-danger btn-sm" onclick="excluirPublicacao(${publicacao.id})"><i class="bi bi-trash me-1"></i>Excluir</button>`;
  }
  modContainer.innerHTML = botoesMod;

  bootstrap.Modal.getOrCreateInstance(document.getElementById('postDetailModal')).show();
}

function atualizarBotaoSalvarModal(estaSalvo) {
  document.getElementById('postModalSaveBtn').className = `btn ${estaSalvo ? 'btn-warning text-dark' : 'btn-outline-warning text-dark'} d-flex align-items-center gap-2`;
  document.getElementById('postModalSaveIcon').className = `bi ${estaSalvo ? 'bi-bookmark-fill' : 'bi-bookmark'}`;
  document.getElementById('postModalSaveText').textContent = estaSalvo ? 'Salvo' : 'Salvar';
}

function abrirModalEdicaoPublicacao(idPublicacao) {
  const post = listaPublicacoes.find(p => Number(p.id) === Number(idPublicacao));
  if (!post) return;

  bootstrap.Modal.getInstance(document.getElementById('postDetailModal'))?.hide();

  document.getElementById('editPostId').value = post.id;
  document.getElementById('editPostTitle').value = post.title || '';
  document.getElementById('editPostDesc').value = post.description || '';
  document.getElementById('editPostLocation').value = post.location || '';
  document.getElementById('editPostWpp').value = post.contact_wpp || '';

  const priceBox = document.getElementById('editPostPriceContainer');
  priceBox.classList.toggle('d-none', post.category !== 'servicos');
  if (post.category === 'servicos') document.getElementById('editPostPrice').value = post.price || '';

  bootstrap.Modal.getOrCreateInstance(document.getElementById('editPostModal')).show();
}

async function salvarEdicaoPublicacao(evento) {
  evento.preventDefault();
  const id = Number(document.getElementById('editPostId').value);
  const btn = document.getElementById('btnSaveEditPost');
  btn.disabled = true;

  const dados = {
    title: document.getElementById('editPostTitle').value.trim(),
    description: document.getElementById('editPostDesc').value.trim(),
    location: document.getElementById('editPostLocation').value.trim(),
    contact_wpp: document.getElementById('editPostWpp').value.trim()
  };
  if (!document.getElementById('editPostPriceContainer').classList.contains('d-none')) {
    dados.price = document.getElementById('editPostPrice').value.trim();
  }

  try {
    await servicoApi.editarPublicacao(id, dados);
    bootstrap.Modal.getInstance(document.getElementById('editPostModal'))?.hide();
    exibirAlerta('Publicação atualizada com sucesso!', 'success');
    await carregarPublicacoes();
    if (abaAtual === 'perfil') await renderizarPerfil(abaPerfilAtual);
  } catch (erro) {
    exibirAlerta('Erro ao editar: ' + erro.message, 'danger');
  } finally {
    btn.disabled = false;
  }
}

async function excluirPublicacao(idPublicacao) {
  if (!confirm('Tem certeza que deseja excluir esta publicação?')) return;

  try {
    await servicoApi.removerPublicacao(idPublicacao);
    bootstrap.Modal.getInstance(document.getElementById('postDetailModal'))?.hide();

    const idNum = Number(idPublicacao);
    publicacoesMinhas.delete(idNum);
    publicacoesSalvas.delete(idNum);
    publicacoesCurtidas.delete(idNum);
    localStorage.setItem(obterChaveUsuario('ifdashboard_my_posts'), JSON.stringify(Array.from(publicacoesMinhas)));
    localStorage.setItem(obterChaveUsuario('ifdashboard_saved_posts'), JSON.stringify(Array.from(publicacoesSalvas)));
    localStorage.setItem(obterChaveUsuario('ifdashboard_liked_posts'), JSON.stringify(Array.from(publicacoesCurtidas)));

    exibirAlerta('Publicação removida com sucesso.', 'success');
    await carregarPublicacoes();
    await carregarEventosCalendario();
    if (abaAtual === 'calendario') renderizarCalendario();
    else if (abaAtual === 'perfil') await renderizarPerfil(abaPerfilAtual);
  } catch (erro) {
    exibirAlerta('Erro ao excluir: ' + erro.message, 'danger');
  }
}

/* --- INTERAÇÕES (CURTIR, SALVAR, CRIAR) --- */
async function aoCurtir(idPublicacao, botao) {
  if (ehConvidado()) {
    abrirModalCadastroConvidado();
    return;
  }

  const foiCurtido = publicacoesCurtidas.has(idPublicacao);
  try {
    const resultado = await servicoApi.alternarCurtida(idPublicacao, foiCurtido ? 'decrement' : 'increment');
    foiCurtido ? publicacoesCurtidas.delete(idPublicacao) : publicacoesCurtidas.add(idPublicacao);
    localStorage.setItem(obterChaveUsuario('ifdashboard_liked_posts'), JSON.stringify(Array.from(publicacoesCurtidas)));

    const postObj = listaPublicacoes.find(p => p.id === idPublicacao);
    if (postObj) postObj.likes_count = resultado.likes_count;

    if (botao) {
      const span = botao.querySelector('.contador-curtidas');
      if (span) span.textContent = resultado.likes_count;
      botao.classList.toggle('btn-danger', !foiCurtido);
      botao.classList.toggle('btn-outline-danger', foiCurtido);
      const icone = botao.querySelector('i');
      if (icone) icone.className = !foiCurtido ? 'bi bi-heart-fill' : 'bi bi-heart';
    }
    if (abaAtual === 'perfil') renderizarPerfil(abaPerfilAtual);
  } catch (erro) {
    exibirAlerta(erro.message, 'warning');
  }
}

async function curtirNoModal(idPublicacao) {
  await aoCurtir(idPublicacao, null);
  const publicacao = listaPublicacoes.find(p => p.id === idPublicacao);
  if (!publicacao) return;

  const estaCurtido = publicacoesCurtidas.has(idPublicacao);
  document.getElementById('postModalLikeCount').textContent = publicacao.likes_count || 0;
  document.getElementById('postModalLikeBtn').className = `btn ${estaCurtido ? 'btn-danger' : 'btn-outline-danger'} d-flex align-items-center gap-2`;
  document.getElementById('postModalLikeIcon').className = `bi ${estaCurtido ? 'bi-heart-fill' : 'bi-heart'}`;
  document.getElementById('postModalLikeText').textContent = estaCurtido ? 'Curtido' : 'Curtir';
  if (abaAtual !== 'perfil') renderizarPublicacoes(listaPublicacoes);
}

function alternarSalvar(idPublicacao, botao) {
  if (ehConvidado()) {
    abrirModalCadastroConvidado();
    return;
  }

  const foiSalvo = publicacoesSalvas.has(idPublicacao);
  if (foiSalvo) {
    publicacoesSalvas.delete(idPublicacao);
  } else {
    publicacoesSalvas.add(idPublicacao);
    adicionarNotificacao('Item Salvo', 'Uma publicação foi adicionada aos seus itens salvos.', 'bi-bookmark-check-fill text-warning');
  }
  localStorage.setItem(obterChaveUsuario('ifdashboard_saved_posts'), JSON.stringify(Array.from(publicacoesSalvas)));

  const estaSalvo = !foiSalvo;
  if (botao) {
    botao.classList.toggle('btn-warning', estaSalvo);
    botao.classList.toggle('text-dark', estaSalvo);
    botao.classList.toggle('btn-outline-secondary', !estaSalvo);
    const icone = botao.querySelector('i');
    if (icone) icone.className = estaSalvo ? 'bi bi-bookmark-fill' : 'bi bi-bookmark';
  }
  if (idPublicacaoAtualDetalhes === idPublicacao) atualizarBotaoSalvarModal(estaSalvo);
  if (abaAtual === 'perfil') renderizarPerfil(abaPerfilAtual);
}

function aoSalvarNoModal() {
  if (idPublicacaoAtualDetalhes) alternarSalvar(idPublicacaoAtualDetalhes, null);
}

function previsualizarImagem(evento) {
  const arquivo = evento.target.files?.[0];
  if (!arquivo) return limparUploadImagem();

  if (!arquivo.type.startsWith('image/') || arquivo.size > 16 * 1024 * 1024) {
    exibirAlerta('Selecione uma imagem válida (PNG, JPG, WEBP ou GIF) de até 16MB.', 'warning');
    return limparUploadImagem();
  }

  const leitor = new FileReader();
  leitor.onload = e => {
    document.getElementById('postImagePreview').src = e.target.result;
    document.getElementById('postImagePreviewContainer').classList.remove('d-none');
  };
  leitor.readAsDataURL(arquivo);
}

function limparUploadImagem() {
  const campo = document.getElementById('postImageFile');
  if (campo) campo.value = '';
  document.getElementById('postImagePreviewContainer')?.classList.add('d-none');
  const img = document.getElementById('postImagePreview');
  if (img) img.src = '';
}

function aoMudarCategoria() {
  const categoria = document.getElementById('postCategory').value;
  const ehPeriodo = ['pesquisa', 'editais', 'avisos'].includes(categoria);

  document.getElementById('conditionalAchados')?.classList.toggle('d-none', categoria !== 'achados');
  document.getElementById('conditionalServicos')?.classList.toggle('d-none', categoria !== 'servicos');
  document.getElementById('conditionalPeriodo')?.classList.toggle('d-none', !ehPeriodo);

  const campoInicio = document.getElementById('postStartDate');
  if (campoInicio) campoInicio.required = ehPeriodo;
}

async function enviarNovaPublicacao(evento) {
  evento.preventDefault();
  if (ehConvidado()) return abrirModalCadastroConvidado();

  const botao = document.getElementById('btnSubmitPost');
  botao.disabled = true;
  botao.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Publicando...';

  const categoria = document.getElementById('postCategory').value;
  const subTipo = categoria === 'achados'
    ? document.getElementById('postSubTypeAchados').value
    : (categoria === 'servicos' ? document.getElementById('postSubTypeServicos').value : null);

  const usuarioAtual = obterUsuarioSessao();
  const tituloPub = document.getElementById('postTitle').value.trim();

  const formData = new FormData();
  formData.append('category', categoria);
  if (subTipo) formData.append('sub_type', subTipo);
  formData.append('title', tituloPub);
  formData.append('description', document.getElementById('postDesc').value.trim());
  formData.append('location', document.getElementById('postLocation').value.trim() || 'Campus Lapa');
  formData.append('author', usuarioAtual?.name?.trim() || 'Usuário IF');
  formData.append('contact_wpp', document.getElementById('postWpp').value.trim());

  if (categoria === 'servicos') {
    const preco = document.getElementById('postPrice').value.trim();
    if (preco) formData.append('price', preco);
  }
  if (['pesquisa', 'editais', 'avisos'].includes(categoria)) {
    const inicio = document.getElementById('postStartDate')?.value;
    const fim = document.getElementById('postEndDate')?.value;
    if (inicio) formData.append('start_date', inicio);
    if (fim) formData.append('end_date', fim);
  }

  const arquivo = document.getElementById('postImageFile')?.files?.[0];
  if (arquivo) formData.append('image', arquivo);

  try {
    const resp = await servicoApi.criarPublicacao(formData);
    if (resp?.id != null) {
      publicacoesMinhas.add(Number(resp.id));
      localStorage.setItem(obterChaveUsuario('ifdashboard_my_posts'), JSON.stringify(Array.from(publicacoesMinhas)));
    }

    adicionarNotificacao('Publicação criada', `Sua publicação "${tituloPub}" foi postada com sucesso no mural.`, 'bi-check-circle-fill text-success');
    bootstrap.Modal.getInstance(document.getElementById('newPostModal'))?.hide();
    document.getElementById('newPostForm').reset();
    limparUploadImagem();

    exibirAlerta('Publicação criada com sucesso!', 'success');
    await carregarPublicacoes();
    await carregarEventosCalendario();
    if (abaAtual === 'calendario') renderizarCalendario();
    else if (abaAtual === 'perfil') await renderizarPerfil(abaPerfilAtual);
  } catch (erro) {
    exibirAlerta('Falha ao criar publicação: ' + erro.message, 'danger');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Publicar agora';
  }
}


