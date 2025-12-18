// server.js - VERSÃO PRODUÇÃO ATUALIZADA
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();

// Middlewares ATUALIZADOS para produção
app.use(cors({
    origin: [
        'http://localhost:5500',           // Live Server local
        'http://127.0.0.1:5500',           // Local alternativo
        'https://*.netlify.app',           // Qualquer Netlify
        'https://*.github.io',             // Qualquer GitHub Pages
        'http://localhost:8080',           // Outro servidor local
        'https://teste-sist-yes-no.onrender.com'  // Seu próprio backend
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// CONEXÃO COM MONGODB ATLAS (PRODUÇÃO)
const connectDB = async () => {
    try {
        // URL do MongoDB Atlas (use variável de ambiente no Render)
        const mongoURI = process.env.MONGODB_URI || 
                        'mongodb+srv://sfptc06_db_user:batatinhafrita123@cluster0.rik8o9v.mongodb.net/dados-de-acesso?retryWrites=true&w=majority';
        
        console.log('🔄 Conectando ao MongoDB Atlas...');
        
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Conectado ao MongoDB Atlas!');
        console.log(`📊 Banco: ${mongoose.connection.db.databaseName}`);
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao conectar ao MongoDB Atlas:', error.message);
        
        // Dicas de troubleshooting
        if (error.message.includes('authentication')) {
            console.error('💡 Verifique a senha do MongoDB Atlas');
        }
        if (error.message.includes('network')) {
            console.error('💡 Verifique Network Access no Atlas (0.0.0.0/0)');
        }
        
        return false;
    }
};

// MODELO do usuário
const usuarioSchema = new mongoose.Schema({
    nome: String,
    email: String,
    senha: String,
    estadoCivil: String,
    moraLua: Boolean,
    dataCadastro: Date
}, { collection: 'login-dados' });

const Usuario = mongoose.model('Usuario', usuarioSchema);

// ==================================================
// ROTAS DA API
// ==================================================

// ROTA RAIZ - Para verificar se API está online
app.get('/', (req, res) => {
    res.json({
        status: 'online ✅',
        servico: 'API Sistema de Login',
        versao: '1.0.0',
        timestamp: new Date().toISOString(),
        rotas: {
            teste: 'GET /api/teste',
            login: 'POST /api/login',
            cadastro: 'POST /api/cadastrar',
            criar_teste: 'POST /api/criar-teste',
            resetar_senha: 'POST /api/resetar-senha'
        },
        ambiente: process.env.NODE_ENV || 'development',
        mensagem: 'Backend funcionando na nuvem! 🚀'
    });
});

// ROTA DE HEALTH CHECK (para o Render monitorar)
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
        status: 'healthy',
        database: dbStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ROTA DE TESTE
app.get('/api/teste', async (req, res) => {
    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        
        // Contar usuários
        const usuarioCount = await Usuario.countDocuments();
        
        res.json({
            mensagem: 'Backend funcionando! 🚀',
            banco: mongoose.connection.db.databaseName,
            colecoes: collections.map(c => c.name),
            totalUsuarios: {
                'login-dados': usuarioCount
            },
            colecaoAtiva: 'login-dados',
            ambiente: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(500).json({
            mensagem: 'Erro ao conectar com o banco',
            erro: error.message
        });
    }
});

// ROTA DE LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        
        if (!email || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Email e senha são obrigatórios'
            });
        }
        
        console.log(`🔍 Tentando login: ${email}`);
        
        const usuario = await Usuario.findOne({ 
            email: { $regex: new RegExp('^' + email + '$', 'i') } 
        });
        
        if (!usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado'
            });
        }
        
        // Verificar senha com bcrypt
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        
        if (!senhaValida) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Senha incorreta'
            });
        }
        
        console.log(`✅ Login bem-sucedido: ${email}`);
        
        res.json({
            sucesso: true,
            mensagem: 'Login realizado com sucesso!',
            usuario: {
                id: usuario._id,
                nome: usuario.nome,
                email: usuario.email,
                estadoCivil: usuario.estadoCivil || 'Solteiro',
                moraLua: usuario.moraLua || false
            }
        });
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno no servidor'
        });
    }
});

