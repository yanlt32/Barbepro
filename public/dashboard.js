// Variáveis globais
let dados = { 
    Gabriel: [], 
    Wagner: [], 
    despesas: [],
    mensalistas: []
};

let config = { 
    pin: '1234', 
    whatsapp: '974065186', 
    corte: 28, 
    barba: 15, 
    combo: 40 
};

let graficoPizza = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    carregarDados();
    atualizarDashboard();
    
    const hoje = new Date();
    const umaSemanaAtras = new Date();
    umaSemanaAtras.setDate(hoje.getDate() - 7);
    
    document.getElementById('dataInicio').value = umaSemanaAtras.toISOString().split('T')[0];
    document.getElementById('dataFim').value = hoje.toISOString().split('T')[0];
    
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    document.getElementById('dataInicioPagamentos').value = primeiroDiaMes.toISOString().split('T')[0];
    document.getElementById('dataFimPagamentos').value = hoje.toISOString().split('T')[0];
    
    document.getElementById('dataInicioMensalistas').value = primeiroDiaMes.toISOString().split('T')[0];
    document.getElementById('dataFimMensalistas').value = hoje.toISOString().split('T')[0];
});

// Funções principais ATUALIZADAS
async function carregarDados() {
    try {
        const response = await fetch('/api/data');
        const result = await response.json();
        if (result.success) {
            Object.assign(dados, result.data);
            if (result.data.config) Object.assign(config, result.data.config);
            atualizarDashboard();
        }
    } catch (error) {
        console.log('Usando dados locais');
        const salvo = localStorage.getItem('barbapro_duo');
        if (salvo) {
            const temp = JSON.parse(salvo);
            Object.assign(dados, temp);
            if (temp.config) Object.assign(config, temp.config);
        }
    }
}

async function salvarDados() {
    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { ...dados, config } })
        });
        
        if (!response.ok) {
            throw new Error('Falha ao salvar no servidor');
        }
    } catch (error) {
        console.log('Salvando localmente');
        localStorage.setItem('barbapro_duo', JSON.stringify({ ...dados, config }));
    }
}

function atualizarDashboard() {
    atualizarEstatisticasBarbeiros();
    atualizarEstatisticasGerais();
    atualizarResumoPagamentos();
    atualizarComparacaoBarbeiros();
    atualizarServicosPorTipo();
    atualizarListaServicosRecentes();
    atualizarListaDespesas();
    atualizarListaMensalistas();
    atualizarGraficoPizza();
}

function atualizarEstatisticasBarbeiros() {
    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    
    // Gabriel - HOJE
    const servicosGabrielHoje = dados.Gabriel.filter(s => s.data === hoje);
    const totalGabrielHoje = servicosGabrielHoje.reduce((acc, s) => acc + s.valor, 0);
    const fiadoGabrielHoje = servicosGabrielHoje.reduce((acc, s) => acc + (!s.pago ? s.valor : 0), 0);
    
    // Gabriel - MÊS
    const servicosGabrielMes = dados.Gabriel.filter(s => {
        const dataServico = new Date(s.data);
        return dataServico.getMonth() === mesAtual && dataServico.getFullYear() === anoAtual;
    });
    
    const totalGabrielMes = servicosGabrielMes.reduce((acc, s) => acc + s.valor, 0);
    const fiadoGabrielMes = servicosGabrielMes.reduce((acc, s) => acc + (!s.pago ? s.valor : 0), 0);
    
    // Atualizar Gabriel
    document.getElementById('gabrielHoje').textContent = servicosGabrielHoje.length;
    document.getElementById('gabrielTotalHoje').textContent = totalGabrielHoje.toFixed(2);
    document.getElementById('gabrielFiadoHoje').textContent = fiadoGabrielHoje.toFixed(2);
    document.getElementById('gabrielMes').textContent = servicosGabrielMes.length;
    document.getElementById('gabrielTotalMes').textContent = totalGabrielMes.toFixed(2);
    document.getElementById('gabrielFiadoMes').textContent = fiadoGabrielMes.toFixed(2);
    
    // Wagner - HOJE
    const servicosWagnerHoje = dados.Wagner.filter(s => s.data === hoje);
    const totalWagnerHoje = servicosWagnerHoje.reduce((acc, s) => acc + s.valor, 0);
    const fiadoWagnerHoje = servicosWagnerHoje.reduce((acc, s) => acc + (!s.pago ? s.valor : 0), 0);
    
    // Wagner - MÊS
    const servicosWagnerMes = dados.Wagner.filter(s => {
        const dataServico = new Date(s.data);
        return dataServico.getMonth() === mesAtual && dataServico.getFullYear() === anoAtual;
    });
    
    const totalWagnerMes = servicosWagnerMes.reduce((acc, s) => acc + s.valor, 0);
    const fiadoWagnerMes = servicosWagnerMes.reduce((acc, s) => acc + (!s.pago ? s.valor : 0), 0);
    
    // Atualizar Wagner
    document.getElementById('wagnerHoje').textContent = servicosWagnerHoje.length;
    document.getElementById('wagnerTotalHoje').textContent = totalWagnerHoje.toFixed(2);
    document.getElementById('wagnerFiadoHoje').textContent = fiadoWagnerHoje.toFixed(2);
    document.getElementById('wagnerMes').textContent = servicosWagnerMes.length;
    document.getElementById('wagnerTotalMes').textContent = totalWagnerMes.toFixed(2);
    document.getElementById('wagnerFiadoMes').textContent = fiadoWagnerMes.toFixed(2);
}

function atualizarEstatisticasGerais() {
    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    
    // Hoje
    const servicosGabrielHoje = dados.Gabriel.filter(s => s.data === hoje);
    const servicosWagnerHoje = dados.Wagner.filter(s => s.data === hoje);
    
    const totalPagoGabriel = servicosGabrielHoje.reduce((acc, s) => acc + (s.pago ? s.valor : 0), 0);
    const totalPagoWagner = servicosWagnerHoje.reduce((acc, s) => acc + (s.pago ? s.valor : 0), 0);
    const totalFiadoGabriel = servicosGabrielHoje.reduce((acc, s) => acc + (!s.pago ? s.valor : 0), 0);
    const totalFiadoWagner = servicosWagnerHoje.reduce((acc, s) => acc + (!s.pago ? s.valor : 0), 0);
    
    const totalHoje = totalPagoGabriel + totalPagoWagner;
    const totalServicosHoje = servicosGabrielHoje.length + servicosWagnerHoje.length;
    const totalFiadoHoje = totalFiadoGabriel + totalFiadoWagner;
    
    // Mês
    const servicosGabrielMes = dados.Gabriel.filter(s => {
        const dataServico = new Date(s.data);
        return dataServico.getMonth() === mesAtual && dataServico.getFullYear() === anoAtual;
    });
    
    const servicosWagnerMes = dados.Wagner.filter(s => {
        const dataServico = new Date(s.data);
        return dataServico.getMonth() === mesAtual && dataServico.getFullYear() === anoAtual;
    });
    
    const despesasMes = dados.despesas.filter(d => {
        const dataDespesa = new Date(d.data);
        return dataDespesa.getMonth() === mesAtual && dataDespesa.getFullYear() === anoAtual;
    }).reduce((acc, d) => acc + d.valor, 0);
    
    document.getElementById('totalHoje').textContent = `R$ ${totalHoje.toFixed(2)}`;
    document.getElementById('servicosHoje').textContent = totalServicosHoje;
    document.getElementById('fiadoHoje').textContent = `R$ ${totalFiadoHoje.toFixed(2)}`;
    document.getElementById('despesasMes').textContent = `R$ ${despesasMes.toFixed(2)}`;
}

