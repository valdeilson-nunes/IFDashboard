from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

DEV_EMAIL = 'administrador@ifdashboard.com'


class Usuario(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)
    avatar = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(50), default='basico')  # guest, basico, admin, dev
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def definir_senha(self, senha):
        self.password_hash = generate_password_hash(senha)

    def verificar_senha(self, senha):
        return bool(self.password_hash) and check_password_hash(self.password_hash, senha)

    @property
    def eh_admin_ou_dev(self):
        return self.role in ('admin', 'dev')

    @property
    def eh_dev(self):
        return self.role == 'dev' or self.email == DEV_EMAIL

    def para_dicionario(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'avatar': self.avatar,
            'role': 'basico' if self.role == 'student' else self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Publicacao(db.Model):
    __tablename__ = 'posts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    category = db.Column(db.String(50), nullable=False)
    sub_type = db.Column(db.String(50), nullable=True)
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
            'user_id': self.user_id,
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
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
        }


class Evento(db.Model):
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
            'post_id': self.post_id,
        }


class Notificacao(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    titulo = db.Column(db.String(150), nullable=False)
    mensagem = db.Column(db.Text, nullable=False)
    icone = db.Column(db.String(100), default='bi-bell-fill text-primary')
    lida = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def para_dicionario(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'titulo': self.titulo,
            'mensagem': self.mensagem,
            'icone': self.icone,
            'lida': self.lida,
            'data': self.created_at.strftime('%d/%m/%Y %H:%M') if self.created_at else 'Hoje',
        }


