// server.js - VERSÃO COMPLETA CORRIGIDA
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================================================
// 1. MIDDLEWARES E ARQUIVOS ESTÁTICOS
// ==================================================
app.use(cors({
    origin: '*',
    credentials: true
}));

app.use(express.json());

// SERVIR ARQUIVOS FRONTEND DA PASTA 'public'
app.use(express.static(path.join(__dirname, 'public')));

// ==================================================
// 2. CONEXÃO COM MONGODB
// ==================================================
const MONGODB_URI = process.env.MONGODB_URI || 
                   'mongodb+srv://sfptc06_db_user:batatinhafrita123@cluster0.rik8o9v.mongodb.net/dados-de-acesso?retryWrites=true&w=majority';

console.log('🔗 String de conexão MongoDB:', MONGODB_URI.replace(/:[^:]*@/, ':****@'));

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ MongoDB Atlas CONECTADO com sucesso!');
    console.log('📊 Banco:', mongoose.connection.db.databaseName);
})
.catch(err => {
    console.error('❌ ERRO ao conectar ao MongoDB:', err.message);
});

// ==================================================
// 3. DEFINIR MODELO (CORREÇÃO FINAL - FUNÇÃO SEGURA)
// ==================================================

// CACHE global para armazenar o modelo
let _usuarioModel = null;

function getUsuarioModel() {
    try {
        // 1. Se já temos o modelo em cache, retorna ele
        if (_usuarioModel) {
            console.log('📋 [CACHE] Retornando modelo Usuario do cache');
            return _usuarioModel;
        }
        
        // 2. Verifica se o modelo já existe no Mongoose (para hot reloads)
        if (mongoose.models && mongoose.models['Usuario']) {
            _usuarioModel = mongoose.models['Usuario'];
            console.log('📋 [MONGOOSE] Usando modelo Usuario já registrado');
            return _usuarioModel;
        }
        
        // 3. Se não existe em nenhum lugar, cria APENAS UMA VEZ
        const usuarioSchema = new mongoose.Schema({
            nome: { type: String, required: true },
            email: { 
                type: String, 
                required: true,
                unique: true,
                lowercase: true,
                trim: true
            },
            senha: { type: String, required: true },
            estadoCivil: { 
                type: String, 
                enum: ['Solteiro', 'Casado', 'Divorciado', 'Amaziado'],
                default: 'Solteiro'
            },
            moraLua: { type: Boolean, default: false },
            dataCadastro: { type: Date, default: Date.now }
        }, { 
            collection: 'login-dados',  // Nome da coleção no MongoDB
            timestamps: false,
            autoCreate: false  // IMPORTANTE para evitar recriação da coleção
        });

        // Adiciona índices
        usuarioSchema.index({ email: 1 }, { unique: true });
        usuarioSchema.index({ dataCadastro: -1 });

        // 4. Registra o modelo no Mongoose e no cache
        _usuarioModel = mongoose.model('Usuario', usuarioSchema);
        console.log('📋 [CRIAÇÃO] Modelo Usuario criado com sucesso!');
        
        return _usuarioModel;
        
    } catch (error) {
        console.error('❌ Erro CRÍTICO ao obter modelo Usuario:', error);
        console.error('Stack trace:', error.stack);
        throw new Error(`Falha ao inicializar modelo: ${error.message}`);
    }
}

// ==================================================
// 4. MIDDLEWARE PARA VERIFICAR MODELO ANTES DAS ROTAS
// ==================================================
app.use(async (req, res, next) => {
    try {
        // Pré-carrega o modelo na primeira requisição
        if (!_usuarioModel) {
            getUsuarioModel();
        }
        next();
    } catch (error) {
        console.error('❌ Middleware: Erro ao inicializar modelo', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro de inicialização do servidor',
            erro: error.message
        });
    }
});

// ==================================================
// 5. ROTAS API (TODAS USAM getUsuarioModel() CORRETAMENTE)
// ==================================================

// ROTA DE TESTE
app.get('/api/teste', async (req, res) => {
    try {
        // Obtém o modelo de forma SEGURA
        const Usuario = getUsuarioModel();
        
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        let usuarioCount = 0;
        if (collectionNames.includes('login-dados')) {
            usuarioCount = await Usuario.countDocuments();
        }
        
        res.json({
            sucesso: true,
            mensagem: '✅ Backend funcionando perfeitamente!',
            banco: mongoose.connection.db.databaseName,
            colecoes: collectionNames,
            totalUsuarios: usuarioCount,
            conexao_mongodb: mongoose.connection.readyState === 1,
            modelo_carregado: !!Usuario
        });
        
    } catch (error) {
        console.error('❌ Erro FATAL em /api/teste:', error);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Backend OK, mas erro no MongoDB',
            erro: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// ROTA DE LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const Usuario = getUsuarioModel();
        const { email, senha } = req.body;
        
        if (!email || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Email e senha são obrigatórios'
            });
        }
        
        const usuario = await Usuario.findOne({ 
            email: { $regex: new RegExp('^' + email + '$', 'i') } 
        });
        
        if (!usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado'
            });
        }
        
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        
        if (!senhaValida) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Senha incorreta'
            });
        }
        
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
        const Usuario = getUsuarioModel();
        const { nome, email, senha, estadoCivil, moraLua } = req.body;
        
        if (!nome || !email || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nome, email e senha são obrigatórios'
            });
        }
        
        // Verificar se email existe
        const existe = await Usuario.findOne({ 
            email: { $regex: new RegExp('^' + email + '$', 'i') } 
        });
        
        if (existe) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Email já cadastrado'
            });
        }
        
        const senhaHash = await bcrypt.hash(senha, 10);
        
        const novoUsuario = new Usuario({
            nome,
            email,
            senha: senhaHash,
            estadoCivil: estadoCivil || 'Solteiro',
            moraLua: moraLua || false,
            dataCadastro: new Date()
        });
        
        await novoUsuario.save();
        
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

// ROTA CRIAR USUÁRIO TESTE
app.post('/api/criar-teste', async (req, res) => {
    try {
        const Usuario = getUsuarioModel();
        
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

// ROTA HEALTH CHECK
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        modelo_carregado: !!_usuarioModel
    });
});

// ROTA RAIZ PARA FRONTEND
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ROTA PARA DASHBOARD
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ==================================================
// 6. INICIAR SERVIDOR (CORRIGIDO PARA RENDER)
// ==================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
==================================================
🚀 SERVIDOR INICIADO COM SUCESSO!
==================================================
📡 Host: 0.0.0.0:${PORT}
🌐 URL Pública: https://teste-sist-yes-no.onrender.com
📁 Frontend: Disponível em /
🗄️  MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Conectado' : '❌ Desconectado'}
📋 Modelo: ${_usuarioModel ? '✅ Pronto' : '⏳ Aguardando primeira requisição'}
==================================================
    `);
    
    // Pré-carrega o modelo na inicialização
    setTimeout(() => {
        try {
            getUsuarioModel();
            console.log('✅ Modelo pré-carregado na inicialização');
        } catch (error) {
            console.error('❌ Falha ao pré-carregar modelo:', error.message);
        }
    }, 1000);
});

// ==================================================
// 7. MANIPULADORES DE ERRO GLOBAL
// ==================================================
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Stack:', error.stack);
});

// Gerenciar desligamento
process.on('SIGINT', async () => {
    console.log('👋 Recebido SIGINT. Encerrando...');
    await mongoose.connection.close();
    console.log('✅ Conexão MongoDB fechada');
    process.exit(0);
});