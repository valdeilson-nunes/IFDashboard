import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app import db
from app.models import Publicacao

EXTENSOES_PERMITIDAS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
ALLOWED_EXTENSIONS = EXTENSOES_PERMITIDAS

def arquivo_permitido(nome_arquivo):
    """Verifica se a extensão do arquivo enviado é permitida"""
    return '.' in nome_arquivo and nome_arquivo.rsplit('.', 1)[1].lower() in EXTENSOES_PERMITIDAS

allowed_file = arquivo_permitido

rotas_publicacoes = Blueprint('posts', __name__)
posts_bp = rotas_publicacoes

@rotas_publicacoes.route('', methods=['GET'])
def listar_publicacoes():
    """Lista publicações com suporte a filtros de categoria, busca e ordenação"""
    categoria = request.args.get('category')
    termo_busca = request.args.get('search')
    tipo_ordenacao = request.args.get('sort', 'recent')

    consulta = Publicacao.query

    if categoria and categoria != 'todos':
        consulta = consulta.filter_by(category=categoria)

    if termo_busca:
        filtro_busca = f"%{termo_busca}%"
        consulta = consulta.filter(
            (Publicacao.title.ilike(filtro_busca)) | 
            (Publicacao.description.ilike(filtro_busca)) |
            (Publicacao.location.ilike(filtro_busca))
        )

    if tipo_ordenacao == 'likes':
        consulta = consulta.order_by(Publicacao.is_pinned.desc(), Publicacao.likes_count.desc(), Publicacao.created_at.desc())
    else:
        consulta = consulta.order_by(Publicacao.is_pinned.desc(), Publicacao.created_at.desc())

    publicacoes = consulta.all()
    return jsonify([pub.para_dicionario() for pub in publicacoes]), 200

# Alias para compatibilidade
get_posts = listar_publicacoes

@rotas_publicacoes.route('/<int:post_id>', methods=['GET'])
def obter_publicacao(post_id):
    """Retorna os detalhes completos de uma publicação específica"""
    publicacao = Publicacao.query.get_or_404(post_id)
    return jsonify(publicacao.para_dicionario()), 200

get_post = obter_publicacao

@rotas_publicacoes.route('', methods=['POST'])
def criar_publicacao():
    """Cria uma nova publicação, suportando dados em JSON ou formulário com imagem"""
    if request.is_json:
        dados = request.get_json() or {}
        url_imagem = dados.get('image_url')
    else:
        dados = request.form.to_dict()
        url_imagem = dados.get('image_url')
        if 'image' in request.files:
            arquivo = request.files['image']
            if arquivo and arquivo.filename != '':
                if not arquivo_permitido(arquivo.filename):
                    return jsonify({'error': 'Formato de imagem não permitido. Use PNG, JPG, JPEG, WEBP ou GIF.'}), 400
                nome_unico = f"{uuid.uuid4().hex}_{secure_filename(arquivo.filename)}"
                pasta_upload = current_app.config['UPLOAD_FOLDER']
                os.makedirs(pasta_upload, exist_ok=True)
                arquivo.save(os.path.join(pasta_upload, nome_unico))
                url_base = request.host_url.rstrip('/')
                url_imagem = f"{url_base}/uploads/{nome_unico}"

    if not dados.get('title') or not dados.get('category'):
        return jsonify({'error': 'Título e categoria são obrigatórios'}), 400

    nova_publicacao = Publicacao(
        category=dados.get('category'),
        sub_type=dados.get('sub_type'),
        title=dados.get('title'),
        description=dados.get('description', ''),
        location=dados.get('location', 'Campus Lapa'),
        author=dados.get('author', 'Usuário IF'),
        price=dados.get('price'),
        deadline=dados.get('deadline'),
        contact_wpp=dados.get('contact_wpp'),
        image_url=url_imagem,
        is_pinned=bool(dados.get('is_pinned', False))
    )

    db.session.add(nova_publicacao)
    db.session.commit()

    return jsonify(nova_publicacao.para_dicionario()), 201

create_post = criar_publicacao

@rotas_publicacoes.route('/<int:post_id>/like', methods=['POST'])
def alternar_curtida(post_id):
    """Registra ou remove uma curtida de uma publicação"""
    publicacao = Publicacao.query.get_or_404(post_id)
    
    if publicacao.category == 'achados':
        return jsonify({'error': 'Publicações de achados e perdidos não aceitam curtidas para manter a solidariedade.'}), 400

    acao = request.json.get('action', 'increment') if request.is_json else 'increment'
    
    if acao == 'decrement' and publicacao.likes_count > 0:
        publicacao.likes_count -= 1
    else:
        publicacao.likes_count += 1

    db.session.commit()
    return jsonify({'id': publicacao.id, 'likes_count': publicacao.likes_count}), 200

toggle_like = alternar_curtida

@rotas_publicacoes.route('/<int:post_id>', methods=['DELETE'])
def remover_publicacao(post_id):
    """Remove uma publicação pelo identificador"""
    publicacao = Publicacao.query.get_or_404(post_id)
    db.session.delete(publicacao)
    db.session.commit()
    return jsonify({'message': 'Publicação removida com sucesso'}), 200

delete_post = remover_publicacao
