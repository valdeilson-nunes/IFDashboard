/**
 * Aplicação Principal IFDashboard (Front-end Vanilla JS + Bootstrap)
 * Nomes de variáveis e funções em português
 */

let abaAtual = 'home';
let tipoOrdenacao = 'recent';
let publicacoesCurtidas = new Set(JSON.parse(localStorage.getItem('ifdashboard_liked_posts') || '[]'));
let publicacoesSalvas = new Set(JSON.parse(localStorage.getItem('ifdashboard_saved_posts') || '[]'));
let publicacoesMinhas = new Set(JSON.parse(localStorage.getItem('ifdashboard_my_posts') || '[]'));
let listaPublicacoes = [];
let abaPerfilAtual = 'meus';
let idPublicacaoAtualDetalhes = null;

// Notificações do usuário (persistidas no localStorage)
let notificacoesUsuario = JSON.parse(localStorage.getItem('ifdashboard_notifications') || 'null');
if (!notificacoesUsuario) {
  notificacoesUsuario = [
    {
      id: 1,
      titulo: 'Boas-vindas ao IFDashboard!',
      mensagem: 'Fique por dentro de avisos oficiais, editais, achados e serviços do IF Baiano Campus Lapa.',
      icone: 'bi-bell-fill text-primary',
      data: 'Hoje',
      lida: false
    },
    {
      id: 2,
      titulo: 'Novo edital publicado',
      mensagem: 'Edital nº 14/2026 — Auxílio Permanência está com inscrições abertas na DIRENS.',
      icone: 'bi-file-earmark-text-fill text-warning',
      data: 'Ontem',
      lida: false
    },
    {
      id: 3,
      titulo: 'Bolsas de Robótica',
      mensagem: 'Seleção aberta de bolsistas de extensão com a Profa. Carla Menezes.',
      icone: 'bi-mortarboard-fill text-info',
      data: '2 dias atrás',
      lida: true
    }
  ];
  localStorage.setItem('ifdashboard_notifications', JSON.stringify(notificacoesUsuario));
}

const MAPA_CATEGORIAS = {
  achados: { label: 'Achados e Perdidos', class: 'etiqueta-achados', pin: 'pino-achados' },
  servicos: { label: 'Serviços e Vendas', class: 'etiqueta-servicos', pin: 'pino-servicos' },
  pesquisa: { label: 'Pesquisa e Extensão', class: 'etiqueta-pesquisa', pin: 'pino-pesquisa' },
  editais: { label: 'Editais e Avisos', class: 'etiqueta-editais', pin: 'pino-editais' }
};

document.addEventListener('DOMContentLoaded', async () => {
  configurarSessaoUsuario();
  configurarBusca();
  configurarTema();
  
  // Limpar formulário e pré-visualização ao fechar o modal de nova publicação
  document.getElementById('newPostModal')?.addEventListener('hidden.bs.modal', () => {
    document.getElementById('newPostForm')?.reset();
    limparUploadImagem();
  });

  await carregarPublicacoes();
  configurarCarrosselDestaques();
});

// Configurar dados do usuário logado na interface
function configurarSessaoUsuario() {
  const usuarioJson = localStorage.getItem('ifdashboard_user');
  if (usuarioJson) {
    try {
      const usuario = JSON.parse(usuarioJson);

      const elementoNomeGaveta = document.getElementById('drawerUserName');
      const elementoEmailGaveta = document.getElementById('drawerUserEmail');
      const elementoLetraGaveta = document.getElementById('drawerUserBadge');

      const elementoNomePerfil = document.getElementById('profileName');
      const elementoEmailPerfil = document.getElementById('profileEmail');
      const elementoLetraPerfil = document.getElementById('profileBadgeLetter');
      
      const nomeExibicao = usuario.name || 'Usuário';
      const papelExibicao = usuario.role === 'guest' ? 'Modo Visitante (Apenas leitura)' : (usuario.email || '');
      const inicial = nomeExibicao.charAt(0).toUpperCase();

      if (elementoNomeGaveta) elementoNomeGaveta.textContent = nomeExibicao;
      if (elementoEmailGaveta) elementoEmailGaveta.textContent = papelExibicao;
      if (elementoLetraGaveta) elementoLetraGaveta.textContent = inicial;

      if (elementoNomePerfil) elementoNomePerfil.textContent = nomeExibicao;
      if (elementoEmailPerfil) elementoEmailPerfil.textContent = papelExibicao;
      if (elementoLetraPerfil) elementoLetraPerfil.textContent = inicial;
    } catch (erro) {
      console.warn('Erro ao carregar sessão do usuário:', erro);
    }
  }
}

// Desconectar e voltar para a Landing Page
function fazerLogout() {
  localStorage.removeItem('ifdashboard_user');
  window.location.href = 'landing.html';
}

