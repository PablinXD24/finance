// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCfZXFifjVKwNBplzext-C-lsfgqGJhxvQ",
  authDomain: "meu-app-financeiro-4f6f4.firebaseapp.com",
  projectId: "meu-app-financeiro-4f6f4",
  storageBucket: "meu-app-financeiro-4f6f4.appspot.com",
  messagingSenderId: "185525679690",
  appId: "1:185525679690:web:80cfc8e52b93eca9d658b3"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Provedor de autenticação do Google
const provider = new firebase.auth.GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface
    const loginModal = document.getElementById('loginModal');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const loginMessage = document.getElementById('loginMessage');
    const appContainer = document.querySelector('.app-container');
    const logoutBtn = document.querySelector('.btn-logout');
    const userPhoto = document.getElementById('userPhoto');
    const userName = document.getElementById('userName');
    const settingsUserPhoto = document.getElementById('settings-user-photo');
    const userEmail = document.getElementById('user-email');
    const userNameInput = document.getElementById('user-name');
    
    // Elementos financeiros
    const mesSelect = document.getElementById('mesSelecionado');
    const anoInput = document.getElementById('anoSelecionado');
    const listaGastos = document.getElementById('listaGastos');
    const addGastoBtn = document.getElementById('addGasto');
    const calcularBtn = document.getElementById('calcularBtn');
    const tabsContainer = document.getElementById('tabsContainer');
    const tabsContent = document.getElementById('tabsContent');
    
    // Elementos de configuração
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const themeSelector = document.getElementById('theme-selector');
    const colorOptions = document.querySelectorAll('.color-option');
    
    let savedCalculations = JSON.parse(localStorage.getItem('savedCalculations')) || [];

    // Configura data atual
    const hoje = new Date();
    mesSelect.value = hoje.getMonth();
    anoInput.value = hoje.getFullYear();

    // Event listeners
    addGastoBtn.addEventListener('click', () => adicionarGasto('', 0));
    calcularBtn.addEventListener('click', calcularResumo);
    mesSelect.addEventListener('change', atualizarDiasUteis);
    anoInput.addEventListener('change', atualizarDiasUteis);
    logoutBtn.addEventListener('click', signOut);
    saveSettingsBtn.addEventListener('click', saveSettings);
    googleLoginBtn.addEventListener('click', signInWithGoogle);

    // Configura navegação entre páginas
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            
            // Esconde todas as páginas
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            // Mostra a página selecionada
            document.getElementById(pageId).classList.add('active');
        });
    });

    // Configura o toggle da sidebar
    document.querySelector('.sidebar-toggle').addEventListener('click', toggleSidebar);

    // Configura listeners para cálculo em tempo real do VT
    document.getElementById('valorPassagem').addEventListener('input', calcularVTemTempoReal);
    document.getElementById('viagensDia').addEventListener('input', calcularVTemTempoReal);
    document.getElementById('diasUsadosVT').addEventListener('input', calcularVTemTempoReal);
    document.getElementById('valeTransporte').addEventListener('input', calcularVTemTempoReal);

    // Configura seleção de cores
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            colorOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Função para login com Google
    function signInWithGoogle() {
        auth.signInWithPopup(provider)
            .then(async (result) => {
                const user = result.user;
                
                if (result.additionalUserInfo.isNewUser) {
                    await db.collection('users').doc(user.uid).set({
                        name: user.displayName,
                        email: user.email,
                        photoURL: user.photoURL,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        settings: {
                            theme: 'dark',
                            accentColor: 'blue',
                            emailNotifications: true,
                            spendingAlerts: true
                        }
                    });
                }
                
                loginModal.style.display = 'none';
                appContainer.style.display = 'flex';
                updateUserUI(user);
                await loadFinancialData(user.uid);
            })
            .catch((error) => {
                showMessage(loginMessage, getFirebaseErrorMessage(error), 'error');
            });
    }

    // Função para logout
    function signOut() {
        calcularResumo()
            .then(() => auth.signOut())
            .catch(error => {
                console.error('Erro ao salvar dados antes de sair:', error);
                auth.signOut();
            });
    }

    // Função para atualizar a UI com os dados do usuário
    function updateUserUI(user) {
        if (user.photoURL) {
            userPhoto.src = user.photoURL;
            settingsUserPhoto.src = user.photoURL;
        } else {
            const defaultPhoto = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
            userPhoto.src = defaultPhoto;
            settingsUserPhoto.src = defaultPhoto;
        }
        
        userName.textContent = user.displayName || 'Usuário';
        userNameInput.value = user.displayName || '';
        userEmail.value = user.email || '';
    }

    // Função para salvar configurações
    async function saveSettings() {
        const user = auth.currentUser;
        if (!user) return;

        const settings = {
            theme: themeSelector.value,
            accentColor: document.querySelector('.color-option.active').dataset.color,
            emailNotifications: document.getElementById('emailNotifications').checked,
            spendingAlerts: document.getElementById('spendingAlerts').checked
        };

        try {
            await db.collection('users').doc(user.uid).update({
                settings: settings
            });
            
            applyTheme(settings.theme, settings.accentColor);
            showMessage(loginMessage, 'Configurações salvas com sucesso!', 'success');
        } catch (error) {
            showMessage(loginMessage, 'Erro ao salvar configurações: ' + error.message, 'error');
        }
    }

    // Observador de estado de autenticação
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            loginModal.style.display = 'none';
            appContainer.style.display = 'flex';
            updateUserUI(user);
            
            const userData = await loadUserData(user.uid);
            if (userData && userData.settings) {
                applySettings(userData.settings);
            }
            
            await loadFinancialData(user.uid);
            atualizarDiasUteis();
            calcularVTemTempoReal();
            updateSavedTabs();
        } else {
            loginModal.style.display = 'flex';
            appContainer.style.display = 'none';
        }
    });

    // Função para alternar a sidebar
    function toggleSidebar() {
        document.querySelector('.sidebar').classList.toggle('collapsed');
    }

    // Função para adicionar gasto
    function adicionarGasto(nome, valor) {
        const gastoDiv = document.createElement('div');
        gastoDiv.className = 'gasto-item';
        gastoDiv.innerHTML = `
            <input type="text" placeholder="Categoria" value="${nome}">
            <input type="number" step="0.01" placeholder="Valor" value="${valor}">
            <button type="button" class="removerGasto">×</button>
        `;
        listaGastos.appendChild(gastoDiv);
        
        gastoDiv.querySelector('.removerGasto').addEventListener('click', function() {
            if (listaGastos.children.length > 1) {
                listaGastos.removeChild(gastoDiv);
            } else {
                alert('Você precisa ter pelo menos um gasto cadastrado');
            }
        });
    }

    // Função para calcular dias úteis
    function calcularDiasUteis(mes, ano) {
        const primeiroDia = new Date(ano, mes, 1).getDay();
        let diasNoMes = new Date(ano, mes + 1, 0).getDate();
        let diasUteis = 0;

        for (let dia = 1; dia <= diasNoMes; dia++) {
            const diaSemana = (primeiroDia + dia - 1) % 7;
            if (diaSemana > 0 && diaSemana < 6) diasUteis++;
        }
        return diasUteis;
    }

    // Função para atualizar dias úteis
    function atualizarDiasUteis() {
        const mes = parseInt(mesSelect.value);
        const ano = parseInt(anoInput.value);
        const diasUteis = calcularDiasUteis(mes, ano);
        const diasNoMes = new Date(ano, mes + 1, 0).getDate();

        document.getElementById('totalDiasUteis').textContent = diasUteis;
        document.getElementById('diasNoMes').textContent = diasNoMes;
        document.getElementById('diasUsadosVT').max = diasUteis;
        document.getElementById('diasUsadosVT').value = diasUteis;
        
        calcularVTemTempoReal();
    }

    // Função para calcular VT em tempo real
    function calcularVTemTempoReal() {
        const valorPassagem = parseFloat(document.getElementById('valorPassagem').value) || 0;
        const viagensDia = parseInt(document.getElementById('viagensDia').value) || 0;
        const diasUsados = parseInt(document.getElementById('diasUsadosVT').value) || 0;
        const vtRecebido = parseFloat(document.getElementById('valeTransporte').value) || 0;

        const vtUtilizado = valorPassagem * viagensDia * diasUsados;
        const vtSaldo = vtRecebido - vtUtilizado;

        document.getElementById('vtUtilizadoDisplay').textContent = `R$ ${vtUtilizado.toFixed(2)}`;
        document.getElementById('vtRecebidoDisplay').textContent = `R$ ${vtRecebido.toFixed(2)}`;
        
        const saldoElement = document.getElementById('vtSaldoDisplay');
        saldoElement.textContent = `R$ ${vtSaldo.toFixed(2)}`;
        saldoElement.className = vtSaldo > 0 ? 'positive' : vtSaldo < 0 ? 'negative' : 'neutral';
    }

    // Função para carregar dados do usuário
    async function loadUserData(userId) {
        try {
            const doc = await db.collection('users').doc(userId).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            return null;
        }
    }

    // Função para carregar dados financeiros
    async function loadFinancialData(userId) {
        try {
            const doc = await db.collection('financialData').doc(userId).get();
            if (doc.exists) {
                const data = doc.data();
                
                if (data.salario) document.getElementById('salario').value = data.salario;
                if (data.outrasRendas) document.getElementById('outrasRendas').value = data.outrasRendas;
                if (data.valorPassagem) document.getElementById('valorPassagem').value = data.valorPassagem;
                if (data.viagensDia) document.getElementById('viagensDia').value = data.viagensDia;
                if (data.valeTransporte) document.getElementById('valeTransporte').value = data.valeTransporte;
                if (data.diasUsadosVT) document.getElementById('diasUsadosVT').value = data.diasUsadosVT;
                
                listaGastos.innerHTML = '';
                
                if (data.gastos && data.gastos.length > 0) {
                    data.gastos.forEach(gasto => {
                        adicionarGasto(gasto.nome, gasto.valor);
                    });
                } else {
                    adicionarGasto('Moradia', 521.66);
                    adicionarGasto('Alimentação', 130);
                    adicionarGasto('Transporte', 50);
                }
                
                return data;
            } else {
                adicionarGasto('Moradia', 521.66);
                adicionarGasto('Alimentação', 130);
                adicionarGasto('Transporte', 50);
                return null;
            }
        } catch (error) {
            console.error('Erro ao carregar dados financeiros:', error);
            return null;
        }
    }

    // Função para calcular resumo financeiro
    async function calcularResumo() {
        const mes = parseInt(mesSelect.value);
        const ano = parseInt(anoInput.value);
        const salario = parseFloat(document.getElementById('salario').value) || 0;
        const outrasRendas = parseFloat(document.getElementById('outrasRendas').value) || 0;
        const valorPassagem = parseFloat(document.getElementById('valorPassagem').value) || 0;
        const viagensDia = parseInt(document.getElementById('viagensDia').value) || 0;
        const diasUsadosVT = parseInt(document.getElementById('diasUsadosVT').value) || 0;
        const vtRecebido = parseFloat(document.getElementById('valeTransporte').value) || 0;

        const vtUtilizado = valorPassagem * viagensDia * diasUsadosVT;
        const vtEconomizado = vtRecebido - vtUtilizado;
        
        const gastosItens = Array.from(listaGastos.children).map(item => ({
            nome: item.querySelector('input[type="text"]').value || 'Gasto não nomeado',
            valor: parseFloat(item.querySelector('input[type="number"]').value) || 0
        }));
        
        const totalGastos = gastosItens.reduce((total, gasto) => total + gasto.valor, 0);
        const rendaTotal = salario + outrasRendas;
        const saldo = rendaTotal - totalGastos + vtEconomizado;

        const mesNome = mesSelect.options[mesSelect.selectedIndex].text;
        const resumoHTML = `
            <h3>${mesNome} ${ano}</h3>
            <p><strong>Renda Total:</strong> <span>R$ ${rendaTotal.toFixed(2)}</span></p>
            
            <h4>Gastos Fixos</h4>
            <p><strong>Total:</strong> <span>R$ ${totalGastos.toFixed(2)}</span></p>
            <ul class="lista-gastos">
                ${gastosItens.map(gasto => `
                    <li>${gasto.nome}: <span>R$ ${gasto.valor.toFixed(2)}</span></li>
                `).join('')}
            </ul>
            
            <h4>Vale Transporte</h4>
            <p><strong>Passagem:</strong> <span>R$ ${valorPassagem.toFixed(2)}</span></p>
            <p><strong>Viagens/dia:</strong> <span>${viagensDia}</span></p>
            <p><strong>Dias utilizados:</strong> <span>${diasUsadosVT}/${document.getElementById('totalDiasUteis').textContent}</span></p>
            <p><strong>VT utilizado:</strong> <span>R$ ${vtUtilizado.toFixed(2)}</span></p>
            <p><strong>VT recebido:</strong> <span>R$ ${vtRecebido.toFixed(2)}</span></p>
            <p><strong>Saldo VT:</strong> <span class="${vtEconomizado > 0 ? 'positive' : vtEconomizado < 0 ? 'negative' : 'neutral'}">R$ ${vtEconomizado.toFixed(2)}</span></p>
        `;

        document.getElementById('resumoMensal').innerHTML = resumoHTML;
        
        const saldoElement = document.getElementById('saldoDisponivel');
        saldoElement.textContent = `R$ ${saldo.toFixed(2)}`;
        saldoElement.className = saldo > 0 ? 'positive' : saldo < 0 ? 'negative' : 'neutral';
        
        document.getElementById('resultado').style.display = 'block';

        // Salva o cálculo no histórico local
        const calculationData = {
            id: Date.now(),
            mes: mesNome,
            ano: ano,
            html: resumoHTML,
            saldo: saldo,
            data: new Date().toLocaleString()
        };
        
        savedCalculations.push(calculationData);
        localStorage.setItem('savedCalculations', JSON.stringify(savedCalculations));
        updateSavedTabs();

        // Salva os dados financeiros no Firebase
        const user = auth.currentUser;
        if (user) {
            const financialData = {
                salario: salario,
                outrasRendas: outrasRendas,
                valorPassagem: valorPassagem,
                viagensDia: viagensDia,
                diasUsadosVT: diasUsadosVT,
                valeTransporte: vtRecebido,
                gastos: gastosItens,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            try {
                await db.collection('financialData').doc(user.uid).set(financialData);
                console.log('Dados financeiros salvos com sucesso!');
            } catch (error) {
                console.error('Erro ao salvar dados financeiros:', error);
            }
        }
    }

    // Função para atualizar abas salvas
    function updateSavedTabs() {
        tabsContainer.innerHTML = '';
        tabsContent.innerHTML = '';
        
        savedCalculations.forEach(calc => {
            const tab = document.createElement('div');
            tab.className = 'tab';
            tab.textContent = `${calc.mes} ${calc.ano}`;
            tab.dataset.id = calc.id;
            
            const closeBtn = document.createElement('span');
            closeBtn.className = 'tab-close';
            closeBtn.innerHTML = '×';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeTab(calc.id);
            });
            tab.appendChild(closeBtn);
            
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.querySelector(`.tab-content[data-id="${calc.id}"]`).classList.add('active');
            });
            
            tabsContainer.appendChild(tab);
            
            const content = document.createElement('div');
            content.className = 'tab-content';
            content.dataset.id = calc.id;
            content.innerHTML = calc.html;
            
            const saldoDiv = document.createElement('div');
            saldoDiv.className = 'saldo-final';
            saldoDiv.innerHTML = `
                <span>Saldo Disponível:</span>
                <span class="${calc.saldo > 0 ? 'positive' : calc.saldo < 0 ? 'negative' : 'neutral'}">R$ ${calc.saldo.toFixed(2)}</span>
            `;
            content.appendChild(saldoDiv);
            
            tabsContent.appendChild(content);
        });
        
        if (savedCalculations.length > 0) {
            const lastTab = tabsContainer.lastChild;
            const lastContent = tabsContent.lastChild;
            lastTab.classList.add('active');
            lastContent.classList.add('active');
        }
    }

    // Função para remover aba
    function removeTab(id) {
        savedCalculations = savedCalculations.filter(calc => calc.id !== id);
        localStorage.setItem('savedCalculations', JSON.stringify(savedCalculations));
        updateSavedTabs();
    }

    // Função para aplicar tema
    function applyTheme(theme, accentColor) {
        console.log('Tema aplicado:', theme, 'Cor de destaque:', accentColor);
        // Implementação real dependeria da sua lógica de temas
    }

    // Função para aplicar configurações
    function applySettings(settings) {
        if (!settings) return;
        
        themeSelector.value = settings.theme || 'dark';
        
        document.getElementById('emailNotifications').checked = settings.emailNotifications !== false;
        document.getElementById('spendingAlerts').checked = settings.spendingAlerts !== false;
        
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.color === (settings.accentColor || 'blue')) {
                option.classList.add('active');
            }
        });
    }

    // Função para mostrar mensagens
    function showMessage(element, message, type) {
        element.textContent = message;
        element.className = `message ${type}`;
        setTimeout(() => {
            element.textContent = '';
            element.className = 'message';
        }, 5000);
    }

    // Função para obter mensagem de erro do Firebase
    function getFirebaseErrorMessage(error) {
        switch (error.code) {
            case 'auth/popup-closed-by-user':
                return 'O popup de login foi fechado antes de concluir';
            case 'auth/cancelled-popup-request':
                return 'Outra solicitação de popup já está em andamento';
            case 'auth/popup-blocked':
                return 'O popup de login foi bloqueado pelo navegador';
            default:
                return 'Erro ao fazer login: ' + error.message;
        }
    }

    // Inicializa a aplicação
    if (auth.currentUser) {
        loginModal.style.display = 'none';
        appContainer.style.display = 'flex';
        updateUserUI(auth.currentUser);
        loadUserData(auth.currentUser.uid);
        loadFinancialData(auth.currentUser.uid);
    } else {
        loginModal.style.display = 'flex';
        appContainer.style.display = 'none';
    }

    // Inicializa cálculos
    atualizarDiasUteis();
});
