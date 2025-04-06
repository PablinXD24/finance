document.addEventListener('DOMContentLoaded', function() {
    // Elementos principais
    const mesSelect = document.getElementById('mesSelecionado');
    const anoInput = document.getElementById('anoSelecionado');
    const listaGastos = document.getElementById('listaGastos');
    const addGastoBtn = document.getElementById('addGasto');
    const calcularBtn = document.getElementById('calcularBtn');
    
    // Configurar data atual
    const dataAtual = new Date();
    mesSelect.value = dataAtual.getMonth();
    anoInput.value = dataAtual.getFullYear();
    
    // Adicionar gastos iniciais
    adicionarGasto('Moradia', 521.66);
    adicionarGasto('Alimentação', 130);
    adicionarGasto('Transporte', 50);
    
    // Event listeners
    addGastoBtn.addEventListener('click', () => adicionarGasto('', 0));
    calcularBtn.addEventListener('click', calcularResumo);
    mesSelect.addEventListener('change', atualizarDiasUteis);
    anoInput.addEventListener('change', atualizarDiasUteis);
    
    // Event listeners para cálculo em tempo real do VT
    document.getElementById('valorPassagem').addEventListener('input', calcularVTemTempoReal);
    document.getElementById('viagensDia').addEventListener('input', calcularVTemTempoReal);
    document.getElementById('diasUsadosVT').addEventListener('input', calcularVTemTempoReal);
    document.getElementById('valeTransporte').addEventListener('input', calcularVTemTempoReal);
    
    // Inicializar
    atualizarDiasUteis();
    calcularVTemTempoReal();
    
    function adicionarGasto(nome, valor) {
        const gastoDiv = document.createElement('div');
        gastoDiv.className = 'gasto-item';
        
        gastoDiv.innerHTML = `
            <input type="text" placeholder="Categoria" value="${nome}">
            <input type="number" step="0.01" placeholder="Valor" value="${valor}">
            <button type="button" class="removerGasto">×</button>
        `;
        
        listaGastos.appendChild(gastoDiv);
        
        // Adicionar evento de remoção
        gastoDiv.querySelector('.removerGasto').addEventListener('click', function() {
            if (listaGastos.children.length > 1) {
                listaGastos.removeChild(gastoDiv);
            } else {
                alert('Você precisa ter pelo menos um gasto cadastrado');
            }
        });
    }
    
    function atualizarDiasUteis() {
        const mes = parseInt(mesSelect.value);
        const ano = parseInt(anoInput.value);
        const diasUteis = calcularDiasUteis(mes, ano);
        
        document.getElementById('totalDiasUteis').textContent = diasUteis;
        document.getElementById('diasUsadosVT').max = diasUteis;
        document.getElementById('diasUsadosVT').value = diasUteis;
        
        // Recalcular VT
        calcularVTemTempoReal();
    }
    
    function calcularDiasUteis(mes, ano) {
        let diasUteis = 0;
        const diasNoMes = new Date(ano, mes + 1, 0).getDate();
        
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const data = new Date(ano, mes, dia);
            if (data.getDay() > 0 && data.getDay() < 6) { // Segunda a sexta
                diasUteis++;
            }
        }
        
        return diasUteis;
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
        
        // Aplicar classe de cor baseada no saldo
        saldoElement.className = '';
        if (vtSaldo > 0) {
            saldoElement.classList.add('positive');
        } else if (vtSaldo < 0) {
            saldoElement.classList.add('negative');
        } else {
            saldoElement.classList.add('neutral');
        }
    }
    
    function calcularResumo() {
        // Obter valores básicos
        const mes = parseInt(mesSelect.value);
        const ano = parseInt(anoInput.value);
        const salario = parseFloat(document.getElementById('salario').value) || 0;
        const outrasRendas = parseFloat(document.getElementById('outrasRendas').value) || 0;
        
        // Obter dados do VT
        const valorPassagem = parseFloat(document.getElementById('valorPassagem').value) || 0;
        const viagensDia = parseInt(document.getElementById('viagensDia').value) || 0;
        const diasUsadosVT = parseInt(document.getElementById('diasUsadosVT').value) || 0;
        const vtRecebido = parseFloat(document.getElementById('valeTransporte').value) || 0;
        
        // Calcular VT
        const vtUtilizado = valorPassagem * viagensDia * diasUsadosVT;
        const vtEconomizado = vtRecebido - vtUtilizado;
        
        // Calcular total de gastos
        const gastosItens = Array.from(listaGastos.children).map(item => {
            const nome = item.querySelector('input[type="text"]').value || 'Gasto não nomeado';
            const valor = parseFloat(item.querySelector('input[type="number"]').value) || 0;
            return { nome, valor };
        });
        
        const totalGastos = gastosItens.reduce((total, gasto) => total + gasto.valor, 0);
        
        // Calcular saldo
        const rendaTotal = salario + outrasRendas;
        const saldo = rendaTotal - totalGastos + vtEconomizado;
        
        // Exibir resultados
        const mesNome = mesSelect.options[mesSelect.selectedIndex].text;
        let resumoHTML = `
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
        saldoElement.className = '';
        
        if (saldo > 0) {
            saldoElement.classList.add('positive');
        } else if (saldo < 0) {
            saldoElement.classList.add('negative');
        } else {
            saldoElement.classList.add('neutral');
        }
        
        // Mostrar resultado
        document.getElementById('resultado').style.display = 'block';
    }
});
