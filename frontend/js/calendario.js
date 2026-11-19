/**
 * Módulo do Calendário Acadêmico Interativo e Agenda Lateral
 */

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
  } catch {
    todosEventosCalendario = [];
  }

  eventosPorData = new Map();
  todosEventosCalendario.forEach(ev => {
    if (!ev.event_date) return;
    const chave = ev.event_date.substring(0, 10);
    if (!eventosPorData.has(chave)) eventosPorData.set(chave, []);
    eventosPorData.get(chave).push(ev);
  });

  const prefixoAtual = `${dataCalendario.getFullYear()}-${String(dataCalendario.getMonth() + 1).padStart(2, '0')}`;
  const temNoMesAtual = Array.from(eventosPorData.keys()).some(k => k.startsWith(prefixoAtual));

  if (eventosPorData.size > 0 && !temNoMesAtual) {
    const chaveAlvo = Array.from(eventosPorData.keys()).sort()[0];
    const [ano, mes] = chaveAlvo.split('-');
    dataCalendario = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, 1);
    chaveDataSelecionada = chaveAlvo;
  }
}

function renderizarCalendario() {
  const ano = dataCalendario.getFullYear();
  const mes = dataCalendario.getMonth();
  const chaveHoje = formatarChaveData(new Date());
  const prefixoMes = `${ano}-${String(mes + 1).padStart(2, '0')}`;

  document.getElementById('calMonthLabel').textContent = `${MESES_ANO[mes]} ${ano}`;

  let contagemMes = 0;
  for (const [chave, lista] of eventosPorData.entries()) {
    if (chave.startsWith(prefixoMes)) contagemMes += lista.length;
  }
  document.getElementById('eventsCountBadge').textContent = `${contagemMes} evento${contagemMes === 1 ? '' : 's'}`;

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  let html = DIAS_SEMANA.map(d => `<div class="dia-semana-cal">${d}</div>`).join('');
  html += '<div class="dia-cal vazio"></div>'.repeat(primeiroDiaSemana);

  for (let d = 1; d <= diasNoMes; d++) {
    const chaveDia = `${prefixoMes}-${String(d).padStart(2, '0')}`;
    const eventosDia = eventosPorData.get(chaveDia) || [];
    const ehHoje = chaveDia === chaveHoje;
    const selecionado = chaveDia === chaveDataSelecionada;

    const dotsHtml = eventosDia.map(ev => {
      const pin = MAPA_CATEGORIAS[ev.category]?.pin || 'pino-editais';
      return `<span class="ponto-cal ${pin}" title="${escaparHTML(ev.title)}"></span>`;
    }).join('');

    const badgeHtml = eventosDia.slice(0, 1).map(ev => {
      const cls = MAPA_CATEGORIAS[ev.category]?.class || 'etiqueta-editais';
      return `<div class="etiqueta-evento-cal ${cls} d-none d-md-block" title="${escaparHTML(ev.title)}">${escaparHTML(ev.title)}</div>`;
    }).join('');

    const maisHtml = eventosDia.length > 1
      ? `<span class="mais-eventos-cal text-muted d-none d-md-block">+${eventosDia.length - 1} evento${eventosDia.length > 2 ? 's' : ''}</span>`
      : '';

    html += `
      <div class="dia-cal ${ehHoje ? 'hoje' : ''} ${selecionado ? 'selecionado' : ''}" data-date="${chaveDia}" onclick="selecionarData('${chaveDia}')">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="numero-dia-cal">${d}</span>
          ${ehHoje ? '<span class="badge bg-warning text-dark p-0 px-1" style="font-size:0.55rem;">Hoje</span>' : ''}
        </div>
        ${badgeHtml}
        ${maisHtml}
        <div class="pontos-cal mt-auto">${dotsHtml}</div>
      </div>
    `;
  }

  document.getElementById('calGrid').innerHTML = html;
  renderizarAgendaDoDia(chaveDataSelecionada);
}

function selecionarData(chaveData) {
  chaveDataSelecionada = chaveData;
  document.querySelectorAll('.dia-cal').forEach(el => {
    el.classList.toggle('selecionado', el.getAttribute('data-date') === chaveData);
  });
  renderizarAgendaDoDia(chaveData);
  const campoData = document.getElementById('eventDate');
  if (campoData) campoData.value = chaveData;
}

function renderizarAgendaDoDia(chaveData) {
  const container = document.getElementById('agendaList');
  if (!container) return;

  const [ano, mes, dia] = chaveData.split('-');
  document.getElementById('agendaTitle').textContent = `Agenda — ${dia} de ${MESES_ANO[parseInt(mes, 10) - 1]}`;
  document.getElementById('agendaSubtitle').textContent = `${dia}/${mes}/${ano}`;

  const eventos = eventosPorData.get(chaveData) || [];
  document.getElementById('agendaEventsCount').textContent = eventos.length;

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
    const cfg = MAPA_CATEGORIAS[ev.category] || { label: 'Aviso', class: 'etiqueta-editais', pin: 'pino-editais' };
    return `
      <div class="item-agenda" onclick="aoClicarItemAgenda(${ev.id})">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="badge ${cfg.class} rounded-pill etiqueta-cat-agenda px-2 py-0">${cfg.label}</span>
          <span class="indicador-pino ${cfg.pin} position-static d-inline-block"></span>
        </div>
        <div class="fw-bold fs-6 mb-1 text-body">${escaparHTML(ev.title)}</div>
        ${ev.description ? `<p class="text-muted small mb-0 text-truncate">${escaparHTML(ev.description)}</p>` : ''}
      </div>
    `;
  }).join('');
}

async function aoClicarItemAgenda(idEvento) {
  const evento = todosEventosCalendario.find(e => Number(e.id) === Number(idEvento));
  if (!evento) return;

  if (evento.post_id) {
    return abrirModalDetalhes(evento.post_id);
  }

  const cfg = MAPA_CATEGORIAS[evento.category] || { label: 'Aviso', class: 'etiqueta-editais' };
  const badge = document.getElementById('modalEventBadge');
  badge.className = `badge rounded-pill px-3 py-1 ${cfg.class}`;
  badge.textContent = cfg.label;

  document.getElementById('modalEventTitle').textContent = evento.title;
  if (evento.event_date) {
    const [ano, mes, dia] = evento.event_date.substring(0, 10).split('-');
    document.getElementById('modalEventDate').textContent = `${dia} de ${MESES_ANO[parseInt(mes, 10) - 1]} de ${ano}`;
  }
  document.getElementById('modalEventDesc').textContent = evento.description || 'Nenhuma descrição detalhada informada.';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('eventDetailModal')).show();
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

async function salvarNovoEvento(evento) {
  evento.preventDefault();
  if (ehConvidado()) return abrirModalCadastroConvidado();

  const botao = document.getElementById('btnSubmitEvent');
  botao.disabled = true;
  botao.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

  try {
    await servicoApi.criarEvento({
      title: document.getElementById('eventTitle').value.trim(),
      event_date: document.getElementById('eventDate').value,
      category: document.getElementById('eventCategory').value,
      description: document.getElementById('eventDesc').value.trim()
    });
    bootstrap.Modal.getInstance(document.getElementById('newEventModal'))?.hide();
    document.getElementById('newEventForm').reset();

    exibirAlerta('Evento agendado com sucesso no calendário!', 'success');
    await carregarEventosCalendario();
    renderizarCalendario();
  } catch (erro) {
    exibirAlerta('Erro ao criar evento: ' + erro.message, 'danger');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Salvar no Calendário';
  }
}


