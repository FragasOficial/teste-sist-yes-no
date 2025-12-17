// CONFIGURAÇÃO
const API_URL = 'http://localhost:3000';
console.log('🔧 API URL configurada:', API_URL);

// Função para verificar se estamos em file://
function isLocalFile() {
    return window.location.protocol === 'file:';
}

// Aguardar DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM completamente carregado');
    console.log('🌐 URL atual:', window.location.href);
    console.log('📁 Protocolo:', window.location.protocol);
    
    if (isLocalFile()) {
        console.warn('⚠️ ATENÇÃO: Página aberta como arquivo local (file://)');
        console.warn('⚠️ Isso pode causar problemas de CORS!');
        console.warn('⚠️ Recomendado: usar um servidor HTTP (Live Server, Python, etc.)');
        
        // Mostrar alerta visual
        const alerta = document.createElement('div');
        alerta.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #fff3cd;
            color: #856404;
            padding: 15px;
            border-bottom: 2px solid #ffeaa7;
            text-align: center;
            font-weight: bold;
            z-index: 9999;
        `;
        alerta.innerHTML = '⚠️ USE UM SERVIDOR HTTP (Live Server) para evitar problemas de CORS!';
        document.body.prepend(alerta);
    }
    
    inicializarAplicacao();
});

function inicializarAplicacao() {
    console.log('🔍 Procurando elementos no DOM...');
    
    // 1. PRIMEIRO: Encontrar os formulários pelas classes configLebel
    const forms = document.querySelectorAll('.configLebel');
    console.log('📋 Forms encontrados:', forms.length);
    
    if (forms.length < 2) {
        console.error('❌ Não encontrei os 2 formulários esperados!');
        console.log('📝 Classes CSS disponíveis:', 
            Array.from(document.querySelectorAll('*')).map(el => el.className).filter(c => c)
        );
        return;
    }
    
    // No cadastro, antes de enviar
    function validarEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    // Formulário de CADASTRO (primeiro)
    const cadastroForm = forms[0];
    // Formulário de LOGIN (segundo)
    const loginForm = forms[1];
    
    console.log('✅ Formulários identificados:', {
        cadastro: !!cadastroForm,
        login: !!loginForm
    });
    
    // 2. Encontrar elementos DENTRO de cada formulário
    // CADASTRO
    const cadastroNome = cadastroForm.querySelector('input[type="text"]');
    const cadastroEmail = cadastroForm.querySelector('input[type="email"]');
    const cadastroSenha = cadastroForm.querySelector('input[type="password"]');
    const cadastroEstadoCivil = cadastroForm.querySelector('#configSelect');
    const cadastroMoraLua = cadastroForm.querySelector('#configYesNo');
    const cadastroButton = cadastroForm.querySelector('button:not(.renderButton)') || cadastroForm.querySelector('button');
    
    // LOGIN
    const loginEmail = loginForm.querySelector('input[type="email"]');
    const loginSenha = loginForm.querySelector('input[type="password"]');
    const loginButton = loginForm.querySelector('.renderButton') || loginForm.querySelector('button');
    
    console.log('🎯 Elementos encontrados:', {
        cadastro: {
            nome: !!cadastroNome,
            email: !!cadastroEmail,
            senha: !!cadastroSenha,
            estadoCivil: !!cadastroEstadoCivil,
            moraLua: !!cadastroMoraLua,
            botao: !!cadastroButton
        },
        login: {
            email: !!loginEmail,
            senha: !!loginSenha,
            botao: !!loginButton
        }
    });
    
    // 3. Testar conexão com backend
    testarConexaoBackend();
    
    // 4. Adicionar event listeners
    if (cadastroButton) {
        cadastroButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🖱️ Botão CADASTRAR clicado');
            executarCadastro(cadastroNome, cadastroEmail, cadastroSenha, cadastroEstadoCivil, cadastroMoraLua);
        });
    }
    
    if (loginButton) {
        loginButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🖱️ Botão LOGIN clicado');
            executarLogin(loginEmail, loginSenha);
        });
    }
    
    // 5. Adicionar botões de debug
    adicionarBotoesDebug();
}

// TESTE DE CONEXÃO
async function testarConexaoBackend() {
    console.log('🔌 Testando conexão com backend...');
    
    try {
        const response = await fetch(`${API_URL}/api/teste`);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ BACKEND CONECTADO:', data.mensagem);
            mostrarStatusBackend(true);
            return true;
        }
    } catch (error) {
        console.error('❌ BACKEND NÃO CONECTADO:', error.message);
        console.log('📌 Verifique se:');
        console.log('   1. Backend está rodando em:', API_URL);
        console.log('   2. Não há bloqueio de firewall');
        console.log('   3. O CORS está configurado no backend');
        mostrarStatusBackend(false);
        return false;
    }
}

function mostrarStatusBackend(conectado) {
    let statusDiv = document.getElementById('backend-status');
    
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'backend-status';
        statusDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 10px 15px;
            border-radius: 5px;
            font-weight: bold;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(statusDiv);
    }
    
    if (conectado) {
        statusDiv.textContent = '✅ Backend Online';
        statusDiv.style.background = '#28a745';
        statusDiv.style.color = 'white';
    } else {
        statusDiv.textContent = '❌ Backend Offline';
        statusDiv.style.background = '#dc3545';
        statusDiv.style.color = 'white';
    }
}

// CADASTRO
async function executarCadastro(nomeInput, emailInput, senhaInput, estadoCivilSelect, moraLuaSelect) {
    console.log('📝 Iniciando processo de cadastro...');
    
    // Validação
    if (!nomeInput || !nomeInput.value.trim()) {
        alert('Por favor, digite seu nome');
        return;
    }
    
    if (!emailInput || !emailInput.value.trim()) {
        alert('Por favor, digite seu email');
        return;
    }
    
    if (!senhaInput || !senhaInput.value) {
        alert('Por favor, digite uma senha');
        return;
    }
    
    if (senhaInput.value.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres');
        return;
    }
    
    // Preparar dados
    const usuarioData = {
        nome: nomeInput.value.trim(),
        email: emailInput.value.trim().toLowerCase(),
        senha: senhaInput.value,
        estadoCivil: estadoCivilSelect ? estadoCivilSelect.value : 'Solteiro',
        moraLua: moraLuaSelect ? (moraLuaSelect.value === 'Sim') : false
    };
    
    console.log('📤 Dados para cadastro:', usuarioData);
    
    try {
        const response = await fetch(`${API_URL}/api/cadastrar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(usuarioData)
        });
        
        const data = await response.json();
        console.log('📥 Resposta do backend:', data);
        
        if (response.ok) {
            alert(`✅ CADASTRO REALIZADO COM SUCESSO!\n\nNome: ${data.usuario.nome}\nEmail: ${data.usuario.email}\n\nVocê já pode fazer login!`);
            
            // Limpar formulário
            nomeInput.value = '';
            emailInput.value = '';
            senhaInput.value = '';
            if (estadoCivilSelect) estadoCivilSelect.value = 'Solteiro';
            if (moraLuaSelect) moraLuaSelect.value = 'Não';
            
        } else {
            alert(`❌ ERRO NO CADASTRO:\n${data.mensagem || 'Erro desconhecido'}`);
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        alert('❌ Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    }
}

// LOGIN
async function executarLogin(emailInput, senhaInput) {
    console.log('🔐 Iniciando processo de login...');
    
    if (!emailInput || !emailInput.value.trim()) {
        alert('Por favor, digite seu email');
        return;
    }
    
    if (!senhaInput || !senhaInput.value) {
        alert('Por favor, digite sua senha');
        return;
    }
    
    const loginData = {
        email: emailInput.value.trim().toLowerCase(),
        senha: senhaInput.value
    };
    
    console.log('📤 Dados para login:', loginData.email);
    
    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData)
        });
        
        const data = await response.json();
        console.log('📥 Resposta do login:', data);
        
        if (response.ok) {
            alert(`✅ LOGIN BEM-SUCEDIDO!\n\nBem-vindo(a), ${data.usuario.nome}!\nEmail: ${data.usuario.email}\nEstado Civil: ${data.usuario.estadoCivil}\nMora na Lua: ${data.usuario.moraLua ? 'Sim 🌙' : 'Não 🌎'}`);
            
            // Armazenar no localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            console.log('💾 Dados salvos no localStorage');
            
        } else {
            alert(`❌ ERRO NO LOGIN:\n${data.mensagem || 'Credenciais inválidas'}`);
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        alert('❌ Não foi possível conectar ao servidor.');
    }
}

