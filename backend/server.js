// server.js - VERSÃO CORRIGIDA
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();

// Middlewares (mantenha igual)
app.use(cors({
    origin: [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'https://*.netlify.app',
        'https://*.github.io',
        'http://localhost:8080',
        'https://teste-sist-yes-no.onrender.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ==================================================
// CONEXÃO COM MONGODB - COM TRATAMENTO DE RECONEXÃO
// ==================================================
let Usuario; // Variável global para o modelo

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 
                        'mongodb+srv://sfptc06_db_user:batatinhafrita123@cluster0.rik8o9v.mongodb.net/dados-de-acesso?retryWrites=true&w=majority';
        
        console.log('🔄 Conectando ao MongoDB Atlas...');
        
        // Conectar ao MongoDB
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10, // Conexões simultâneas
        });
        
        console.log('✅ Conectado ao MongoDB Atlas!');
        
        // DEFINIR O MODELO APÓS A CONEXÃO (apenas uma vez!)
        if (!Usuario) {
            const usuarioSchema = new mongoose.Schema({
                nome: String,
                email: String,
                senha: String,
                estadoCivil: String,
                moraLua: Boolean,
                dataCadastro: Date
            }, { collection: 'login-dados' });
            
            // Verificar se modelo já existe antes de criar
            if (mongoose.models.Usuario) {
                Usuario = mongoose.models.Usuario;
            } else {
                Usuario = mongoose.model('Usuario', usuarioSchema);
            }
            
            console.log('📋 Modelo Usuario definido');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao conectar:', error.message);
        return false;
    }
};

// ==================================================
// ROTAS DA API - CORRIGIDAS
// ==================================================

// ROTA RAIZ
app.get('/', (req, res) => {
    res.json({
        status: 'online ✅',
        servico: 'API Sistema de Login',
        versao: '2.0.1',
        timestamp: new Date().toISOString(),
        rotas: {
            teste: 'GET /api/teste',
            login: 'POST /api/login',
            cadastro: 'POST /api/cadastrar',
            criar_teste: 'POST /api/criar-teste',
            resetar_senha: 'POST /api/resetar-senha',
            health: 'GET /health'
        },
        ambiente: process.env.NODE_ENV || 'development',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// HEALTH CHECK
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
        status: 'healthy',
        database: dbStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        modeloDefinido: !!Usuario
    });
});

// ROTA DE TESTE - CORRIGIDA
app.get('/api/teste', async (req, res) => {
    try {
        // Verificar conexão
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        
        // Usar o modelo global definido
        if (!Usuario) {
            throw new Error('Modelo Usuario não definido');
        }
        
        // Listar coleções
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        // Contar usuários usando o modelo correto
        let usuarioCount = 0;
        if (collectionNames.includes('login-dados')) {
            usuarioCount = await Usuario.countDocuments();
        }
        
        res.json({
            mensagem: 'Backend funcionando! 🚀',
            banco: mongoose.connection.db.databaseName,
            colecoes: collectionNames,
            totalUsuarios: {
                'login-dados': usuarioCount
            },
            colecaoAtiva: 'login-dados',
            modelo: 'Usuario definido',
            ambiente: process.env.NODE_ENV || 'development'
        });
        
    } catch (error) {
        console.error('❌ Erro em /api/teste:', error.message);
        res.status(500).json({
            mensagem: 'Erro no servidor',
            erro: error.message,
            sugestao: 'Verifique a conexão com MongoDB'
        });
    }
});

// ROTA DE LOGIN - CORRIGIDA
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        
        if (!email || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Email e senha são obrigatórios'
            });
        }
        
        // Verificar conexão e modelo
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        
        if (!Usuario) {
            return res.status(500).json({
                sucesso: false,
                mensagem: 'Erro no servidor: modelo não definido'
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

// ROTA DE CADASTRO - CORRIGIDA
app.post('/api/cadastrar', async (req, res) => {
    try {
        const { nome, email, senha, estadoCivil, moraLua } = req.body;
        
        if (!nome || !email || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nome, email e senha são obrigatórios'
            });
        }
        
        // Verificar conexão
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        
        if (!Usuario) {
            return res.status(500).json({
                sucesso: false,
                mensagem: 'Erro no servidor: modelo não definido'
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
        
        console.log(`✅ Novo usuário: ${email}`);
        
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

// ROTA CRIAR TESTE - CORRIGIDA
app.post('/api/criar-teste', async (req, res) => {
    try {
        // Verificar conexão
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        
        if (!Usuario) {
            return res.status(500).json({
                sucesso: false,
                mensagem: 'Erro: modelo não definido'
            });
        }
        
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
            mensagem: 'Usuário teste criado!',
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

// 404
app.use((req, res) => {
    res.status(404).json({
        erro: 'Rota não encontrada',
        rota: req.originalUrl,
        metodo: req.method
    });
});

// ==================================================
// INICIAR SERVIDOR
// ==================================================
const startServer = async () => {
    console.log('🚀 Iniciando servidor...');
    
    const PORT = process.env.PORT || 3000;
    
    // Conectar ao banco ANTES de iniciar o servidor
    try {
        await connectDB();
        
        app.listen(PORT, () => {
            console.log(`
==================================================
✅ SERVIDOR INICIADO!
==================================================
📡 URL: http://localhost:${PORT}
🌐 Produção: https://teste-sist-yes-no.onrender.com
🗄️  MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Conectado' : '❌ Desconectado'}
📊 Banco: ${mongoose.connection.db?.databaseName || 'N/A'}
📁 Modelo: ${Usuario ? '✅ Definido' : '❌ Não definido'}
==================================================
            `);
        });
        
    } catch (error) {
        console.error('❌ Falha ao iniciar servidor:', error);
        process.exit(1);
    }
};

// Gerenciar shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('👋 Conexão com MongoDB fechada');
    process.exit(0);
});

startServer();