function atualizarResumoPagamentos() {
    const hoje = new Date().toISOString().split('T')[0];
    const todosServicosHoje = [
        ...dados.Gabriel.filter(s => s.data === hoje && s.pago),
        ...dados.Wagner.filter(s => s.data === hoje && s.pago)
    ];
    
    const totalDinheiro = todosServicosHoje
        .filter(s => s.metodoPagamento === 'dinheiro')
        .reduce((acc, s) => acc + s.valor, 0);
    
    const totalPix = todosServicosHoje
        .filter(s => s.metodoPagamento === 'pix')
        .reduce((acc, s) => acc + s.valor, 0);
    
    const totalDebito = todosServicosHoje
        .filter(s => s.metodoPagamento === 'debito')
        .reduce((acc, s) => acc + s.valor, 0);
    
    const totalCredito = todosServicosHoje
        .filter(s => s.metodoPagamento === 'credito')
        .reduce((acc, s) => acc + s.valor, 0);
    
    document.getElementById('totalDinheiro').textContent = `R$ ${totalDinheiro.toFixed(2)}`;
    document.getElementById('totalPix').textContent = `R$ ${totalPix.toFixed(2)}`;
    document.getElementById('totalDebito').textContent = `R$ ${totalDebito.toFixed(2)}`;
    document.getElementById('totalCredito').textContent = `R$ ${totalCredito.toFixed(2)}`;
}