// BOTÕES DE DEBUG
function adicionarBotoesDebug() {
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 9999;
    `;
    
    // Botão Testar Conexão
    const btnTestar = document.createElement('button');
    btnTestar.textContent = '🔌 Testar Backend';
    btnTestar.style.cssText = `
        padding: 10px 15px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 12px;
    `;
    btnTestar.onclick = testarConexaoBackend;
    
    // Botão Ver Dados
    const btnDados = document.createElement('button');
    btnDados.textContent = '📊 Ver Dados Locais';
    btnDados.style.cssText = `
        padding: 10px 15px;
        background: #28a745;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 12px;
    `;
    btnDados.onclick = function() {
        console.log('📦 Dados no localStorage:');
        console.log('Token:', localStorage.getItem('token'));
        console.log('Usuário:', localStorage.getItem('usuario'));
        alert('Dados no console (F12)');
    };
    
    // Botão Limpar
    const btnLimpar = document.createElement('button');
    btnLimpar.textContent = '🗑️ Limpar Dados';
    btnLimpar.style.cssText = `
        padding: 10px 15px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 12px;
    `;
    btnLimpar.onclick = function() {
        localStorage.clear();
        alert('Dados limpos!');
    };
    
    container.appendChild(btnTestar);
    container.appendChild(btnDados);
    container.appendChild(btnLimpar);
    document.body.appendChild(container);
}

// Função auxiliar para mostrar logs bonitos
console.log = (function() {
    const original = console.log;
    return function() {
        const args = Array.from(arguments);
        const timestamp = new Date().toLocaleTimeString();
        args.unshift(`[${timestamp}]`);
        original.apply(console, args);
    };
})();