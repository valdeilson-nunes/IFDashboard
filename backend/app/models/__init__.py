from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

class Usuario(db.Model):
    """Modelo representando os usuários cadastrados e visitantes"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)
    avatar = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(50), default='student')  # student, teacher, admin, guest
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def definir_senha(self, senha):
        self.password_hash = generate_password_hash(senha)

    def verificar_senha(self, senha):
        if not self.password_hash:
            return True  # Permite acesso livre se nenhuma senha for exigida
        return check_password_hash(self.password_hash, senha)

    def para_dicionario(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'avatar': self.avatar,
            'role': self.role
        }

    # Aliases para compatibilidade
    set_password = definir_senha
    check_password = verificar_senha
    to_dict = para_dicionario

# Alias em inglês
User = Usuario


class Publicacao(db.Model):
    """Modelo representando os anúncios e avisos do mural"""
    __tablename__ = 'posts'

    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)  # achados, servicos, pesquisa, editais
    sub_type = db.Column(db.String(50), nullable=True)   # produto, servico, aula, bolsa, achado, etc.
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(100), default='Campus Lapa')
    author = db.Column(db.String(100), default='Comunidade IF')
    price = db.Column(db.String(50), nullable=True)
    deadline = db.Column(db.String(50), nullable=True)
    contact_wpp = db.Column(db.String(30), nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    likes_count = db.Column(db.Integer, default=0)
    is_pinned = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)

    def para_dicionario(self):
        return {
            'id': self.id,
            'category': self.category,
            'sub_type': self.sub_type,
            'title': self.title,
            'description': self.description,
            'location': self.location,
            'author': self.author,
            'price': self.price,
            'deadline': self.deadline,
            'contact_wpp': self.contact_wpp,
            'image_url': self.image_url,
            'likes_count': self.likes_count,
            'is_pinned': self.is_pinned,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }

    # Alias para compatibilidade
    to_dict = para_dicionario

# Alias em inglês
Post = Publicacao


class Evento(db.Model):
    """Modelo representando eventos e prazos acadêmicos do calendário"""
    __tablename__ = 'events'

    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    event_date = db.Column(db.Date, nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=True)

    def para_dicionario(self):
        return {
            'id': self.id,
            'category': self.category,
            'title': self.title,
            'description': self.description,
            'event_date': self.event_date.strftime('%Y-%m-%d') if self.event_date else None,
            'post_id': self.post_id
        }

    # Alias para compatibilidade
    to_dict = para_dicionario

# Alias em inglês
Event = Evento
