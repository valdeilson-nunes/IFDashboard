import os
from pathlib import Path

# Diretório raiz do backend
DIRETORIO_BASE = Path(__file__).resolve().parent.parent
BASE_DIR = DIRETORIO_BASE

class Configuracao:
    """Configurações centrais da aplicação Flask"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'chave-secreta-padrao-desenvolvimento')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', f"sqlite:///{DIRETORIO_BASE / 'instance' / 'ifdashboard.db'}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_HEADERS = 'Content-Type'
    UPLOAD_FOLDER = str(DIRETORIO_BASE / 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # Limite máximo de 16 MB por imagem

# Alias para manter compatibilidade
Config = Configuracao
