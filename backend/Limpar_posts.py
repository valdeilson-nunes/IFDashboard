import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'instance', 'ifdashboard.db')
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')

if not os.path.exists(DB_PATH):
    print(f"Banco de dados não encontrado em: {DB_PATH}")
    exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# 1. Remove imagens enviadas na pasta uploads associadas aos posts
cursor.execute("SELECT image_url FROM posts WHERE image_url IS NOT NULL")
for (image_url,) in cursor.fetchall():
    if '/uploads/' in image_url:
        nome_arquivo = image_url.rsplit('/uploads/', 1)[-1]
        caminho = os.path.join(UPLOAD_DIR, nome_arquivo)
        if os.path.exists(caminho):
            os.remove(caminho)

# 2. Limpa a tabela de eventos do calendário e a tabela de publicações
cursor.execute("DELETE FROM events")
eventos_removidos = cursor.rowcount

cursor.execute("DELETE FROM posts")
posts_removidos = cursor.rowcount

# 3. Reseta o autoincremento apenas se sqlite_sequence existir
try:
    cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('posts', 'events')")
except sqlite3.OperationalError:
    pass

conn.commit()
conn.close()

print(f"Limpeza concluída: {posts_removidos} publicações e {eventos_removidos} eventos removidos.")