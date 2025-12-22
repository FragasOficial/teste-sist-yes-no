// CONFIGURAÇÃO
const API_URL = window.location.origin; // Auto-detecção (local ou produção)
console.log('🔧 Sistema iniciado com API:', API_URL);

// Elementos do DOM
const elementos = {
    // Cadastro
    nomeCadastro: document.getElementById('nomeCadastro'),
    emailCadastro: document.getElementById('emailCadastro'),
    senhaCadastro: document.getElementById('senhaCadastro'),
    confirmarSenhaCadastro: document.getElementById('confirmarSenhaCadastro'),
    estadoCivilCadastro: document.getElementById('configSelectCadastro'),
    moraLuaCadastro: document.getElementById('configYesNoCadastro'),
    btnCadastrar: document.getElementById('btnCadastrar'),
    
    // Login
    emailLogin: document.getElementById('emailLogin'),
    senhaLogin: document.getElementById('senhaLogin'),
    btnLogin: document.getElementById('btnLogin')
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM carregado');
    
    // Testar conexão com backend
    testarConexaoBackend();
    
    // Adicionar event listeners
    if (elementos.btnCadastrar) {
        elementos.btnCadastrar.addEventListener('click', executarCadastro);
    }
    
    if (elementos.btnLogin) {
        elementos.btnLogin.addEventListener('click', executarLogin);
    }
    
    // Permitir Enter para login
    if (elementos.senhaLogin) {
        elementos.senhaLogin.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') executarLogin();
        });
    }
});

// Testar conexão com backend
async function testarConexaoBackend() {
    try {
        const response = await fetch(`${API_URL}/api/teste`);
        const data = await response.json();
        
        mostrarStatus(`✅ Backend Online: ${data.mensagem}`, 'success');
        console.log('📊 Banco de dados:', data);
        
    } catch (error) {
        mostrarStatus('❌ Backend Offline - Verifique conexão', 'error');
        console.error('Erro de conexão:', error);
    }
}

// Função de cadastro
async function executarCadastro() {
    // Validação básica
    if (!elementos.nomeCadastro.value.trim()) {
        alert('Por favor, digite seu nome');
        return;
    }
    
    if (!elementos.emailCadastro.value.trim()) {
        alert('Por favor, digite seu email');
        return;
    }
    
    if (!validarEmail(elementos.emailCadastro.value)) {
        alert('Por favor, digite um email válido');
        return;
    }
    
    if (elementos.senhaCadastro.value.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres');
        return;
    }
    
    if (elementos.senhaCadastro.value !== elementos.confirmarSenhaCadastro.value) {
        alert('As senhas não coincidem!');
        return;
    }
    
    // Preparar dados
    const dados = {
        nome: elementos.nomeCadastro.value.trim(),
        email: elementos.emailCadastro.value.trim().toLowerCase(),
        senha: elementos.senhaCadastro.value,
        estadoCivil: elementos.estadoCivilCadastro.value,
        moraLua: elementos.moraLuaCadastro.value === 'Sim'
    };
    
    console.log('📤 Enviando cadastro:', { ...dados, senha: '***' });
    
    try {
        const response = await fetch(`${API_URL}/api/cadastrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        const resultado = await response.json();
        
        if (resultado.sucesso) {
            alert(`✅ Cadastro realizado!\n\nNome: ${resultado.usuario.nome}\nEmail: ${resultado.usuario.email}`);
            
            // Limpar formulário
            elementos.nomeCadastro.value = '';
            elementos.emailCadastro.value = '';
            elementos.senhaCadastro.value = '';
            elementos.confirmarSenhaCadastro.value = '';
            
            // Preencher login com novo email
            elementos.emailLogin.value = dados.email;
            elementos.senhaLogin.value = dados.senha;
            
        } else {
            alert(`❌ Erro: ${resultado.mensagem}`);
        }
        
    } catch (error) {
        alert('❌ Erro de conexão com o servidor');
        console.error('Erro:', error);
    }
}

// Função de login
async function executarLogin() {
    if (!elementos.emailLogin.value.trim()) {
        alert('Por favor, digite seu email');
        return;
    }
    
    if (!elementos.senhaLogin.value) {
        alert('Por favor, digite sua senha');
        return;
    }
    
    const dados = {
        email: elementos.emailLogin.value.trim().toLowerCase(),
        senha: elementos.senhaLogin.value
    };
    
    console.log('🔐 Tentando login:', dados.email);
    
    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        const resultado = await response.json();
        
        if (resultado.sucesso) {
            // Salvar usuário no localStorage
            localStorage.setItem('usuario', JSON.stringify(resultado.usuario));
            
            // Redirecionar para dashboard
            window.location.href = '/dashboard.html';
            
        } else {
            alert(`❌ Login falhou: ${resultado.mensagem}`);
        }
        
    } catch (error) {
        alert('❌ Erro de conexão com o servidor');
        console.error('Erro:', error);
    }
}

// Funções auxiliares
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function mostrarStatus(mensagem, tipo) {
    // Criar ou atualizar elemento de status
    let statusEl = document.getElementById('status-message');
    
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'status-message';
        statusEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 300px;
            text-align: center;
        `;
        document.body.appendChild(statusEl);
    }
    
    statusEl.textContent = mensagem;
    statusEl.style.background = tipo === 'success' ? '#2ecc71' : '#e74c3c';
    statusEl.style.color = 'white';
    
    // Remover após 5 segundos
    setTimeout(() => {
        if (statusEl.parentNode) {
            statusEl.remove();
        }
    }, 5000);
}

// Criar botões de debug (apenas em desenvolvimento)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    document.addEventListener('DOMContentLoaded', function() {
        const debugDiv = document.createElement('div');
        debugDiv.className = 'debug-buttons';
        debugDiv.innerHTML = `
            <button onclick="testarConexaoBackend()" style="background:#3498db;">🔌 Testar Backend</button>
            <button onclick="criarUsuarioTeste()" style="background:#9b59b6;">🧪 Criar Usuário Teste</button>
            <button onclick="limparDados()" style="background:#e74c3c;">🗑️ Limpar Dados</button>
        `;
        document.body.appendChild(debugDiv);
    });
}

// Função para criar usuário teste
async function criarUsuarioTeste() {
    try {
        const response = await fetch(`${API_URL}/api/criar-teste`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const resultado = await response.json();
        
        if (resultado.sucesso) {
            alert(`✅ ${resultado.mensagem}\n\nEmail: ${resultado.credenciais.email}\nSenha: ${resultado.credenciais.senha}`);
            
            // Preencher formulário de login
            if (elementos.emailLogin) {
                elementos.emailLogin.value = resultado.credenciais.email;
                elementos.senhaLogin.value = resultado.credenciais.senha;
            }
        }
        
    } catch (error) {
        alert('❌ Erro ao criar usuário teste');
    }
}

// Função para limpar dados
function limparDados() {
    if (confirm('Tem certeza que deseja limpar todos os dados locais?')) {
        localStorage.clear();
        alert('🗑️ Dados locais limpos!');
    }
}

const toggleBtn = document.getElementById("themeToggle");

toggleBtn.addEventListener("click", ()=>{
  document.body.classList.toggle("dark");
  toggleBtn.innerHTML =
    document.body.classList.contains("dark")
    ? `<span class="material-icons">light_mode</span>`
    : `<span class="material-icons">dark_mode</span>`;
});

function showToast(msg){
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.classList.add("show");
    setTimeout(()=> toast.classList.remove("show"), 3000);
  }
  showToast("Configuração aplicada com sucesso!");
  
