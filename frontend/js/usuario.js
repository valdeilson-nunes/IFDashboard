/**
 * Módulo de Sessão, Perfil, Notificações e Gestão de Usuários
 */

let abaPerfilAtual = 'meus';
let listaUsuariosAdmin = [];
let publicacoesCurtidas = new Set();
let publicacoesSalvas = new Set();
let publicacoesMinhas = new Set();
let notificacoesUsuario = [];

function obterUsuarioSessao() {
  try {
    return JSON.parse(localStorage.getItem('ifdashboard_user') || 'null');
  } catch {
    return null;
  }
}

function ehConvidado() {
  const u = obterUsuarioSessao();
  return !u || u.role === 'guest';
}

function ehAdminOuDev() {
  const u = obterUsuarioSessao();
  return Boolean(u && (u.role === 'admin' || u.role === 'dev'));
}

function abrirModalCadastroConvidado() {
  const el = document.getElementById('guestRegisterModal');
  if (el) bootstrap.Modal.getOrCreateInstance(el).show();
}

function obterChaveUsuario(base) {
  const usuario = obterUsuarioSessao();
  if (!usuario) return `${base}_anonimo`;
  if (usuario.role === 'guest') return `${base}_guest`;
  const id = (usuario.email || usuario.id || 'padrao').toString().toLowerCase().trim();
  return `${base}_${id}`;
}

function carregarDadosLocaisUsuario() {
  publicacoesCurtidas = new Set(JSON.parse(localStorage.getItem(obterChaveUsuario('ifdashboard_liked_posts')) || '[]'));
  publicacoesSalvas = new Set(JSON.parse(localStorage.getItem(obterChaveUsuario('ifdashboard_saved_posts')) || '[]'));
  publicacoesMinhas = new Set(JSON.parse(localStorage.getItem(obterChaveUsuario('ifdashboard_my_posts')) || '[]'));

  const salvasNotif = JSON.parse(localStorage.getItem(obterChaveUsuario('ifdashboard_notifications')) || 'null');
  if (salvasNotif) {
    notificacoesUsuario = salvasNotif;
  } else {
    notificacoesUsuario = [{
      id: 1,
      titulo: 'Boas-vindas ao IFDashboard!',
      mensagem: 'Fique por dentro de avisos oficiais, editais, achados e serviços do IF Baiano Campus Lapa.',
      icone: 'bi-bell-fill text-primary',
      data: 'Hoje',
      lida: false
    }];
    localStorage.setItem(obterChaveUsuario('ifdashboard_notifications'), JSON.stringify(notificacoesUsuario));
  }
}

function configurarSessaoUsuario() {
  const usuario = obterUsuarioSessao();
  if (!usuario) return;

  const adminOuDev = ehAdminOuDev();
  document.getElementById('navUsuariosItem')?.classList.toggle('d-none', !adminOuDev);

  const selectCat = document.getElementById('postCategory');
  if (selectCat) {
    Array.from(selectCat.options).forEach(opt => {
      if (['pesquisa', 'editais', 'avisos'].includes(opt.value)) {
        opt.hidden = !adminOuDev;
        opt.disabled = !adminOuDev;
      }
    });
  }

  const rotulosPapel = {
    guest: 'Modo Visitante (Apenas leitura)',
    basico: 'Usuário Básico',
    student: 'Usuário Básico',
    admin: 'Administrador',
    dev: 'Desenvolvedor (Superusuário)'
  };

  const nome = usuario.name || 'Usuário';
  const papel = usuario.role === 'guest'
    ? rotulosPapel.guest
    : `${usuario.email || ''} • ${rotulosPapel[usuario.role] || 'Básico'}`;
  const inicial = nome.charAt(0).toUpperCase();

  ['drawerUserName', 'profileName'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = nome;
  });
  ['drawerUserEmail', 'profileEmail'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = papel;
  });
  ['drawerUserBadge', 'profileBadgeLetter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = inicial;
  });
}

