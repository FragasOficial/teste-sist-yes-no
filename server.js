// server.js - VERSÃO DEFINITIVA CORRIGIDA
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
// 3. MODELO ÚNICO E DEFINIDO UMA VEZ (FORA DE QUALQUER FUNÇÃO)
// ==================================================

// Verifica se o modelo JÁ EXISTE ANTES de tentar criar
let Usuario;
try {
    // Se o modelo 'Usuario' já está registrado no Mongoose, usa ele
    if (mongoose.models.Usuario) {
        Usuario = mongoose.models.Usuario;
        console.log('✅ Modelo Usuario já existe. Reutilizando.');
    } else {
        // Se não existe, cria pela PRIMEIRA e ÚNICA vez
        const usuarioSchema = new mongoose.Schema({
            nome: String,
            email: String,
            senha: String,
            estadoCivil: String,
            moraLua: Boolean,
            dataCadastro: Date
        }, {
            collection: 'login-dados' // Isso APENAS diz em qual coleção salvar
        });
        
        Usuario = mongoose.model('Usuario', usuarioSchema);
        console.log('📋 Modelo Usuario criado com sucesso.');
    }
} catch (error) {
    console.error('❌ ERRO CRÍTICO ao definir modelo:', error);
    // Se falhar aqui, o servidor não deve continuar
    throw error;
}

// ==================================================
// 4. ROTAS API (USAM A VARIÁVEL GLOBAL 'Usuario')
// ==================================================

// ROTA DE TESTE
app.get('/api/teste', async (req, res) => {
    try {
        // Usuario é uma variável global já definida
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
        modelo_carregado: !!Usuario
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
// 5. INICIAR SERVIDOR (CORRIGIDO PARA RENDER)
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
📋 Modelo: ${Usuario ? '✅ Pronto' : '❌ Falhou'}
==================================================
    `);
});

// ==================================================
// 6. MANIPULADORES DE ERRO GLOBAL
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