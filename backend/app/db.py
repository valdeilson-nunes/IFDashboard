import os
from flask import abort

try:
    from flask_sqlalchemy import SQLAlchemy
    db = SQLAlchemy()
except ImportError:
    # Camada de compatibilidade usando SQLAlchemy 2.0 padrão
    from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, Date, ForeignKey
    from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session, Query

    class ConsultaCustomizada(Query):
        """Query personalizada com método get_or_404 integrado"""
        def get_or_404(self, identificador, descricao=None):
            mapeador = self._only_full_mapper_zero('get')
            registro = self.session.get(mapeador.class_, identificador)
            if registro is None:
                abort(404, description=descricao or f"Registro {identificador} não encontrado.")
            return registro

    CustomQuery = ConsultaCustomizada

    class _SQLAlchemyFallback:
        def __init__(self):
            self.Column = Column
            self.Integer = Integer
            self.String = String
            self.Text = Text
            self.Boolean = Boolean
            self.DateTime = DateTime
            self.Date = Date
            self.ForeignKey = ForeignKey
            self.Model = declarative_base()
            self.engine = None
            self.session = None

        def init_app(self, app):
            uri_banco = app.config.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///ifdashboard.db')
            
            # Garante que a pasta do sqlite exista
            if uri_banco.startswith('sqlite:///'):
                caminho_arquivo = uri_banco.replace('sqlite:///', '')
                caminho_pasta = os.path.dirname(caminho_arquivo)
                if caminho_pasta:
                    os.makedirs(caminho_pasta, exist_ok=True)

            self.engine = create_engine(uri_banco)
            self.session = scoped_session(sessionmaker(bind=self.engine))
            self.Model.query = self.session.query_property(query_cls=ConsultaCustomizada)
            
            @app.teardown_appcontext
            def encerrar_sessao(excecao=None):
                self.session.remove()

        def create_all(self):
            if self.engine is not None:
                self.Model.metadata.create_all(self.engine)

    db = _SQLAlchemyFallback()
