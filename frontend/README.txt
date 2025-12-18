COMO RODAR O SISTEMA COMPLETO:

🎯 SISTEMA EM PRODUÇÃO (PRONTO PARA USAR):
Frontend: https://seusite.netlify.app (ou GitHub Pages)
Backend: https://teste-sist-yes-no.onrender.com
Banco: MongoDB Atlas (cloud)

🎯 DESENVOLVIMENTO LOCAL:

OPÇÃO 1 (RECOMENDADA):
1. Backend: Na pasta backend, execute: npm run dev
2. Frontend: Instale "Live Server" no VS Code
3. Clique direito em index.html → "Open with Live Server"
4. Acesse: http://localhost:5500

OPÇÃO 2:
1. Backend: node server.js (na pasta backend)
2. Frontend: python -m http.server 5500 (na pasta frontend)
3. Acesse: http://localhost:5500

📌 VARIÁVEIS DE CONFIGURAÇÃO:

Modo Desenvolvimento:
- Frontend conecta em: http://localhost:3000
- MongoDB: Local ou Atlas com IP liberado

Modo Produção:
- Frontend conecta em: https://teste-sist-yes-no.onrender.com
- MongoDB: MongoDB Atlas (cloud)

⚠️ IMPORTANTE:
- O sistema detecta automaticamente se está local ou em produção
- Não é necessário alterar manualmente as URLs
- Para deploy, apenas suba os arquivos para Netlify/GitHub

🔧 COMANDOS ÚTEIS:
1. Criar usuário teste: POST /api/criar-teste
2. Testar conexão: GET /api/teste
3. Ver logs: console do navegador (F12)