import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import criar_app

app = criar_app()

if __name__ == '__main__':
    print(">>> IFDashboard rodando em http://localhost:5000 <<<")
    app.run(host='0.0.0.0', port=5000, debug=True)


