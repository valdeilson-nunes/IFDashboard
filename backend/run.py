import os
import sys

# Garante que o diretório backend esteja no PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import criar_app, db

aplicacao = criar_app()
app = aplicacao  # Compatibilidade com servidores WSGI

if __name__ == '__main__':
    with aplicacao.app_context():
        # Cria as tabelas do banco de dados caso não existam
        os.makedirs(os.path.join(os.path.dirname(__file__), 'instance'), exist_ok=True)
        db.create_all()
    
    print(">>> IFDashboard API rodando em http://localhost:5000/api <<<")
    aplicacao.run(host='0.0.0.0', port=5000, debug=True)
