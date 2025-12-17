const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: '*',  // ⚠️ PERMITE TODAS AS ORIGENS
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Conexão com MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dados-de-acesso';

mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ Conectado ao MongoDB'))
.catch(err => console.error('❌ Erro na conexão MongoDB:', err));

// Schema do usuário
const usuarioSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    estadoCivil: { type: String, required: true },
    moraLua: { type: Boolean, default: false },
    dataCadastro: { type: Date, default: Date.now }
});

const Usuario = mongoose.model('Usuario', usuarioSchema, 'login-dados');

// Rota de teste
app.get('/api/teste', (req, res) => {
    res.json({ mensagem: 'API funcionando!' });
});

// Rota de cadastro
app.post('/api/cadastrar', async (req, res) => {
    try {
        console.log('📝 Tentativa de cadastro:', req.body);
        
        const { nome, email, senha, estadoCivil, moraLua } = req.body;
        
        // Validação básica
        if (!nome || !email || !senha) {
            return res.status(400).json({ 
                mensagem: 'Todos os campos são obrigatórios' 
            });
        }
        
        // Verificar se usuário já existe
        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) {
            return res.status(400).json({ 
                mensagem: 'Email já cadastrado' 
            });
        }
        
        // Criptografar senha
        const senhaCriptografada = await bcrypt.hash(senha, 10);
        
        // Criar novo usuário
        const novoUsuario = new Usuario({
            nome,
            email,
            senha: senhaCriptografada,
            estadoCivil,
            moraLua: moraLua === true || moraLua === 'Sim'
        });
        
        await novoUsuario.save();
        
        console.log('✅ Usuário cadastrado:', email);
        
        res.status(201).json({ 
            mensagem: 'Usuário cadastrado com sucesso',
            usuario: {
                id: novoUsuario._id,
                nome: novoUsuario.nome,
                email: novoUsuario.email
            }
        });
        
    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        res.status(500).json({ 
            mensagem: 'Erro interno do servidor',
            erro: error.message 
        });
    }
});

// Rota de login
app.post('/api/login', async (req, res) => {
    try {
        console.log('🔐 Tentativa de login:', req.body.email);
        
        const { email, senha } = req.body;
        
        if (!email || !senha) {
            return res.status(400).json({ 
                mensagem: 'Email e senha são obrigatórios' 
            });
        }
        
        // Buscar usuário
        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            console.log('❌ Usuário não encontrado:', email);
            return res.status(401).json({ 
                mensagem: 'Email ou senha incorretos' 
            });
        }
        
        // Verificar senha
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            console.log('❌ Senha inválida para:', email);
            return res.status(401).json({ 
                mensagem: 'Email ou senha incorretos' 
            });
        }
        
        // Criar token JWT
        const token = jwt.sign(
            { 
                userId: usuario._id,
                email: usuario.email 
            },
            process.env.JWT_SECRET || 'seu-segredo-jwt-aqui',
            { expiresIn: '24h' }
        );
        
        console.log('✅ Login bem-sucedido:', email);
        
        res.json({
            mensagem: 'Login realizado com sucesso',
            token,
            usuario: {
                id: usuario._id,
                nome: usuario.nome,
                email: usuario.email,
                estadoCivil: usuario.estadoCivil,
                moraLua: usuario.moraLua
            }
        });
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.status(500).json({ 
            mensagem: 'Erro interno do servidor',
            erro: error.message 
        });
    }
});

// Rota para listar usuários (apenas para teste)
app.get('/api/usuarios', async (req, res) => {
    try {
        const usuarios = await Usuario.find({}, '-senha');
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ mensagem: 'Erro ao buscar usuários' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
});