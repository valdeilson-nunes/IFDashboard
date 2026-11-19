import os
import uuid
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app import db
from app.models import Publicacao, Evento, Usuario, Notificacao
from app.routes.auth import obter_ator

EXTENSOES_PERMITIDAS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
rotas_publicacoes = Blueprint('posts', __name__)


def eh_dono_post(usuario, publicacao):
    if not usuario:
        return False
    if publicacao.user_id and publicacao.user_id == usuario.id:
        return True
    return (publicacao.author or '').strip().lower() == (usuario.name or '').strip().lower()


def arquivo_permitido(nome_arquivo):
    return '.' in nome_arquivo and nome_arquivo.rsplit('.', 1)[1].lower() in EXTENSOES_PERMITIDAS


def notificar_autor_moderacao(ator, publicacao, titulo, mensagem, icone):
    if not (ator.eh_admin_ou_dev and not eh_dono_post(ator, publicacao)):
        return
    destinatario_id = publicacao.user_id
    if not destinatario_id and publicacao.author:
        autor_obj = Usuario.query.filter_by(name=publicacao.author).first()
        destinatario_id = autor_obj.id if autor_obj else None
    if destinatario_id:
        db.session.add(Notificacao(
            user_id=destinatario_id,
            titulo=titulo,
            mensagem=mensagem,
            icone=icone
        ))


@rotas_publicacoes.route('', methods=['GET'])
def listar_publicacoes():
    categoria = request.args.get('category')
    termo_busca = request.args.get('search')
    ordenacao = request.args.get('sort', 'recent')

    consulta = Publicacao.query
    if categoria and categoria != 'todos':
        consulta = consulta.filter_by(category=categoria)

    if termo_busca:
        filtro = f"%{termo_busca}%"
        consulta = consulta.filter(
            Publicacao.title.ilike(filtro) |
            Publicacao.description.ilike(filtro) |
            Publicacao.location.ilike(filtro)
        )

    if ordenacao == 'likes':
        consulta = consulta.order_by(Publicacao.is_pinned.desc(), Publicacao.likes_count.desc(), Publicacao.created_at.desc())
    else:
        consulta = consulta.order_by(Publicacao.is_pinned.desc(), Publicacao.created_at.desc())

    return jsonify([p.para_dicionario() for p in consulta.all()]), 200


@rotas_publicacoes.route('/<int:post_id>', methods=['GET'])
def obter_publicacao(post_id):
    return jsonify(db.get_or_404(Publicacao, post_id).para_dicionario()), 200


@rotas_publicacoes.route('', methods=['POST'])
def criar_publicacao():
    ator = obter_ator()
    if not ator or ator.role == 'guest':
        return jsonify({'error': 'Visitantes não têm permissão para publicar.'}), 403

    if request.is_json:
        dados = request.get_json() or {}
        url_imagem = dados.get('image_url')
    else:
        dados = request.form.to_dict()
        url_imagem = dados.get('image_url')
        arquivo = request.files.get('image')
        if arquivo and arquivo.filename:
            if not arquivo_permitido(arquivo.filename):
                return jsonify({'error': 'Formato inválido. Use PNG, JPG, JPEG, WEBP ou GIF.'}), 400
            nome_unico = f"{uuid.uuid4().hex}_{secure_filename(arquivo.filename)}"
            arquivo.save(os.path.join(current_app.config['UPLOAD_FOLDER'], nome_unico))
            url_imagem = f"{request.host_url.rstrip('/')}/uploads/{nome_unico}"

    categoria = dados.get('category')
    if not dados.get('title') or not categoria:
        return jsonify({'error': 'Título e categoria são obrigatórios.'}), 400

    if not ator.eh_admin_ou_dev and categoria not in ('achados', 'servicos'):
        return jsonify({'error': 'Usuários básicos só podem publicar em Achados e Perdidos ou Serviços e Vendas.'}), 403

    prazo_formatado = dados.get('deadline')
    dt_inicio = dt_fim = None

    if categoria in ('pesquisa', 'editais', 'avisos'):
        inicio_str = (dados.get('start_date') or '').strip()
        fim_str = (dados.get('end_date') or '').strip()
        if not inicio_str:
            return jsonify({'error': 'A data de início é obrigatória para esta categoria.'}), 400
        try:
            dt_inicio = datetime.strptime(inicio_str, '%Y-%m-%d').date()
            dt_fim = datetime.strptime(fim_str, '%Y-%m-%d').date() if fim_str else dt_inicio
        except ValueError:
            return jsonify({'error': 'Formato de data inválido. Use AAAA-MM-DD.'}), 400

        if dt_fim < dt_inicio:
            return jsonify({'error': 'A data de término não pode ser anterior à de início.'}), 400

        prazo_formatado = (
            dt_inicio.strftime('%d/%m/%Y')
            if dt_inicio == dt_fim
            else f"{dt_inicio.strftime('%d/%m/%Y')} a {dt_fim.strftime('%d/%m/%Y')}"
        )

    nova = Publicacao(
        user_id=ator.id,
        category=categoria,
        sub_type=dados.get('sub_type'),
        title=dados.get('title').strip(),
        description=dados.get('description', '').strip(),
        location=dados.get('location', '').strip() or 'Campus Lapa',
        author=ator.name,
        price=dados.get('price'),
        deadline=prazo_formatado,
        contact_wpp=dados.get('contact_wpp'),
        image_url=url_imagem,
        is_pinned=bool(dados.get('is_pinned', False)) if ator.eh_admin_ou_dev else False
    )
    db.session.add(nova)
    db.session.flush()

    if dt_inicio and dt_fim:
        total_dias = (dt_fim - dt_inicio).days
        for i in range(total_dias + 1):
            dia = dt_inicio + timedelta(days=i)
            titulo_ev = nova.title
            if total_dias > 0:
                if i == 0:
                    titulo_ev = f"[Início] {nova.title}"
                elif i == total_dias:
                    titulo_ev = f"[Encerramento] {nova.title}"

            db.session.add(Evento(
                category=nova.category,
                title=titulo_ev,
                description=nova.description,
                event_date=dia,
                post_id=nova.id
            ))

    db.session.commit()
    return jsonify(nova.para_dicionario()), 201


