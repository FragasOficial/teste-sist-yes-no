🎯 SISTEMA COMPLETO - FRONTEND + BACKEND

ESTRUTURA:
- public/          → Frontend (HTML/CSS/JS)
- server.js        → Backend (Node.js/Express)
- package.json     → Dependências

🚀 COMO RODAR LOCALMENTE:
1. Instale Node.js (v18+)
2. Execute: npm install
3. Execute: npm run dev
4. Acesse: http://localhost:3000

🌐 DEPLOY NO RENDER:
1. Faça push para GitHub
2. Crie Web Service no Render
3. Configure:
   - Build Command: npm install
   - Start Command: npm start
4. Pronto! Sistema online

🔧 ENDPOINTS DA API:
- GET    /              → Frontend (index.html)
- GET    /api/teste     → Teste do backend
- POST   /api/login     → Login de usuário
- POST   /api/cadastrar → Cadastro de usuário
- POST   /api/criar-teste → Criar usuário teste
- GET    /health        → Health check

👤 USUÁRIO TESTE:
Email: teste@teste.com
Senha: 123456

📁 ARQUIVOS PRINCIPAIS:
- index.html      → Página de login/cadastro
- dashboard.html  → Página após login
- script.js       → Lógica frontend
- server.js       → Backend completo

⚠️ IMPORTANTE:
- MongoDB Atlas já configurado
- CORS configurado para todas origens
- Sistema auto-detecta ambiente (local/produção)