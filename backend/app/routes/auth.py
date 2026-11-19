from flask import Blueprint, request, jsonify
from app import db
from app.models import Usuario, Publicacao, Notificacao, DEV_EMAIL

rotas_autenticacao = Blueprint('auth', __name__)


def obter_ator():
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return None
    try:
        return db.session.get(Usuario, int(user_id))
    except (ValueError, TypeError):
        return None


@rotas_autenticacao.route('/login', methods=['POST'])
def fazer_login():
    dados = request.get_json() or {}
    email = dados.get('email', '').strip().lower()
    senha = dados.get('password', '').strip()

    if not email or not senha:
        return jsonify({'error': 'E-mail e senha são obrigatórios.'}), 400

    usuario = Usuario.query.filter_by(email=email).first()
    if not usuario:
        return jsonify({'error': 'Usuário não encontrado. Realize seu cadastro primeiro.'}), 404

    if not usuario.verificar_senha(senha):
        return jsonify({'error': 'Senha incorreta.'}), 401

    return jsonify({'message': 'Login realizado com sucesso.', 'user': usuario.para_dicionario()}), 200


@rotas_autenticacao.route('/guest', methods=['POST'])
def entrar_como_visitante():
    return jsonify({
        'message': 'Acesso concedido como visitante.',
        'user': {
            'id': 0,
            'name': 'Visitante',
            'email': 'visitante@ifbaiano.edu.br',
            'role': 'guest',
            'avatar': None,
        }
    }), 200


@rotas_autenticacao.route('/register', methods=['POST'])
def cadastrar_usuario():
    dados = request.get_json() or {}
    nome = dados.get('name', '').strip()
    email = dados.get('email', '').strip().lower()
    senha = dados.get('password', '').strip()

    if not nome:
        return jsonify({'error': 'Nome completo é obrigatório.'}), 400
    if not email:
        return jsonify({'error': 'E-mail institucional é obrigatório.'}), 400
    if email == DEV_EMAIL:
        return jsonify({'error': 'Este e-mail é reservado pelo sistema.'}), 403
    if len(senha) < 6:
        return jsonify({'error': 'A senha deve conter no mínimo 6 caracteres.'}), 400
    if Usuario.query.filter_by(email=email).first():
        return jsonify({'error': 'Este e-mail já está cadastrado no sistema.'}), 409

    novo = Usuario(name=nome, email=email, role='basico')
    novo.definir_senha(senha)
    db.session.add(novo)
    db.session.commit()

    return jsonify({'message': 'Cadastro realizado com sucesso.', 'user': novo.para_dicionario()}), 201


@rotas_autenticacao.route('/users', methods=['GET'])
def listar_usuarios():
    ator = obter_ator()
    if not ator or not ator.eh_admin_ou_dev:
        return jsonify({'error': 'Acesso negado.'}), 403

    usuarios = Usuario.query.filter(
        Usuario.email != DEV_EMAIL,
        Usuario.role != 'dev'
    ).order_by(Usuario.name.asc()).all()

    resultado = []
    for u in usuarios:
        d = u.para_dicionario()
        d['posts_count'] = Publicacao.query.filter(
            (Publicacao.user_id == u.id) | (Publicacao.author == u.name)
        ).count()
        resultado.append(d)

    return jsonify(resultado), 200


@rotas_autenticacao.route('/users/<int:target_id>', methods=['PUT'])
def atualizar_usuario(target_id):
    ator = obter_ator()
    if not ator or not ator.eh_admin_ou_dev:
        return jsonify({'error': 'Acesso negado.'}), 403

    alvo = db.get_or_404(Usuario, target_id)
    if alvo.eh_dev:
        return jsonify({'error': 'Este usuário não pode ser modificado.'}), 403

    dados = request.get_json() or {}
    if dados.get('name', '').strip():
        alvo.name = dados['name'].strip()

    if dados.get('email', '').strip():
        novo_email = dados['email'].strip().lower()
        if novo_email == DEV_EMAIL:
            return jsonify({'error': 'E-mail reservado.'}), 403
        if Usuario.query.filter(Usuario.email == novo_email, Usuario.id != alvo.id).first():
            return jsonify({'error': 'Já existe outro usuário com este e-mail.'}), 409
        alvo.email = novo_email

    if dados.get('role') in ('basico', 'admin'):
        alvo.role = dados['role']

    if dados.get('password', '').strip():
        nova_senha = dados['password'].strip()
        if len(nova_senha) < 6:
            return jsonify({'error': 'A nova senha deve ter no mínimo 6 caracteres.'}), 400
        alvo.definir_senha(nova_senha)

    db.session.commit()
    return jsonify({'message': 'Dados atualizados com sucesso.', 'user': alvo.para_dicionario()}), 200


@rotas_autenticacao.route('/users/<int:target_id>/posts', methods=['GET'])
def listar_posts_usuario(target_id):
    ator = obter_ator()
    if not ator or not ator.eh_admin_ou_dev:
        return jsonify({'error': 'Acesso negado.'}), 403

    alvo = db.get_or_404(Usuario, target_id)
    if alvo.eh_dev:
        return jsonify({'error': 'Acesso negado.'}), 403

    posts = Publicacao.query.filter(
        (Publicacao.user_id == alvo.id) | (Publicacao.author == alvo.name)
    ).order_by(Publicacao.created_at.desc()).all()

    return jsonify([p.para_dicionario() for p in posts]), 200


@rotas_autenticacao.route('/notifications/<int:user_id>', methods=['GET'])
def obter_notificacoes(user_id):
    notifs = Notificacao.query.filter_by(user_id=user_id).order_by(Notificacao.created_at.desc()).all()
    return jsonify([n.para_dicionario() for n in notifs]), 200


@rotas_autenticacao.route('/notifications/<int:user_id>/read', methods=['POST'])
def marcar_notificacoes_lidas(user_id):
    Notificacao.query.filter_by(user_id=user_id, lida=False).update({'lida': True})
    db.session.commit()
    return jsonify({'message': 'Notificações marcadas como lidas.'}), 200


@rotas_autenticacao.route('/notifications/<int:user_id>', methods=['DELETE'])
def limpar_notificacoes_usuario(user_id):
    Notificacao.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({'message': 'Notificações removidas.'}), 200