@rotas_publicacoes.route('/<int:post_id>/like', methods=['POST'])
def alternar_curtida(post_id):
    ator = obter_ator()
    if not ator or ator.role == 'guest':
        return jsonify({'error': 'Visitantes não podem curtir publicações.'}), 403

    publicacao = db.get_or_404(Publicacao, post_id)
    if publicacao.category == 'achados':
        return jsonify({'error': 'Achados e perdidos não aceitam curtidas.'}), 400

    acao = (request.get_json(silent=True) or {}).get('action', 'increment')
    if acao == 'decrement' and publicacao.likes_count > 0:
        publicacao.likes_count -= 1
    else:
        publicacao.likes_count += 1

    db.session.commit()
    return jsonify({'id': publicacao.id, 'likes_count': publicacao.likes_count}), 200


@rotas_publicacoes.route('/<int:post_id>', methods=['PUT'])
def editar_publicacao(post_id):
    ator = obter_ator()
    if not ator or ator.role == 'guest':
        return jsonify({'error': 'Acesso negado.'}), 403

    publicacao = db.get_or_404(Publicacao, post_id)
    if not ator.eh_admin_ou_dev:
        if not eh_dono_post(ator, publicacao):
            return jsonify({'error': 'Você só pode editar suas próprias publicações.'}), 403
        if publicacao.created_at and (datetime.utcnow() - publicacao.created_at) > timedelta(minutes=30):
            return jsonify({'error': 'O prazo de 30 minutos para edição expirou.'}), 403

    dados = request.get_json() or {}
    titulo_antigo = publicacao.title

    if dados.get('title', '').strip():
        publicacao.title = dados['title'].strip()
    if 'description' in dados:
        publicacao.description = dados['description'].strip()
    if 'location' in dados:
        publicacao.location = dados['location'].strip() or 'Campus Lapa'
    if 'contact_wpp' in dados:
        publicacao.contact_wpp = dados['contact_wpp'].strip()
    if 'price' in dados:
        publicacao.price = dados['price'].strip()
    if 'sub_type' in dados:
        publicacao.sub_type = dados['sub_type']

    Evento.query.filter_by(post_id=publicacao.id).update({
        'title': publicacao.title,
        'description': publicacao.description
    })

    notificar_autor_moderacao(
        ator, publicacao,
        'Publicação editada pela moderação',
        f'Sua publicação "{titulo_antigo}" foi editada por um Administrador.',
        'bi-pencil-square text-warning'
    )

    db.session.commit()
    return jsonify(publicacao.para_dicionario()), 200


@rotas_publicacoes.route('/<int:post_id>', methods=['DELETE'])
def remover_publicacao(post_id):
    ator = obter_ator()
    if not ator or ator.role == 'guest':
        return jsonify({'error': 'Acesso negado.'}), 403

    publicacao = db.get_or_404(Publicacao, post_id)
    if not ator.eh_admin_ou_dev and not eh_dono_post(ator, publicacao):
        return jsonify({'error': 'Você não tem permissão para excluir esta publicação.'}), 403

    notificar_autor_moderacao(
        ator, publicacao,
        'Publicação removida pela moderação',
        f'Sua publicação "{publicacao.title}" foi removida por um Administrador.',
        'bi-shield-exclamation text-danger'
    )

    if publicacao.image_url and '/uploads/' in publicacao.image_url:
        nome_arquivo = publicacao.image_url.rsplit('/uploads/', 1)[-1]
        caminho = os.path.join(current_app.config['UPLOAD_FOLDER'], secure_filename(nome_arquivo))
        if os.path.exists(caminho):
            os.remove(caminho)

    Evento.query.filter_by(post_id=publicacao.id).delete()
    db.session.delete(publicacao)
    db.session.commit()
    return jsonify({'message': 'Publicação removida com sucesso.'}), 200


