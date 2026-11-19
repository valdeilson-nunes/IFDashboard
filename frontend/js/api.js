const URL_BASE_API = '/api';

function obterHeadersAuth(extra = {}) {
  const headers = { ...extra };
  try {
    const u = JSON.parse(localStorage.getItem('ifdashboard_user') || 'null');
    if (u && u.id) headers['X-User-Id'] = String(u.id);
  } catch (e) {}
  return headers;
}

async function requisicaoJson(url, opcoes = {}, erroPadrao = 'Erro na requisição.') {
  const resposta = await fetch(url, opcoes);
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.error || erroPadrao);
  return dados;
}

const servicoApi = {
  obterPublicacoes(categoria = '', busca = '', ordenacao = 'recent') {
    const params = new URLSearchParams();
    if (categoria && categoria !== 'todos') params.append('category', categoria);
    if (busca) params.append('search', busca);
    if (ordenacao) params.append('sort', ordenacao);
    return requisicaoJson(`${URL_BASE_API}/posts?${params.toString()}`, {}, 'Erro ao buscar publicações.');
  },

  obterPublicacaoPorId(id) {
    return requisicaoJson(`${URL_BASE_API}/posts/${id}`, {}, 'Publicação não encontrada.');
  },

  criarPublicacao(dadosPublicacao) {
    const ehFormData = dadosPublicacao instanceof FormData;
    return requisicaoJson(`${URL_BASE_API}/posts`, {
      method: 'POST',
      headers: ehFormData ? obterHeadersAuth() : obterHeadersAuth({ 'Content-Type': 'application/json' }),
      body: ehFormData ? dadosPublicacao : JSON.stringify(dadosPublicacao)
    }, 'Erro ao criar publicação.');
  },

  editarPublicacao(id, dados) {
    return requisicaoJson(`${URL_BASE_API}/posts/${id}`, {
      method: 'PUT',
      headers: obterHeadersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(dados)
    }, 'Erro ao editar publicação.');
  },

  removerPublicacao(id) {
    return requisicaoJson(`${URL_BASE_API}/posts/${id}`, {
      method: 'DELETE',
      headers: obterHeadersAuth()
    }, 'Erro ao remover publicação.');
  },

  alternarCurtida(id, acao = 'increment') {
    return requisicaoJson(`${URL_BASE_API}/posts/${id}/like`, {
      method: 'POST',
      headers: obterHeadersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: acao })
    }, 'Erro ao registrar curtida.');
  },

  obterEventos() {
    return requisicaoJson(`${URL_BASE_API}/events`, {}, 'Erro ao buscar eventos.');
  },

  criarEvento(dadosEvento) {
    return requisicaoJson(`${URL_BASE_API}/events`, {
      method: 'POST',
      headers: obterHeadersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(dadosEvento)
    }, 'Erro ao criar evento.');
  },

  fazerLogin(email, senha) {
    return requisicaoJson(`${URL_BASE_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: senha })
    }, 'Falha ao autenticar.');
  },

  cadastrarUsuario(nome, email, senha) {
    return requisicaoJson(`${URL_BASE_API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nome, email, password: senha })
    }, 'Falha ao cadastrar usuário.');
  },

  entrarComoVisitante() {
    return requisicaoJson(`${URL_BASE_API}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, 'Falha ao entrar como visitante.');
  },

  listarUsuarios() {
    return requisicaoJson(`${URL_BASE_API}/auth/users`, {
      headers: obterHeadersAuth()
    }, 'Erro ao listar usuários.');
  },

  atualizarUsuarioAdmin(id, dados) {
    return requisicaoJson(`${URL_BASE_API}/auth/users/${id}`, {
      method: 'PUT',
      headers: obterHeadersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(dados)
    }, 'Erro ao atualizar usuário.');
  },

  obterPostsUsuarioAdmin(id) {
    return requisicaoJson(`${URL_BASE_API}/auth/users/${id}/posts`, {
      headers: obterHeadersAuth()
    }, 'Erro ao carregar posts do usuário.');
  },

  async obterNotificacoes(userId) {
    try {
      return await requisicaoJson(`${URL_BASE_API}/auth/notifications/${userId}`, {
        headers: obterHeadersAuth()
      });
    } catch {
      return [];
    }
  },

  marcarNotificacoesLidas(userId) {
    return fetch(`${URL_BASE_API}/auth/notifications/${userId}/read`, {
      method: 'POST',
      headers: obterHeadersAuth()
    });
  },

  limparNotificacoesApi(userId) {
    return fetch(`${URL_BASE_API}/auth/notifications/${userId}`, {
      method: 'DELETE',
      headers: obterHeadersAuth()
    });
  }
};


