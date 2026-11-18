from flask import Blueprint, request, jsonify
from app import db
from app.models import Usuario

rotas_autenticacao = Blueprint('auth', __name__)
auth_bp = rotas_autenticacao

@rotas_autenticacao.route('/me', methods=['GET'])
def obter_usuario_atual():
    """Retorna os dados do usuário autenticado no sistema"""
    usuario = Usuario.query.first()
    if not usuario:
        usuario = Usuario(
            name="Valdeilson",
            email="valdeilson@ifbaiano.edu.br",
            role="student"
        )
        usuario.definir_senha("123456")
        db.session.add(usuario)
        db.session.commit()
    
    return jsonify(usuario.para_dicionario()), 200

get_current_user = obter_usuario_atual

@rotas_autenticacao.route('/login', methods=['POST'])
def fazer_login():
    """Realiza a autenticação por e-mail e senha"""
    dados = request.get_json() or {}
    email = dados.get('email', '').strip().lower()
    senha = dados.get('password', '').strip()

    if not email or not senha:
        return jsonify({'error': 'E-mail e senha são obrigatórios'}), 400

    usuario = Usuario.query.filter_by(email=email).first()
    
    # Se o usuário não existir no ambiente de desenvolvimento, cria-se automaticamente
    if not usuario:
        nome = email.split('@')[0].replace('.', ' ').title()
        usuario = Usuario(name=nome, email=email, role="student")
        usuario.definir_senha(senha)
        db.session.add(usuario)
        db.session.commit()
    else:
        # Se usuário existe e tem senha configurada, valida
        if not usuario.verificar_senha(senha):
            return jsonify({'error': 'Senha incorreta'}), 401

    return jsonify({
        'message': 'Login realizado com sucesso',
        'user': usuario.para_dicionario()
    }), 200

login = fazer_login

@rotas_autenticacao.route('/guest', methods=['POST'])
def entrar_como_visitante():
    """Gera uma sessão temporária no modo visitante"""
    usuario_visitante = {
        'id': 0,
        'name': 'Visitante',
        'email': 'visitante@ifbaiano.edu.br',
        'role': 'guest',
        'avatar': None
    }
    return jsonify({
        'message': 'Acesso concedido como visitante',
        'user': usuario_visitante
    }), 200

login_as_guest = entrar_como_visitante