// Navegação entre abas principais
function navegar(aba) {
  fecharMenuLateral();
  abaAtual = aba;

  // Atualizar visual da sidebar ativa
  document.querySelectorAll('[data-nav]').forEach(elemento => {
    elemento.classList.toggle('active', elemento.getAttribute('data-nav') === aba);
  });

  const titulos = {
    home: { titulo: 'Mural do Campus', subtitulo: 'Avisos oficiais, achados, serviços e oportunidades da comunidade acadêmica.' },
    achados: { titulo: 'Achados e Perdidos', subtitulo: 'Perdeu ou encontrou algo no campus? Ajude a comunidade a recuperar.' },
    servicos: { titulo: 'Serviços e Vendas', subtitulo: 'Compre, venda ou contrate aulas e serviços no âmbito do IF.' },
    pesquisa: { titulo: 'Pesquisa e Extensão', subtitulo: 'Oportunidades de bolsas, monitorias e projetos de extensão abertos.' },
    editais: { titulo: 'Editais e Avisos', subtitulo: 'Publicações oficiais e prazos institucionais do campus.' },
    calendario: { titulo: 'Calendário Acadêmico', subtitulo: 'Provas, prazos de editais, manutenções e eventos do campus.' },
    perfil: { titulo: 'Meu Perfil', subtitulo: 'Suas publicações, itens salvos e atividades no mural.' }
  };

  const cabecalho = titulos[aba] || titulos.home;
  document.getElementById('sectionTitle').textContent = cabecalho.titulo;
  document.getElementById('sectionSubtitle').textContent = cabecalho.subtitulo;

  const ehCalendario = aba === 'calendario';
  const ehPerfil = aba === 'perfil';

  document.getElementById('calendarView')?.classList.toggle('d-none', !ehCalendario);
  document.getElementById('perfilView')?.classList.toggle('d-none', !ehPerfil);
  document.getElementById('postsView')?.classList.toggle('d-none', ehCalendario || ehPerfil);
  document.getElementById('sortFilterGroup')?.classList.toggle('d-none', ehCalendario || ehPerfil);

  pararTemporizadorDestaques();
  if (aba !== 'home') {
    document.getElementById('destaquesView')?.classList.add('d-none');
  }

  if (ehCalendario) {
    iniciarCalendario();
  } else if (ehPerfil) {
    renderizarPerfil(abaPerfilAtual);
  } else {
    carregarPublicacoes();
  }
}

// Fechar menu modal drawer (lateral) se aberto
function fecharMenuLateral() {
  const elemento = document.getElementById('sidebarMenu');
  if (elemento) {
    const modalOffcanvas = bootstrap.Offcanvas.getInstance(elemento);
    if (modalOffcanvas) modalOffcanvas.hide();
  }
}

// Alternar ordenação dos itens
function definirOrdenacao(tipo) {
  tipoOrdenacao = tipo;
  document.querySelectorAll('#sortFilterGroup button').forEach(botao => {
    botao.classList.toggle('active', botao.getAttribute('data-sort') === tipo);
  });
  carregarPublicacoes();
}

