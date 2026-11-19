/**
 * Orquestrador Principal do IFDashboard: Navegação, Tema, Busca e Utilitários
 */

let abaAtual = 'home';

const MAPA_CATEGORIAS = {
  achados: { label: 'Achados e Perdidos', class: 'etiqueta-achados', pin: 'pino-achados' },
  servicos: { label: 'Serviços e Vendas', class: 'etiqueta-servicos', pin: 'pino-servicos' },
  pesquisa: { label: 'Pesquisa e Extensão', class: 'etiqueta-pesquisa', pin: 'pino-pesquisa' },
  editais: { label: 'Editais', class: 'etiqueta-editais', pin: 'pino-editais' },
  avisos: { label: 'Avisos', class: 'etiqueta-avisos', pin: 'pino-avisos' }
};

const TITULOS_ABAS = {
  home: { titulo: 'Mural do Campus', subtitulo: 'Avisos oficiais, achados, serviços e oportunidades da comunidade acadêmica.' },
  usuarios: { titulo: 'Gestão de Usuários', subtitulo: 'Administre perfis cadastrados, níveis de acesso e publicações dos usuários.' },
  achados: { titulo: 'Achados e Perdidos', subtitulo: 'Perdeu ou encontrou algo no campus? Ajude a comunidade a recuperar.' },
  servicos: { titulo: 'Serviços e Vendas', subtitulo: 'Compre, venda ou contrate aulas e serviços no âmbito do IF.' },
  pesquisa: { titulo: 'Pesquisa e Extensão', subtitulo: 'Oportunidades de bolsas, monitorias e projetos de extensão abertos.' },
  editais: { titulo: 'Editais', subtitulo: 'Editais oficiais, processos seletivos e auxílios estudantis do campus.' },
  avisos: { titulo: 'Avisos', subtitulo: 'Comunicados gerais, informativos e avisos da comunidade acadêmica.' },
  calendario: { titulo: 'Calendário Acadêmico', subtitulo: 'Provas, prazos de editais, manutenções e eventos do campus.' },
  perfil: { titulo: 'Meu Perfil', subtitulo: 'Suas publicações, itens salvos e atividades no mural.' }
};

carregarDadosLocaisUsuario();

document.addEventListener('DOMContentLoaded', async () => {
  configurarSessaoUsuario();
  configurarBusca();
  configurarTema();

  document.getElementById('newPostModal')?.addEventListener('hidden.bs.modal', () => {
    document.getElementById('newPostForm')?.reset();
    limparUploadImagem();
    aoMudarCategoria();
  });

  await carregarPublicacoes();
  configurarCarrosselDestaques();
});

function aoClicarPublicar() {
  if (ehConvidado()) return abrirModalCadastroConvidado();
  aoMudarCategoria();
  bootstrap.Modal.getOrCreateInstance(document.getElementById('newPostModal')).show();
}

function aoClicarNovoEvento() {
  if (ehConvidado()) return abrirModalCadastroConvidado();
  bootstrap.Modal.getOrCreateInstance(document.getElementById('newEventModal')).show();
}

function navegar(aba) {
  const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('sidebarMenu'));
  offcanvas?.hide();

  if (aba === 'perfil' && ehConvidado()) return abrirModalCadastroConvidado();
  if (aba === 'usuarios' && !ehAdminOuDev()) {
    return exibirAlerta('Acesso restrito a Administradores.', 'warning');
  }

  abaAtual = aba;
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-nav') === aba);
  });

  const cabecalho = TITULOS_ABAS[aba] || TITULOS_ABAS.home;
  document.getElementById('sectionTitle').textContent = cabecalho.titulo;
  document.getElementById('sectionSubtitle').textContent = cabecalho.subtitulo;

  const ehCalendario = aba === 'calendario';
  const ehPerfil = aba === 'perfil';
  const ehUsuarios = aba === 'usuarios';

  document.getElementById('calendarView')?.classList.toggle('d-none', !ehCalendario);
  document.getElementById('perfilView')?.classList.toggle('d-none', !ehPerfil);
  document.getElementById('usuariosView')?.classList.toggle('d-none', !ehUsuarios);
  document.getElementById('postsView')?.classList.toggle('d-none', ehCalendario || ehPerfil || ehUsuarios);
  document.getElementById('sortFilterGroup')?.classList.toggle('d-none', ehCalendario || ehPerfil || ehUsuarios);

  pararTemporizadorDestaques();
  if (aba !== 'home') document.getElementById('destaquesView')?.classList.add('d-none');

  if (ehCalendario) iniciarCalendario();
  else if (ehPerfil) renderizarPerfil(abaPerfilAtual);
  else if (ehUsuarios) carregarUsuariosAdmin();
  else carregarPublicacoes();
}

function configurarBusca() {
  const campoBusca = document.getElementById('globalSearchInput');
  let timer = null;
  campoBusca?.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => carregarPublicacoes(), 300);
  });
}

function aplicarTema(tema) {
  document.documentElement.setAttribute('data-bs-theme', tema);
  document.documentElement.setAttribute('data-theme', tema);
  document.body.setAttribute('data-bs-theme', tema);
  document.body.setAttribute('data-theme', tema);
  localStorage.setItem('ifdashboard_theme', tema);

  const icone = document.querySelector('#themeToggleBtn i');
  if (icone) icone.className = tema === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars';
}

function configurarTema() {
  const temaSalvo = localStorage.getItem('ifdashboard_theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  aplicarTema(temaSalvo);

  document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    const atual = document.documentElement.getAttribute('data-bs-theme') || 'light';
    aplicarTema(atual === 'light' ? 'dark' : 'light');
  });
}

function exibirAlerta(mensagem, tipo = 'info') {
  const alerta = document.getElementById('statusAlert');
  const texto = document.getElementById('statusAlertText');
  if (!alerta || !texto) return;
  alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
  texto.textContent = mensagem;
  alerta.classList.remove('d-none');
  setTimeout(() => alerta.classList.add('d-none'), 5000);
}

function ocultarAlerta() {
  document.getElementById('statusAlert')?.classList.add('d-none');
}

function escaparHTML(texto) {
  if (!texto) return '';
  return String(texto).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}


