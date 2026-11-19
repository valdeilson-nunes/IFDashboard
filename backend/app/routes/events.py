from datetime import datetime
from flask import Blueprint, request, jsonify
from app import db
from app.models import Evento

rotas_eventos = Blueprint('events', __name__)


@rotas_eventos.route('', methods=['GET'])
def listar_eventos():
    eventos = Evento.query.order_by(Evento.event_date.asc()).all()
    return jsonify([e.para_dicionario() for e in eventos]), 200


@rotas_eventos.route('', methods=['POST'])
def criar_evento():
    dados = request.get_json() or {}
    if not dados.get('title') or not dados.get('event_date') or not dados.get('category'):
        return jsonify({'error': 'Título, data e categoria são obrigatórios.'}), 400

    try:
        data_evento = datetime.strptime(dados['event_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Formato de data inválido. Use AAAA-MM-DD.'}), 400

    novo = Evento(
        category=dados['category'],
        title=dados['title'].strip(),
        description=dados.get('description', '').strip(),
        event_date=data_evento,
        post_id=dados.get('post_id')
    )
    db.session.add(novo)
    db.session.commit()
    return jsonify(novo.para_dicionario()), 201