async function fazerCadastroVisitante(evento) {
  evento.preventDefault();
  const nome = document.getElementById('guestRegName').value.trim();
  const email = document.getElementById('guestRegEmail').value.trim();
  const senha = document.getElementById('guestRegPass').value.trim();
  const conf = document.getElementById('guestRegPassConfirm').value.trim();
  const alerta = document.getElementById('guestRegisterAlert');
  const btn = document.getElementById('btnGuestRegisterSubmit');

  alerta.classList.add('d-none');
  if (senha !== conf) {
    alerta.textContent = 'As senhas não coincidem.';
    alerta.classList.remove('d-none');
    return;
  }

  btn.disabled = true;
  try {
    const resp = await servicoApi.cadastrarUsuario(nome, email, senha);
    localStorage.setItem('ifdashboard_user', JSON.stringify(resp.user));
    window.location.reload();
  } catch (erro) {
    alerta.textContent = erro.message || 'Erro ao cadastrar.';
    alerta.classList.remove('d-none');
  } finally {
    btn.disabled = false;
  }
}

function fazerLogout() {
  localStorage.removeItem('ifdashboard_user');
  window.location.href = 'landing.html';
}

/* --- GESTÃO DE USUÁRIOS (ADMIN / DEV) --- */
async function carregarUsuariosAdmin() {
  const tbody = document.getElementById('usuariosTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Carregando usuários...</td></tr>';

  try {
    listaUsuariosAdmin = await servicoApi.listarUsuarios();
    renderizarTabelaUsuarios(listaUsuariosAdmin);
  } catch (erro) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">${escaparHTML(erro.message)}</td></tr>`;
  }
}

function filtrarTabelaUsuarios() {
  const termo = (document.getElementById('userSearchInput')?.value || '').trim().toLowerCase();
  const filtrados = listaUsuariosAdmin.filter(u =>
    (u.name || '').toLowerCase().includes(termo) ||
    (u.email || '').toLowerCase().includes(termo)
  );
  renderizarTabelaUsuarios(filtrados);
}

