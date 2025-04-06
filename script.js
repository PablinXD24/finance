document.addEventListener('DOMContentLoaded', function() {
    // Elementos principais
    const mesSelect = document.getElementById('mesSelecionado');
    const anoInput = document.getElementById('anoSelecionado');
    const listaGastos = document.getElementById('listaGastos');
    const addGastoBtn = document.getElementById('addGasto');
    const calcularBtn = document.getElementById('calcularBtn');

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

    // Cálculo VT em tempo real
    document.getElementById('valorPassagem').addEventListener('input', calcularVTemTempoReal);
    document.getElementById('viagensDia').addEventListener('input', calcularVTemTempoReal);
    document.getElementById('diasUsadosVT').addEventListener('input', calcularVTemTempoReal);
    document.getElementById('valeTransporte').addEventListener('input', calcularVTemTempoReal);

    // Inicializa
    atualizarDiasUteis();
    calcularVTemTempoReal();

    // Funções
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

    function isAnoBissexto(ano) {
        return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
    }

    function calcularDiasUteis(mes, ano) {
        const primeiroDia = new Date(ano, mes, 1).getDay(); // 0=Domingo, 1=Segunda...
        let diasNoMes = new Date(ano, mes + 1, 0).getDate();
        let diasUteis = 0;

        for (let dia = 1; dia <= diasNoMes; dia++) {
            const diaSemana = (primeiroDia + dia - 1) % 7;
            if (diaSemana > 0 && diaSemana < 6) diasUteis++; // Segunda a Sexta
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
        document.getElementById('resumoMensal').innerHTML = `
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

        const saldoElement = document.getElementById('saldoDisponivel');
        saldoElement.textContent = `R$ ${saldo.toFixed(2)}`;
        saldoElement.className = saldo > 0 ? 'positive' : saldo < 0 ? 'negative' : 'neutral';
        
        document.getElementById('resultado').style.display = 'block';
    }
});
