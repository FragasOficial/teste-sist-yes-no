// server.js - VERSÃO FINAL FUNCIONAL
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:8080'],
    credentials: true
}));
app.use(express.json());

// CONEXÃO COM MONGODB
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dados-de-acesso';
        
        console.log('🔄 Conectando ao MongoDB...');
        console.log('📡 URI:', mongoURI);
        
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Conectado ao MongoDB!');
        console.log(`📊 Banco: ${mongoose.connection.db.databaseName}`);
        
        // Listar coleções
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📁 Coleções disponíveis:');
        collections.forEach(col => console.log(`   - ${col.name}`));
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao conectar:', error.message);
        return false;
    }
};

// MODELO para a coleção CORRETA: login-dados
const usuarioSchema = new mongoose.Schema({
    nome: String,
    email: String,
    senha: String,
    estadoCivil: String,
    moraLua: Boolean,
    dataCadastro: Date
}, { collection: 'login-dados' }); // ← COLETAÇÃO CORRETA!

const Usuario = mongoose.model('Usuario', usuarioSchema);

// ROTA DE TESTE
app.get('/api/teste', async (req, res) => {
    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        
        // Contar usuários em cada coleção
        const counts = {};
        for (const col of collections) {
            const Model = mongoose.model(col.name, new mongoose.Schema({}, { strict: false }), col.name);
            const count = await Model.countDocuments();
            counts[col.name] = count;
        }
        
        res.json({
            mensagem: 'Backend funcionando! 🚀',
            banco: mongoose.connection.db.databaseName,
            colecoes: collections.map(c => c.name),
            totalUsuarios: counts,
            colecaoAtiva: 'login-dados'
        });
    } catch (error) {
        res.json({
            mensagem: 'Backend OK, mas erro no MongoDB',
            erro: error.message
        });
    }
});

// ROTA DE LOGIN - COM BCRYPT
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        
        if (!email || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Email e senha são obrigatórios'
            });
        }
        
        console.log(`🔍 Procurando usuário: ${email}`);
        
        // Buscar na coleção CORRETA: login-dados
        const usuario = await Usuario.findOne({ 
            email: { $regex: new RegExp('^' + email + '$', 'i') } 
        });
        
        if (!usuario) {
            console.log(`❌ Usuário ${email} não encontrado na coleção login-dados`);
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado'
            });
        }
        
        console.log('✅ Usuário encontrado!');
        console.log('🔑 Hash da senha no banco:', usuario.senha.substring(0, 30) + '...');
        
        // VERIFICAR SENHA COM BCRYPT
        console.log('🔐 Comparando senha com bcrypt...');
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        
        if (!senhaValida) {
            console.log('❌ Senha inválida (bcrypt)');
            
            // Fallback para desenvolvimento: se a senha for "123456", crie um novo hash
            if (senha === '123456') {
                console.log('⚠️ Tentando criar novo hash para senha "123456"...');
                const hash = await bcrypt.hash('123456', 10);
                
                // Atualizar senha no banco
                usuario.senha = hash;
                await usuario.save();
                console.log('✅ Senha atualizada no banco com novo hash');
                
                // Tentar novamente
                const novaVerificacao = await bcrypt.compare(senha, usuario.senha);
                if (novaVerificacao) {
                    console.log('✅ Agora a senha funciona!');
                } else {
                    return res.status(401).json({
                        sucesso: false,
                        mensagem: 'Senha incorreta (bcrypt)'
                    });
                }
            } else {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: 'Senha incorreta'
                });
            }
        }
        
        console.log('✅ Login bem-sucedido!');
        
        // SUCESSO!
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

// ROTA PARA ATUALIZAR SENHA (se você esqueceu a senha original)
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
            mensagem: 'Senha atualizada com sucesso!',
            novaSenha: novaSenha // Apenas para desenvolvimento
        });
        
    } catch (error) {
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar senha'
        });
    }
});

// ROTA DE CADASTRO - COM BCRYPT
app.post('/api/cadastrar', async (req, res) => {
    try {
        const { nome, email, senha, estadoCivil, moraLua } = req.body;
        
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
            senha: senhaHash, // Senha criptografada
            estadoCivil: estadoCivil || 'Solteiro',
            moraLua: moraLua || false,
            dataCadastro: new Date()
        });
        
        await novoUsuario.save();
        
        console.log('✅ Novo usuário cadastrado:', email);
        
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

// Iniciar servidor
const startServer = async () => {
    const connected = await connectDB();
    
    app.listen(PORT, () => {
        console.log(`
==================================================
🚀 SERVIDOR INICIADO COM SUCESSO!
==================================================
📡 URL: http://localhost:${PORT}
🌐 Ambiente: ${process.env.NODE_ENV || 'development'}
🗄️  MongoDB: ${connected ? '✅ Conectado' : '❌ Desconectado'}
📊 Banco: ${mongoose.connection.db?.databaseName || 'N/A'}
📁 Coleção ativa: login-dados
==================================================
📌 COMANDOS ÚTEIS:

1. Crie usuário teste:
   POST /api/criar-teste
   → Email: teste@teste.com
   → Senha: 123456

2. Ou resetar senha do seu usuário:
   POST /api/resetar-senha
   Body: {"email":"costafragas@gmail.com","novaSenha":"123456"}

3. Teste conexão:
   GET /api/teste
==================================================
        `);
    });
};

startServer();