function atualizarComparacaoBarbeiros() {
    const hoje = new Date().toISOString().split('T')[0];
    const servicosGabriel = dados.Gabriel.filter(s => s.data === hoje && s.pago);
    const servicosWagner = dados.Wagner.filter(s => s.data === hoje && s.pago);
    
    const gabrielMetodos = {
        dinheiro: servicosGabriel.filter(s => s.metodoPagamento === 'dinheiro').reduce((acc, s) => acc + s.valor, 0),
        pix: servicosGabriel.filter(s => s.metodoPagamento === 'pix').reduce((acc, s) => acc + s.valor, 0),
        debito: servicosGabriel.filter(s => s.metodoPagamento === 'debito').reduce((acc, s) => acc + s.valor, 0),
        credito: servicosGabriel.filter(s => s.metodoPagamento === 'credito').reduce((acc, s) => acc + s.valor, 0)
    };
    
    const wagnerMetodos = {
        dinheiro: servicosWagner.filter(s => s.metodoPagamento === 'dinheiro').reduce((acc, s) => acc + s.valor, 0),
        pix: servicosWagner.filter(s => s.metodoPagamento === 'pix').reduce((acc, s) => acc + s.valor, 0),
        debito: servicosWagner.filter(s => s.metodoPagamento === 'debito').reduce((acc, s) => acc + s.valor, 0),
        credito: servicosWagner.filter(s => s.metodoPagamento === 'credito').reduce((acc, s) => acc + s.valor, 0)
    };
    
    const container = document.getElementById('comparacaoBarbeiros');
    
    let html = `
        <div class="barbeiro-metodos">
            <div class="barbeiro-metodos-nome">GABRIEL</div>
            <div class="metodo-item">
                <div class="metodo-info">
                    <span>💵</span>
                    <span>Dinheiro:</span>
                </div>
                <div class="metodo-valor">R$ ${gabrielMetodos.dinheiro.toFixed(2)}</div>
            </div>
            <div class="metodo-item">
                <div class="metodo-info">
                    <span>📱</span>
                    <span>PIX:</span>
                </div>
                <div class="metodo-valor">R$ ${gabrielMetodos.pix.toFixed(2)}</div>
            </div>
            <div class="metodo-item">
                <div class="metodo-info">
                    <span>💳</span>
                    <span>Débito:</span>
                </div>
                <div class="metodo-valor">R$ ${gabrielMetodos.debito.toFixed(2)}</div>
            </div>
            <div class="metodo-item">
                <div class="metodo-info">
                    <span>💳</span>
                    <span>Crédito:</span>
                </div>
                <div class="metodo-valor">R$ ${gabrielMetodos.credito.toFixed(2)}</div>
            </div>
            <div class="metodo-item" style="margin-top:10px; padding-top:10px; border-top:2px solid #ffaa00;">
                <div class="metodo-info">
                    <span>💰</span>
                    <span style="font-weight:600;">TOTAL:</span>
                </div>
                <div class="metodo-valor" style="color:#25D366;">R$ ${(gabrielMetodos.dinheiro + gabrielMetodos.pix + gabrielMetodos.debito + gabrielMetodos.credito).toFixed(2)}</div>
            </div>
        </div>
        
        <div class="barbeiro-metodos">
            <div class="barbeiro-metodos-nome">WAGNER</div>
            <div class="metodo-item">
                <div class="metodo-info">
                    <span>💵</span>
                    <span>Dinheiro:</span>
                </div>
                <div class="metodo-valor">R$ ${wagnerMetodos.dinheiro.toFixed(2)}</div>
            </div>
            <div class="metodo-item">
                <div class="metodo-info">
                    <span>📱</span>
                    <span>PIX:</span>
                </div>
                <div class="metodo-valor">R$ ${wagnerMetodos.pix.toFixed(2)}</div>
            </div>
            <div class="metodo-item">
                <div class="metodo-info">
                    <span>💳</span>
                    <span>Débito:</span>
                </div>
                <div class="metodo-valor">R$ ${wagnerMetodos.debito.toFixed(2)}</div>
            </div>
            <div class="metodo-item">
                <div class="metodo-info">
                    <span>💳</span>
                    <span>Crédito:</span>
                </div>
                <div class="metodo-valor">R$ ${wagnerMetodos.credito.toFixed(2)}</div>
            </div>
            <div class="metodo-item" style="margin-top:10px; padding-top:10px; border-top:2px solid #ffaa00;">
                <div class="metodo-info">
                    <span>💰</span>
                    <span style="font-weight:600;">TOTAL:</span>
                </div>
                <div class="metodo-valor" style="color:#25D366;">R$ ${(wagnerMetodos.dinheiro + wagnerMetodos.pix + wagnerMetodos.debito + wagnerMetodos.credito).toFixed(2)}</div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function atualizarServicosPorTipo() {
    const hoje = new Date().toISOString().split('T')[0];
    const todosServicosHoje = [
        ...dados.Gabriel.filter(s => s.data === hoje),
        ...dados.Wagner.filter(s => s.data === hoje)
    ];
    
    const servicosPorTipo = {};
    
    todosServicosHoje.forEach(servico => {
        if (!servicosPorTipo[servico.tipo]) {
            servicosPorTipo[servico.tipo] = {
                total: 0,
                dinheiro: 0,
                pix: 0,
                debito: 0,
                credito: 0,
                fiado: 0,
                count: 0
            };
        }
        
        servicosPorTipo[servico.tipo].total += servico.valor;
        servicosPorTipo[servico.tipo].count += 1;
        
        if (!servico.pago) {
            servicosPorTipo[servico.tipo].fiado += servico.valor;
        } else {
            switch(servico.metodoPagamento) {
                case 'dinheiro':
                    servicosPorTipo[servico.tipo].dinheiro += servico.valor;
                    break;
                case 'pix':
                    servicosPorTipo[servico.tipo].pix += servico.valor;
                    break;
                case 'debito':
                    servicosPorTipo[servico.tipo].debito += servico.valor;
                    break;
                case 'credito':
                    servicosPorTipo[servico.tipo].credito += servico.valor;
                    break;
            }
        }
    });
    
    const container = document.getElementById('servicosPorTipo');
    let html = '';
    
    Object.entries(servicosPorTipo).forEach(([tipo, dados]) => {
        html += `
            <div class="servico-resumo-item">
                <div class="servico-resumo-tipo">${tipo}</div>
                <div class="servico-resumo-detalhes">
                    <div>Total: R$ ${dados.total.toFixed(2)}</div>
                    <div>Qtd: ${dados.count}</div>
                    ${dados.dinheiro > 0 ? `<div>💵: R$ ${dados.dinheiro.toFixed(2)}</div>` : ''}
                    ${dados.pix > 0 ? `<div>📱: R$ ${dados.pix.toFixed(2)}</div>` : ''}
                    ${dados.debito > 0 ? `<div>💳: R$ ${dados.debito.toFixed(2)}</div>` : ''}
                    ${dados.credito > 0 ? `<div>💳: R$ ${dados.credito.toFixed(2)}</div>` : ''}
                    ${dados.fiado > 0 ? `<div>⏰: R$ ${dados.fiado.toFixed(2)}</div>` : ''}
                </div>
            </div>
        `;
    });
    
    if (html === '') {
        html = '<p style="text-align:center;color:#666;grid-column:1/-1;">Nenhum serviço registrado hoje</p>';
    }
    
    container.innerHTML = html;
}

function atualizarListaServicosRecentes() {
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;
    
    const container = document.getElementById('listaServicosRecentes');
    
    const todosServicos = [...dados.Gabriel, ...dados.Wagner];
    const servicosFiltrados = todosServicos.filter(s => {
        return s.data >= dataInicio && s.data <= dataFim;
    });
    
    servicosFiltrados.sort((a, b) => new Date(b.data + ' ' + b.hora) - new Date(a.data + ' ' + a.hora));
    
    if (servicosFiltrados.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;padding:30px;">Nenhum serviço encontrado no período selecionado</p>';
        return;
    }
    
    let html = `
        <table>
            <tr>
                <th>Data</th>
                <th>Barbeiro</th>
                <th>Serviço</th>
                <th>Valor</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th>Ação</th>
            </tr>
    `;
    
    servicosFiltrados.forEach((servico, index) => {
        const barbeiro = dados.Gabriel.includes(servico) ? 'Gabriel' : 'Wagner';
        const status = servico.pago ? 'PAGO' : 'FIADO';
        const statusClass = servico.pago ? 'servico-pago' : 'servico-fiado';
        
        let metodoIcon = '';
        switch(servico.metodoPagamento) {
            case 'dinheiro': metodoIcon = '💵'; break;
            case 'pix': metodoIcon = '📱'; break;
            case 'debito': metodoIcon = '💳'; break;
            case 'credito': metodoIcon = '💳'; break;
            default: metodoIcon = '⚫';
        }
        
        html += `
            <tr>
                <td>${servico.data}</td>
                <td>${barbeiro}</td>
                <td>${servico.tipo}</td>
                <td>R$ ${servico.valor.toFixed(2)}</td>
                <td>${metodoIcon}</td>
                <td class="${statusClass}">${status}</td>
                <td>
                    <button class="action-btn" onclick="excluirServico('${barbeiro}', ${index})">×</button>
                </td>
            </tr>
        `;
    });
    
    html += '</table>';
    container.innerHTML = html;
}

function filtrarServicos() {
    atualizarListaServicosRecentes();
}

async function excluirServico(barbeiro, index) {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
        const servicosFiltrados = [...dados[barbeiro]];
        const servicoParaExcluir = servicosFiltrados[index];
        
        const indexOriginal = dados[barbeiro].findIndex(s => 
            s.data === servicoParaExcluir.data && 
            s.hora === servicoParaExcluir.hora && 
            s.tipo === servicoParaExcluir.tipo &&
            s.valor === servicoParaExcluir.valor
        );
        
        if (indexOriginal !== -1) {
            dados[barbeiro].splice(indexOriginal, 1);
            await salvarDados();
            atualizarListaServicosRecentes();
            atualizarDashboard();
            alert('Serviço excluído com sucesso!');
        }
    }
}

function atualizarListaDespesas() {
    const container = document.getElementById('listaDespesasDashboard');
    
    if (dados.despesas.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;padding:30px;">Nenhuma despesa registrada</p>';
        return;
    }
    
    const despesasOrdenadas = [...dados.despesas].sort((a, b) => new Date(b.data) - new Date(a.data));
    
    let html = '';
    
    despesasOrdenadas.forEach(despesa => {
        html += `
            <div class="despesa-item">
                <div>
                    <div style="font-weight:600;">${despesa.desc}</div>
                    <div style="font-size:12px;color:#aaa;">${despesa.data}</div>
                </div>
                <div class="despesa-valor">R$ ${despesa.valor.toFixed(2)}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function atualizarListaMensalistas() {
    const container = document.getElementById('listaMensalistas');
    
    if (dados.mensalistas.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;padding:30px;">Nenhum mensalista cadastrado</p>';
        return;
    }
    
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    const mensalistasMes = dados.mensalistas.filter(m => {
        const dataMensalista = new Date(m.dataInicio);
        return dataMensalista.getMonth() === mesAtual && dataMensalista.getFullYear() === anoAtual;
    });
    
    if (mensalistasMes.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;padding:30px;">Nenhum mensalista ativo este mês</p>';
        return;
    }
    
    let html = '';
    
    mensalistasMes.forEach((mensalista, index) => {
        const statusClass = mensalista.status === 'pago' ? 'status-pago' : 'status-pendente';
        const statusText = mensalista.status === 'pago' ? 'PAGO' : 'PENDENTE';
        
        html += `
            <div class="mensalista-card">
                <div class="mensalista-header">
                    <div class="mensalista-nome">${mensalista.nome}</div>
                    <div class="mensalista-status ${statusClass}">${statusText}</div>
                </div>
                <div class="mensalista-detalhes">
                    <div>Barbeiro: <span style="color:#ffaa00;">${mensalista.barbeiro || 'N/A'}</span></div>
                    <div>Valor: <span class="mensalista-valor">R$ ${mensalista.valor.toFixed(2)}</span></div>
                    <div>Vencimento: dia ${mensalista.vencimento}</div>
                    <div>Início: ${formatarDataBrasileira(mensalista.dataInicio)}</div>
                    <div>Status: ${mensalista.status === 'pago' ? '✅ Pago' : '⏳ Pendente'}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function atualizarGraficoPizza() {
    const ctx = document.getElementById('graficoPizza').getContext('2d');
    
    if (graficoPizza) {
        graficoPizza.destroy();
    }
    
    const hoje = new Date().toISOString().split('T')[0];
    const servicosGabriel = dados.Gabriel.filter(s => s.data === hoje);
    const servicosWagner = dados.Wagner.filter(s => s.data === hoje);
    
    const totalGabriel = servicosGabriel.reduce((acc, s) => acc + s.valor, 0);
    const totalWagner = servicosWagner.reduce((acc, s) => acc + s.valor, 0);
    const totalFiado = servicosGabriel.reduce((acc, s) => acc + (!s.pago ? s.valor : 0), 0) + 
                       servicosWagner.reduce((acc, s) => acc + (!s.pago ? s.valor : 0), 0);
    
    graficoPizza = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Gabriel', 'Wagner', 'Fiado'],
            datasets: [{
                data: [totalGabriel, totalWagner, totalFiado],
                backgroundColor: ['#ffaa00', '#3366ff', '#ff3366'],
                borderColor: '#0a0a0a',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#fff', font: { size: 14 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: R$ ${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Funções de navegação
function voltarParaRegistro() {
    window.location.href = '/';
}

// Funções de modais
function abrirModalResumo() {
    document.getElementById('modalResumo').style.display = 'flex';
    exibirResumoCompleto();
}

function exibirResumoCompleto() {
    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    
    // Gabriel - HOJE
    const servicosGabrielHoje = dados.Gabriel.filter(s => s.data === hoje);
    const totalGabrielPagoHoje = servicosGabrielHoje.reduce((acc, s) => acc + (s.pago ? s.valor : 0), 0);
    const totalGabrielFiadoHoje = servicosGabrielHoje.reduce((acc, s) => acc + (!s.pago ? s.valor : 0), 0);
    
    // Gabriel - MÊS
    const servicosGabrielMes = dados.Gabriel.filter(s => {
        const dataServico = new Date(s.data);
        return dataServico.getMonth() === mesAtual && dataServico.getFullYear() === anoAtual;
    });
    
    const totalGabrielMes = servicosGabrielMes.reduce((acc, s) => acc + s.valor, 0);
    const totalGabrielPagoMes = servicosGabrielMes.reduce((acc, s) => acc + (s.pago ? s.valor : 0), 0);
    const totalGabrielFiadoMes = servicosGabrielMes.reduce((acc, s) => acc + (!s.pago ? s.valor : 0), 0);
    
    // Wagner - HOJE
    const servicosWagnerHoje = dados.Wagner.filter(s => s.data === hoje);
    const totalWagnerPagoHoje = servicosWagnerHoje.reduce((acc, s) => acc + (s.pago ? s.valor : 0), 0);
    const totalWagnerFiadoHoje = servicosWagnerHoje.reduce((acc, s) => acc + (!s.pago ? s.valor : 0), 0);
    
    // Wagner - MÊS
    const servicosWagnerMes = dados.Wagner.filter(s => {
        const dataServico = new Date(s.data);
        return dataServico.getMonth() === mesAtual && dataServico.getFullYear() === anoAtual;
    });
    
    const totalWagnerMes = servicosWagnerMes.reduce((acc, s) => acc + s.valor, 0);
    const totalWagnerPagoMes = servicosWagnerMes.reduce((acc, s) => acc + (s.pago ? s.valor : 0), 0);
    const totalWagnerFiadoMes = servicosWagnerMes.reduce((acc, s) => acc + (!s.pago ? s.valor : 0), 0);
    
    // Totais Gerais
    const totalPagoHoje = totalGabrielPagoHoje + totalWagnerPagoHoje;
    const totalFiadoHoje = totalGabrielFiadoHoje + totalWagnerFiadoHoje;
    const totalServicosHoje = servicosGabrielHoje.length + servicosWagnerHoje.length;
    
    const totalPagoMes = totalGabrielPagoMes + totalWagnerPagoMes;
    const totalFiadoMes = totalGabrielFiadoMes + totalWagnerFiadoMes;
    const totalServicosMes = servicosGabrielMes.length + servicosWagnerMes.length;
    
    // Mensalistas do mês
    const mensalistasMes = dados.mensalistas.filter(m => {
        const dataMensalista = new Date(m.dataInicio);
        return dataMensalista.getMonth() === mesAtual && dataMensalista.getFullYear() === anoAtual;
    });
    
    const mensalistasGabriel = mensalistasMes.filter(m => m.barbeiro === 'Gabriel');
    const mensalistasWagner = mensalistasMes.filter(m => m.barbeiro === 'Wagner');
    
    const totalMensalistasGabriel = mensalistasGabriel.reduce((acc, m) => acc + m.valor, 0);
    const totalMensalistasWagner = mensalistasWagner.reduce((acc, m) => acc + m.valor, 0);
    const totalMensalistas = totalMensalistasGabriel + totalMensalistasWagner;
    
    // Despesas do mês
    const despesasMes = dados.despesas.filter(d => {
        const dataDespesa = new Date(d.data);
        return dataDespesa.getMonth() === mesAtual && dataDespesa.getFullYear() === anoAtual;
    }).reduce((acc, d) => acc + d.valor, 0);
    
    const lucroMes = (totalGabrielMes + totalWagnerMes + totalMensalistas) - despesasMes;
    
    const container = document.getElementById('conteudoResumo');
    
    const html = `
        <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:20px;margin:15px 0;border-left:4px solid #ffaa00;">
            <h4 style="color:#ffaa00; margin-bottom:15px;">RESUMO DO DIA - ${new Date().toLocaleDateString('pt-BR')}</h4>
            
            <div style="display:flex; gap:15px; flex-wrap:wrap;">
                <div style="flex:1; min-width:200px;">
                    <h5 style="color:#ffaa00; margin-bottom:10px;">GABRIEL</h5>
                    <div style="font-size:16px; margin-bottom:5px;">Recebido: <span style="color:#25D366; font-weight:600;">R$ ${totalGabrielPagoHoje.toFixed(2)}</span></div>
                    <div style="font-size:16px; margin-bottom:5px;">Fiado: <span style="color:#FF9500; font-weight:600;">R$ ${totalGabrielFiadoHoje.toFixed(2)}</span></div>
                    <div style="font-size:16px; margin-bottom:5px;">Serviços: <span style="font-weight:600;">${servicosGabrielHoje.length}</span></div>
                </div>
                
                <div style="flex:1; min-width:200px;">
                    <h5 style="color:#ffaa00; margin-bottom:10px;">WAGNER</h5>
                    <div style="font-size:16px; margin-bottom:5px;">Recebido: <span style="color:#25D366; font-weight:600;">R$ ${totalWagnerPagoHoje.toFixed(2)}</span></div>
                    <div style="font-size:16px; margin-bottom:5px;">Fiado: <span style="color:#FF9500; font-weight:600;">R$ ${totalWagnerFiadoHoje.toFixed(2)}</span></div>
                    <div style="font-size:16px; margin-bottom:5px;">Serviços: <span style="font-weight:600;">${servicosWagnerHoje.length}</span></div>
                </div>
            </div>
            
            <div style="margin-top:15px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.1);">
                <h5 style="color:#9933ff; margin-bottom:10px;">TOTAIS GERAIS DO DIA</h5>
                <div style="font-size:18px; margin-bottom:5px; font-weight:600;">Total Recebido: <span style="color:#25D366;">R$ ${totalPagoHoje.toFixed(2)}</span></div>
                <div style="font-size:16px; margin-bottom:5px;">Total Fiado: <span style="color:#FF9500;">R$ ${totalFiadoHoje.toFixed(2)}</span></div>
                <div style="font-size:16px; margin-bottom:5px;">Total Serviços: <span style="font-weight:600;">${totalServicosHoje}</span></div>
            </div>
        </div>
        
        <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:20px;margin:15px 0;border-left:4px solid #9933ff;">
            <h4 style="color:#9933ff; margin-bottom:15px;">RESUMO DO MÊS - ${new Date().toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'})}</h4>
            
            <div style="display:flex; gap:15px; flex-wrap:wrap;">
                <div style="flex:1; min-width:200px;">
                    <h5 style="color:#ffaa00; margin-bottom:10px;">GABRIEL</h5>
                    <div style="font-size:16px; margin-bottom:5px;">Total: <span style="font-weight:600;">R$ ${totalGabrielMes.toFixed(2)}</span></div>
                    <div style="font-size:16px; margin-bottom:5px;">Recebido: <span style="color:#25D366;">R$ ${totalGabrielPagoMes.toFixed(2)}</span></div>
                    <div style="font-size:16px; margin-bottom:5px;">Fiado: <span style="color:#FF9500;">R$ ${totalGabrielFiadoMes.toFixed(2)}</span></div>
                    <div style="font-size:16px; margin-bottom:5px;">Serviços: <span style="font-weight:600;">${servicosGabrielMes.length}</span></div>
                </div>
                
                <div style="flex:1; min-width:200px;">
                    <h5 style="color:#ffaa00; margin-bottom:10px;">WAGNER</h5>
                    <div style="font-size:16px; margin-bottom:5px;">Total: <span style="font-weight:600;">R$ ${totalWagnerMes.toFixed(2)}</span></div>
                    <div style="font-size:16px; margin-bottom:5px;">Recebido: <span style="color:#25D366;">R$ ${totalWagnerPagoMes.toFixed(2)}</span></div>
                    <div style="font-size:16px; margin-bottom:5px;">Fiado: <span style="color:#FF9500;">R$ ${totalWagnerFiadoMes.toFixed(2)}</span></div>
                    <div style="font-size:16px; margin-bottom:5px;">Serviços: <span style="font-weight:600;">${servicosWagnerMes.length}</span></div>
                </div>
            </div>
            
            <div style="margin-top:15px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.1);">
                <h5 style="color:#9933ff; margin-bottom:10px;">TOTAIS DO MÊS</h5>
                <div style="font-size:18px; margin-bottom:5px; font-weight:600;">Faturamento: <span style="color:#25D366;">R$ ${(totalGabrielMes + totalWagnerMes).toFixed(2)}</span></div>
                <div style="font-size:16px; margin-bottom:5px;">Recebido: <span style="color:#25D366;">R$ ${totalPagoMes.toFixed(2)}</span></div>
                <div style="font-size:16px; margin-bottom:5px;">Fiado: <span style="color:#FF9500;">R$ ${totalFiadoMes.toFixed(2)}</span></div>
                <div style="font-size:16px; margin-bottom:5px;">Total Serviços: <span style="font-weight:600;">${totalServicosMes}</span></div>
            </div>
        </div>
        
        <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:20px;margin:15px 0;border-left:4px solid #00cc99;">
            <h4 style="color:#00cc99; margin-bottom:15px;">MENSALISTAS DO MÊS</h4>
            
            <div style="display:flex; gap:15px; flex-wrap:wrap;">
                <div style="flex:1; min-width:200px;">
                    <h5 style="color:#ffaa00; margin-bottom:10px;">GABRIEL</h5>
                    <div style="font-size:16px; margin-bottom:5px;">Total: <span style="font-weight:600; color:#00cc99;">R$ ${totalMensalistasGabriel.toFixed(2)}</span></div>
                    <div style="font-size:16px; margin-bottom:5px;">Clientes: <span style="font-weight:600;">${mensalistasGabriel.length}</span></div>
                </div>
                
                <div style="flex:1; min-width:200px;">
                    <h5 style="color:#ffaa00; margin-bottom:10px;">WAGNER</h5>
                    <div style="font-size:16px; margin-bottom:5px;">Total: <span style="font-weight:600; color:#00cc99;">R$ ${totalMensalistasWagner.toFixed(2)}</span></div>
                    <div style="font-size:16px; margin-bottom:5px;">Clientes: <span style="font-weight:600;">${mensalistasWagner.length}</span></div>
                </div>
            </div>
            
            <div style="margin-top:15px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.1);">
                <h5 style="color:#00cc99; margin-bottom:10px;">TOTAL MENSALISTAS</h5>
                <div style="font-size:18px; margin-bottom:5px; font-weight:600;">Valor Total: <span style="color:#00cc99;">R$ ${totalMensalistas.toFixed(2)}</span></div>
                <div style="font-size:16px; margin-bottom:5px;">Total Clientes: <span style="font-weight:600;">${mensalistasMes.length}</span></div>
            </div>
        </div>
        
        <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:20px;margin:15px 0;border-left:4px solid #ff3366;">
            <h4 style="color:#ff3366; margin-bottom:15px;">RESUMO FINANCEIRO DO MÊS</h4>
            
            <div style="font-size:18px; margin-bottom:10px; font-weight:600;">
                Faturamento Total: <span style="color:#25D366;">R$ ${(totalGabrielMes + totalWagnerMes + totalMensalistas).toFixed(2)}</span>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <div>
                    <div style="font-size:16px; margin-bottom:5px;">Faturamento Serviços:</div>
                    <div style="font-size:16px; margin-bottom:5px; color:#25D366; font-weight:600;">R$ ${(totalGabrielMes + totalWagnerMes).toFixed(2)}</div>
                </div>
                <div>
                    <div style="font-size:16px; margin-bottom:5px;">Faturamento Mensalistas:</div>
                    <div style="font-size:16px; margin-bottom:5px; color:#00cc99; font-weight:600;">R$ ${totalMensalistas.toFixed(2)}</div>
                </div>
            </div>
            
            <div style="margin-top:15px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.1);">
                <div style="font-size:16px; margin-bottom:5px;">Despesas do Mês: <span style="color:#ff3366; font-weight:600;">R$ ${despesasMes.toFixed(2)}</span></div>
                <div style="font-size:20px; margin-top:10px; font-weight:700; color:#25D366;">
                    LUCRO LÍQUIDO: R$ ${lucroMes.toFixed(2)}
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function abrirModalPagamentos() {
    document.getElementById('modalPagamentos').style.display = 'flex';
    gerarRelatorioPagamentos();
}

function gerarRelatorioPagamentos() {
    const dataInicio = document.getElementById('dataInicioPagamentos').value;
    const dataFim = document.getElementById('dataFimPagamentos').value;
    
    const container = document.getElementById('relatorioPagamentos');
    
    const todosServicos = [...dados.Gabriel, ...dados.Wagner];
    const servicosFiltrados = todosServicos.filter(s => {
        return s.data >= dataInicio && s.data <= dataFim && s.pago;
    });
    
    if (servicosFiltrados.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;padding:30px;">Nenhum pagamento encontrado no período selecionado</p>';
        return;
    }
    
    const totais = {
        dinheiro: 0,
        pix: 0,
        debito: 0,
        credito: 0,
        total: 0
    };
    
    const totaisBarbeiros = {
        Gabriel: { dinheiro: 0, pix: 0, debito: 0, credito: 0, total: 0 },
        Wagner: { dinheiro: 0, pix: 0, debito: 0, credito: 0, total: 0 }
    };
    
    servicosFiltrados.forEach(servico => {
        if (servico.metodoPagamento && servico.pago) {
            const barbeiro = dados.Gabriel.includes(servico) ? 'Gabriel' : 'Wagner';
            totais[servico.metodoPagamento] += servico.valor;
            totais.total += servico.valor;
            
            totaisBarbeiros[barbeiro][servico.metodoPagamento] += servico.valor;
            totaisBarbeiros[barbeiro].total += servico.valor;
        }
    });
    
    let html = `
        <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:20px;margin-bottom:20px;">
            <h4 style="color:#ffaa00; margin-bottom:15px; text-align:center;">TOTAIS POR MÉTODO DE PAGAMENTO</h4>
            <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:15px;">
                <div style="text-align:center;">
                    <div style="font-size:14px;color:#aaa;">DINHEIRO</div>
                    <div style="font-size:18px;font-weight:700;color:#ffaa00;">R$ ${totais.dinheiro.toFixed(2)}</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:14px;color:#aaa;">PIX</div>
                    <div style="font-size:18px;font-weight:700;color:#25D366;">R$ ${totais.pix.toFixed(2)}</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:14px;color:#aaa;">DÉBITO</div>
                    <div style="font-size:18px;font-weight:700;color:#3366ff;">R$ ${totais.debito.toFixed(2)}</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:14px;color:#aaa;">CRÉDITO</div>
                    <div style="font-size:18px;font-weight:700;color:#9933ff;">R$ ${totais.credito.toFixed(2)}</div>
                </div>
            </div>
            <div style="text-align:center; margin-top:15px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.1);">
                <div style="font-size:14px;color:#aaa;">TOTAL GERAL</div>
                <div style="font-size:24px;font-weight:700;color:#ffaa00;">R$ ${totais.total.toFixed(2)}</div>
            </div>
        </div>
        
        <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:20px;margin-bottom:20px;">
            <h4 style="color:#ffaa00; margin-bottom:15px; text-align:center;">TOTAIS POR BARBEIRO</h4>
            <div style="display:flex; gap:20px; justify-content:center;">
                <div style="text-align:center;">
                    <div style="font-size:14px;color:#aaa;">GABRIEL</div>
                    <div style="font-size:18px;font-weight:700;color:#ffaa00;">R$ ${totaisBarbeiros.Gabriel.total.toFixed(2)}</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:14px;color:#aaa;">WAGNER</div>
                    <div style="font-size:18px;font-weight:700;color:#3366ff;">R$ ${totaisBarbeiros.Wagner.total.toFixed(2)}</div>
                </div>
            </div>
        </div>
        
        <h4 style="color:#ffaa00; margin:20px 0 10px;">DETALHES DOS PAGAMENTOS</h4>
        <table>
            <tr>
                <th>Data</th>
                <th>Barbeiro</th>
                <th>Serviço</th>
                <th>Valor</th>
                <th>Metodo</th>
            </tr>
    `;

    servicosFiltrados.sort((a, b) => new Date(b.data + ' ' + b.hora) - new Date(a.data + ' ' + a.hora));

    servicosFiltrados.forEach(servico => {
        const barbeiro = dados.Gabriel.includes(servico) ? 'Gabriel' : 'Wagner';
        let metodoIcon = '';
        let metodoTexto = '';
        switch(servico.metodoPagamento) {
            case 'dinheiro': metodoIcon = '💵'; metodoTexto = 'Dinheiro'; break;
            case 'pix': metodoIcon = '📱'; metodoTexto = 'PIX'; break;
            case 'debito': metodoIcon = '💳'; metodoTexto = 'Débito'; break;
            case 'credito': metodoIcon = '💳'; metodoTexto = 'Crédito'; break;
        }

        html += `
            <tr>
                <td>${servico.data}<br><small>${servico.hora}</small></td>
                <td>${barbeiro}</td>
                <td>${servico.tipo}</td>
                <td>R$ ${servico.valor.toFixed(2)}</td>
                <td>${metodoIcon} ${metodoTexto}</td>
            </tr>
        `;
    });

    html += `</table>`;
    container.innerHTML = html;
}

function filtrarPagamentos() {
    gerarRelatorioPagamentos();
}

function enviarRelatorioPagamentosWhatsApp() {
    const dataInicio = document.getElementById('dataInicioPagamentos').value;
    const dataFim = document.getElementById('dataFimPagamentos').value;
    const periodo = dataInicio === dataFim 
        ? `dia ${formatarDataBrasileira(dataInicio)}` 
        : `período ${formatarDataBrasileira(dataInicio)} a ${formatarDataBrasileira(dataFim)}`;

    const todosServicos = [...dados.Gabriel, ...dados.Wagner].filter(s => 
        s.data >= dataInicio && s.data <= dataFim && s.pago
    );

    if (todosServicos.length === 0) {
        alert('Nenhum pagamento no período selecionado!');
        return;
    }

    const totais = {
        dinheiro: 0, pix: 0, debito: 0, credito: 0, total: 0
    };

    const totaisBarbeiros = {
        Gabriel: 0,
        Wagner: 0
    };

    todosServicos.forEach(s => {
        if (s.metodoPagamento && s.pago) {
            const barbeiro = dados.Gabriel.includes(s) ? 'Gabriel' : 'Wagner';
            totais[s.metodoPagamento] += s.valor;
            totais.total += s.valor;
            totaisBarbeiros[barbeiro] += s.valor;
        }
    });

    const mensagem = `*RELATÓRIO DE PAGAMENTOS*\n` +
        `Período: ${periodo}\n\n` +
        `*TOTAIS POR BARBEIRO*\n` +
        `Gabriel: R$ ${totaisBarbeiros.Gabriel.toFixed(2)}\n` +
        `Wagner: R$ ${totaisBarbeiros.Wagner.toFixed(2)}\n\n` +
        `*TOTAIS POR MÉTODO*\n` +
        `💵 Dinheiro: R$ ${totais.dinheiro.toFixed(2)}\n` +
        `📱 PIX: R$ ${totais.pix.toFixed(2)}\n` +
        `💳 Débito: R$ ${totais.debito.toFixed(2)}\n` +
        `💳 Crédito: R$ ${totais.credito.toFixed(2)}\n\n` +
        `💰 *TOTAL RECEBIDO: R$ ${totais.total.toFixed(2)}*`;

    const url = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

function abrirModalDespesas() {
    document.getElementById('modalDespesas').style.display = 'flex';
    listarDespesasModal();
}

function listarDespesasModal() {
    const container = document.getElementById('listaDespesas');
    if (dados.despesas.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;padding:30px;">Nenhuma despesa cadastrada este mês</p>';
        return;
    }

    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    const despesasMes = dados.despesas.filter(d => {
        const data = new Date(d.data);
        return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    });

    const totalDespesas = despesasMes.reduce((acc, d) => acc + d.valor, 0);

    let html = `<div style="margin-bottom:15px; padding:12px; background:rgba(255,50,50,0.15); border-radius:10px; text-align:center;">
        <div style="color:#ff3366; font-size:18px; font-weight:700;">Total de Despesas do Mês: R$ ${totalDespesas.toFixed(2)}</div>
    </div>`;

    despesasMes.sort((a, b) => new Date(b.data) - new Date(a.data)).forEach((d, i) => {
        html += `
            <div class="despesa-item">
                <div>
                    <div style="font-weight:600;">${d.desc}</div>
                    <div style="font-size:12px;color:#aaa;">${formatarDataBrasileira(d.data)}</div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="despesa-valor">R$ ${d.valor.toFixed(2)}</div>
                    <button class="action-btn" onclick="excluirDespesa(${i})">×</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function adicionarDespesa() {
    const desc = document.getElementById('descDespesa').value.trim();
    const valorStr = document.getElementById('valorDespesa').value;
    
    if (!desc || !valorStr) {
        alert('Preencha descrição e valor!');
        return;
    }

    const valor = parseFloat(valorStr);
    if (isNaN(valor) || valor <= 0) {
        alert('Valor inválido!');
        return;
    }

    const hoje = new Date().toISOString().split('T')[0];
    dados.despesas.push({ desc, valor, data: hoje });
    await salvarDados();
    document.getElementById('descDespesa').value = '';
    document.getElementById('valorDespesa').value = '';
    listarDespesasModal();
    atualizarListaDespesas();
    atualizarDashboard();
    alert('Despesa adicionada com sucesso!');
}

async function excluirDespesa(index) {
    if (confirm('Excluir esta despesa?')) {
        dados.despesas.splice(index, 1);
        await salvarDados();
        listarDespesasModal();
        atualizarListaDespesas();
        atualizarDashboard();
    }
}

function abrirModalMensalistas() {
    document.getElementById('modalMensalistas').style.display = 'flex';
    listarMensalistasModal();
}

function listarMensalistasModal() {
    const container = document.getElementById('listaMensalistasModal');
    
    if (dados.mensalistas.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;padding:30px;">Nenhum mensalista cadastrado</p>';
        return;
    }
    
    const dataInicio = document.getElementById('dataInicioMensalistas').value;
    const dataFim = document.getElementById('dataFimMensalistas').value;
    
    const mensalistasFiltrados = dados.mensalistas.filter(m => {
        return m.dataInicio >= dataInicio && m.dataInicio <= dataFim;
    });
    
    if (mensalistasFiltrados.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;padding:30px;">Nenhum mensalista encontrado no período selecionado</p>';
        return;
    }
    
    const totalMensalistas = mensalistasFiltrados.length;
    const totalValor = mensalistasFiltrados.reduce((acc, m) => acc + m.valor, 0);
    const totalPagos = mensalistasFiltrados.filter(m => m.status === 'pago').length;
    const totalPendentes = mensalistasFiltrados.filter(m => m.status === 'pendente').length;
    
    // Separar por barbeiro
    const mensalistasGabriel = mensalistasFiltrados.filter(m => m.barbeiro === 'Gabriel');
    const mensalistasWagner = mensalistasFiltrados.filter(m => m.barbeiro === 'Wagner');
    const totalGabriel = mensalistasGabriel.reduce((acc, m) => acc + m.valor, 0);
    const totalWagner = mensalistasWagner.reduce((acc, m) => acc + m.valor, 0);
    
    let html = `
        <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:20px;margin-bottom:20px;">
            <h4 style="color:#00cc99; margin-bottom:15px; text-align:center;">RESUMO DE MENSALISTAS</h4>
            <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:15px;">
                <div style="text-align:center;">
                    <div style="font-size:14px;color:#aaa;">TOTAL</div>
                    <div style="font-size:18px;font-weight:700;color:#00cc99;">${totalMensalistas}</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:14px;color:#aaa;">VALOR TOTAL</div>
                    <div style="font-size:18px;font-weight:700;color:#00cc99;">R$ ${totalValor.toFixed(2)}</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:14px;color:#aaa;">PAGOS</div>
                    <div style="font-size:18px;font-weight:700;color:#25D366;">${totalPagos}</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:14px;color:#aaa;">PENDENTES</div>
                    <div style="font-size:18px;font-weight:700;color:#FF9500;">${totalPendentes}</div>
                </div>
            </div>
            
            <div style="margin-top:15px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.1);">
                <div style="display:flex; gap:20px; justify-content:center;">
                    <div style="text-align:center;">
                        <div style="font-size:14px;color:#aaa;">GABRIEL</div>
                        <div style="font-size:16px;font-weight:700;color:#ffaa00;">R$ ${totalGabriel.toFixed(2)}</div>
                        <div style="font-size:12px;color:#aaa;">${mensalistasGabriel.length} clientes</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:14px;color:#aaa;">WAGNER</div>
                        <div style="font-size:16px;font-weight:700;color:#3366ff;">R$ ${totalWagner.toFixed(2)}</div>
                        <div style="font-size:12px;color:#aaa;">${mensalistasWagner.length} clientes</div>
                    </div>
                </div>
            </div>
        </div>
        
        <h4 style="color:#00cc99; margin:20px 0 10px;">LISTA DE MENSALISTAS</h4>
    `;
    
    mensalistasFiltrados.sort((a, b) => new Date(b.dataInicio) - new Date(a.dataInicio)).forEach((mensalista, index) => {
        const statusClass = mensalista.status === 'pago' ? 'status-pago' : 'status-pendente';
        const statusText = mensalista.status === 'pago' ? 'PAGO' : 'PENDENTE';
        
        html += `
            <div class="mensalista-card">
                <div class="mensalista-header">
                    <div class="mensalista-nome">${mensalista.nome}</div>
                    <div class="mensalista-status ${statusClass}">${statusText}</div>
                </div>
                <div class="mensalista-detalhes">
                    <div>Barbeiro: <span style="color:#ffaa00;">${mensalista.barbeiro || 'N/A'}</span></div>
                    <div>Valor: <span class="mensalista-valor">R$ ${mensalista.valor.toFixed(2)}</span></div>
                    <div>Vencimento: dia ${mensalista.vencimento}</div>
                    <div>Início: ${formatarDataBrasileira(mensalista.dataInicio)}</div>
                    <div>Status: ${mensalista.status === 'pago' ? '✅ Pago' : '⏳ Pendente'}</div>
                </div>
                <div style="margin-top:10px; display:flex; gap:10px;">
                    <button class="action-btn" style="background:#25D366;" onclick="alterarStatusMensalista(${index})">✓</button>
                    <button class="action-btn" onclick="excluirMensalista(${index})">×</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function filtrarMensalistas() {
    listarMensalistasModal();
}

async function adicionarMensalista() {
    const nome = document.getElementById('nomeMensalista').value.trim();
    const valorStr = document.getElementById('valorMensalista').value;
    const vencimento = document.getElementById('vencimentoMensalista').value;
    const barbeiro = document.getElementById('barbeiroMensalista').value;
    const status = document.getElementById('statusMensalista').value;
    
    if (!nome || !valorStr || !vencimento) {
        alert('Preencha todos os campos!');
        return;
    }

    const valor = parseFloat(valorStr);
    if (isNaN(valor) || valor <= 0) {
        alert('Valor inválido!');
        return;
    }

    if (vencimento < 1 || vencimento > 31) {
        alert('Dia de vencimento deve ser entre 1 e 31!');
        return;
    }

    const hoje = new Date().toISOString().split('T')[0];
    dados.mensalistas.push({ 
        nome, 
        valor, 
        vencimento: parseInt(vencimento), 
        barbeiro,
        status,
        dataInicio: hoje
    });
    
    await salvarDados();
    
    document.getElementById('nomeMensalista').value = '';
    document.getElementById('valorMensalista').value = '';
    document.getElementById('vencimentoMensalista').value = '';
    document.getElementById('barbeiroMensalista').value = 'Gabriel';
    document.getElementById('statusMensalista').value = 'pago';
    
    listarMensalistasModal();
    atualizarListaMensalistas();
    alert('Mensalista adicionado com sucesso!');
}

async function alterarStatusMensalista(index) {
    const mensalista = dados.mensalistas[index];
    mensalista.status = mensalista.status === 'pago' ? 'pendente' : 'pago';
    await salvarDados();
    listarMensalistasModal();
    atualizarListaMensalistas();
}

async function excluirMensalista(index) {
    if (confirm('Tem certeza que deseja excluir este mensalista?')) {
        dados.mensalistas.splice(index, 1);
        await salvarDados();
        listarMensalistasModal();
        atualizarListaMensalistas();
        alert('Mensalista excluído com sucesso!');
    }
}

function abrirModalConfiguracoes() {
    document.getElementById('modalConfig').style.display = 'flex';
    document.getElementById('numWhats').value = config.whatsapp;
    document.getElementById('corteAtual').textContent = config.corte.toFixed(2);
    document.getElementById('barbaAtual').textContent = config.barba.toFixed(2);
    document.getElementById('comboAtual').textContent = config.combo.toFixed(2);
    document.getElementById('valCorte').value = '';
    document.getElementById('valBarba').value = '';
    document.getElementById('valCombo').value = '';
    document.getElementById('novoPin').value = '';
}

async function salvarConfiguracoes() {
    const numWhats = document.getElementById('numWhats').value.replace(/\D/g, '');
    const novoPin = document.getElementById('novoPin').value;

    if (numWhats && numWhats.length >= 10) {
        config.whatsapp = numWhats;
    }

    if (novoPin && novoPin.length === 4 && /^\d+$/.test(novoPin)) {
        config.pin = novoPin;
        alert('PIN alterado com sucesso!');
    }

    const valCorte = parseFloat(document.getElementById('valCorte').value);
    const valBarba = parseFloat(document.getElementById('valBarba').value);
    const valCombo = parseFloat(document.getElementById('valCombo').value);

    if (!isNaN(valCorte) && valCorte > 0) config.corte = valCorte;
    if (!isNaN(valBarba) && valBarba > 0) config.barba = valBarba;
    if (!isNaN(valCombo) && valCombo > 0) config.combo = valCombo;

    await salvarDados();
    alert('Configurações salvas com sucesso!');
    fecharModal('modalConfig');
}

function enviarResumoWhatsApp() {
    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    
    // Gabriel
    const servicosGabrielHoje = dados.Gabriel.filter(s => s.data === hoje);
    const servicosGabrielMes = dados.Gabriel.filter(s => {
        const dataServico = new Date(s.data);
        return dataServico.getMonth() === mesAtual && dataServico.getFullYear() === anoAtual;
    });
    
    const totalGabrielPagoHoje = servicosGabrielHoje.reduce((acc, s) => acc + (s.pago ? s.valor : 0), 0);
    const totalGabrielFiadoHoje = servicosGabrielHoje.reduce((acc, s) => acc + (!s.pago ? s.valor : 0), 0);
    const totalGabrielMes = servicosGabrielMes.reduce((acc, s) => acc + s.valor, 0);
    
    // Wagner
    const servicosWagnerHoje = dados.Wagner.filter(s => s.data === hoje);
    const servicosWagnerMes = dados.Wagner.filter(s => {
        const dataServico = new Date(s.data);
        return dataServico.getMonth() === mesAtual && dataServico.getFullYear() === anoAtual;
    });
    
    const totalWagnerPagoHoje = servicosWagnerHoje.reduce((acc, s) => acc + (s.pago ? s.valor : 0), 0);
    const totalWagnerFiadoHoje = servicosWagnerHoje.reduce((acc, s) => acc + (!s.pago ? s.valor : 0), 0);
    const totalWagnerMes = servicosWagnerMes.reduce((acc, s) => acc + s.valor, 0);
    
    // Mensalistas
    const mensalistasMes = dados.mensalistas.filter(m => {
        const dataMensalista = new Date(m.dataInicio);
        return dataMensalista.getMonth() === mesAtual && dataMensalista.getFullYear() === anoAtual;
    });
    
    const mensalistasGabriel = mensalistasMes.filter(m => m.barbeiro === 'Gabriel');
    const mensalistasWagner = mensalistasMes.filter(m => m.barbeiro === 'Wagner');
    const totalMensalistasGabriel = mensalistasGabriel.reduce((acc, m) => acc + m.valor, 0);
    const totalMensalistasWagner = mensalistasWagner.reduce((acc, m) => acc + m.valor, 0);
    
    // Despesas
    const despesasMes = dados.despesas.filter(d => {
        const dataDespesa = new Date(d.data);
        return dataDespesa.getMonth() === mesAtual && dataDespesa.getFullYear() === anoAtual;
    }).reduce((acc, d) => acc + d.valor, 0);
    
    const hojeFormatado = new Date().toLocaleDateString('pt-BR');
    const mesFormatado = new Date().toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'});
    
    const mensagem = `*RESUMO COMPLETO - BarbaPRO Duo*\n\n` +
        `📅 *HOJE (${hojeFormatado})*\n` +
        `• Gabriel: R$ ${totalGabrielPagoHoje.toFixed(2)} (Fiado: R$ ${totalGabrielFiadoHoje.toFixed(2)})\n` +
        `• Wagner: R$ ${totalWagnerPagoHoje.toFixed(2)} (Fiado: R$ ${totalWagnerFiadoHoje.toFixed(2)})\n` +
        `• Total: R$ ${(totalGabrielPagoHoje + totalWagnerPagoHoje).toFixed(2)}\n\n` +
        `📊 *MÊS ATUAL (${mesFormatado})*\n` +
        `• Gabriel: R$ ${totalGabrielMes.toFixed(2)}\n` +
        `• Wagner: R$ ${totalWagnerMes.toFixed(2)}\n` +
        `• Total Serviços: R$ ${(totalGabrielMes + totalWagnerMes).toFixed(2)}\n\n` +
        `💰 *MENSALISTAS*\n` +
        `• Gabriel: R$ ${totalMensalistasGabriel.toFixed(2)} (${mensalistasGabriel.length} clientes)\n` +
        `• Wagner: R$ ${totalMensalistasWagner.toFixed(2)} (${mensalistasWagner.length} clientes)\n` +
        `• Total: R$ ${(totalMensalistasGabriel + totalMensalistasWagner).toFixed(2)}\n\n` +
        `💸 *DESPESAS DO MÊS*\n` +
        `• Total: R$ ${despesasMes.toFixed(2)}\n\n` +
        `✅ *LUCRO ESTIMADO*\n` +
        `• Total: R$ ${((totalGabrielMes + totalWagnerMes + totalMensalistasGabriel + totalMensalistasWagner) - despesasMes).toFixed(2)}`;

    const url = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

function fecharModal(id) {
    document.getElementById(id).style.display = 'none';
}

function formatarDataBrasileira(dataISO) {
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
}

// Fechar modal ao clicar fora
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
});