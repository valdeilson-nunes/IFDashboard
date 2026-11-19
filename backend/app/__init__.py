import os
from pathlib import Path
from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from app.config import Configuracao

db = SQLAlchemy()


def criar_app(classe_config=Configuracao):
    pasta_frontend = str(Path(__file__).resolve().parent.parent.parent / 'frontend')
    app = Flask(__name__, static_folder=pasta_frontend, static_url_path='')
    app.config.from_object(classe_config)

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(os.path.dirname(app.config['UPLOAD_FOLDER']), 'instance'), exist_ok=True)

    CORS(app, resources={r"/*": {"origins": "*"}})
    db.init_app(app)

    from app.models import Usuario, DEV_EMAIL
    from app.routes.auth import rotas_autenticacao
    from app.routes.posts import rotas_publicacoes
    from app.routes.events import rotas_eventos

    app.register_blueprint(rotas_autenticacao, url_prefix='/api/auth')
    app.register_blueprint(rotas_publicacoes, url_prefix='/api/posts')
    app.register_blueprint(rotas_eventos, url_prefix='/api/events')

    with app.app_context():
        db.create_all()
        if not Usuario.query.filter_by(email=DEV_EMAIL).first():
            dev = Usuario(name="Desenvolvedor", email=DEV_EMAIL, role="dev")
            dev.definir_senha("ifdashboardadmin")
            db.session.add(dev)
            db.session.commit()

    @app.route('/api/health', methods=['GET'])
    def verificar_saude():
        return {'status': 'ok', 'message': 'IFDashboard API operacional'}, 200

    @app.route('/uploads/<filename>', methods=['GET'])
    def servir_arquivo_upload(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    @app.route('/', methods=['GET'])
    def pagina_inicial():
        return send_from_directory(app.static_folder, 'landing.html')

    @app.route('/<path:caminho>', methods=['GET'])
    def arquivos_frontend(caminho):
        return send_from_directory(app.static_folder, caminho)

    return app


