import os
import uuid
from flask import Flask, send_from_directory, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS
from app.config import Configuracao, Config
from app.db import db

EXTENSOES_PERMITIDAS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
ALLOWED_EXTENSIONS = EXTENSOES_PERMITIDAS

def arquivo_permitido(nome_arquivo):
    """Verifica se a extensão do arquivo enviado é permitida"""
    return '.' in nome_arquivo and nome_arquivo.rsplit('.', 1)[1].lower() in EXTENSOES_PERMITIDAS

allowed_file = arquivo_permitido

def criar_app(classe_config=Configuracao):
    """Fábrica de aplicação Flask do IFDashboard"""
    app = Flask(__name__)
    app.config.from_object(classe_config)

    # Garantir que a pasta de uploads exista
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Inicializar extensões
    CORS(app, resources={r"/*": {"origins": "*"}})
    db.init_app(app)

    # Registrar Blueprints / Rotas da API
    from app.routes.post_routes import rotas_publicacoes
    from app.routes.event_routes import rotas_eventos
    from app.routes.auth_routes import rotas_autenticacao

    app.register_blueprint(rotas_publicacoes, url_prefix='/api/posts')
    app.register_blueprint(rotas_eventos, url_prefix='/api/events')
    app.register_blueprint(rotas_autenticacao, url_prefix='/api/auth')

    # Verificação de integridade da API
    @app.route('/api/health', methods=['GET'])
    def verificar_saude():
        return {'status': 'ok', 'message': 'IFDashboard API está operacional!'}, 200

    # Rota para servir os arquivos de imagens carregados
    @app.route('/uploads/<filename>', methods=['GET'])
    def servir_arquivo_upload(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # Endpoint de Upload independente de Imagens
    @app.route('/api/upload', methods=['POST'])
    def fazer_upload_imagem():
        if 'image' not in request.files:
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400
        
        arquivo = request.files['image']
        if arquivo.filename == '':
            return jsonify({'error': 'Arquivo não selecionado'}), 400
            
        if arquivo and arquivo_permitido(arquivo.filename):
            nome_unico = f"{uuid.uuid4().hex}_{secure_filename(arquivo.filename)}"
            caminho_arquivo = os.path.join(app.config['UPLOAD_FOLDER'], nome_unico)
            arquivo.save(caminho_arquivo)

            url_base = request.host_url.rstrip('/')
            url_imagem = f"{url_base}/uploads/{nome_unico}"
            return jsonify({'image_url': url_imagem, 'filename': nome_unico}), 201

        return jsonify({'error': 'Formato de arquivo não suportado. Use PNG, JPG, JPEG, WEBP ou GIF.'}), 400

    return app

# Alias para compatibilidade
create_app = criar_app
