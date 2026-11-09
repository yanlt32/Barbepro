// BarbaPRO - funções compartilhadas entre servidor, registro e dashboard
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Barba = factory();
})(typeof self !== 'undefined' ? self : this, function () {

    // "clientes" guarda só dados extras do cliente (telefone), com id = nome normalizado
    const COLECOES = ['Gabriel', 'Wagner', 'despesas', 'mensalistas', 'clientes'];
    const BARBEIROS = ['Gabriel', 'Wagner'];
    const CHAVE_LOCAL = 'barbapro_duo';

    const CONFIG_PADRAO = {
        pin: '1234',
        whatsapp: '5511974065186',
        corte: 30,
        barba: 20,
        combo: 40,
        orcamentoDespesas: 1500
    };

    const METODOS = {
        dinheiro: { nome: 'Dinheiro', icone: '💵' },
        pix: { nome: 'PIX', icone: '📱' },
        debito: { nome: 'Débito', icone: '💳' },
        credito: { nome: 'Crédito', icone: '💳' }
    };

    // ========== DATAS (horário de Brasília) ==========
    function partesBrasilia(ts) {
        const d = new Date((ts == null ? Date.now() : ts) - 3 * 3600000);
        return {
            ano: d.getUTCFullYear(),
            mes: String(d.getUTCMonth() + 1).padStart(2, '0'),
            dia: String(d.getUTCDate()).padStart(2, '0'),
            hora: String(d.getUTCHours()).padStart(2, '0'),
            min: String(d.getUTCMinutes()).padStart(2, '0')
        };
    }

    function hoje(ts) {
        const p = partesBrasilia(ts);
        return `${p.ano}-${p.mes}-${p.dia}`;
    }

    function horaAgora() {
        const p = partesBrasilia();
        return `${p.hora}:${p.min}`;
    }

    function mesDe(iso) { return (iso || '').substring(0, 7); }

    function somarDias(iso, n) {
        const d = new Date(iso + 'T12:00:00Z');
        d.setUTCDate(d.getUTCDate() + n);
        return d.toISOString().substring(0, 10);
    }

    function diaDaSemana(iso) { return new Date(iso + 'T12:00:00Z').getUTCDay(); }

    function diasEntre(a, b) {
        return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);
    }

    function minutosDe(hora) {
        const [h, m] = String(hora || '0:0').split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    }

    // Semana de pagamento: terça a domingo
    function semanaTercaDomingo(iso) {
        const ref = iso || hoje();
        const diff = (diaDaSemana(ref) - 2 + 7) % 7;
        const inicio = somarDias(ref, -diff);
        return { inicio, fim: somarDias(inicio, 5) };
    }

    function somarMeses(mes, n) {
        const [a, m] = mes.split('-').map(Number);
        const total = a * 12 + (m - 1) + n;
        return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
    }

    function diasNoMes(mes) {
        const [a, m] = mes.split('-').map(Number);
        return new Date(Date.UTC(a, m, 0)).getUTCDate();
    }

    const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const NOMES_MES_LONGO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    function nomeMes(mes, longo) {
        const [a, m] = mes.split('-').map(Number);
        return `${(longo ? NOMES_MES_LONGO : NOMES_MES)[m - 1]}/${a}`;
    }

    function formatarData(iso) {
        if (!iso) return '';
        if (iso.includes('/')) return iso;
        const [a, m, d] = iso.split('-');
        return `${d}/${m}/${a}`;
    }

    // ========== FORMATAÇÃO ==========
    function moeda(v) {
        return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function chaveCliente(nome) { return String(nome || '').trim().toLowerCase(); }

    function soma(lista, campo = 'valor') { return lista.reduce((t, x) => t + (Number(x[campo]) || 0), 0); }

    // ========== MODELO DE DADOS ==========
    function migrarMensalista(m) {
        if (!m.pagamentos || typeof m.pagamentos !== 'object') {
            m.pagamentos = {};
            if (m.status === 'pago') {
                const ref = m.ultimaAtualizacao || Date.now();
                m.pagamentos[mesDe(hoje(ref))] = { data: hoje(ref), valor: m.valor, metodo: null };
            }
        }
        m.valor = Number(m.valor) || 0;
        m.diaVencimento = Number(m.diaVencimento) || 1;
        return m;
    }

    function normalizarDados(d) {
        d = d && typeof d === 'object' ? d : {};
        const out = {};
        COLECOES.forEach(c => { out[c] = Array.isArray(d[c]) ? d[c].filter(x => x && x.id != null) : []; });
        BARBEIROS.forEach(b => out[b].forEach(s => {
            if (!s.barbeiro) s.barbeiro = b;
            s.valor = Number(s.valor) || 0;
        }));
        out.mensalistas.forEach(migrarMensalista);
        out.removidos = Array.isArray(d.removidos) ? d.removidos.map(String) : [];
        out.config = Object.assign({}, CONFIG_PADRAO, d.config || {});
        return out;
    }

    function versao(item) {
        return item.atualizadoEm || item.timestamp || item.ultimaAtualizacao || item.dataCriacao || 0;
    }

    // Junta dois conjuntos de dados sem perder nada: une os itens pelo id, a versão
    // mais recente de cada item vence, e ids na lista "removidos" ficam de fora.
    // Em empate, "b" vence.
    function mesclarDados(a, b) {
        a = normalizarDados(a);
        b = normalizarDados(b);
        const removidos = new Set([...a.removidos, ...b.removidos]);
        const out = { removidos: [...removidos] };
        COLECOES.forEach(col => {
            const mapa = new Map();
            [...a[col], ...b[col]].forEach(item => {
                const id = String(item.id);
                if (removidos.has(id)) return;
                const atual = mapa.get(id);
                if (!atual || versao(item) >= versao(atual)) mapa.set(id, item);
            });
            out[col] = [...mapa.values()];
        });
        out.config = (b.config.atualizadoEm || 0) >= (a.config.atualizadoEm || 0)
            ? Object.assign({}, a.config, b.config)
            : Object.assign({}, b.config, a.config);
        return out;
    }

    function totalServicos(d) {
        return BARBEIROS.reduce((t, b) => t + ((d && Array.isArray(d[b])) ? d[b].length : 0), 0);
    }

    function totalRegistros(d) {
        return COLECOES.reduce((t, c) => t + ((d && Array.isArray(d[c])) ? d[c].length : 0), 0);
    }

    // ========== MENSALISTAS ==========
    function situacaoMensalista(m, dataRef) {
        const ref = dataRef || hoje();
        const mes = mesDe(ref);
        const pagamento = m.pagamentos && m.pagamentos[mes];
        if (pagamento) return { codigo: 'pago', texto: 'Pago', pagamento, dias: null };
        const dia = Math.min(m.diaVencimento, diasNoMes(mes));
        const venc = `${mes}-${String(dia).padStart(2, '0')}`;
        const dias = Math.round((new Date(venc + 'T12:00:00Z') - new Date(ref + 'T12:00:00Z')) / 86400000);
        if (dias === 0) return { codigo: 'hoje', texto: 'Vence hoje', dias, vencimento: venc };
        if (dias < 0) return { codigo: 'vencido', texto: 'Vencido', dias, vencimento: venc };
        if (dias <= 3) return { codigo: 'breve', texto: 'Vence em breve', dias, vencimento: venc };
        return { codigo: 'pendente', texto: 'Pendente', dias, vencimento: venc };
    }

    // ========== CLIENTES ==========
    const NOMES_GENERICOS = new Set(['cliente', 'clientes', 'sem nome', 'nao sei', 'não sei', 'x', 'xx', '-', '.', '?', 'avulso']);
    const JANELA_MESMA_PESSOA = 7;
    const MINUTOS_MESMA_VISITA = 40;

    function mediana(lista) {
        if (!lista.length) return null;
        const o = lista.slice().sort((a, b) => a - b);
        const meio = Math.floor(o.length / 2);
        return o.length % 2 ? o[meio] : (o[meio - 1] + o[meio]) / 2;
    }

    // Agrupa os serviços por nome e estima quantas pessoas diferentes usam o mesmo nome:
    // - serviços do mesmo nome, mesmo dia, mesmo barbeiro e até 40 min de diferença = 1 visita
    // - o mesmo nome voltando em menos de 7 dias = outra pessoa
    // O número de pessoas é o máximo de visitas desse nome em qualquer janela de 7 dias.
    function analisarClientes(dados, filtro) {
        const grupos = new Map();
        BARBEIROS.forEach(b => (dados[b] || []).forEach(s => {
            const chave = chaveCliente(s.cliente);
            if (!chave || !/^\d{4}-\d{2}-\d{2}$/.test(s.data || '') || s.data < '2015') return;
            if (filtro && !filtro(s)) return;
            if (!grupos.has(chave)) grupos.set(chave, { chave, nome: String(s.cliente).trim(), servicos: [] });
            grupos.get(chave).servicos.push(s);
        }));
        const extras = new Map((dados.clientes || []).map(c => [String(c.id), c]));

        return [...grupos.values()].map(g => {
            g.servicos.sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));
            const visitas = [];
            g.servicos.forEach(s => {
                const ultima = visitas[visitas.length - 1];
                if (ultima && ultima.data === s.data && ultima.barbeiro === s.barbeiro &&
                    minutosDe(s.hora) - ultima.fimMin <= MINUTOS_MESMA_VISITA) {
                    ultima.valor += s.valor;
                    ultima.fimMin = minutosDe(s.hora);
                } else {
                    visitas.push({ data: s.data, barbeiro: s.barbeiro, valor: s.valor, fimMin: minutosDe(s.hora) });
                }
            });

            const extra = extras.get(g.chave) || {};
            let pessoas = 1;
            for (let i = 0, ini = 0; i < visitas.length; i++) {
                while (diasEntre(visitas[ini].data, visitas[i].data) >= JANELA_MESMA_PESSOA) ini++;
                pessoas = Math.max(pessoas, i - ini + 1);
            }
            // Marcado à mão como "é uma pessoa só"
            if (extra.pessoaUnica) pessoas = 1;
            const generico = NOMES_GENERICOS.has(g.chave);
            const intervalos = visitas.slice(1).map((v, i) => diasEntre(visitas[i].data, v.data));
            const total = soma(g.servicos);
            const barbeiros = {};
            g.servicos.forEach(s => { barbeiros[s.barbeiro] = (barbeiros[s.barbeiro] || 0) + 1; });

            return {
                chave: g.chave,
                nome: g.nome,
                servicos: g.servicos,
                visitas,
                pessoas,
                generico,
                ambiguo: generico || pessoas > 1,
                total,
                porPessoa: total / pessoas,
                primeira: visitas[0].data,
                ultima: visitas[visitas.length - 1].data,
                intervalo: pessoas === 1 ? mediana(intervalos) : null,
                barbeiro: Object.entries(barbeiros).sort((a, b) => b[1] - a[1])[0][0],
                pessoaUnica: !!extra.pessoaUnica,
                telefone: extra.telefone || ''
            };
        });
    }

    function telefoneWhats(tel) {
        const n = String(tel || '').replace(/\D/g, '');
        if (!n) return '';
        return n.startsWith('55') && n.length >= 12 ? n : '55' + n;
    }

    function baixarArquivo(nome, conteudo, tipo) {
        const blob = new Blob([conteudo], { type: tipo || 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nome;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // ========== STORE (somente navegador) ==========
    function criarStore(opcoes) {
        opcoes = opcoes || {};
        const store = {
            dados: normalizarDados(null),
            online: false,
            ws: null,
            ultimaInfoServidor: null
        };

        const avisar = (tipo) => { if (opcoes.onChange) opcoes.onChange(tipo); };
        const status = (on) => { store.online = on; if (opcoes.onStatus) opcoes.onStatus(on); };

        store.carregarLocal = function () {
            try {
                const salvo = localStorage.getItem(CHAVE_LOCAL);
                if (salvo) store.dados = normalizarDados(JSON.parse(salvo));
            } catch (e) { console.error('Erro ao ler dados locais', e); }
        };

        store.salvarLocal = function () {
            try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(store.dados)); }
            catch (e) { console.error('Erro ao salvar dados locais', e); }
        };

        function aplicar(dadosRecebidos) {
            store.dados = mesclarDados(store.dados, dadosRecebidos);
            store.salvarLocal();
        }

        async function enviar() {
            const resp = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: store.dados })
            });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const r = await resp.json();
            if (r.data) aplicar(r.data);
            return r;
        }

        // Salva local primeiro (nunca perde), depois envia ao servidor (que mescla)
        store.salvar = async function () {
            store.dados.config = store.dados.config || {};
            store.salvarLocal();
            avisar('local');
            try {
                await enviar();
                avisar('servidor');
                return true;
            } catch (e) {
                console.warn('Servidor indisponível, salvo só neste aparelho', e.message);
                return false;
            }
        };

        // Busca do servidor, mescla com o que tem aqui e devolve tudo mesclado.
        // Se o servidor voltou vazio (ex.: redeploy no Render), isso restaura o histórico.
        store.sincronizar = async function () {
            const resp = await fetch('/api/data');
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const r = await resp.json();
            const servidorAntes = totalServicos(r.data);
            const localAntes = totalServicos(store.dados);
            aplicar(r.data);
            await enviar();
            store.ultimaInfoServidor = r.info || null;
            avisar('sync');
            return {
                servidorAntes,
                localAntes,
                total: totalServicos(store.dados),
                restaurou: servidorAntes < totalServicos(store.dados)
            };
        };

        store.atualizar = function (colecao, id, mudancas) {
            const item = store.dados[colecao].find(x => String(x.id) === String(id));
            if (!item) return null;
            Object.assign(item, mudancas, { atualizadoEm: Date.now() });
            return item;
        };

        store.adicionar = function (colecao, item) {
            item.atualizadoEm = Date.now();
            store.dados[colecao].unshift(item);
            return item;
        };

        store.remover = function (colecao, id) {
            const antes = store.dados[colecao].length;
            store.dados[colecao] = store.dados[colecao].filter(x => String(x.id) !== String(id));
            if (!store.dados.removidos.includes(String(id))) store.dados.removidos.push(String(id));
            return store.dados[colecao].length < antes;
        };

        store.salvarConfig = function (mudancas) {
            store.dados.config = Object.assign({}, store.dados.config, mudancas, { atualizadoEm: Date.now() });
        };

        store.importar = function (conteudo) {
            const recebido = JSON.parse(conteudo);
            const dadosArquivo = recebido && recebido.data && !Array.isArray(recebido.data) ? recebido.data : recebido;
            if (!dadosArquivo || totalRegistros(normalizarDados(dadosArquivo)) === 0) {
                throw new Error('Arquivo sem dados do BarbaPRO');
            }
            const antes = totalRegistros(store.dados);
            store.dados = mesclarDados(store.dados, dadosArquivo);
            return totalRegistros(store.dados) - antes;
        };

        store.baixarBackup = function () {
            baixarArquivo(`barbapro-backup-${hoje()}.json`, JSON.stringify(store.dados, null, 2));
        };

        store.conectar = function () {
            try {
                const protocolo = location.protocol === 'https:' ? 'wss:' : 'ws:';
                const ws = new WebSocket(`${protocolo}//${location.host}`);
                store.ws = ws;
                ws.onopen = () => {
                    status(true);
                    store.sincronizar().then(r => {
                        if (r.restaurou && r.servidorAntes === 0 && opcoes.onRestaurado) opcoes.onRestaurado(r);
                    }).catch(e => console.warn('Falha ao sincronizar', e.message));
                };
                ws.onmessage = (ev) => {
                    try {
                        const msg = JSON.parse(ev.data);
                        if ((msg.type === 'sync_completo' || msg.type === 'dados_iniciais') && msg.data) {
                            aplicar(msg.data);
                            avisar('remoto');
                        }
                    } catch (e) { console.error(e); }
                };
                ws.onclose = () => { status(false); setTimeout(store.conectar, 5000); };
                ws.onerror = () => status(false);
            } catch (e) {
                status(false);
            }
        };

        return store;
    }

    // ========== INTERFACE COMPARTILHADA ==========
    function toast(msg, tipo) {
        let pilha = document.getElementById('toasts');
        if (!pilha) {
            pilha = document.createElement('div');
            pilha.id = 'toasts';
            pilha.className = 'toasts';
            document.body.appendChild(pilha);
        }
        const el = document.createElement('div');
        el.className = 'toast toast-' + (tipo || 'info');
        el.textContent = msg;
        pilha.appendChild(el);
        setTimeout(() => { el.classList.add('saindo'); setTimeout(() => el.remove(), 250); }, 3200);
    }

    function abrirModal(id) {
        const m = document.getElementById(id);
        if (m) { m.classList.add('aberto'); document.body.classList.add('modal-aberto'); }
    }

    function fecharModal(id) {
        const m = document.getElementById(id);
        if (m) m.classList.remove('aberto');
        if (!document.querySelector('.modal.aberto')) document.body.classList.remove('modal-aberto');
    }

    // Fecha modais ao clicar no fundo, em [data-fechar] ou com Esc
    function ligarModais() {
        document.addEventListener('click', (e) => {
            const alvo = e.target;
            if (alvo.classList && alvo.classList.contains('modal')) fecharModal(alvo.id);
            const btn = alvo.closest && alvo.closest('[data-fechar]');
            if (btn) fecharModal(btn.closest('.modal').id);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            const abertos = document.querySelectorAll('.modal.aberto');
            if (abertos.length) fecharModal(abertos[abertos.length - 1].id);
        });
    }

    // Escolha da forma de pagamento (reaproveitado para quitar fiado e mensalista)
    function escolherMetodo(titulo, subtitulo) {
        return new Promise(resolve => {
            let modal = document.getElementById('modalEscolherMetodo');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'modalEscolherMetodo';
                modal.className = 'modal';
                document.body.appendChild(modal);
            }
            modal.innerHTML = `
                <div class="modal-box">
                    <div class="modal-topo"><h2>${esc(titulo)}</h2><button class="icon-btn" data-fechar aria-label="Fechar">✕</button></div>
                    ${subtitulo ? `<p class="modal-sub">${subtitulo}</p>` : ''}
                    <div class="grade-2">
                        ${Object.entries(METODOS).map(([k, m]) => `<button class="opcao" data-metodo="${k}"><span class="opcao-ico">${m.icone}</span><span>${m.nome}</span></button>`).join('')}
                    </div>
                    <div class="acoes"><button class="btn btn-ghost" data-fechar>Cancelar</button></div>
                </div>`;
            const terminar = (valor) => {
                observador.disconnect();
                fecharModal(modal.id);
                resolve(valor);
            };
            modal.querySelectorAll('[data-metodo]').forEach(b => b.onclick = () => terminar(b.dataset.metodo));
            const observador = new MutationObserver(() => { if (!modal.classList.contains('aberto')) terminar(null); });
            abrirModal(modal.id);
            observador.observe(modal, { attributes: true, attributeFilter: ['class'] });
        });
    }

    // Tela "Recuperar histórico"
    function abrirRecuperacao(store, aoTerminar) {
        let modal = document.getElementById('modalRecuperacao');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalRecuperacao';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-topo"><h2>Recuperar histórico</h2><button class="icon-btn" data-fechar aria-label="Fechar">✕</button></div>
                <p class="modal-sub">Se o servidor reiniciou vazio (ex.: deploy no Render), use uma das opções abaixo. Nada é apagado: os dados são <strong>somados</strong> aos que já existem.</p>
                <div class="rec-status" id="recStatus">Consultando servidor…</div>
                <div class="rec-lista">
                    <button class="rec-opcao" id="recAparelho">
                        <strong>Restaurar com os dados deste aparelho</strong>
                        <span>Envia todo o histórico salvo neste celular/computador para o servidor.</span>
                    </button>
                    <button class="rec-opcao" id="recServidor">
                        <strong>Restaurar backup automático do servidor</strong>
                        <span>O servidor guarda uma cópia por dia (funciona se o disco do Render não foi zerado).</span>
                    </button>
                    <label class="rec-opcao">
                        <strong>Importar arquivo de backup (.json)</strong>
                        <span>Use um arquivo baixado antes pelo botão abaixo.</span>
                        <input type="file" accept=".json,application/json" id="recArquivo" hidden>
                    </label>
                    <button class="rec-opcao" id="recBaixar">
                        <strong>Baixar backup agora</strong>
                        <span>Guarde esse arquivo no Drive/WhatsApp. É sua garantia se tudo cair.</span>
                    </button>
                </div>
                <div id="recBackups"></div>
            </div>`;
        abrirModal(modal.id);

        const statusEl = modal.querySelector('#recStatus');
        const concluir = (msg) => { toast(msg, 'sucesso'); if (aoTerminar) aoTerminar(); atualizarStatus(); };

        async function atualizarStatus() {
            try {
                const r = await (await fetch('/api/status-dados')).json();
                statusEl.innerHTML = `
                    <div><span>Servidor</span><strong>${r.servicos} serviços</strong></div>
                    <div><span>Este aparelho</span><strong>${totalServicos(store.dados)} serviços</strong></div>
                    <div><span>Backups no servidor</span><strong>${r.backups}</strong></div>`;
            } catch (e) {
                statusEl.innerHTML = `<div><span>Servidor</span><strong class="txt-perigo">offline</strong></div>
                    <div><span>Este aparelho</span><strong>${totalServicos(store.dados)} serviços</strong></div>`;
            }
        }
        atualizarStatus();

        modal.querySelector('#recAparelho').onclick = async () => {
            try {
                const r = await store.sincronizar();
                concluir(`Pronto! Servidor tinha ${r.servidorAntes} serviços, agora tem ${r.total}.`);
            } catch (e) { toast('Servidor offline. Tente de novo em instantes.', 'erro'); }
        };

        modal.querySelector('#recBaixar').onclick = () => { store.baixarBackup(); toast('Backup baixado', 'sucesso'); };

        modal.querySelector('#recArquivo').onchange = async (e) => {
            const arq = e.target.files[0];
            if (!arq) return;
            try {
                const novos = store.importar(await arq.text());
                await store.salvar();
                concluir(`Backup importado: ${novos} registro(s) recuperado(s).`);
            } catch (err) { toast('Arquivo inválido: ' + err.message, 'erro'); }
            e.target.value = '';
        };

        modal.querySelector('#recServidor').onclick = async () => {
            const alvo = modal.querySelector('#recBackups');
            try {
                const r = await (await fetch('/api/backups')).json();
                if (!r.backups.length) { alvo.innerHTML = '<p class="vazio-mini">Nenhum backup automático no servidor.</p>'; return; }
                alvo.innerHTML = `<div class="rec-backups">${r.backups.map(b =>
                    `<button class="chip" data-arquivo="${esc(b.arquivo)}">${formatarData(b.data)} · ${b.servicos} serviços</button>`).join('')}</div>`;
                alvo.querySelectorAll('[data-arquivo]').forEach(btn => btn.onclick = async () => {
                    const resp = await fetch('/api/restaurar-backup', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ arquivo: btn.dataset.arquivo })
                    });
                    const res = await resp.json();
                    if (!res.success) { toast(res.error || 'Erro ao restaurar', 'erro'); return; }
                    store.dados = mesclarDados(store.dados, res.data);
                    store.salvarLocal();
                    concluir('Backup do servidor restaurado.');
                });
            } catch (e) { toast('Servidor offline.', 'erro'); }
        };
    }

    return {
        COLECOES, BARBEIROS, METODOS, CONFIG_PADRAO,
        analisarClientes, diasEntre, minutosDe, diaDaSemana,
        hoje, horaAgora, mesDe, somarDias, somarMeses, semanaTercaDomingo, diasNoMes, nomeMes, formatarData,
        moeda, esc, chaveCliente, soma,
        normalizarDados, mesclarDados, totalServicos, totalRegistros,
        situacaoMensalista, telefoneWhats, baixarArquivo,
        criarStore, toast, abrirModal, fecharModal, ligarModais, escolherMetodo, abrirRecuperacao
    };
});
