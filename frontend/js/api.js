/**
 * Camada de Comunicação com a API REST Flask
 */
const HOST_API = window.location.hostname || 'localhost';
const URL_BASE_API = `http://${HOST_API}:5000/api`;
const API_BASE_URL = URL_BASE_API;

const servicoApi = {
  // Obter lista de publicações com filtros
  async obterPublicacoes(categoria = '', busca = '', ordenacao = 'recent') {
    const parametros = new URLSearchParams();
    if (categoria && categoria !== 'todos') parametros.append('category', categoria);
    if (busca) parametros.append('search', busca);
    if (ordenacao) parametros.append('sort', ordenacao);

    const resposta = await fetch(`${URL_BASE_API}/posts?${parametros.toString()}`);
    if (!resposta.ok) throw new Error(`Erro ao buscar publicações: ${resposta.statusText}`);
    return await resposta.json();
  },

  // Obter uma publicação específica
  async obterPublicacaoPorId(id) {
    const resposta = await fetch(`${URL_BASE_API}/posts/${id}`);
    if (!resposta.ok) throw new Error(`Erro ao buscar publicação: ${resposta.statusText}`);
    return await resposta.json();
  },

  // Criar nova publicação (aceita JSON ou FormData para imagens carregadas)
  async criarPublicacao(dadosPublicacao) {
    const ehFormData = dadosPublicacao instanceof FormData;
    const opcoes = {
      method: 'POST',
      body: ehFormData ? dadosPublicacao : JSON.stringify(dadosPublicacao)
    };
    if (!ehFormData) {
      opcoes.headers = { 'Content-Type': 'application/json' };
    }
    const resposta = await fetch(`${URL_BASE_API}/posts`, opcoes);
    if (!resposta.ok) {
      let mensagemErro = `Erro ao criar publicação: ${resposta.statusText}`;
      try {
        const jsonErro = await resposta.json();
        if (jsonErro && jsonErro.error) mensagemErro = jsonErro.error;
      } catch (e) {}
      throw new Error(mensagemErro);
    }
    return await resposta.json();
  },

  // Upload independente de imagem (se necessário)
  async enviarImagem(arquivo) {
    const dadosFormulario = new FormData();
    dadosFormulario.append('image', arquivo);
    const resposta = await fetch(`${URL_BASE_API}/upload`, {
      method: 'POST',
      body: dadosFormulario
    });
    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      throw new Error(erro.error || 'Erro ao carregar imagem.');
    }
    return await resposta.json();
  },

  // Curtir / Descurtir
  async alternarCurtida(id, acao = 'increment') {
    const resposta = await fetch(`${URL_BASE_API}/posts/${id}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: acao })
    });
    if (!resposta.ok) throw new Error(`Erro ao registrar curtida: ${resposta.statusText}`);
    return await resposta.json();
  },

  // Remover publicação
  async removerPublicacao(id) {
    const resposta = await fetch(`${URL_BASE_API}/posts/${id}`, {
      method: 'DELETE'
    });
    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      throw new Error(erro.error || `Erro ao remover publicação: ${resposta.statusText}`);
    }
    return await resposta.json();
  },

  // Eventos do Calendário
  async obterEventos() {
    const resposta = await fetch(`${URL_BASE_API}/events`);
    if (!resposta.ok) throw new Error(`Erro ao buscar eventos: ${resposta.statusText}`);
    return await resposta.json();
  },

  // Criar novo evento no Calendário
  async criarEvento(dadosEvento) {
    const resposta = await fetch(`${URL_BASE_API}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosEvento)
    });
    if (!resposta.ok) {
      const erro = await resposta.json();
      throw new Error(erro.error || `Erro ao criar evento: ${resposta.statusText}`);
    }
    return await resposta.json();
  },

  // Verificação de integridade da API (Health check)
  async verificarStatus() {
    try {
      const resposta = await fetch(`${URL_BASE_API}/health`);
      return resposta.ok;
    } catch {
      return false;
    }
  },

  // Autenticação com Email e Senha
  async fazerLogin(email, senha) {
    const resposta = await fetch(`${URL_BASE_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: senha })
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.error || 'Falha ao autenticar.');
    return dados;
  },

  // Cadastrar Novo Usuário
  async cadastrarUsuario(nome, email, senha) {
    const resposta = await fetch(`${URL_BASE_API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nome, email: email, password: senha })
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.error || 'Falha ao cadastrar usuário.');
    return dados;
  },

  // Entrar como Visitante
  async entrarComoVisitante() {
    const resposta = await fetch(`${URL_BASE_API}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.error || 'Falha ao entrar como visitante.');
    return dados;
  }
};

// Aliases para compatibilidade total
servicoApi.getPosts = servicoApi.obterPublicacoes;
servicoApi.getPostById = servicoApi.obterPublicacaoPorId;
servicoApi.createPost = servicoApi.criarPublicacao;
servicoApi.uploadImage = servicoApi.enviarImagem;
servicoApi.toggleLike = servicoApi.alternarCurtida;
servicoApi.getEvents = servicoApi.obterEventos;
servicoApi.createEvent = servicoApi.criarEvento;
servicoApi.checkHealth = servicoApi.verificarStatus;
servicoApi.login = servicoApi.fazerLogin;
servicoApi.register = servicoApi.cadastrarUsuario;
servicoApi.loginAsGuest = servicoApi.entrarComoVisitante;
servicoApi.deletePost = servicoApi.removerPublicacao;

const api = servicoApi;