// ROTA DE CADASTRO
app.post('/api/cadastrar', async (req, res) => {
    try {
        const { nome, email, senha, estadoCivil, moraLua } = req.body;
        
        if (!nome || !email || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nome, email e senha são obrigatórios'
            });
        }
        
        // Verificar se email já existe
        const existe = await Usuario.findOne({ 
            email: { $regex: new RegExp('^' + email + '$', 'i') } 
        });
        
        if (existe) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Email já cadastrado'
            });
        }
        
        // Criar hash da senha
        const senhaHash = await bcrypt.hash(senha, 10);
        
        // Criar novo usuário
        const novoUsuario = new Usuario({
            nome,
            email,
            senha: senhaHash,
            estadoCivil: estadoCivil || 'Solteiro',
            moraLua: moraLua || false,
            dataCadastro: new Date()
        });
        
        await novoUsuario.save();
        
        console.log(`✅ Novo usuário cadastrado: ${email}`);
        
        res.status(201).json({
            sucesso: true,
            mensagem: 'Cadastro realizado com sucesso!',
            usuario: {
                id: novoUsuario._id,
                nome: novoUsuario.nome,
                email: novoUsuario.email
            }
        });
        
    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao cadastrar'
        });
    }
});

// ROTA PARA CRIAR USUÁRIO DE TESTE
app.post('/api/criar-teste', async (req, res) => {
    try {
        // Verificar se já existe
        const existe = await Usuario.findOne({ email: 'teste@teste.com' });
        
        if (existe) {
            return res.json({
                sucesso: true,
                mensagem: 'Usuário teste já existe!',
                credenciais: {
                    email: 'teste@teste.com',
                    senha: '123456'
                }
            });
        }
        
        const senhaHash = await bcrypt.hash('123456', 10);
        
        const usuarioTeste = new Usuario({
            nome: 'Usuário Teste',
            email: 'teste@teste.com',
            senha: senhaHash,
            estadoCivil: 'Solteiro',
            moraLua: false,
            dataCadastro: new Date()
        });
        
        await usuarioTeste.save();
        
        res.json({
            sucesso: true,
            mensagem: 'Usuário teste criado com sucesso!',
            credenciais: {
                email: 'teste@teste.com',
                senha: '123456'
            }
        });
    } catch (error) {
        res.status(500).json({ 
            sucesso: false,
            erro: error.message 
        });
    }
});

// ROTA PARA RESETAR SENHA
app.post('/api/resetar-senha', async (req, res) => {
    try {
        const { email, novaSenha } = req.body;
        
        const usuario = await Usuario.findOne({ 
            email: { $regex: new RegExp('^' + email + '$', 'i') } 
        });
        
        if (!usuario) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado'
            });
        }
        
        // Criar hash da nova senha
        const hash = await bcrypt.hash(novaSenha, 10);
        usuario.senha = hash;
        await usuario.save();
        
        res.json({
            sucesso: true,
            mensagem: 'Senha atualizada com sucesso!'
        });
        
    } catch (error) {
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar senha'
        });
    }
});

// ROTA 404 PERSONALIZADA
app.use((req, res) => {
    res.status(404).json({
        erro: 'Rota não encontrada',
        rota: req.originalUrl,
        metodo: req.method,
        sugestao: 'Acesse / para ver todas rotas disponíveis'
    });
});

// ==================================================
// INICIAR SERVIDOR
// ==================================================

const startServer = async () => {
    const connected = await connectDB();
    
    const PORT = process.env.PORT || 3000;
    
    app.listen(PORT, () => {
        console.log(`
==================================================
🚀 SERVIDOR INICIADO COM SUCESSO!
==================================================
📡 URL: https://teste-sist-yes-no.onrender.com
🌐 Ambiente: ${process.env.NODE_ENV || 'development'}
🗄️  MongoDB Atlas: ${connected ? '✅ Conectado' : '❌ Desconectado'}
📊 Banco: ${mongoose.connection.db?.databaseName || 'N/A'}
📁 Coleção: login-dados
==================================================
📌 ROTAS DISPONÍVEIS:

1. Teste: GET  /api/teste
2. Login: POST /api/login
3. Cadastro: POST /api/cadastrar
4. Criar teste: POST /api/criar-teste
5. Resetar senha: POST /api/resetar-senha
==================================================
        `);
    });
};

startServer();