function renderizarTabelaUsuarios(usuarios) {
  const tbody = document.getElementById('usuariosTableBody');
  if (!tbody) return;

  if (!usuarios || usuarios.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Nenhum usuário encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = usuarios.map(u => {
    const badgePapel = u.role === 'admin'
      ? '<span class="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle">Administrador</span>'
      : '<span class="badge bg-secondary-subtle text-secondary-emphasis border">Básico</span>';

    return `
      <tr>
        <td class="fw-semibold">${escaparHTML(u.name)}</td>
        <td class="text-muted small">${escaparHTML(u.email)}</td>
        <td>${badgePapel}</td>
        <td><span class="badge bg-body-secondary text-body border">${u.posts_count || 0}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary" onclick="abrirModalUsuarioAdmin(${u.id})">
            <i class="bi bi-sliders me-1"></i>Gerenciar
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function abrirModalUsuarioAdmin(userId) {
  const u = listaUsuariosAdmin.find(item => Number(item.id) === Number(userId));
  if (!u) return;

  document.getElementById('adminUserModalTitle').textContent = `Gerenciar: ${u.name}`;
  document.getElementById('adminEditUserId').value = u.id;
  document.getElementById('adminEditUserName').value = u.name || '';
  document.getElementById('adminEditUserEmail').value = u.email || '';
  document.getElementById('adminEditUserRole').value = u.role === 'admin' ? 'admin' : 'basico';
  document.getElementById('adminEditUserPassword').value = '';

  const tabInfo = document.getElementById('tabBtnUserInfo');
  if (tabInfo) bootstrap.Tab.getOrCreateInstance(tabInfo).show();

  const listaPostsEl = document.getElementById('adminUserPostsList');
  const countEl = document.getElementById('adminUserPostsCount');
  listaPostsEl.innerHTML = '<div class="text-center py-3 text-muted small">Carregando publicações...</div>';

  bootstrap.Modal.getOrCreateInstance(document.getElementById('adminUserModal')).show();

  try {
    const posts = await servicoApi.obterPostsUsuarioAdmin(u.id);
    countEl.textContent = posts.length;
    if (posts.length === 0) {
      listaPostsEl.innerHTML = '<div class="text-center py-4 text-muted small">Este usuário ainda não criou publicações.</div>';
      return;
    }
    listaPostsEl.innerHTML = posts.map(p => {
      const cat = MAPA_CATEGORIAS[p.category] || { label: p.category, class: 'bg-secondary' };
      return `
        <div class="p-3 rounded-3 border bg-body-tertiary d-flex justify-content-between align-items-center gap-2" style="cursor:pointer;" onclick="abrirPostDoUsuarioAdmin(${p.id})">
          <div class="overflow-hidden">
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="badge ${cat.class} rounded-pill">${cat.label}</span>
              <span class="fw-bold text-truncate">${escaparHTML(p.title)}</span>
            </div>
            <small class="text-muted d-block text-truncate">${escaparHTML(p.description || '')}</small>
          </div>
          <i class="bi bi-box-arrow-up-right text-primary"></i>
        </div>
      `;
    }).join('');
  } catch (erro) {
    listaPostsEl.innerHTML = `<div class="text-danger small py-3">${escaparHTML(erro.message)}</div>`;
  }
}

function abrirPostDoUsuarioAdmin(postId) {
  bootstrap.Modal.getInstance(document.getElementById('adminUserModal'))?.hide();
  abrirModalDetalhes(postId);
}

async function salvarUsuarioAdmin(evento) {
  evento.preventDefault();
  const id = Number(document.getElementById('adminEditUserId').value);
  const btn = document.getElementById('btnSaveAdminUser');
  btn.disabled = true;

  const dados = {
    name: document.getElementById('adminEditUserName').value.trim(),
    email: document.getElementById('adminEditUserEmail').value.trim(),
    role: document.getElementById('adminEditUserRole').value
  };
  const senha = document.getElementById('adminEditUserPassword').value.trim();
  if (senha) dados.password = senha;

  try {
    await servicoApi.atualizarUsuarioAdmin(id, dados);
    bootstrap.Modal.getInstance(document.getElementById('adminUserModal'))?.hide();
    exibirAlerta('Usuário atualizado com sucesso.', 'success');
    await carregarUsuariosAdmin();
  } catch (erro) {
    exibirAlerta(erro.message, 'danger');
  } finally {
    btn.disabled = false;
  }
}

/* --- MEU PERFIL E NOTIFICAÇÕES --- */
function mudarAbaPerfil(aba) {
  abaPerfilAtual = aba;
  document.querySelectorAll('#perfilTabs button').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-perfil-aba') === aba);
  });
  renderizarPerfil(aba);
}

async function renderizarPerfil(aba = 'meus') {
  const container = document.getElementById('perfilContent');
  if (!container) return;

  try {
    const todas = await servicoApi.obterPublicacoes('', '', 'recent');
    if (Array.isArray(todas)) listaPublicacoes = todas;
  } catch {}

  const usuario = obterUsuarioSessao();
  const nomeUsuario = (usuario?.name || '').trim().toLowerCase();

  let notifsServidor = [];
  if (usuario && usuario.id && usuario.role !== 'guest') {
    notifsServidor = await servicoApi.obterNotificacoes(usuario.id);
  }
  const todasNotificacoes = [...notifsServidor, ...notificacoesUsuario];

  const minhas = listaPublicacoes.filter(p =>
    publicacoesMinhas.has(Number(p.id)) ||
    (usuario && p.user_id && Number(p.user_id) === Number(usuario.id)) ||
    (nomeUsuario !== '' && (p.author || '').trim().toLowerCase() === nomeUsuario)
  );
  const salvos = listaPublicacoes.filter(p => publicacoesSalvas.has(Number(p.id)));
  const curtidas = listaPublicacoes.filter(p => publicacoesCurtidas.has(Number(p.id)));

  document.getElementById('countMeus').textContent = minhas.length;
  document.getElementById('countSalvos').textContent = salvos.length;
  document.getElementById('countCurtidos').textContent = curtidas.length;
  document.getElementById('countNotificacoes').textContent = todasNotificacoes.filter(n => !n.lida).length;

  if (aba === 'notificacoes') {
    if (todasNotificacoes.length === 0) {
      container.innerHTML = `
        <div class="empty-state-perfil">
          <i class="bi bi-bell-slash fs-1 text-muted"></i>
          <h5 class="fw-bold mt-3 mb-1">Nenhuma notificação</h5>
          <p class="text-muted small">Você não tem notificações recentes no momento.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <span class="text-muted small fw-semibold">Notificações e Avisos Pessoais</span>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary py-1" onclick="marcarNotificacoesComoLidas()">
            <i class="bi bi-check2-all me-1"></i>Marcar todas como lidas
          </button>
          <button class="btn btn-sm btn-outline-danger py-1" onclick="limparNotificacoes()">
            <i class="bi bi-trash me-1"></i>Limpar
          </button>
        </div>
      </div>
      <div class="d-flex flex-column gap-2">
        ${todasNotificacoes.map(n => `
          <div class="card-notificacao ${!n.lida ? 'nao-lida' : ''} d-flex align-items-start gap-3">
            <i class="bi ${n.icone || 'bi-bell-fill text-primary'} fs-4 mt-1"></i>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold text-body">${escaparHTML(n.titulo)}</span>
                <small class="text-muted">${escaparHTML(n.data || 'Hoje')}</small>
              </div>
              <p class="text-muted small mb-0">${escaparHTML(n.mensagem)}</p>
            </div>
            ${!n.lida ? '<span class="badge bg-primary rounded-pill p-1" title="Não lida">●</span>' : ''}
          </div>
        `).join('')}
      </div>
    `;
    return;
  }

  const mapasAbas = {
    meus: { lista: minhas, icone: 'bi-journal-x', titulo: 'Nenhuma publicação criada ainda', dica: 'Você ainda não publicou nenhum aviso, achado ou serviço no mural.' },
    salvos: { lista: salvos, icone: 'bi-bookmark-x', titulo: 'Nenhum item salvo', dica: 'Clique no ícone de marcador nos cards para salvar publicações importantes.' },
    curtidos: { lista: curtidas, icone: 'bi-heartbreak', titulo: 'Nenhuma publicação curtida', dica: 'Publicações curtidas por você aparecerão aqui.' }
  };

  const info = mapasAbas[aba] || mapasAbas.meus;
  if (info.lista.length === 0) {
    container.innerHTML = `
      <div class="empty-state-perfil">
        <i class="bi ${info.icone} fs-1 text-muted"></i>
        <h5 class="fw-bold mt-3 mb-1">${info.titulo}</h5>
        <p class="text-muted small mb-3">${info.dica}</p>
        ${aba === 'meus'
          ? '<button class="btn btn-primary btn-sm px-3" onclick="aoClicarPublicar()"><i class="bi bi-plus-lg me-1"></i>Criar Publicação Agora</button>'
          : `<button class="btn btn-outline-secondary btn-sm px-3" onclick="navegar('home')"><i class="bi bi-arrow-left me-1"></i>Explorar Mural do Campus</button>`
        }
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="row g-3">${info.lista.map(p => gerarHtmlCardPublicacao(p, aba === 'meus')).join('')}</div>`;
}

function adicionarNotificacao(titulo, mensagem, icone = 'bi-bell-fill text-primary') {
  notificacoesUsuario.unshift({
    id: Date.now(),
    titulo,
    mensagem,
    icone,
    data: 'Agora',
    lida: false
  });
  localStorage.setItem(obterChaveUsuario('ifdashboard_notifications'), JSON.stringify(notificacoesUsuario));
}

async function marcarNotificacoesComoLidas() {
  notificacoesUsuario.forEach(n => { n.lida = true; });
  localStorage.setItem(obterChaveUsuario('ifdashboard_notifications'), JSON.stringify(notificacoesUsuario));
  const u = obterUsuarioSessao();
  if (u && u.id && u.role !== 'guest') await servicoApi.marcarNotificacoesLidas(u.id);
  renderizarPerfil('notificacoes');
}

async function limparNotificacoes() {
  notificacoesUsuario = [];
  localStorage.setItem(obterChaveUsuario('ifdashboard_notifications'), JSON.stringify(notificacoesUsuario));
  const u = obterUsuarioSessao();
  if (u && u.id && u.role !== 'guest') await servicoApi.limparNotificacoesApi(u.id);
  renderizarPerfil('notificacoes');
}


