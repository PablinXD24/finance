document.addEventListener('DOMContentLoaded', function() {
    // Elementos da sidebar e navegação
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const menuItems = document.querySelectorAll('.menu-item');
    const pages = document.querySelectorAll('.page');

    // Elementos financeiros
    const mesSelect = document.getElementById('mesSelecionado');
    const anoInput = document.getElementById('anoSelecionado');
    const listaGastos = document.getElementById('listaGastos');
    const addGastoBtn = document.getElementById('addGasto');
    const calcularBtn = document.getElementById('calcularBtn');
    const tabsContainer = document.getElementById('tabsContainer');
    const tabsContent = document.getElementById('tabsContent');
    
    let savedCalculations = JSON.parse(localStorage.getItem('savedCalculations')) || [];

    // Configura data atual
    const hoje = new Date();
    mesSelect.value = hoje.getMonth();
    anoInput.value = hoje.getFullYear();

    // Adiciona gastos iniciais
    adicionarGasto('Moradia', 521.66);
    adicionarGasto('Alimentação', 130);
    adicionarGasto('Transporte', 50);

    // Event listeners
    addGastoBtn.addEventListener('click', () => adicionarGasto('', 0));
    calcularBtn.addEventListener('click', calcularResumo);
    mesSelect.addEventListener('change', atualizarDiasUteis);
    anoInput.addEventListener('change', atualizarDiasUteis);
    sidebarToggle.addEventListener('click', toggleSidebar);

    // Cálculo VT em tempo real
    document.getElementById('valorPassagem').addEventListener('input', calcularVTemTempoReal);
    document.getElementById('viagensDia').addEventListener('input', calcularVTemTempoReal);
    document.getElementById('diasUsadosVT').addEventListener('input', calcularVTemTempoReal);
    document.getElementById('valeTransporte').addEventListener('input', calcularVTemTempoReal);

    // Navegação entre páginas
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            
            // Remove a classe active de todos os itens do menu
            menuItems.forEach(i => i.parentElement.classList.remove('active'));
            // Adiciona a classe active apenas no item clicado
            this.parentElement.classList.add('active');
            
            // Esconde todas as páginas
            pages.forEach(page => page.classList.remove('active'));
            
            // Mostra a página correspondente
            document.getElementById(pageId).classList.add('active');
        });
    });

    // Inicializa
    atualizarDiasUteis();
    calcularVTemTempoReal();
    updateSavedTabs();

    // Funções
    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
    }

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

    function calcularResumo() {
        const mes = parseInt(mesSelect.value);
        const ano = parseInt(anoInput.value);
        const salario = parseFloat(document.getElementById('salario').value) || 0;
        const outrasRendas = parseFloat(document.getElementById('outrasRendas').value) || 0;
        const valorPassagem = parseFloat(document.getElementById('valorPassagem').value) || 0;
        const viagensDia = parseInt(document.getElementById('viagensDia').value) || 0;
        const diasUsadosVT = parseInt(document.getElementById('diasUsadosVT').value) || 0;
        const vtRecebido = parseFloat(document.getElementById('valeTransporte').value) || 0;

        // Cálculos
        const vtUtilizado = valorPassagem * viagensDia * diasUsadosVT;
        const vtEconomizado = vtRecebido - vtUtilizado;
        
        const gastosItens = Array.from(listaGastos.children).map(item => ({
            nome: item.querySelector('input[type="text"]').value || 'Gasto não nomeado',
            valor: parseFloat(item.querySelector('input[type="number"]').value) || 0
        }));
        
        const totalGastos = gastosItens.reduce((total, gasto) => total + gasto.valor, 0);
        const rendaTotal = salario + outrasRendas;
        const saldo = rendaTotal - totalGastos + vtEconomizado;

        // Exibe resultados
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

        // Salva o cálculo
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
    }

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

    function removeTab(id) {
        savedCalculations = savedCalculations.filter(calc => calc.id !== id);
        localStorage.setItem('savedCalculations', JSON.stringify(savedCalculations));
        updateSavedTabs();
    }
});
