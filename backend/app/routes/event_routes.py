from flask import Blueprint, request, jsonify
from datetime import datetime
from app import db
from app.models import Evento

rotas_eventos = Blueprint('events', __name__)
events_bp = rotas_eventos

@rotas_eventos.route('', methods=['GET'])
def listar_eventos():
    """Retorna todos os eventos do calendário ordenados por data"""
    eventos = Evento.query.order_by(Evento.event_date.asc()).all()
    return jsonify([evento.para_dicionario() for evento in eventos]), 200

get_events = listar_eventos

@rotas_eventos.route('', methods=['POST'])
def criar_evento():
    """Cadastra um novo evento no calendário acadêmico"""
    dados = request.get_json() or {}

    if not dados.get('title') or not dados.get('event_date') or not dados.get('category'):
        return jsonify({'error': 'Título, data e categoria são obrigatórios'}), 400

    try:
        data_evento = datetime.strptime(dados.get('event_date'), '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Formato de data inválido. Use AAAA-MM-DD'}), 400

    novo_evento = Evento(
        category=dados.get('category'),
        title=dados.get('title'),
        description=dados.get('description', ''),
        event_date=data_evento,
        post_id=dados.get('post_id')
    )

    db.session.add(novo_evento)
    db.session.commit()

    return jsonify(novo_evento.para_dicionario()), 201

create_event = criar_evento