// Carregar publicações da API Flask
async function carregarPublicacoes() {
  const container = document.getElementById('postsContainer');
  container.innerHTML = `
    <div class="col-12 text-center py-5 text-muted">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2 small">Carregando...</p>
    </div>
  `;

  const filtroCategoria = abaAtual === 'home' || abaAtual === 'perfil' || abaAtual === 'calendario' ? '' : abaAtual;
  const termoBusca = document.getElementById('globalSearchInput')?.value || '';

  try {
    const publicacoes = await servicoApi.obterPublicacoes(filtroCategoria, termoBusca, tipoOrdenacao);
    listaPublicacoes = Array.isArray(publicacoes) ? publicacoes : [];
    renderizarPublicacoes(listaPublicacoes);
    // Destaques só aparecem na aba home sem filtro de busca
    if (abaAtual === 'home' && !termoBusca) {
      renderizarDestaques(listaPublicacoes);
    } else {
      pararTemporizadorDestaques();
      document.getElementById('destaquesView')?.classList.add('d-none');
    }
  } catch (erro) {
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

// Renderizar cards das publicações no mural
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

  container.innerHTML = publicacoes.map(post => {
    const configCategoria = MAPA_CATEGORIAS[post.category] || { label: 'Aviso', class: 'badge-secondary', pin: 'pino-editais' };
    const foiCurtido = publicacoesCurtidas.has(post.id);
    const foiSalvo = publicacoesSalvas.has(post.id);
    const ehAchados = post.category === 'achados';

    return `
      <div class="col-md-6 col-xl-4">
        <div class="card card-mural h-100 p-3 shadow-sm" onclick="abrirModalDetalhes(${post.id})" title="Clique para ver detalhes">
          <span class="indicador-pino ${configCategoria.pin}"></span>
          
          <!-- Imagem da publicação se houver -->
          ${post.image_url ? `
            <div class="card-mural-imagem mb-2 rounded-3 overflow-hidden border">
              <img src="${escaparHTML(post.image_url)}" alt="${escaparHTML(post.title)}" class="w-100 object-fit-cover" style="height: 140px;" loading="lazy">
            </div>
          ` : ''}

          <div class="d-flex align-items-center gap-2 mb-2">
            <span class="badge ${configCategoria.class} rounded-pill px-2 py-1">${configCategoria.label}</span>
            ${post.sub_type ? `<span class="badge bg-body-secondary text-body border">${post.sub_type}</span>` : ''}
            ${post.is_pinned ? '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"><i class="bi bi-pin-fill"></i> Fixado</span>' : ''}
          </div>

          <h5 class="card-title fw-bold fs-6 mb-2">${escaparHTML(post.title)}</h5>
          <p class="card-text text-muted small flex-grow-1">${escaparHTML(post.description)}</p>

          ${post.price ? `<div class="fw-bold text-success mb-2">${escaparHTML(post.price)}</div>` : ''}

          <div class="d-flex justify-content-between align-items-center pt-2 mt-2 border-top text-muted small">
            <span><i class="bi bi-geo-alt me-1"></i>${escaparHTML(post.location || 'Campus Lapa')}</span>
            
            <div class="d-flex align-items-center gap-2">
              ${post.contact_wpp ? `
                <a href="https://wa.me/${post.contact_wpp}" target="_blank" class="btn btn-sm btn-outline-success py-0 px-2" title="Contato via WhatsApp" onclick="event.stopPropagation();">
                  <i class="bi bi-whatsapp"></i>
                </a>
              ` : ''}

              <!-- Salvar / Favoritar -->
              <button class="btn btn-sm ${foiSalvo ? 'btn-warning text-dark' : 'btn-outline-secondary'} py-0 px-2" onclick="event.stopPropagation(); alternarSalvar(${post.id}, this)" title="${foiSalvo ? 'Remover dos salvos' : 'Salvar publicação'}">
                <i class="bi ${foiSalvo ? 'bi-bookmark-fill' : 'bi-bookmark'}"></i>
              </button>

              <!-- Curtidas: Omitida em Achados e Perdidos -->
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
  }).join('');
}


/* ============================================================
   CARROSSEL DE DESTAQUES INSTITUCIONAL (CAMPUS BOM JESUS DA LAPA)
============================================================ */
let destaquesAtuais = [];
let indiceSlideDestaque = 0;
let temporizadorCarrosselDestaques = null;
const INTERVALO_SLIDE_DESTAQUES = 10000; // 10 segundos por slide

// Renderizar o carrossel no modelo institucional com limite de 5 cards
function renderizarDestaques(publicacoes) {
  const containerPrincipal = document.getElementById('cardDestaquePrincipal');
  const viewDestaques = document.getElementById('destaquesView');

  if (!containerPrincipal || !viewDestaques) return;

  // Prioridade: publicações fixadas primeiro, seguidas pelas mais curtidas
  const fixados = publicacoes.filter(p => p.is_pinned);
  const restantes = publicacoes
    .filter(p => !p.is_pinned)
    .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));

  // Limite de 5 cards no carrossel
  destaquesAtuais = [...fixados, ...restantes].slice(0, 5);

  if (destaquesAtuais.length === 0) {
    pararTemporizadorDestaques();
    viewDestaques.classList.add('d-none');
    return;
  }

  viewDestaques.classList.remove('d-none');
  indiceSlideDestaque = 0;

  // Renderizar o slide inicial e a lista lateral
  exibirSlideDestaque(0);
  renderizarListaLateralDestaques();
  iniciarTemporizadorDestaques();
}

// Exibir um slide específico no card maior
function exibirSlideDestaque(indice) {
  if (!destaquesAtuais || destaquesAtuais.length === 0) return;

  const total = destaquesAtuais.length;
  indiceSlideDestaque = (indice + total) % total;
  const post = destaquesAtuais[indiceSlideDestaque];

  const containerPrincipal = document.getElementById('cardDestaquePrincipal');
  if (!containerPrincipal) return;

  const configCategoria = MAPA_CATEGORIAS[post.category] || { label: 'Aviso Institucional', class: 'etiqueta-editais' };

  // Imagem de fundo ou banner temático de gradiente
  const bannerBgHtml = post.image_url
    ? `<img src="${escaparHTML(post.image_url)}" alt="${escaparHTML(post.title)}" class="card-destaque-img-bg" loading="lazy">`
    : `
      <div class="card-destaque-fallback-bg">
        <div class="text-white text-center opacity-25">
          <i class="bi bi-mortarboard-fill display-1"></i>
        </div>
      </div>
    `;

  // Indicadores de slide no canto inferior direito (o ativo em verde institucional)
  const indicadoresHtml = destaquesAtuais.map((_, i) => `
    <span class="indicador-slide ${i === indiceSlideDestaque ? 'ativo' : ''}" 
          onclick="event.stopPropagation(); irParaSlideDestaque(${i})" 
          title="Ir para notícia ${i + 1}"></span>
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
    <div class="card-destaque-indicadores">
      ${indicadoresHtml}
    </div>
  `;

  containerPrincipal.onclick = () => abrirModalDetalhes(post.id);

  // Sincronizar indicador visual na lista lateral
  atualizarSelecaoListaLateral();
}

// Renderizar lista rápida de notícias à direita
function renderizarListaLateralDestaques() {
  const containerLista = document.getElementById('destaquesListaLateral');
  if (!containerLista) return;

  containerLista.innerHTML = destaquesAtuais.map((post, i) => {
    return `
      <div class="item-noticia-lateral ${i === indiceSlideDestaque ? 'ativo-lateral' : ''}" 
           data-destaque-index="${i}" 
           onclick="irParaSlideDestaque(${i})" 
           title="Ver destaque: ${escaparHTML(post.title)}">
        <div class="item-noticia-titulo">${escaparHTML(post.title)}</div>
        <div class="item-noticia-meta d-flex align-items-center justify-content-between">
          <span><i class="bi bi-geo-alt me-1"></i>${escaparHTML(post.location || 'Campus Lapa')}</span>
          ${post.category !== 'achados' ? `<span><i class="bi bi-heart me-1"></i>${post.likes_count || 0}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Atualizar classe ativa na lista lateral
function atualizarSelecaoListaLateral() {
  const itens = document.querySelectorAll('.item-noticia-lateral');
  itens.forEach((el, i) => {
    el.classList.toggle('ativo-lateral', i === indiceSlideDestaque);
  });
}

// Trocar de slide ao clicar e reiniciar contagem de 10 segundos
function irParaSlideDestaque(indice) {
  exibirSlideDestaque(indice);
  iniciarTemporizadorDestaques();
}

// Iniciar temporizador automático de 10 segundos
function iniciarTemporizadorDestaques() {
  pararTemporizadorDestaques();
  if (destaquesAtuais.length <= 1) return;

  temporizadorCarrosselDestaques = setInterval(() => {
    exibirSlideDestaque(indiceSlideDestaque + 1);
  }, INTERVALO_SLIDE_DESTAQUES);
}

// Parar temporizador automático
function pararTemporizadorDestaques() {
  if (temporizadorCarrosselDestaques) {
    clearInterval(temporizadorCarrosselDestaques);
    temporizadorCarrosselDestaques = null;
  }
}

// Pausar slide no hover e retomar ao retirar o cursor
function configurarCarrosselDestaques() {
  const viewDestaques = document.getElementById('destaquesView');
  if (!viewDestaques) return;

  viewDestaques.addEventListener('mouseenter', () => {
    pararTemporizadorDestaques();
  });

  viewDestaques.addEventListener('mouseleave', () => {
    if (abaAtual === 'home') {
      iniciarTemporizadorDestaques();
    }
  });
}

// Rolar suavemente para a área de publicações do mural
function rolarParaMural(evento) {
  if (evento) evento.preventDefault();
  const elemento = document.getElementById('postsContainer') || document.getElementById('postsView');
  if (elemento) {
    elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
// Abrir Modal de Detalhes da Publicação
function abrirModalDetalhes(idPublicacao) {
  const publicacao = listaPublicacoes.find(p => p.id === idPublicacao);
  if (!publicacao) return;

  const configCategoria = MAPA_CATEGORIAS[publicacao.category] || { label: 'Aviso', class: 'badge-secondary' };
  const ehAchados = publicacao.category === 'achados';
  const foiCurtido = publicacoesCurtidas.has(publicacao.id);

  // Categoria e Subtipo
  const elementoBadge = document.getElementById('postModalBadge');
  if (elementoBadge) {
    elementoBadge.className = `badge rounded-pill px-3 py-1 ${configCategoria.class}`;
    elementoBadge.textContent = configCategoria.label;
  }

  const elementoSubTipo = document.getElementById('postModalSubType');
  if (elementoSubTipo) {
    if (publicacao.sub_type) {
      elementoSubTipo.textContent = publicacao.sub_type;
      elementoSubTipo.classList.remove('d-none');
    } else {
      elementoSubTipo.classList.add('d-none');
    }
  }

  const elementoFixado = document.getElementById('postModalPinned');
  if (elementoFixado) elementoFixado.classList.toggle('d-none', !publicacao.is_pinned);

  // Imagem
  const containerImagem = document.getElementById('postModalImageContainer');
  const elementoImagem = document.getElementById('postModalImage');
  if (containerImagem && elementoImagem) {
    if (publicacao.image_url) {
      elementoImagem.src = publicacao.image_url;
      containerImagem.classList.remove('d-none');
    } else {
      elementoImagem.src = '';
      containerImagem.classList.add('d-none');
    }
  }

  // Título e Descrição
  document.getElementById('postModalTitle').textContent = publicacao.title;
  document.getElementById('postModalDesc').textContent = publicacao.description || 'Nenhum detalhe adicional informado.';

  // Metadados
  document.getElementById('postModalAuthor').innerHTML = `<i class="bi bi-person me-1"></i>${escaparHTML(publicacao.author || 'Membro do IF')}`;
  document.getElementById('postModalLocation').innerHTML = `<i class="bi bi-geo-alt me-1"></i>${escaparHTML(publicacao.location || 'Campus Lapa')}`;
  
  let textoData = 'Recente';
  if (publicacao.created_at) {
    try {
      const dataCriacao = new Date(publicacao.created_at);
      textoData = dataCriacao.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {}
  }
  document.getElementById('postModalDate').innerHTML = `<i class="bi bi-clock me-1"></i>${textoData}`;

  // Preço ou Prazo destacados
  const elementoDestaque = document.getElementById('postModalHighlight');
  if (elementoDestaque) {
    if (publicacao.price) {
      elementoDestaque.className = 'p-3 rounded-3 bg-success-subtle text-success-emphasis border border-success-subtle d-flex align-items-center gap-2 fw-bold mb-3';
      elementoDestaque.innerHTML = `<i class="bi bi-tag-fill fs-5"></i><span>Valor: ${escaparHTML(publicacao.price)}</span>`;
    } else if (publicacao.deadline) {
      elementoDestaque.className = 'p-3 rounded-3 bg-warning-subtle text-warning-emphasis border border-warning-subtle d-flex align-items-center gap-2 fw-bold mb-3';
      elementoDestaque.innerHTML = `<i class="bi bi-calendar-event fs-5"></i><span>Prazo limite: até ${escaparHTML(publicacao.deadline)}</span>`;
    } else {
      elementoDestaque.className = 'd-none';
      elementoDestaque.innerHTML = '';
    }
  }

  // Botão de WhatsApp
  const containerWpp = document.getElementById('postModalWppContainer');
  const botaoWpp = document.getElementById('postModalWppBtn');
  if (containerWpp && botaoWpp) {
    if (publicacao.contact_wpp) {
      botaoWpp.href = `https://wa.me/${publicacao.contact_wpp}`;
      containerWpp.classList.remove('d-none');
    } else {
      containerWpp.classList.add('d-none');
    }
  }

  // Curtidas: Não permitir em Achados e Perdidos
  const containerCurtidas = document.getElementById('postModalLikesContainer');
  const botaoCurtir = document.getElementById('postModalLikeBtn');
  const contadorCurtidas = document.getElementById('postModalLikeCount');
  const iconeCurtir = document.getElementById('postModalLikeIcon');
  const textoCurtir = document.getElementById('postModalLikeText');

  if (ehAchados) {
    if (containerCurtidas) containerCurtidas.classList.add('d-none');
  } else {
    if (containerCurtidas) containerCurtidas.classList.remove('d-none');

    if (contadorCurtidas) contadorCurtidas.textContent = publicacao.likes_count || 0;
    if (botaoCurtir) {
      botaoCurtir.className = `btn ${foiCurtido ? 'btn-danger' : 'btn-outline-danger'} d-flex align-items-center gap-2`;
      botaoCurtir.onclick = () => curtirNoModal(publicacao.id);
    }
    if (iconeCurtir) iconeCurtir.className = `bi ${foiCurtido ? 'bi-heart-fill' : 'bi-heart'}`;
    if (textoCurtir) textoCurtir.textContent = foiCurtido ? 'Curtido' : 'Curtir';
  }

  // Exibir o modal
  const elementoModal = document.getElementById('postDetailModal');
  if (elementoModal) {
    const instanciaModal = new bootstrap.Modal(elementoModal);
    instanciaModal.show();
  }
}

// Manipular curtida acionada a partir do modal de detalhes
async function curtirNoModal(idPublicacao) {
  const publicacao = listaPublicacoes.find(p => p.id === idPublicacao);
  if (!publicacao || publicacao.category === 'achados') return;

  const foiCurtido = publicacoesCurtidas.has(idPublicacao);
  const acao = foiCurtido ? 'decrement' : 'increment';

  try {
    const resultado = await servicoApi.alternarCurtida(idPublicacao, acao);
    if (foiCurtido) {
      publicacoesCurtidas.delete(idPublicacao);
    } else {
      publicacoesCurtidas.add(idPublicacao);
    }
    publicacao.likes_count = resultado.likes_count;

    // Atualizar visual do modal
    const botaoCurtir = document.getElementById('postModalLikeBtn');
    const contadorCurtidas = document.getElementById('postModalLikeCount');
    const iconeCurtir = document.getElementById('postModalLikeIcon');
    const textoCurtir = document.getElementById('postModalLikeText');

    const estaCurtidoAgora = publicacoesCurtidas.has(idPublicacao);
    if (contadorCurtidas) contadorCurtidas.textContent = resultado.likes_count;
    if (botaoCurtir) botaoCurtir.className = `btn ${estaCurtidoAgora ? 'btn-danger' : 'btn-outline-danger'} d-flex align-items-center gap-2`;
    if (iconeCurtir) iconeCurtir.className = `bi ${estaCurtidoAgora ? 'bi-heart-fill' : 'bi-heart'}`;
    if (textoCurtir) textoCurtir.textContent = estaCurtidoAgora ? 'Curtido' : 'Curtir';

    // Atualiza também os cards na página
    renderizarPublicacoes(listaPublicacoes);
  } catch (erro) {
    console.error('Erro ao curtir post no modal:', erro);
  }
}

// Pré-visualização do upload de imagem do usuário
function previsualizarImagem(evento) {
  const arquivo = evento.target.files && evento.target.files[0];
  const container = document.getElementById('postImagePreviewContainer');
  const elementoImagem = document.getElementById('postImagePreview');

  if (arquivo) {
    if (!arquivo.type.startsWith('image/')) {
      exibirAlerta('Por favor, selecione um arquivo de imagem válido (PNG, JPG, JPEG, WEBP ou GIF).', 'warning');
      limparUploadImagem();
      return;
    }

    if (arquivo.size > 16 * 1024 * 1024) {
      exibirAlerta('A imagem não pode ultrapassar 16MB.', 'warning');
      limparUploadImagem();
      return;
    }

    const leitor = new FileReader();
    leitor.onload = function(e) {
      if (elementoImagem) elementoImagem.src = e.target.result;
      if (container) container.classList.remove('d-none');
    };
    leitor.readAsDataURL(arquivo);
  } else {
    limparUploadImagem();
  }
}

// Limpar campo de upload de imagem e prévia
function limparUploadImagem() {
  const campoArquivo = document.getElementById('postImageFile');
  if (campoArquivo) campoArquivo.value = '';
  const container = document.getElementById('postImagePreviewContainer');
  if (container) container.classList.add('d-none');
  const elementoImagem = document.getElementById('postImagePreview');
  if (elementoImagem) elementoImagem.src = '';
}

// Manipular envio de nova publicação
async function enviarNovaPublicacao(evento) {
  evento.preventDefault();
  const botao = document.getElementById('btnSubmitPost');
  botao.disabled = true;
  botao.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Publicando...';

  const categoria = document.getElementById('postCategory').value;
  let subTipo = null;

  if (categoria === 'achados') {
    subTipo = document.getElementById('postSubTypeAchados').value;
  } else if (categoria === 'servicos') {
    subTipo = document.getElementById('postSubTypeServicos').value;
  }

  const dadosFormulario = new FormData();
  dadosFormulario.append('category', categoria);
  if (subTipo) dadosFormulario.append('sub_type', subTipo);
  dadosFormulario.append('title', document.getElementById('postTitle').value.trim());
  dadosFormulario.append('description', document.getElementById('postDesc').value.trim());
  dadosFormulario.append('location', document.getElementById('postLocation').value.trim() || 'Campus Lapa');
  dadosFormulario.append('contact_wpp', document.getElementById('postWpp').value.trim());

  if (categoria === 'servicos') {
    const preco = document.getElementById('postPrice').value.trim();
    if (preco) dadosFormulario.append('price', preco);
  }

  const campoArquivo = document.getElementById('postImageFile');
  if (campoArquivo && campoArquivo.files && campoArquivo.files[0]) {
    dadosFormulario.append('image', campoArquivo.files[0]);
  }

  try {
    await servicoApi.criarPublicacao(dadosFormulario);
    
    // Fechar modal e resetar formulário
    const elementoModal = document.getElementById('newPostModal');
    const instanciaModal = bootstrap.Modal.getInstance(elementoModal);
    if (instanciaModal) instanciaModal.hide();
    document.getElementById('newPostForm').reset();
    limparUploadImagem();

    exibirAlerta('Publicação criada com sucesso!', 'success');
    await carregarPublicacoes();
  } catch (erro) {
    exibirAlerta('Falha ao criar publicação: ' + erro.message, 'danger');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Publicar agora';
  }
}

// Alternar campos condicionais conforme a categoria selecionada
function aoMudarCategoria() {
  const categoria = document.getElementById('postCategory').value;
  document.getElementById('conditionalAchados').classList.toggle('d-none', categoria !== 'achados');
  document.getElementById('conditionalServicos').classList.toggle('d-none', categoria !== 'servicos');
}

// Manipular curtida rápida no card
async function aoCurtir(idPublicacao, botao) {
  const foiCurtido = publicacoesCurtidas.has(idPublicacao);
  const acao = foiCurtido ? 'decrement' : 'increment';

  try {
    const resultado = await servicoApi.alternarCurtida(idPublicacao, acao);
    if (foiCurtido) {
      publicacoesCurtidas.delete(idPublicacao);
    } else {
      publicacoesCurtidas.add(idPublicacao);
    }
    const spanContador = botao.querySelector('.contador-curtidas');
    if (spanContador) spanContador.textContent = resultado.likes_count;
    
    botao.classList.toggle('btn-danger', !foiCurtido);
    botao.classList.toggle('btn-outline-danger', foiCurtido);
    const icone = botao.querySelector('i');
    if (icone) {
      icone.className = !foiCurtido ? 'bi bi-heart-fill' : 'bi bi-heart';
    }
  } catch (erro) {
    console.error('Erro ao curtir post:', erro);
  }
}

// Configurar busca com debounce
function configurarBusca() {
  const campoBusca = document.getElementById('globalSearchInput');
  let temporizador = null;
  campoBusca?.addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      carregarPublicacoes();
    }, 300);
  });
}

