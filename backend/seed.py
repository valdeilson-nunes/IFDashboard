import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import criar_app, db
from app.models import Publicacao, Evento, Usuario, Notificacao, DEV_EMAIL

aplicacao = criar_app()

USUARIOS_PADRAO = [
    {
        "name": "Valdeilson",
        "email": "valdeilson@ifbaiano.edu.br",
        "role": "basico",
        "senha": "123456",
    },
    # Adicione outros usuários padrão aqui, se desejar:
    # {
    #     "name": "Coordenação GTI",
    #     "email": "coordenacao@ifbaiano.edu.br",
    #     "role": "admin",
    #     "senha": "123456",
    # },
]


def limpar_banco():
    with aplicacao.app_context():
        pasta_uploads = aplicacao.config['UPLOAD_FOLDER']
        if os.path.exists(pasta_uploads):
            for pub in Publicacao.query.filter(Publicacao.image_url.isnot(None)).all():
                if '/uploads/' in pub.image_url:
                    nome = pub.image_url.rsplit('/uploads/', 1)[-1]
                    caminho = os.path.join(pasta_uploads, nome)
                    if os.path.exists(caminho):
                        os.remove(caminho)

        Evento.query.delete()
        Publicacao.query.delete()
        Notificacao.query.delete()
        Usuario.query.filter(Usuario.email != DEV_EMAIL).delete()
        db.session.commit()
        print("Banco limpo (posts, eventos, notificações e usuários comuns removidos).")


def popular_banco():
    with aplicacao.app_context():
        # Garante que todas as tabelas estejam criadas
        db.create_all()

        criados = 0
        for dados in USUARIOS_PADRAO:
            if Usuario.query.filter_by(email=dados["email"]).first():
                continue

            usuario = Usuario(
                name=dados["name"],
                email=dados["email"],
                role=dados["role"],
            )
            usuario.definir_senha(dados["senha"])
            db.session.add(usuario)
            criados += 1

        db.session.commit()
        print(f"Estrutura verificada! {criados} usuário(s) padrão criado(s).")


if __name__ == '__main__':
    if '--clear' in sys.argv:
        limpar_banco()
    elif '--reset' in sys.argv:
        limpar_banco()
        popular_banco()
    else:
        popular_banco()

