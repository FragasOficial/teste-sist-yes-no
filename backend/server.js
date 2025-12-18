// server.js - VERSÃO FINAL DEFINITIVA
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================================================
// 1. MIDDLEWARES
// ==================================================
app.use(cors({
    origin: [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'https://*.netlify.app',
        'https://*.github.io',
        'http://localhost:8080',
        'https://teste-sist-yes-no.onrender.com'
    ],
    credentials: true
}));

app.use(express.json());

// ==================================================
// 2. CONEXÃO COM MONGODB (ANTES DE QUALQUER ROTA)
// ==================================================
const MONGODB_URI = process.env.MONGODB_URI || 
                   'mongodb+srv://sfptc06_db_user:batatinhafrita123@cluster0.rik8o9v.mongodb.net/dados-de-acesso?retryWrites=true&w=majority';

console.log('🔗 String de conexão MongoDB:', MONGODB_URI.replace(/:[^:]*@/, ':****@'));

// Conectar ao MongoDB UMA ÚNICA VEZ
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
    console.log('💡 Dica: Verifique:');
    console.log('   1. String de conexão está correta?');
    console.log('   2. Network Access no Atlas tem 0.0.0.0/0?');
    console.log('   3. Usuário/senha estão corretos?');
});

// ==================================================
// 3. DEFINIR MODELO (FORA DAS ROTAS, UMA ÚNICA VEZ)
// ==================================================
let Usuario;

// Função para obter o modelo de forma segura
function getUsuarioModel() {
    if (!Usuario) {
        // Verificar se o modelo já existe no Mongoose
        if (mongoose.models.Usuario) {
            Usuario = mongoose.models.Usuario;
            console.log('📋 Usando modelo Usuario já existente');
        } else {
            // Criar schema e modelo UMA VEZ
            const usuarioSchema = new mongoose.Schema({
                nome: String,
                email: String,
                senha: String,
                estadoCivil: String,
                moraLua: Boolean,
                dataCadastro: Date
            }, { 
                collection: 'login-dados',
                // Evitar criar coleção automaticamente
                autoCreate: false  
            });
            
            Usuario = mongoose.model('Usuario', usuarioSchema);
            console.log('📋 Modelo Usuario criado com sucesso');
        }
    }
    return Usuario;
}

// ==================================================
// 4. MIDDLEWARE PARA VERIFICAR CONEXÃO
// ==================================================
app.use(async (req, res, next) => {
    // Verificar se MongoDB está conectado
    if (mongoose.connection.readyState !== 1) {
        console.log('⚠️ MongoDB desconectado, tentando reconectar...');
        try {
            await mongoose.connect(MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            console.log('✅ Reconexão bem-sucedida!');
        } catch (error) {
            console.error('❌ Falha na reconexão:', error.message);
            return res.status(503).json({
                sucesso: false,
                mensagem: 'Serviço de banco de dados indisponível'
            });
        }
    }
    next();
});

// ==================================================
// 5. ROTAS SIMPLIFICADAS E SEGURAS
// ==================================================

// ROTA RAIZ (sem usar modelo)
app.get('/', (req, res) => {
    res.json({
        status: 'online ✅',
        servico: 'API Sistema de Login',
        versao: '3.0.0',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        rotas_disponiveis: [
            'GET  /api/teste',
            'POST /api/login',
            'POST /api/cadastrar',
            'POST /api/criar-teste',
            'GET  /health'
        ]
    });
});

// HEALTH CHECK (sem usar modelo)
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ROTA DE TESTE (USANDO O MODELO CORRETAMENTE)
app.get('/api/teste', async (req, res) => {
    try {
        // Obter modelo de forma segura
        const UsuarioModel = getUsuarioModel();
        
        // Verificar se coleção existe
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        let usuarioCount = 0;
        if (collectionNames.includes('login-dados')) {
            usuarioCount = await UsuarioModel.countDocuments();
        }
        
        res.json({
            mensagem: 'Backend funcionando! 🚀',
            banco: mongoose.connection.db.databaseName,
            colecoes: collectionNames,
            totalUsuarios: usuarioCount,
            modelo_definido: !!UsuarioModel,
            conexao_mongodb: mongoose.connection.readyState === 1
        });
        
    } catch (error) {
        console.error('❌ Erro em /api/teste:', error.message);
        res.status(500).json({
            mensagem: 'Erro no servidor',
            erro: error.message,
            sugestao: 'O modelo pode estar mal definido'
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
        
        const UsuarioModel = getUsuarioModel();
        const usuario = await UsuarioModel.findOne({ 
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
        
        const UsuarioModel = getUsuarioModel();
        
        // Verificar se email existe
        const existe = await UsuarioModel.findOne({ 
            email: { $regex: new RegExp('^' + email + '$', 'i') } 
        });
        
        if (existe) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Email já cadastrado'
            });
        }
        
        const senhaHash = await bcrypt.hash(senha, 10);
        
        const novoUsuario = new UsuarioModel({
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
        const UsuarioModel = getUsuarioModel();
        
        // Verificar se já existe
        const existe = await UsuarioModel.findOne({ email: 'teste@teste.com' });
        
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
        
        const usuarioTeste = new UsuarioModel({
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

// ROTA 404
app.use((req, res) => {
    res.status(404).json({
        erro: 'Rota não encontrada',
        rota: req.originalUrl,
        metodo: req.method
    });
});

// ==================================================
// 6. INICIAR SERVIDOR
// ==================================================
app.listen(PORT, () => {
    console.log(`
==================================================
🚀 SERVIDOR INICIADO COM SUCESSO!
==================================================
📡 URL Local: http://localhost:${PORT}
🌐 URL Produção: https://teste-sist-yes-no.onrender.com
🗄️  MongoDB Status: ${mongoose.connection.readyState === 1 ? '✅ Conectado' : '❌ Desconectado'}
==================================================
    `);
});

// Gerenciar desligamento
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('👋 Conexão MongoDB fechada');
    process.exit(0);
});