// Configurar e Alternar Tema Escuro / Claro
function aplicarTema(tema) {
  document.documentElement.setAttribute('data-bs-theme', tema);
  document.documentElement.setAttribute('data-theme', tema);
  document.body.setAttribute('data-bs-theme', tema);
  document.body.setAttribute('data-theme', tema);
  localStorage.setItem('ifdashboard_theme', tema);

  const iconeTema = document.querySelector('#themeToggleBtn i');
  if (iconeTema) {
    iconeTema.className = tema === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars';
  }
}

function configurarTema() {
  const temaSalvo = localStorage.getItem('ifdashboard_theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  aplicarTema(temaSalvo);

  const botaoTema = document.getElementById('themeToggleBtn');
  botaoTema?.addEventListener('click', () => {
    const temaAtual = document.documentElement.getAttribute('data-bs-theme') || 'light';
    const proximoTema = temaAtual === 'light' ? 'dark' : 'light';
    aplicarTema(proximoTema);
  });
}

// Utilitários de Alerta
function exibirAlerta(mensagem, tipo = 'info') {
  const alerta = document.getElementById('statusAlert');
  const textoAlerta = document.getElementById('statusAlertText');
  if (alerta && textoAlerta) {
    alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
    textoAlerta.textContent = mensagem;
    alerta.classList.remove('d-none');
    setTimeout(() => ocultarAlerta(), 5000);
  }
}

function ocultarAlerta() {
  document.getElementById('statusAlert')?.classList.add('d-none');
}

function escaparHTML(texto) {
  if (!texto) return '';
  return String(texto).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

/* ============================================================
   LÓGICA DO CALENDÁRIO INTERATIVO (CAMPUS LAPA)
============================================================ */
const MESES_ANO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

let dataCalendario = new Date();
let chaveDataSelecionada = formatarChaveData(new Date());
let todosEventosCalendario = [];
let eventosPorData = new Map();

function formatarChaveData(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

async function iniciarCalendario() {
  await carregarEventosCalendario();
  renderizarCalendario();
}

async function carregarEventosCalendario() {
  try {
    const eventos = await servicoApi.obterEventos();
    todosEventosCalendario = Array.isArray(eventos) ? eventos : [];
  } catch (erro) {
    console.warn('Falha ao obter eventos da API, carregando eventos padrão:', erro);
    todosEventosCalendario = [
      { id: 1, category: 'editais', title: 'Prazo final — Auxílio Permanência', event_date: '2026-08-05', description: 'Último dia para envio da documentação na DIRENS.' },
      { id: 2, category: 'pesquisa', title: 'Encerramento inscrições — Robótica', event_date: '2026-08-10', description: 'Seleção de bolsistas de extensão com a Prof. Carla.' },
      { id: 3, category: 'editais', title: 'Manutenção Laboratórios 1 e 2', event_date: '2026-08-03', description: 'Laboratórios fechados para revisão da rede elétrica.' }
    ];
  }

  // Agrupar eventos por data (YYYY-MM-DD)
  eventosPorData = new Map();
  todosEventosCalendario.forEach(ev => {
    if (!ev.event_date) return;
    const chave = ev.event_date.substring(0, 10);
    if (!eventosPorData.has(chave)) {
      eventosPorData.set(chave, []);
    }
    eventosPorData.get(chave).push(ev);
  });

  // Se houver eventos e o mês visível estiver vazio, posiciona automaticamente no mês do primeiro evento
  const anoAtual = dataCalendario.getFullYear();
  const mesAtual = dataCalendario.getMonth();
  if (eventosPorData.size > 0 && !temEventosNoMes(anoAtual, mesAtual)) {
    const chavesOrdenadas = Array.from(eventosPorData.keys()).sort();
    const chaveAlvo = chavesOrdenadas[0];
    const [ano, mes] = chaveAlvo.split('-');
    dataCalendario = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, 1);
    chaveDataSelecionada = chaveAlvo;
  }
}

function temEventosNoMes(ano, mes) {
  const prefixo = `${ano}-${String(mes + 1).padStart(2, '0')}`;
  for (const chave of eventosPorData.keys()) {
    if (chave.startsWith(prefixo)) return true;
  }
  return false;
}

function renderizarCalendario() {
  const ano = dataCalendario.getFullYear();
  const mes = dataCalendario.getMonth();
  const chaveHoje = formatarChaveData(new Date());

  // Atualizar título do mês
  const elementoTitulo = document.getElementById('calMonthLabel');
  if (elementoTitulo) elementoTitulo.textContent = `${MESES_ANO[mes]} ${ano}`;

  // Contagem de eventos no mês visível
  let contagemEventosMes = 0;
  const prefixoMes = `${ano}-${String(mes + 1).padStart(2, '0')}`;
  for (const [chave, lista] of eventosPorData.entries()) {
    if (chave.startsWith(prefixoMes)) contagemEventosMes += lista.length;
  }
  const badgeContagem = document.getElementById('eventsCountBadge');
  if (badgeContagem) badgeContagem.textContent = `${contagemEventosMes} evento${contagemEventosMes === 1 ? '' : 's'}`;

  // Primeiro dia da semana do mês e total de dias
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  // Cabeçalho dos dias da semana
  let html = DIAS_SEMANA.map(dia => `<div class="dia-semana-cal">${dia}</div>`).join('');

  // Espaços vazios antes do dia 1
  for (let i = 0; i < primeiroDiaSemana; i++) {
    html += `<div class="dia-cal vazio"></div>`;
  }

  // Dias do mês
  for (let d = 1; d <= diasNoMes; d++) {
    const chaveDia = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const eventosDoDia = eventosPorData.get(chaveDia) || [];
    const ehHoje = chaveDia === chaveHoje;
    const estaSelecionado = chaveDia === chaveDataSelecionada;

    // Marcadores coloridos (dots)
    const dotsHtml = eventosDoDia.map(ev => {
      const pinClasse = MAPA_CATEGORIAS[ev.category]?.pin || 'pino-editais';
      return `<span class="ponto-cal ${pinClasse}" title="${escaparHTML(ev.title)}"></span>`;
    }).join('');

    // Em desktop: mostrar prévia compacta do primeiro evento
    const badgesHtml = eventosDoDia.slice(0, 1).map(ev => {
      const catClasse = MAPA_CATEGORIAS[ev.category]?.class || 'etiqueta-editais';
      return `<div class="etiqueta-evento-cal ${catClasse} d-none d-md-block" title="${escaparHTML(ev.title)}">${escaparHTML(ev.title)}</div>`;
    }).join('');

    const maisBadge = eventosDoDia.length > 1 
      ? `<span class="mais-eventos-cal text-muted d-none d-md-block">+${eventosDoDia.length - 1} evento${eventosDoDia.length > 2 ? 's' : ''}</span>` 
      : '';

    html += `
      <div class="dia-cal ${ehHoje ? 'hoje' : ''} ${estaSelecionado ? 'selecionado' : ''}" 
           data-date="${chaveDia}" 
           onclick="selecionarData('${chaveDia}')">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="numero-dia-cal">${d}</span>
          ${ehHoje ? '<span class="badge bg-warning text-dark p-0 px-1" style="font-size:0.55rem;">Hoje</span>' : ''}
        </div>
        ${badgesHtml}
        ${maisBadge}
        <div class="pontos-cal mt-auto">${dotsHtml}</div>
      </div>
    `;
  }

  const gradeCalendario = document.getElementById('calGrid');
  if (gradeCalendario) gradeCalendario.innerHTML = html;

  // Renderizar a lista de agenda do dia selecionado
  renderizarAgendaDoDia(chaveDataSelecionada);
}

function selecionarData(chaveData) {
  chaveDataSelecionada = chaveData;
  
  // Atualizar classe selected nos dias do grid
  document.querySelectorAll('.dia-cal').forEach(el => {
    el.classList.toggle('selecionado', el.getAttribute('data-date') === chaveData);
  });

  renderizarAgendaDoDia(chaveData);

  // Preencher a data padrão do modal de novo evento com a data clicada
  const campoData = document.getElementById('eventDate');
  if (campoData) campoData.value = chaveData;
}

function renderizarAgendaDoDia(chaveData) {
  const container = document.getElementById('agendaList');
  const badgeContagem = document.getElementById('agendaEventsCount');
  const elementoTitulo = document.getElementById('agendaTitle');
  const elementoSub = document.getElementById('agendaSubtitle');
  if (!container) return;

  const [ano, mes, dia] = chaveData.split('-');
  const nomeMes = MESES_ANO[parseInt(mes, 10) - 1];
  
  if (elementoTitulo) elementoTitulo.textContent = `Agenda — ${dia} de ${nomeMes}`;
  if (elementoSub) elementoSub.textContent = `${dia}/${mes}/${ano}`;

  const eventos = eventosPorData.get(chaveData) || [];
  if (badgeContagem) badgeContagem.textContent = eventos.length;

  if (eventos.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-muted">
        <i class="bi bi-calendar2-x fs-2 opacity-50"></i>
        <p class="small mt-2 mb-1 fw-medium">Nenhum evento nesta data.</p>
        <p class="text-muted" style="font-size:0.75rem;">Clique no botão abaixo para adicionar.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = eventos.map(ev => {
    const configCategoria = MAPA_CATEGORIAS[ev.category] || { label: 'Aviso', class: 'etiqueta-editais', pin: 'pino-editais' };
    return `
      <div class="item-agenda" data-event-id="${ev.id}" onclick="aoClicarItemAgenda(${ev.id})">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="badge ${configCategoria.class} rounded-pill etiqueta-cat-agenda px-2 py-0">${configCategoria.label}</span>
          <span class="indicador-pino ${configCategoria.pin} position-static d-inline-block"></span>
        </div>
        <div class="fw-bold fs-6 mb-1 text-body">${escaparHTML(ev.title)}</div>
        ${ev.description ? `<p class="text-muted small mb-0 text-truncate">${escaparHTML(ev.description)}</p>` : ''}
      </div>
    `;
  }).join('');
}

function aoClicarItemAgenda(idEvento) {
  const evento = todosEventosCalendario.find(e => e.id === idEvento);
  if (evento) abrirModalDetalhesEvento(evento);
}

function mudarMes(direcao) {
  dataCalendario = new Date(dataCalendario.getFullYear(), dataCalendario.getMonth() + direcao, 1);
  renderizarCalendario();
}

function irParaHoje() {
  dataCalendario = new Date();
  chaveDataSelecionada = formatarChaveData(new Date());
  renderizarCalendario();
}

function abrirModalDetalhesEvento(evento) {
  const configCategoria = MAPA_CATEGORIAS[evento.category] || { label: 'Aviso', class: 'etiqueta-editais' };
  
  const elementoBadge = document.getElementById('modalEventBadge');
  if (elementoBadge) {
    elementoBadge.className = `badge rounded-pill px-3 py-1 ${configCategoria.class}`;
    elementoBadge.textContent = configCategoria.label;
  }

  const elementoTitulo = document.getElementById('modalEventTitle');
  if (elementoTitulo) elementoTitulo.textContent = evento.title;

  const elementoData = document.getElementById('modalEventDate');
  if (elementoData && evento.event_date) {
    const [ano, mes, dia] = evento.event_date.substring(0, 10).split('-');
    const nomeMes = MESES_ANO[parseInt(mes, 10) - 1];
    elementoData.textContent = `${dia} de ${nomeMes} de ${ano}`;
  }

  const elementoDesc = document.getElementById('modalEventDesc');
  if (elementoDesc) elementoDesc.textContent = evento.description || 'Nenhuma descrição detalhada informada.';

  const elementoModal = document.getElementById('eventDetailModal');
  if (elementoModal) {
    const instanciaModal = new bootstrap.Modal(elementoModal);
    instanciaModal.show();
  }
}

async function salvarNovoEvento(evento) {
  evento.preventDefault();
  const botao = document.getElementById('btnSubmitEvent');
  botao.disabled = true;
  botao.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Salvando...';

  const title = document.getElementById('eventTitle').value.trim();
  const event_date = document.getElementById('eventDate').value;
  const category = document.getElementById('eventCategory').value;
  const description = document.getElementById('eventDesc').value.trim();

  try {
    await servicoApi.criarEvento({ title, event_date, category, description });
    
    // Fechar modal e resetar formulário
    const elementoModal = document.getElementById('newEventModal');
    const instanciaModal = bootstrap.Modal.getInstance(elementoModal);
    if (instanciaModal) instanciaModal.hide();
    document.getElementById('newEventForm').reset();

    exibirAlerta('Evento agendado com sucesso no calendário!', 'success');
    
    // Recarregar eventos e atualizar calendário
    await carregarEventosCalendario();
    renderizarCalendario();
  } catch (erro) {
    exibirAlerta('Erro ao criar evento: ' + erro.message, 'danger');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Salvar no Calendário';
  }
}

/* ============================================================
   ALIASES PARA COMPATIBILIDADE TOTAL (GLOBAL SCOPE)
============================================================ */
window.currentView = abaAtual;
window.currentSort = tipoOrdenacao;
window.likedPosts = publicacoesCurtidas;
window.currentPostsList = listaPublicacoes;
window.CATEGORY_MAP = MAPA_CATEGORIAS;
window.CAL_MONTHS = MESES_ANO;
window.CAL_DOWS = DIAS_SEMANA;
window.calDate = dataCalendario;
window.selectedDateKey = chaveDataSelecionada;
window.allCalendarEvents = todosEventosCalendario;
window.eventsByDate = eventosPorData;

window.setupUserSession = configurarSessaoUsuario;
window.handleLogout = fazerLogout;
window.navigate = navegar;
window.closeOffcanvas = fecharMenuLateral;
window.setSort = definirOrdenacao;
window.loadPosts = carregarPublicacoes;
window.renderPosts = renderizarPublicacoes;
window.openPostDetailModal = abrirModalDetalhes;
window.handleModalLike = curtirNoModal;
window.previewUploadImage = previsualizarImagem;
window.clearUploadImage = limparUploadImagem;
window.handleCreatePost = enviarNovaPublicacao;
window.handleCategoryChange = aoMudarCategoria;
window.handleLike = aoCurtir;
window.setupSearch = configurarBusca;
window.applyTheme = aplicarTema;
window.setupTheme = configurarTema;
window.showAlert = exibirAlerta;
window.hideAlert = ocultarAlerta;
window.escapeHTML = escaparHTML;
window.formatDateKey = formatarChaveData;
window.initCalendar = iniciarCalendario;
window.loadCalendarEvents = carregarEventosCalendario;
window.hasEventsInMonth = temEventosNoMes;
window.renderCalendar = renderizarCalendario;
window.selectDate = selecionarData;
window.renderDayAgenda = renderizarAgendaDoDia;
window.handleAgendaItemClick = aoClicarItemAgenda;
window.changeMonth = mudarMes;
window.goToToday = irParaHoje;
window.openEventDetailModal = abrirModalDetalhesEvento;
window.handleCreateEvent = salvarNovoEvento;
window.renderDestaques = renderizarDestaques;
window.goToDestaqueSlide = irParaSlideDestaque;
window.irParaSlideDestaque = irParaSlideDestaque;
window.rolarParaMural = rolarParaMural;


