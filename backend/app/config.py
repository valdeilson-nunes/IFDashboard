import os
from pathlib import Path

DIRETORIO_BASE = Path(__file__).resolve().parent.parent


class Configuracao:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'chave-secreta-padrao-desenvolvimento')
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f"sqlite:///{DIRETORIO_BASE / 'instance' / 'ifdashboard.db'}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = str(DIRETORIO_BASE / 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB


