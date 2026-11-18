"""
Script para popular o banco de dados inicial com dados do protótipo
"""
import os
import sys
from datetime import date

# Garante que o diretório backend esteja no PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import criar_app, db
from app.models import Publicacao, Evento, Usuario

aplicacao = criar_app()

def popular_banco_dados():
    """Insere registros iniciais de demonstração no banco SQLite"""
    with aplicacao.app_context():
        db.create_all()

        if Publicacao.query.first():
            print("O banco de dados já contém registros. Povoamento ignorado.")
            return

        print("Populando banco de dados...")

        # Criar usuário padrão
        usuario = Usuario(
            name="Valdeilson",
            email="valdeilson@ifbaiano.edu.br",
            role="student"
        )
        usuario.definir_senha("123456")
        db.session.add(usuario)

        # Criar publicações iniciais do mural
        publicacoes = [
            Publicacao(
                category='editais',
                sub_type='Edital',
                title='Edital nº 14/2026 — Auxílio Permanência',
                description='Inscrições abertas para o auxílio do segundo semestre. Confira os critérios e documentação necessária.',
                location='DIRENS',
                author='Direção Geral',
                deadline='05/08',
                likes_count=20,
                is_pinned=True
            ),
            Publicacao(
                category='achados',
                sub_type='achado',
                title='Encontrei um molho de chaves',
                description='Achado perto da cantina, Bloco B. Tem uma chave de moto e duas de casa em um chaveiro de couro.',
                location='Bloco B',
                author='Comunidade Acadêmica',
                contact_wpp='5577999999999',
                image_url='https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80',
                likes_count=0
            ),
            Publicacao(
                category='servicos',
                sub_type='aula',
                title='Aulas particulares de Cálculo I',
                description='Reforço para quem vai fazer dependência ou quer revisar. Atendo presencial na biblioteca ou online.',
                location='Biblioteca',
                author='Monitoria',
                price='R$ 25,00/hora',
                contact_wpp='5577999999999',
                likes_count=12
            ),
            Publicacao(
                category='pesquisa',
                sub_type='bolsa',
                title='Vagas abertas: Robótica Educacional',
                description='Projeto de extensão com a Prof. Carla Menezes. Duas vagas para bolsistas de iniciação.',
                location='Lab. de Robótica',
                author='Coordenação de Extensão',
                deadline='10/08',
                image_url='https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80',
                likes_count=8
            ),
            Publicacao(
                category='achados',
                sub_type='perdido',
                title='Perdi meu caderno de Eletrônica',
                description='Capa azul, com anotações da disciplina de Circuitos. Última vez visto no Laboratório 3.',
                location='Laboratório 3',
                author='Aluno',
                contact_wpp='5577999999999',
                image_url='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
                likes_count=0
            ),
            Publicacao(
                category='servicos',
                sub_type='produto',
                title='Vendo calculadora científica seminova',
                description='HP 12C, pouco uso, funcionando perfeitamente. Aceito troca por material didático do curso.',
                location='Bloco A',
                author='Aluno',
                price='R$ 60,00',
                contact_wpp='5577999999999',
                image_url='https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=800&auto=format&fit=crop&q=80',
                likes_count=5
            )
        ]

        db.session.add_all(publicacoes)

        # Eventos do Calendário Acadêmico
        eventos = [
            Evento(category='editais', title='Semana de Avaliação Institucional', description='Período para preenchimento dos formulários de autoavaliação discente.', event_date=date(2026, 11, 17)),
            Evento(category='pesquisa', title='Apresentação Prévia dos Projetos PIBIC', description='Bancas avaliadoras no auditório do Bloco A a partir das 14h.', event_date=date(2026, 11, 20)),
            Evento(category='editais', title='Convocação — Chamada Regular SISU', description='Publicação do resultado da 2ª chamada no portal institucional.', event_date=date(2026, 11, 25)),
            Evento(category='servicos', title='Feira de Trocas e Doação de Livros', description='Pátio central das 09h às 17h. Aberto a toda a comunidade acadêmica.', event_date=date(2026, 12, 2)),
            Evento(category='editais', title='Prazo final — Auxílio Permanência', description='Envio de documentação na DIRENS.', event_date=date(2026, 8, 5)),
            Evento(category='pesquisa', title='Encerramento inscrições — Robótica Educacional', description='Coordenação Profa. Carla Menezes.', event_date=date(2026, 8, 10)),
            Evento(category='editais', title='Manutenção Laboratórios 1 e 2', description='Interdição para manutenção preventiva.', event_date=date(2026, 8, 3))
        ]
        db.session.add_all(eventos)

        db.session.commit()
        print("Banco de dados populado com sucesso!")

# Alias para compatibilidade
seed_data = popular_banco_dados

if __name__ == '__main__':
    popular_banco_dados()
