/* ==========================================================================
   HOT DOG DO ZÉ — SISTEMA INTEGRADO DE ATENDIMENTO, COZINHA & PDV
   Implementação estrita dos Requisitos & Diagramas:
   - RF01 & RF10: Gerente cadastra, edita preços (RN06) e ativa/desativa produtos e adicionais
   - RF02: Atendente registra pedidos de balcão e mesa, identificando mesa e comanda
   - RF03: Registra produtos, quantidades, adicionais e ingredientes a retirar
   - RF04: Calcula automaticamente o total do pedido, incluindo adicionais por unidade
   - RF05: Exibe à cozinha pedidos confirmados em ordem de chegada com detalhes
   - RF06: Atualiza situação do pedido (RECEBIDO -> EM PREPARO -> PRONTO -> CONCLUÍDO / CANCELADO)
   - RF07: Registra se o pedido está PAGO ou PENDENTE (RN13)
   - RF08: Painel Gerencial com faturamento do dia, valores recebidos/pendentes e mais vendidos
   - RF09: Pesquisa de produtos em tempo real por nome ou categoria na Vitrine e PDV
   - RNF01-RNF07: Responsividade, controle por papel (RBAC), anti-duplo clique e textos claros
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. ENTIDADES & MODELOS (DIAGRAMA DE CLASSES & DER)
   -------------------------------------------------------------------------- */

class Funcionario {
  constructor(id, nome, login, cargo) {
    this.id = id;
    this.nome = nome;
    this.login = login;
    this.cargo = cargo; // 'Cliente', 'Atendente', 'Chefe de Cozinha', 'Gerente'
  }

  autenticar() {
    return true;
  }

  verificarPermissao(acao) {
    if (this.cargo === 'Gerente') return true;
    if (acao === 'REGISTRAR_PEDIDO' && (this.cargo === 'Atendente' || this.cargo === 'Gerente')) return true;
    if (acao === 'AVANCAR_PREPARO' && (this.cargo === 'Chefe de Cozinha' || this.cargo === 'Gerente')) return true;
    if (acao === 'CANCELAR_PEDIDO' && (this.cargo === 'Atendente' || this.cargo === 'Gerente')) return true;
    if (acao === 'FINALIZAR_PEDIDO' && (this.cargo === 'Atendente' || this.cargo === 'Gerente')) return true;
    if (acao === 'REGISTRAR_PAGAMENTO' && (this.cargo === 'Atendente' || this.cargo === 'Gerente')) return true;
    if (acao === 'GERENCIAR_CARDAPIO' && this.cargo === 'Gerente') return true;
    if (acao === 'VER_RELATORIOS' && this.cargo === 'Gerente') return true;
    return false;
  }
}

class Mesa {
  constructor(id, numeroIdentificacao) {
    this.id = id;
    this.numeroIdentificacao = numeroIdentificacao;
  }
}

class Produto {
  constructor(id, nome, categoria, preco, ativo, quantidadeEstoque, ingredientes, imagem, tag, tagClass, descricao) {
    this.id = id;
    this.nome = nome;
    this.categoria = categoria; // 'favoritos', 'gourmet', 'combos', 'acompanhamentos'
    this.preco = preco;
    this.ativo = ativo !== false;
    this.quantidadeEstoque = quantidadeEstoque !== undefined ? quantidadeEstoque : 50;
    this.ingredientes = ingredientes || [];
    this.imagem = imagem || 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=800&q=80';
    this.tag = tag || 'Artesanal ⭐';
    this.tagClass = tagClass || 'badge--accent';
    this.descricao = descricao || '';
  }

  verificarDisponibilidade(qtdDesejada = 1) {
    return this.ativo && this.quantidadeEstoque >= qtdDesejada;
  }

  descontarEstoque(qtd) {
    this.quantidadeEstoque = Math.max(0, this.quantidadeEstoque - qtd);
  }
}

class Adicional {
  constructor(id, nome, preco) {
    this.id = id;
    this.nome = nome;
    this.preco = preco;
  }
}

class ItemAdicional {
  constructor(idItemAdicional, idAdicional, nome, quantidade, precoCobrado) {
    this.idItemAdicional = idItemAdicional;
    this.idAdicional = idAdicional;
    this.nome = nome;
    this.quantidade = quantidade;
    this.precoCobrado = precoCobrado;
  }
}

class ItemPedido {
  constructor(idItem, idProduto, nomeProduto, quantidade, precoCobrado, ingredientesRemovidos, pao, adicionais = [], observacao = '') {
    this.idItem = idItem;
    this.idProduto = idProduto;
    this.nomeProduto = nomeProduto;
    this.quantidade = quantidade;
    this.precoCobrado = precoCobrado; // RN06: Preço preservado no momento da venda
    this.ingredientesRemovidos = ingredientesRemovidos || []; // DER: IngredientesRemovidos
    this.pao = pao || 'Pão Brioche Selado';
    this.adicionais = adicionais; // Lista de ItemAdicional
    this.observacao = observacao;
    this.valorTotalItem = this.calcularValorItem();
  }

  calcularValorItem() {
    // RN04-RN05: Total inclui adicionais por unidade multiplicado pela quantidade
    const totalAdicionaisUnidade = this.adicionais.reduce((acc, ad) => acc + (ad.precoCobrado * ad.quantidade), 0);
    return (this.precoCobrado + totalAdicionaisUnidade) * this.quantidade;
  }
}

class HistoricoStatus {
  constructor(idHistorico, idPedido, idFuncionario, nomeFuncionario, cargoFuncionario, situacaoAnterior, situacaoNova, dataHoraMudanca) {
    this.idHistorico = idHistorico;
    this.idPedido = idPedido;
    this.idFuncionario = idFuncionario;
    this.nomeFuncionario = nomeFuncionario;
    this.cargoFuncionario = cargoFuncionario;
    this.situacaoAnterior = situacaoAnterior;
    this.situacaoNova = situacaoNova;
    this.dataHoraMudanca = dataHoraMudanca || new Date().toISOString();
  }
}

class Pedido {
  constructor(idPedido, numero, idFuncionario, nomeAtendente, tipoAtendimento, idMesa = null, numeroMesa = null, comanda = null, itens = [], nomeCliente = 'Cliente Balcão', formaPagamento = 'Pix') {
    this.idPedido = idPedido;
    this.numero = numero;
    this.idFuncionario = idFuncionario;
    this.nomeAtendente = nomeAtendente;
    this.tipoAtendimento = tipoAtendimento; // 'Balcão' | 'Mesa' | 'Delivery'
    this.idMesa = idMesa;
    this.numeroMesa = numeroMesa;
    this.comanda = comanda;
    this.nomeCliente = nomeCliente;
    this.formaPagamento = formaPagamento;
    this.dataHora = new Date().toISOString();
    this.itens = itens;
    this.situacaoPreparo = 'RECEBIDO'; // 'RECEBIDO' (Novo Pedido) | 'EM PREPARO' | 'PRONTO' | 'CONCLUÍDO' | 'CANCELADO'
    this.situacaoPagamento = 'PENDENTE'; // 'PENDENTE' | 'PAGO'
    this.valorTotal = this.calcularTotal();
    this.entregueAoCliente = false; // RN12: Requisito de entrega confirmada
    this.motivoCancelamento = null;
  }

  calcularTotal() {
    return this.itens.reduce((sum, item) => sum + item.valorTotalItem, 0);
  }
}

/* --------------------------------------------------------------------------
   2. REPOSITÓRIO DE DADOS & ESTADO DA APLICAÇÃO (STORE CENTRAL)
   -------------------------------------------------------------------------- */

const APP_STORE = {
  // Perfis Cadastrados para Simulação (DER: Funcionários & Clientes)
  funcionarios: [
    new Funcionario(0, 'Lucas Silva', 'lucas.cliente', 'Cliente'),
    new Funcionario(1, 'Maria Santos', 'maria.atendente', 'Atendente'),
    new Funcionario(2, 'Chef Zé', 'ze.cozinha', 'Chefe de Cozinha'),
    new Funcionario(3, 'Carlos Gerente', 'carlos.gerente', 'Gerente')
  ],
  usuarioLogado: null,

  // Mesas Cadastradas (DER: Mesas)
  mesas: Array.from({ length: 12 }, (_, i) => new Mesa(i + 1, `Mesa ${String(i + 1).padStart(2, '0')}`)),

  // Adicionais Disponíveis (DER: Adicionais)
  adicionais: [
    new Adicional(1, 'Cheddar Cremoso Artesanal', 4.50),
    new Adicional(2, 'Bacon Crocante Extra', 5.00),
    new Adicional(3, 'Cebola Crispy Crocante', 3.50),
    new Adicional(4, 'Maionese Verde da Casa', 3.00),
    new Adicional(5, 'Catupiry Original Maçaricado', 4.00)
  ],

  // Produtos do Cardápio (DER: Produtos com Estoque e Ativo)
  produtos: [
    new Produto(
      1,
      'Hot Dog do Zé Tradicional',
      'favoritos',
      16.00,
      true,
      25,
      ['Salsicha Bovina', 'Molho de Tomate Defumado', 'Milho Doce', 'Batata Palha Extra Fina', 'Queijo Parmesão'],
      'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=800&q=80',
      'Mais Pedido ⭐',
      'badge--accent',
      'Pão brioche selado na manteiga de garrafa, salsicha suculenta 100% bovina, molho artesanal de tomate defumado, milho doce e batata palha.'
    ),
    new Produto(
      2,
      'Chef’s Bacon & Cheddar Vulcão',
      'gourmet',
      24.00,
      true,
      18,
      ['Salsicha Bovina', 'Cheddar Cremoso', 'Bacon Crocante', 'Cebola Crispy'],
      'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=800&q=80',
      'Chef’s Choice ✨',
      'badge--primary',
      'Pão brioche, salsicha 100% bovina grelhada na chapa, vulcão de cheddar cremoso artesanal, generosa camada de bacon super crocante e cebola crispy.'
    ),
    new Produto(
      3,
      'Gorgonzola & Caramelized Onion',
      'gourmet',
      26.00,
      true,
      10,
      ['Salsicha de Pernil', 'Creme de Gorgonzola', 'Cebola Caramelizada', 'Pimenta Rosa'],
      'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=800&q=80',
      'Edição Especial 🧀',
      'badge--accent',
      'Pão brioche tostado, salsicha artesanal de pernil com ervas finas, creme suave de queijo gorgonzola e cebola caramelizada no mel silvestre.'
    ),
    new Produto(
      4,
      'Hot Dog Duplo Monstro',
      'favoritos',
      28.00,
      true,
      14,
      ['2 Salsichas Bovinas', 'Muçarela Maçaricada', 'Bacon em Cubos', 'Molho Zé'],
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80',
      'Fome de Leão 🦁',
      'badge--primary',
      'Duas salsichas 100% bovinas, camada dupla de queijo muçarela maçaricado na hora, bacon em cubos e batata palha gourmet.'
    ),
    new Produto(
      5,
      'Batata Suprema Recheada',
      'acompanhamentos',
      18.00,
      true,
      20,
      ['Batata Rústica', 'Cheddar Cremoso', 'Bacon Crocante', 'Cebolete'],
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80',
      'Porção Crocante 🍟',
      'badge--accent',
      'Batata frita rústica com casca, coberta com cheddar cremoso derretido, farofa crocante de bacon e cebolete fresca.'
    ),
    new Produto(
      6,
      'Combo Galera do Zé (Para 2)',
      'combos',
      54.00,
      true,
      8,
      ['2 Hot Dogs Especiais', '1 Batata Suprema', '2 Refrigerantes'],
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
      'Super Economia 🍔',
      'badge--primary',
      '2 Hot Dogs Especiais à escolha + 1 Batata Suprema Recheada + 2 Refrigerantes em lata (350ml).'
    ),
    new Produto(
      7,
      'Coca-Cola Original 350ml',
      'acompanhamentos',
      6.00,
      true,
      50,
      ['Lata 350ml'],
      'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
      'Gelada 🥤',
      'badge--accent',
      'Lata de Coca-Cola bem gelada com fatia de limão e gelo.'
    )
  ],

  // Lista de Pedidos Realizados e Histórico (DER: Pedidos & HistoricoPedidos)
  pedidos: [],
  historico: [],
  proximoNumeroPedido: 101,

  // Estado Atual de Montagem do Pedido no PDV (UC01)
  pdvTempOrder: {
    tipoAtendimento: 'Balcão',
    idMesa: null,
    numeroMesa: null,
    comanda: '',
    itens: []
  },

  // Item selecionado atualmente para customizar no PDV
  pdvSelectedItem: null,
  pdvItemQuantity: 1,

  // Carrinho Online do Cliente (Vitrine)
  carrinhoVitrine: [],

  // Notificações não lidas para o Atendente
  notificacoesProntas: [],

  // Filtros de busca em tempo real (RF09)
  buscaVitrine: '',
  filtroCategoriaVitrine: 'todos',
  buscaPDV: ''
};

/* --------------------------------------------------------------------------
   3. INICIALIZAÇÃO DO SISTEMA
   -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  carregarEstadoPersistido();
  inicializarUsuarioPadrao();
  atualizarAbasPorPerfil();
  inicializarNavegacaoModulos();
  inicializarSeletorUsuarios();
  inicializarThemeToggle();

  // Módulos
  renderizarVitrineCardapio('todos');
  inicializarVitrineFiltros();
  inicializarBuscaProdutos();
  inicializarPDV();
  renderizarKDS();
  renderizarTabelaBalcao('todos');
  renderizarPainelGerencial();
  inicializarModaisAcoes();
  inicializarModaisGerente();
  inicializarNotifBell();
  atualizarBadgesHeader();
});

/* --------------------------------------------------------------------------
   3.1 CONTROLE DE ACESSO ÀS VIEWS POR CARGO (RBAC & RNF04)
   -------------------------------------------------------------------------- */
function cargoTemAcessoView(cargo, viewId) {
  if (cargo === 'Cliente') {
    return viewId === 'view-cardapio';
  }
  if (cargo === 'Chefe de Cozinha') {
    return viewId === 'view-cardapio' || viewId === 'view-cozinha';
  }
  if (cargo === 'Atendente') {
    return viewId === 'view-cardapio' || viewId === 'view-pdv' || viewId === 'view-pedidos';
  }
  if (cargo === 'Gerente') {
    return true; // Acesso total e irrestrito (RF01, RF08, RF10)
  }
  return true;
}

function atualizarAbasPorPerfil() {
  const cargo = APP_STORE.usuarioLogado?.cargo;

  document.querySelectorAll('.module-tab').forEach(tab => {
    const permitido = cargoTemAcessoView(cargo, tab.dataset.view);
    tab.style.display = permitido ? '' : 'none';
  });

  // Se a view atualmente ativa deixou de ser permitida para o novo perfil, volta pra Vitrine
  const activeView = document.querySelector('.module-view--active');
  if (activeView && !cargoTemAcessoView(cargo, activeView.id)) {
    navegarParaModulo('view-cardapio');
  }
}

/* Sino de Notificação: leva o usuário direto aos pedidos PRONTOS no Balcão */
function inicializarNotifBell() {
  const notifBtn = document.getElementById('notifBtn');
  notifBtn?.addEventListener('click', () => {
    const cargo = APP_STORE.usuarioLogado?.cargo;
    if (!cargoTemAcessoView(cargo, 'view-pedidos')) {
      mostrarToast('Acesso Negado: o Balcão & Caixa é restrito ao Atendente e ao Gerente.', 'error');
      return;
    }

    const prontos = APP_STORE.pedidos.filter(p => p.situacaoPreparo === 'PRONTO').length;

    if (prontos === 0) {
      mostrarToast('Nenhum pedido pronto para retirada no momento.', 'info');
      return;
    }

    navegarParaModulo('view-pedidos');

    const filterBtnPronto = document.querySelector('[data-table-filter="PRONTO"]');
    if (filterBtnPronto) {
      document.querySelectorAll('[data-table-filter]').forEach(b => b.classList.remove('seg-btn--active'));
      filterBtnPronto.classList.add('seg-btn--active');
    }
    renderizarTabelaBalcao('PRONTO');

    APP_STORE.notificacoesProntas = [];
  });
}

/* --------------------------------------------------------------------------
   4. GERENCIAMENTO DE SESSÃO & PERFIS DE ACESSO
   -------------------------------------------------------------------------- */

function inicializarUsuarioPadrao() {
  // Padrão de início: Atendente autenticado (índice 1)
  APP_STORE.usuarioLogado = APP_STORE.funcionarios[1];
  atualizarDisplayUsuario();
}

function inicializarSeletorUsuarios() {
  const selectRole = document.getElementById('selectUserRole');
  if (!selectRole) return;

  selectRole.addEventListener('change', (e) => {
    const role = e.target.value;
    if (role === 'cliente') {
      APP_STORE.usuarioLogado = APP_STORE.funcionarios[0];
      navegarParaModulo('view-cardapio');
      mostrarToast(`🛒 Modo Cliente Ativo: Navegue pelo cardápio, monte seu pedido e finalize no carrinho!`, 'info');
    } else if (role === 'atendente') {
      APP_STORE.usuarioLogado = APP_STORE.funcionarios[1];
      navegarParaModulo('view-pdv');
      mostrarToast(`📝 Modo Atendente Ativo: Registre pedidos no PDV e encaminhe para a cozinha no Balcão.`, 'info');
    } else if (role === 'cozinha') {
      APP_STORE.usuarioLogado = APP_STORE.funcionarios[2];
      navegarParaModulo('view-cozinha');
      mostrarToast(`🍳 Modo Chefe de Cozinha: Visualize a esteira KDS e marque pedidos como PRONTO!`, 'info');
    } else if (role === 'gerente') {
      APP_STORE.usuarioLogado = APP_STORE.funcionarios[3];
      navegarParaModulo('view-gerente');
      mostrarToast(`👑 Modo Gerente Geral: Acesso total ao Painel Gerencial (RF08), Estoque e Cardápio (RF01/RF10).`, 'info');
    }
    atualizarDisplayUsuario();
    atualizarAbasPorPerfil();
    renderizarKDS();
    renderizarTabelaBalcao('todos');
    renderizarPainelGerencial();
    atualizarBadgesHeader();
  });
}

function navegarParaModulo(targetViewId) {
  const tabs = document.querySelectorAll('.module-tab');
  const views = document.querySelectorAll('.module-view');

  tabs.forEach(t => t.classList.remove('module-tab--active'));
  views.forEach(v => v.classList.remove('module-view--active'));

  const activeTab = document.querySelector(`.module-tab[data-view="${targetViewId}"]`);
  const activeView = document.getElementById(targetViewId);

  if (activeTab) activeTab.classList.add('module-tab--active');
  if (activeView) activeView.classList.add('module-view--active');

  // Atualizações dinâmicas na navegação
  if (targetViewId === 'view-cozinha') renderizarKDS();
  if (targetViewId === 'view-pedidos') renderizarTabelaBalcao('todos');
  if (targetViewId === 'view-gerente') renderizarPainelGerencial();
}

function atualizarDisplayUsuario() {
  const badge = document.getElementById('currentRoleBadge');
  const name = document.getElementById('currentUserName');
  if (badge && APP_STORE.usuarioLogado) {
    badge.textContent = `👤 ${APP_STORE.usuarioLogado.cargo}`;
  }
  if (name && APP_STORE.usuarioLogado) {
    name.textContent = `${APP_STORE.usuarioLogado.nome} (Login: ${APP_STORE.usuarioLogado.login})`;
  }
}

/* --------------------------------------------------------------------------
   5. NAVEGAÇÃO ENTRE OS MÓDULOS (TABS)
   -------------------------------------------------------------------------- */

function inicializarNavegacaoModulos() {
  const tabs = document.querySelectorAll('.module-tab');
  const views = document.querySelectorAll('.module-view');
  const btnGoToPdv = document.getElementById('btnGoToPdv');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetViewId = tab.dataset.view;

      // Camada de defesa (RBAC): barra o acesso indevido
      if (!cargoTemAcessoView(APP_STORE.usuarioLogado?.cargo, targetViewId)) {
        mostrarToast('Acesso Negado: este módulo é restrito a outro perfil.', 'error');
        return;
      }

      tabs.forEach(t => t.classList.remove('module-tab--active'));
      views.forEach(v => v.classList.remove('module-view--active'));

      tab.classList.add('module-tab--active');
      const activeView = document.getElementById(targetViewId);
      if (activeView) activeView.classList.add('module-view--active');

      if (targetViewId === 'view-cozinha') renderizarKDS();
      if (targetViewId === 'view-pedidos') renderizarTabelaBalcao('todos');
      if (targetViewId === 'view-gerente') renderizarPainelGerencial();
    });
  });

  if (btnGoToPdv) {
    btnGoToPdv.addEventListener('click', () => {
      const tabPdv = document.getElementById('tabPdv');
      if (tabPdv) tabPdv.click();
    });
  }
}

/* --------------------------------------------------------------------------
   6. CASO DE USO 01 — REGISTRAR PEDIDO (UC01) & BUSCA (RF09)
   Ator: Atendente Autenticado (ou Gerente)
   Regras: RN01-RN09, RNF07 (Prevenção de duplicidade)
   -------------------------------------------------------------------------- */

function inicializarBuscaProdutos() {
  // RF09: Pesquisa de produtos por nome ou categoria na Vitrine
  const searchMenu = document.getElementById('inputSearchMenu');
  searchMenu?.addEventListener('input', (e) => {
    APP_STORE.buscaVitrine = e.target.value.toLowerCase().trim();
    renderizarVitrineCardapio(APP_STORE.filtroCategoriaVitrine, APP_STORE.buscaVitrine);
  });

  // RF09: Pesquisa de produtos no PDV
  const searchPdv = document.getElementById('inputSearchPdv');
  searchPdv?.addEventListener('input', (e) => {
    APP_STORE.buscaPDV = e.target.value.toLowerCase().trim();
    renderizarProdutosPDV(APP_STORE.buscaPDV);
  });
}

function inicializarPDV() {
  const selectMesa = document.getElementById('selectMesa');
  const mesaFieldsContainer = document.getElementById('mesaFieldsContainer');
  const radioBalcao = document.getElementById('tipoBalcao');
  const radioMesa = document.getElementById('tipoMesa');

  // Preenche o Select de Mesas Cadastradas (RF02)
  if (selectMesa) {
    selectMesa.innerHTML = '<option value="">Selecione uma mesa cadastrada...</option>' +
      APP_STORE.mesas.map(m => `<option value="${m.id}">${m.numeroIdentificacao}</option>`).join('');
  }

  // Alternador Balcão vs Mesa (RF02)
  radioBalcao?.addEventListener('change', () => {
    if (radioBalcao.checked) {
      mesaFieldsContainer.style.display = 'none';
      APP_STORE.pdvTempOrder.tipoAtendimento = 'Balcão';
      APP_STORE.pdvTempOrder.idMesa = null;
      APP_STORE.pdvTempOrder.numeroMesa = null;
      atualizarResumoTipoAtendimento();
    }
  });

  radioMesa?.addEventListener('change', () => {
    if (radioMesa.checked) {
      mesaFieldsContainer.style.display = 'block';
      APP_STORE.pdvTempOrder.tipoAtendimento = 'Mesa';
      atualizarResumoTipoAtendimento();
    }
  });

  selectMesa?.addEventListener('change', (e) => {
    const mesaId = parseInt(e.target.value, 10);
    const mesaObj = APP_STORE.mesas.find(m => m.id === mesaId);
    APP_STORE.pdvTempOrder.idMesa = mesaObj ? mesaObj.id : null;
    APP_STORE.pdvTempOrder.numeroMesa = mesaObj ? mesaObj.numeroIdentificacao : null;
    atualizarResumoTipoAtendimento();
  });

  const inputComanda = document.getElementById('inputComanda');
  inputComanda?.addEventListener('input', (e) => {
    APP_STORE.pdvTempOrder.comanda = e.target.value.trim();
    atualizarResumoTipoAtendimento();
  });

  // Renderiza produtos para o PDV
  renderizarProdutosPDV();

  // Controles de Quantidade do Customizador PDV
  const qtyMinus = document.getElementById('pdvQtyMinus');
  const qtyPlus = document.getElementById('pdvQtyPlus');
  qtyMinus?.addEventListener('click', () => {
    if (APP_STORE.pdvItemQuantity > 1) {
      APP_STORE.pdvItemQuantity--;
      atualizarCalculoCustomizadorPDV();
    }
  });
  qtyPlus?.addEventListener('click', () => {
    APP_STORE.pdvItemQuantity++;
    atualizarCalculoCustomizadorPDV();
  });

  // Botão Incluir Item no Pedido (RF03, RF04)
  const btnInclude = document.getElementById('btnIncludeItemInOrder');
  btnInclude?.addEventListener('click', incluirItemNoPDV);

  // Botão Submeter Pedido à Cozinha (RNF07)
  const btnConfirm = document.getElementById('btnConfirmAndRegisterOrder');
  btnConfirm?.addEventListener('click', submeterPedidoPDV);
}

function atualizarResumoTipoAtendimento() {
  const badge = document.getElementById('pdvSummaryAttendanceType');
  if (!badge) return;

  if (APP_STORE.pdvTempOrder.tipoAtendimento === 'Balcão') {
    badge.textContent = '🚶 Balcão';
    badge.className = 'badge badge--primary';
  } else {
    const mesaStr = APP_STORE.pdvTempOrder.numeroMesa || 'Mesa ?';
    const comandaStr = APP_STORE.pdvTempOrder.comanda ? ` (${APP_STORE.pdvTempOrder.comanda})` : '';
    badge.textContent = `🍽️ ${mesaStr}${comandaStr}`;
    badge.className = 'badge badge--accent';
  }
}

function renderizarProdutosPDV(termoBusca = '') {
  const grid = document.getElementById('pdvProductsGrid');
  if (!grid) return;

  let produtosFiltrados = APP_STORE.produtos.filter(p => p.ativo);

  if (termoBusca) {
    produtosFiltrados = produtosFiltrados.filter(p => 
      p.nome.toLowerCase().includes(termoBusca) ||
      p.categoria.toLowerCase().includes(termoBusca) ||
      p.ingredientes.some(ing => ing.toLowerCase().includes(termoBusca))
    );
  }

  if (produtosFiltrados.length === 0) {
    grid.innerHTML = '<p class="text-muted" style="grid-column: 1/-1; text-align: center; padding: 20px;">Nenhum produto ativo encontrado para a busca.</p>';
    return;
  }

  grid.innerHTML = produtosFiltrados.map(p => {
    const disponivel = p.verificarDisponibilidade(1);
    let stockClass = 'pdv-stock-badge';
    let stockText = `${p.quantidadeEstoque} em estoque`;

    if (!p.ativo || p.quantidadeEstoque <= 0) {
      stockClass += ' pdv-stock-badge--empty';
      stockText = 'Esgotado';
    } else if (p.quantidadeEstoque <= 5) {
      stockClass += ' pdv-stock-badge--low';
      stockText = `Resta(m) ${p.quantidadeEstoque}`;
    }

    return `
      <div class="pdv-product-card ${!disponivel ? 'pdv-product-card--out' : ''}" data-id="${p.id}">
        <div>
          <div style="font-size: 0.72rem; color: var(--color-muted); text-transform: uppercase; font-weight: 700;">${p.categoria}</div>
          <h4 class="pdv-product-card__title">${p.nome}</h4>
        </div>
        <div class="pdv-product-card__meta">
          <span class="pdv-product-card__price">R$ ${p.preco.toFixed(2).replace('.', ',')}</span>
          <span class="${stockClass}">${stockText}</span>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.pdv-product-card').forEach(card => {
    card.addEventListener('click', () => {
      const prodId = parseInt(card.dataset.id, 10);
      abrirCustomizadorPDV(prodId);
    });
  });
}

function abrirCustomizadorPDV(produtoId) {
  const produto = APP_STORE.produtos.find(p => p.id === produtoId);
  if (!produto) return;

  // RN06-RN09: Checar disponibilidade
  if (!produto.verificarDisponibilidade(1)) {
    mostrarToast(`O produto "${produto.nome}" está indisponível ou com estoque esgotado.`, 'error');
    return;
  }

  APP_STORE.pdvSelectedItem = produto;
  APP_STORE.pdvItemQuantity = 1;

  // Destaca card ativo
  document.querySelectorAll('.pdv-product-card').forEach(c => c.classList.remove('pdv-product-card--active'));
  const activeCard = document.querySelector(`.pdv-product-card[data-id="${produtoId}"]`);
  if (activeCard) activeCard.classList.add('pdv-product-card--active');

  // Mostra painel
  document.getElementById('pdvSelectedItemNotice').style.display = 'none';
  const customizer = document.getElementById('pdvActiveCustomizer');
  customizer.style.display = 'block';

  document.getElementById('pdvCustomProductTitle').textContent = produto.nome;
  document.getElementById('pdvCustomProductBasePrice').textContent = `R$ ${produto.preco.toFixed(2).replace('.', ',')}`;

  // Ingredientes padrão para retirar (DER: IngredientesRemovidos / RF03)
  const removalContainer = document.getElementById('pdvIngredientsRemovalContainer');
  if (produto.ingredientes && produto.ingredientes.length > 0) {
    removalContainer.innerHTML = produto.ingredientes.map(ing => `
      <label class="tag-checkbox tag-checkbox--strikethrough">
        <span>${ing}</span>
        <input type="checkbox" name="pdvIngredientCheck" value="${ing}" checked>
      </label>
    `).join('');
  } else {
    removalContainer.innerHTML = '<span class="text-muted" style="font-size: 0.8rem;">Item sem ingredientes adicionais configurados.</span>';
  }

  // Adicionais Pagos (DER: ItensPedido_Adicionais / RF03, RF04)
  const extrasContainer = document.getElementById('pdvExtrasContainer');
  extrasContainer.innerHTML = APP_STORE.adicionais.map(ad => `
    <label class="tag-checkbox">
      <span>+ ${ad.nome} (+ R$ ${ad.preco.toFixed(2).replace('.', ',')})</span>
      <input type="checkbox" class="pdv-extra-check" data-id="${ad.id}" data-name="${ad.nome}" data-price="${ad.preco}">
    </label>
  `).join('');

  // Adiciona listeners para recalcular
  removalContainer.querySelectorAll('input').forEach(i => i.addEventListener('change', atualizarCalculoCustomizadorPDV));
  extrasContainer.querySelectorAll('input').forEach(i => i.addEventListener('change', atualizarCalculoCustomizadorPDV));

  atualizarCalculoCustomizadorPDV();
}

function atualizarCalculoCustomizadorPDV() {
  if (!APP_STORE.pdvSelectedItem) return;

  const basePrice = APP_STORE.pdvSelectedItem.preco;
  let extrasUnitTotal = 0;

  document.querySelectorAll('.pdv-extra-check:checked').forEach(chk => {
    extrasUnitTotal += parseFloat(chk.dataset.price || 0);
  });

  const unitTotal = basePrice + extrasUnitTotal;
  const grandTotal = unitTotal * APP_STORE.pdvItemQuantity;

  document.getElementById('pdvQtyValue').textContent = APP_STORE.pdvItemQuantity;
  document.getElementById('pdvItemCalculatedTotal').textContent = `R$ ${grandTotal.toFixed(2).replace('.', ',')}`;
}

function incluirItemNoPDV() {
  if (!APP_STORE.pdvSelectedItem) return;

  const produto = APP_STORE.pdvSelectedItem;
  const quantidade = APP_STORE.pdvItemQuantity;

  // Checa se estoque aguenta a quantidade solicitada
  if (!produto.verificarDisponibilidade(quantidade)) {
    mostrarToast(`Estoque insuficiente! Disponível: ${produto.quantidadeEstoque} unidades.`, 'error');
    return;
  }

  // Pão escolhido
  const breadRadio = document.querySelector('input[name="pdvBread"]:checked');
  const pao = breadRadio ? breadRadio.value : 'Pão Brioche Selado';

  // Ingredientes retirados (RF03)
  const ingredientesRemovidos = [];
  document.querySelectorAll('input[name="pdvIngredientCheck"]:not(:checked)').forEach(chk => {
    ingredientesRemovidos.push(chk.value);
  });

  // Adicionais selecionados (RF03, RF04)
  const adicionais = [];
  document.querySelectorAll('.pdv-extra-check:checked').forEach(chk => {
    adicionais.push(new ItemAdicional(
      Date.now() + Math.random(),
      parseInt(chk.dataset.id, 10),
      chk.dataset.name,
      1,
      parseFloat(chk.dataset.price)
    ));
  });

  const observacao = document.getElementById('pdvItemNotes')?.value.trim() || '';

  const novoItem = new ItemPedido(
    Date.now(),
    produto.id,
    produto.nome,
    quantidade,
    produto.preco,
    ingredientesRemovidos,
    pao,
    adicionais,
    observacao
  );

  APP_STORE.pdvTempOrder.itens.push(novoItem);
  renderizarResumoPDV();

  // Limpa formulário de customização
  document.getElementById('pdvItemNotes').value = '';
  document.getElementById('pdvActiveCustomizer').style.display = 'none';
  document.getElementById('pdvSelectedItemNotice').style.display = 'block';
  APP_STORE.pdvSelectedItem = null;
  document.querySelectorAll('.pdv-product-card').forEach(c => c.classList.remove('pdv-product-card--active'));

  mostrarToast(`Item "${produto.nome}" incluído na comanda.`, 'info');
}

function renderizarResumoPDV() {
  const container = document.getElementById('pdvSummaryItemsList');
  const subtotalEl = document.getElementById('pdvSummarySubtotal');
  const extrasEl = document.getElementById('pdvSummaryExtras');
  const totalEl = document.getElementById('pdvSummaryGrandTotal');

  if (!container) return;

  if (APP_STORE.pdvTempOrder.itens.length === 0) {
    container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px 0;">Nenhum item adicionado ao pedido.</p>';
    subtotalEl.textContent = 'R$ 0,00';
    extrasEl.textContent = 'R$ 0,00';
    totalEl.textContent = 'R$ 0,00';
    return;
  }

  let subtotalGeral = 0;
  let extrasGeral = 0;

  container.innerHTML = APP_STORE.pdvTempOrder.itens.map((item, index) => {
    const itemBaseTotal = item.precoCobrado * item.quantidade;
    const itemExtrasTotal = item.adicionais.reduce((sum, ad) => sum + (ad.precoCobrado * ad.quantidade * item.quantidade), 0);

    subtotalGeral += itemBaseTotal;
    extrasGeral += itemExtrasTotal;

    const extrasStr = item.adicionais.length > 0
      ? `+ Extras: ${item.adicionais.map(ad => ad.nome).join(', ')}`
      : '';
    const removidosStr = item.ingredientesRemovidos.length > 0
      ? `- Sem: ${item.ingredientesRemovidos.join(', ')}`
      : '';

    return `
      <div class="pdv-ticket-item">
        <div class="pdv-ticket-item__details">
          <div class="pdv-ticket-item__title">${item.quantidade}x ${item.nomeProduto}</div>
          <div class="pdv-ticket-item__sub">Pão: ${item.pao}</div>
          ${extrasStr ? `<div class="pdv-ticket-item__sub pdv-ticket-item__sub--extra">${extrasStr}</div>` : ''}
          ${removidosStr ? `<div class="pdv-ticket-item__sub pdv-ticket-item__sub--removed">${removidosStr}</div>` : ''}
          ${item.observacao ? `<div class="pdv-ticket-item__sub"><em>Obs: ${item.observacao}</em></div>` : ''}
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 800;">R$ ${item.valorTotalItem.toFixed(2).replace('.', ',')}</div>
          <button type="button" class="pdv-ticket-item__del" onclick="removerItemDoPDV(${index})" title="Remover item">✕</button>
        </div>
      </div>
    `;
  }).join('');

  const grandTotal = subtotalGeral + extrasGeral;
  subtotalEl.textContent = `R$ ${subtotalGeral.toFixed(2).replace('.', ',')}`;
  extrasEl.textContent = `R$ ${extrasGeral.toFixed(2).replace('.', ',')}`;
  totalEl.textContent = `R$ ${grandTotal.toFixed(2).replace('.', ',')}`;
}

window.removerItemDoPDV = function(index) {
  APP_STORE.pdvTempOrder.itens.splice(index, 1);
  renderizarResumoPDV();
};

/* --------------------------------------------------------------------------
   SUBMISSÃO DO PEDIDO NO PDV (UC01: Validações, Dedução de Estoque, RNF07)
   -------------------------------------------------------------------------- */
function submeterPedidoPDV() {
  const btn = document.getElementById('btnConfirmAndRegisterOrder');
  const errorBox = document.getElementById('pdvErrorMessage');
  const successBox = document.getElementById('pdvSuccessMessage');

  errorBox.style.display = 'none';
  successBox.style.display = 'none';

  // Precondição UC01: Atendente autenticado
  if (!APP_STORE.usuarioLogado || !APP_STORE.usuarioLogado.verificarPermissao('REGISTRAR_PEDIDO')) {
    errorBox.textContent = 'Erro: Apenas funcionários com perfil de Atendente ou Gerente podem registrar pedidos.';
    errorBox.style.display = 'block';
    return;
  }

  // RN01: Validação de Itens
  if (APP_STORE.pdvTempOrder.itens.length === 0) {
    errorBox.textContent = 'Erro: Adicione pelo menos um item à comanda antes de confirmar.';
    errorBox.style.display = 'block';
    return;
  }

  // RN02: Validação de Mesa (se selecionada)
  if (APP_STORE.pdvTempOrder.tipoAtendimento === 'Mesa') {
    if (!APP_STORE.pdvTempOrder.idMesa) {
      errorBox.textContent = 'Erro (RN01-RN03): Selecione uma mesa cadastrada para pedidos presenciais.';
      errorBox.style.display = 'block';
      return;
    }
    if (!APP_STORE.pdvTempOrder.comanda) {
      errorBox.textContent = 'Erro: Informe a identificação da comanda ou cliente para a mesa.';
      errorBox.style.display = 'block';
      return;
    }
  }

  // RN06-RN09: Validar estoque de todos os itens antes de fechar
  for (const item of APP_STORE.pdvTempOrder.itens) {
    const prod = APP_STORE.produtos.find(p => p.id === item.idProduto);
    if (!prod || !prod.verificarDisponibilidade(item.quantidade)) {
      errorBox.textContent = `Erro de Estoque: O produto "${item.nomeProduto}" não possui estoque suficiente. Ajuste ou substitua o item.`;
      errorBox.style.display = 'block';
      return;
    }
  }

  // RNF07: Prevenção de cliques repetidos (Anti-duplo clique)
  btn.disabled = true;
  btn.textContent = '⏳ Processando Pedido Único...';

  setTimeout(() => {
    // Desconta estoque dos produtos
    APP_STORE.pdvTempOrder.itens.forEach(item => {
      const prod = APP_STORE.produtos.find(p => p.id === item.idProduto);
      if (prod) prod.descontarEstoque(item.quantidade);
    });

    const numeroPedido = APP_STORE.proximoNumeroPedido++;
    const idPedido = Date.now();
    const nomeCliente = document.getElementById('pdvClientName')?.value.trim() || 'Cliente Balcão';
    const formaPagamento = document.getElementById('pdvPaymentMethod')?.value || 'Pix';
    const sendWhatsApp = document.getElementById('pdvSendWhatsApp')?.checked;

    const novoPedido = new Pedido(
      idPedido,
      numeroPedido,
      APP_STORE.usuarioLogado.id,
      APP_STORE.usuarioLogado.nome,
      APP_STORE.pdvTempOrder.tipoAtendimento,
      APP_STORE.pdvTempOrder.idMesa,
      APP_STORE.pdvTempOrder.numeroMesa,
      APP_STORE.pdvTempOrder.comanda,
      [...APP_STORE.pdvTempOrder.itens],
      nomeCliente,
      formaPagamento
    );

    // Registra alteração no histórico (Diagrama de Classes: HistoricoStatus)
    const historicoInicial = new HistoricoStatus(
      Date.now(),
      idPedido,
      APP_STORE.usuarioLogado.id,
      APP_STORE.usuarioLogado.nome,
      APP_STORE.usuarioLogado.cargo,
      'INÍCIO',
      'RECEBIDO'
    );

    APP_STORE.pedidos.push(novoPedido);
    APP_STORE.historico.push(historicoInicial);

    // Limpa estado do PDV
    APP_STORE.pdvTempOrder.itens = [];
    APP_STORE.pdvTempOrder.comanda = '';
    const inputComanda = document.getElementById('inputComanda');
    if (inputComanda) inputComanda.value = '';

    renderizarResumoPDV();
    renderizarProdutosPDV(); // Atualiza contadores de estoque na tela
    renderizarKDS();
    renderizarTabelaBalcao('todos');
    renderizarPainelGerencial();
    salvarEstadoPersistido();
    atualizarBadgesHeader();

    if (sendWhatsApp) {
      encaminharPedidoWhatsApp(novoPedido);
    }

    successBox.textContent = `✅ Pedido #${numeroPedido} registrado com sucesso e enviado à cozinha com situação RECEBIDO!`;
    successBox.style.display = 'block';

    btn.disabled = false;
    btn.innerHTML = '<span>✅ Registrar Pedido (RECEBIDO)</span>';

    mostrarToast(`Novo Pedido #${numeroPedido} enviado para a fila da Cozinha!`, 'info');
  }, 400);
}

/* --------------------------------------------------------------------------
   7. CASO DE USO 02 — ATUALIZAR STATUS DO PEDIDO / COZINHA KDS (UC02, RF05, RF06)
   Regras: RN09-RN10 (Cozinha altera RECEBIDO -> EM PREPARO -> PRONTO)
           RN11 (Atendente cancela RECEBIDO, EM PREPARO ou PRONTO)
           Alerta: Notificar Atendente quando ficar PRONTO
   -------------------------------------------------------------------------- */

function renderizarKDS() {
  const listReceived = document.getElementById('kdsListReceived');
  const listPreparing = document.getElementById('kdsListPreparing');
  const listReady = document.getElementById('kdsListReady');

  const countReceived = document.getElementById('kdsCountReceived');
  const countPreparing = document.getElementById('kdsCountPreparing');
  const countReady = document.getElementById('kdsCountReady');

  if (!listReceived || !listPreparing || !listReady) return;

  const pedidosRecebidos = APP_STORE.pedidos.filter(p => p.situacaoPreparo === 'RECEBIDO');
  const pedidosPreparando = APP_STORE.pedidos.filter(p => p.situacaoPreparo === 'EM PREPARO');
  const pedidosProntos = APP_STORE.pedidos.filter(p => p.situacaoPreparo === 'PRONTO');

  countReceived.textContent = pedidosRecebidos.length;
  countPreparing.textContent = pedidosPreparando.length;
  countReady.textContent = pedidosProntos.length;

  listReceived.innerHTML = pedidosRecebidos.length > 0
    ? pedidosRecebidos.map(p => criarCardKDS(p, 'RECEBIDO')).join('')
    : '<p class="text-muted" style="text-align: center; padding: 40px 10px;">Sem pedidos pendentes na fila.</p>';

  listPreparing.innerHTML = pedidosPreparando.length > 0
    ? pedidosPreparando.map(p => criarCardKDS(p, 'EM PREPARO')).join('')
    : '<p class="text-muted" style="text-align: center; padding: 40px 10px;">Nenhum item na chapa no momento.</p>';

  listReady.innerHTML = pedidosProntos.length > 0
    ? pedidosProntos.map(p => criarCardKDS(p, 'PRONTO')).join('')
    : '<p class="text-muted" style="text-align: center; padding: 40px 10px;">Nenhum pedido aguardando retirada.</p>';
}

function criarCardKDS(pedido, etapa) {
  const horaFormatada = new Date(pedido.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const localizacaoStr = pedido.tipoAtendimento === 'Mesa' ? `${pedido.numeroMesa}` : '🚶 Balcão';

  let acaoHtml = '';
  if (etapa === 'RECEBIDO') {
    acaoHtml = `
      <button type="button" class="btn btn--primary btn--sm btn--block" onclick="avancarStatusCozinha(${pedido.idPedido}, 'EM PREPARO')">
        🔥 Iniciar Preparo (EM PREPARO)
      </button>
    `;
  } else if (etapa === 'EM PREPARO') {
    acaoHtml = `
      <button type="button" class="btn btn--success btn--sm btn--block" onclick="avancarStatusCozinha(${pedido.idPedido}, 'PRONTO')">
        🔔 Concluir Preparo (PRONTO)
      </button>
    `;
  } else if (etapa === 'PRONTO') {
    acaoHtml = `
      <div style="font-size: 0.8rem; color: var(--color-success); font-weight: 700; text-align: center; width: 100%;">
        ✅ Aguardando Atendente Entregar
      </div>
    `;
  }

  return `
    <article class="kds-card kds-card--${etapa.toLowerCase().replace(' ', '')}">
      <div class="kds-card__header">
        <div>
          <span class="kds-card__id">#${pedido.numero}</span>
          <span class="kds-card__table">${localizacaoStr}</span>
        </div>
        <div class="kds-card__timer">🕒 ${horaFormatada}</div>
      </div>

      <div class="kds-card__body">
        ${pedido.itens.map(item => `
          <div class="kds-card__item">
            <div>
              <span class="kds-card__item-qty">${item.quantidade}x</span>
              <span class="kds-card__item-name">${item.nomeProduto}</span>
            </div>
            <div>
              <span class="kds-tag kds-tag--bread">${item.pao}</span>
              ${item.adicionais.map(ad => `<span class="kds-tag kds-tag--extra">+ ${ad.nome}</span>`).join('')}
              ${item.ingredientesRemovidos.map(rem => `<span class="kds-tag kds-tag--removed">Sem ${rem}</span>`).join('')}
            </div>
            ${item.observacao ? `<div class="kds-card__notes">“${item.observacao}”</div>` : ''}
          </div>
        `).join('')}
      </div>

      <div class="kds-card__actions">
        ${acaoHtml}
      </div>
    </article>
  `;
}

window.avancarStatusCozinha = function(idPedido, novaSituacao) {
  // Precondição & Regra RN09-RN10: Apenas Cozinha ou Gerente pode alterar
  if (!APP_STORE.usuarioLogado || !APP_STORE.usuarioLogado.verificarPermissao('AVANCAR_PREPARO')) {
    mostrarToast('Acesso Negado: Apenas a equipe da Cozinha pode alterar a situação do preparo.', 'error');
    return;
  }

  const pedido = APP_STORE.pedidos.find(p => p.idPedido === idPedido);
  if (!pedido) return;

  // Validação de transição estrita
  if (novaSituacao === 'EM PREPARO' && pedido.situacaoPreparo !== 'RECEBIDO') {
    mostrarToast('Transição inválida: Apenas pedidos RECEBIDOS podem ir para EM PREPARO.', 'error');
    return;
  }
  if (novaSituacao === 'PRONTO' && pedido.situacaoPreparo !== 'EM PREPARO') {
    mostrarToast('Transição inválida: Apenas pedidos EM PREPARO podem ir para PRONTO.', 'error');
    return;
  }

  const situacaoAnterior = pedido.situacaoPreparo;
  pedido.situacaoPreparo = novaSituacao;

  // Registra no histórico (HistoricoStatus)
  const historicoEntry = new HistoricoStatus(
    Date.now(),
    pedido.idPedido,
    APP_STORE.usuarioLogado.id,
    APP_STORE.usuarioLogado.nome,
    APP_STORE.usuarioLogado.cargo,
    situacaoAnterior,
    novaSituacao
  );
  APP_STORE.historico.push(historicoEntry);

  salvarEstadoPersistido();
  renderizarKDS();
  renderizarTabelaBalcao('todos');
  renderizarPainelGerencial();
  atualizarBadgesHeader();

  if (novaSituacao === 'PRONTO') {
    // Alerta sonoro e visual para o Atendente
    tocarAlertaSonoro();
    APP_STORE.notificacoesProntas.push(pedido);
    atualizarBadgesHeader();
    mostrarToast(`🔔 ATENÇÃO ATENDENTE: Pedido #${pedido.numero} está PRONTO para entrega!`, 'ready');
  } else {
    mostrarToast(`Pedido #${pedido.numero} agora está: ${novaSituacao}`, 'info');
  }
};

/* --------------------------------------------------------------------------
   8. CASO DE USO 03 — FINALIZAR PEDIDO (UC03, RF07) & GESTÃO BALCÃO
   Regras: RN09-RN12 (Só conclui pedido PRONTO e entregue)
           RN13 (Pagamento PAGO ou PENDENTE não impede a conclusão)
           RN11 (Cancelamento pelo Atendente)
   -------------------------------------------------------------------------- */

let pedidoEmFinalizacao = null;
let pedidoEmCancelamento = null;

function renderizarTabelaBalcao(filtro = 'todos') {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  let pedidosFiltrados = [...APP_STORE.pedidos];

  if (filtro === 'PRONTO') {
    pedidosFiltrados = pedidosFiltrados.filter(p => p.situacaoPreparo === 'PRONTO');
  } else if (filtro === 'EM_ANDAMENTO') {
    pedidosFiltrados = pedidosFiltrados.filter(p => ['RECEBIDO', 'EM PREPARO'].includes(p.situacaoPreparo));
  } else if (filtro === 'CONCLUÍDO') {
    pedidosFiltrados = pedidosFiltrados.filter(p => p.situacaoPreparo === 'CONCLUÍDO');
  } else if (filtro === 'CANCELADO') {
    pedidosFiltrados = pedidosFiltrados.filter(p => p.situacaoPreparo === 'CANCELADO');
  }

  // Ordena por data decrescente
  pedidosFiltrados.sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

  if (pedidosFiltrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--color-muted);">Nenhum pedido encontrado para o filtro selecionado.</td></tr>`;
    return;
  }

  tbody.innerHTML = pedidosFiltrados.map(pedido => {
    const dataHoraStr = new Date(pedido.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const localStr = pedido.tipoAtendimento === 'Mesa' ? `🍽️ ${pedido.numeroMesa}` : '🚶 Balcão';

    // Badge da Situação de Preparo (RNF06: Texto claro sem depender de cor)
    let preparoBadgeClass = 'badge--warning';
    if (pedido.situacaoPreparo === 'RECEBIDO') preparoBadgeClass = 'badge--accent';
    if (pedido.situacaoPreparo === 'EM PREPARO') preparoBadgeClass = 'badge--primary';
    if (pedido.situacaoPreparo === 'PRONTO') preparoBadgeClass = 'badge--success';
    if (pedido.situacaoPreparo === 'CONCLUÍDO') preparoBadgeClass = 'badge--success';
    if (pedido.situacaoPreparo === 'CANCELADO') preparoBadgeClass = 'badge--danger';

    // Badge da Situação de Pagamento (RF07, RN13)
    const pagamentoBadgeClass = pedido.situacaoPagamento === 'PAGO' ? 'badge--success' : 'badge--warning';

    // Ações permitidas conforme UC02 e UC03
    let botoesAcao = `
      <button type="button" class="btn btn--secondary btn--sm" onclick="abrirModalHistorico(${pedido.idPedido})" title="Auditoria e Histórico">
        📜 Histórico
      </button>
    `;

    // UC03: Finalizar se estiver PRONTO
    if (pedido.situacaoPreparo === 'PRONTO') {
      botoesAcao += `
        <button type="button" class="btn btn--success btn--sm" onclick="abrirModalFinalizar(${pedido.idPedido})">
          📦 Finalizar Entrega (UC03)
        </button>
      `;
    }

    // RN13: Se o pedido foi concluído mas o pagamento ficou PENDENTE, permite registrar o pagamento
    if (pedido.situacaoPreparo === 'CONCLUÍDO' && pedido.situacaoPagamento === 'PENDENTE') {
      botoesAcao += `
        <button type="button" class="btn btn--primary btn--sm" onclick="registrarPagamentoPosterior(${pedido.idPedido})" title="Registrar Pagamento sem reabrir pedido">
          💰 Registrar Pagamento (RF07)
        </button>
      `;
    }

    // RN11: Cancelamento (apenas pedidos ativos: RECEBIDO, EM PREPARO ou PRONTO)
    if (['RECEBIDO', 'EM PREPARO', 'PRONTO'].includes(pedido.situacaoPreparo)) {
      botoesAcao += `
        <button type="button" class="btn btn--secondary btn--sm" style="color: var(--color-danger);" onclick="abrirModalCancelar(${pedido.idPedido})">
          ✕ Cancelar
        </button>
      `;
    }

    const resumoItens = pedido.itens.map(i => `${i.quantidade}x ${i.nomeProduto}`).join(', ');

    return `
      <tr>
        <td><strong>#${pedido.numero}</strong></td>
        <td><small>${dataHoraStr}</small></td>
        <td>${localStr}</td>
        <td><small style="max-width: 250px; display: block; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${resumoItens}">${resumoItens}</small></td>
        <td><strong>R$ ${pedido.valorTotal.toFixed(2).replace('.', ',')}</strong></td>
        <td><span class="badge ${preparoBadgeClass}">${pedido.situacaoPreparo}</span></td>
        <td><span class="badge ${pagamentoBadgeClass}">${pedido.situacaoPagamento}</span></td>
        <td>
          <div class="action-buttons-group">
            ${botoesAcao}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function inicializarModaisAcoes() {
  // Filtros da Tabela
  const filterBtns = document.querySelectorAll('[data-table-filter]');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('seg-btn--active'));
      btn.classList.add('seg-btn--active');
      renderizarTabelaBalcao(btn.dataset.tableFilter);
    });
  });

  // Modal Finalizar (UC03)
  const finalizeModal = document.getElementById('finalizeOrderModal');
  const closeFinalize = document.getElementById('closeFinalizeModalBtn');
  const cancelFinalize = document.getElementById('btnCancelFinalizeModal');
  const submitFinalize = document.getElementById('btnSubmitFinalizeOrder');

  closeFinalize?.addEventListener('click', () => finalizeModal.classList.remove('modal-overlay--active'));
  cancelFinalize?.addEventListener('click', () => finalizeModal.classList.remove('modal-overlay--active'));
  submitFinalize?.addEventListener('click', confirmarFinalizacaoUC03);

  // Modal Cancelar (UC02 - RN11)
  const cancelModal = document.getElementById('cancelOrderModal');
  const closeCancel = document.getElementById('closeCancelModalBtn');
  const dismissCancel = document.getElementById('btnDismissCancelModal');
  const submitCancel = document.getElementById('btnSubmitCancelOrder');

  closeCancel?.addEventListener('click', () => cancelModal.classList.remove('modal-overlay--active'));
  dismissCancel?.addEventListener('click', () => cancelModal.classList.remove('modal-overlay--active'));
  submitCancel?.addEventListener('click', confirmarCancelamentoUC02);

  // Modal Histórico (HistoricoStatus)
  const historyModal = document.getElementById('historyModal');
  const closeHistory = document.getElementById('closeHistoryModalBtn');
  const closeHistoryBtn = document.getElementById('btnCloseHistoryModal');

  closeHistory?.addEventListener('click', () => historyModal.classList.remove('modal-overlay--active'));
  closeHistoryBtn?.addEventListener('click', () => historyModal.classList.remove('modal-overlay--active'));
}

/* Abrir Modal Finalizar (UC03) */
window.abrirModalFinalizar = function(idPedido) {
  // Precondição: Atendente autenticado
  if (!APP_STORE.usuarioLogado || !APP_STORE.usuarioLogado.verificarPermissao('FINALIZAR_PEDIDO')) {
    mostrarToast('Acesso Negado: Apenas Atendente ou Gerente podem finalizar pedidos.', 'error');
    return;
  }

  const pedido = APP_STORE.pedidos.find(p => p.idPedido === idPedido);
  if (!pedido) return;

  // RN09-RN12: Só concluir pedido PRONTO
  if (pedido.situacaoPreparo !== 'PRONTO') {
    mostrarToast('Impedimento (RN12): Apenas pedidos com status PRONTO podem ser finalizados.', 'error');
    return;
  }

  pedidoEmFinalizacao = pedido;
  const modal = document.getElementById('finalizeOrderModal');
  const detailsBox = document.getElementById('finalizeOrderDetails');
  const checkDelivery = document.getElementById('checkConfirmDelivery');
  const errorBox = document.getElementById('finalizeModalError');

  errorBox.style.display = 'none';
  checkDelivery.checked = false;

  detailsBox.innerHTML = `
    <div style="background: rgba(0,0,0,0.03); padding: 12px; border-radius: var(--radius-sm);">
      <div style="display: flex; justify-content: space-between; font-weight: 800; margin-bottom: 6px;">
        <span>Pedido #${pedido.numero} (${pedido.tipoAtendimento})</span>
        <span style="color: var(--color-primary);">R$ ${pedido.valorTotal.toFixed(2).replace('.', ',')}</span>
      </div>
      <div style="font-size: 0.85rem; color: var(--color-muted);">
        Itens: ${pedido.itens.map(i => `${i.quantidade}x ${i.nomeProduto}`).join(', ')}
      </div>
    </div>
  `;

  modal.classList.add('modal-overlay--active');
};

function confirmarFinalizacaoUC03() {
  const errorBox = document.getElementById('finalizeModalError');
  const checkDelivery = document.getElementById('checkConfirmDelivery');
  const paymentSelect = document.getElementById('selectPaymentStatus');

  errorBox.style.display = 'none';

  // Validação estrita da entrega (RN12)
  if (!checkDelivery.checked) {
    errorBox.textContent = 'Impedimento (RN12): É obrigatório confirmar que o pedido foi devidamente entregue ao cliente.';
    errorBox.style.display = 'block';
    return;
  }

  if (!pedidoEmFinalizacao) return;

  const situacaoAnterior = pedidoEmFinalizacao.situacaoPreparo;
  pedidoEmFinalizacao.situacaoPreparo = 'CONCLUÍDO';
  pedidoEmFinalizacao.entregueAoCliente = true;
  pedidoEmFinalizacao.situacaoPagamento = paymentSelect.value; // RN13: Preserva PAGO ou PENDENTE

  // Registra no histórico
  const historicoEntry = new HistoricoStatus(
    Date.now(),
    pedidoEmFinalizacao.idPedido,
    APP_STORE.usuarioLogado.id,
    APP_STORE.usuarioLogado.nome,
    APP_STORE.usuarioLogado.cargo,
    situacaoAnterior,
    'CONCLUÍDO'
  );
  APP_STORE.historico.push(historicoEntry);

  salvarEstadoPersistido();
  renderizarKDS();
  renderizarTabelaBalcao('todos');
  renderizarPainelGerencial();
  atualizarBadgesHeader();

  document.getElementById('finalizeOrderModal').classList.remove('modal-overlay--active');
  mostrarToast(`Pedido #${pedidoEmFinalizacao.numero} finalizado com sucesso (CONCLUÍDO)!`, 'success');
  pedidoEmFinalizacao = null;
}

/* RN13: Registrar pagamento posterior em pedido concluído sem alterar status */
window.registrarPagamentoPosterior = function(idPedido) {
  if (!APP_STORE.usuarioLogado || !APP_STORE.usuarioLogado.verificarPermissao('REGISTRAR_PAGAMENTO')) {
    mostrarToast('Acesso Negado: Apenas Atendente ou Gerente podem registrar pagamentos.', 'error');
    return;
  }

  const pedido = APP_STORE.pedidos.find(p => p.idPedido === idPedido);
  if (!pedido) return;

  pedido.situacaoPagamento = 'PAGO';

  // Registra alteração de pagamento no histórico sem alterar a situação CONCLUÍDO
  const historicoEntry = new HistoricoStatus(
    Date.now(),
    pedido.idPedido,
    APP_STORE.usuarioLogado.id,
    APP_STORE.usuarioLogado.nome,
    APP_STORE.usuarioLogado.cargo,
    'PAGAMENTO PENDENTE',
    'PAGAMENTO PAGO (RN13)'
  );
  APP_STORE.historico.push(historicoEntry);

  salvarEstadoPersistido();
  renderizarTabelaBalcao('todos');
  renderizarPainelGerencial();
  mostrarToast(`Pagamento do Pedido #${pedido.numero} registrado como PAGO com sucesso!`, 'success');
};

/* Cancelamento de Pedido (UC02 - RN11) */
window.abrirModalCancelar = function(idPedido) {
  if (!APP_STORE.usuarioLogado || !APP_STORE.usuarioLogado.verificarPermissao('CANCELAR_PEDIDO')) {
    mostrarToast('Acesso Negado (RN11): Apenas o Atendente pode solicitar cancelamento de pedido.', 'error');
    return;
  }

  const pedido = APP_STORE.pedidos.find(p => p.idPedido === idPedido);
  if (!pedido) return;

  // RN11: Não pode cancelar CONCLUÍDO nem CANCELADO
  if (['CONCLUÍDO', 'CANCELADO'].includes(pedido.situacaoPreparo)) {
    mostrarToast('Impedimento (RN11): Pedidos CONCLUÍDOS ou CANCELADOS não mudam de situação.', 'error');
    return;
  }

  pedidoEmCancelamento = pedido;
  const modal = document.getElementById('cancelOrderModal');
  const detailsBox = document.getElementById('cancelOrderDetails');
  const reasonInput = document.getElementById('inputCancelReason');
  const errorBox = document.getElementById('cancelModalError');

  errorBox.style.display = 'none';
  reasonInput.value = '';

  detailsBox.innerHTML = `
    <div style="background: rgba(0,0,0,0.03); padding: 12px; border-radius: var(--radius-sm); margin-top: 10px;">
      <strong>Pedido #${pedido.numero} — Situação Atual: ${pedido.situacaoPreparo}</strong>
      <div style="font-size: 0.85rem; color: var(--color-muted); margin-top: 4px;">
        Total: R$ ${pedido.valorTotal.toFixed(2).replace('.', ',')} | Atendente: ${pedido.nomeAtendente}
      </div>
    </div>
  `;

  modal.classList.add('modal-overlay--active');
};

function confirmarCancelamentoUC02() {
  const reasonInput = document.getElementById('inputCancelReason');
  const errorBox = document.getElementById('cancelModalError');

  if (!reasonInput.value.trim()) {
    errorBox.textContent = 'Erro: Informe o motivo do cancelamento.';
    errorBox.style.display = 'block';
    return;
  }

  if (!pedidoEmCancelamento) return;

  const situacaoAnterior = pedidoEmCancelamento.situacaoPreparo;
  pedidoEmCancelamento.situacaoPreparo = 'CANCELADO';
  pedidoEmCancelamento.motivoCancelamento = reasonInput.value.trim();

  // Devolve o estoque dos produtos
  pedidoEmCancelamento.itens.forEach(item => {
    const prod = APP_STORE.produtos.find(p => p.id === item.idProduto);
    if (prod) prod.quantidadeEstoque += item.quantidade;
  });

  // Registra no histórico (HistoricoStatus)
  const historicoEntry = new HistoricoStatus(
    Date.now(),
    pedidoEmCancelamento.idPedido,
    APP_STORE.usuarioLogado.id,
    APP_STORE.usuarioLogado.nome,
    APP_STORE.usuarioLogado.cargo,
    situacaoAnterior,
    `CANCELADO (${reasonInput.value.trim()})`
  );
  APP_STORE.historico.push(historicoEntry);

  salvarEstadoPersistido();
  renderizarProdutosPDV();
  renderizarKDS();
  renderizarTabelaBalcao('todos');
  renderizarPainelGerencial();
  atualizarBadgesHeader();

  document.getElementById('cancelOrderModal').classList.remove('modal-overlay--active');
  mostrarToast(`Pedido #${pedidoEmCancelamento.numero} foi CANCELADO e registrado no histórico.`, 'error');
  pedidoEmCancelamento = null;
}

/* Modal Auditoria / Histórico (HistoricoStatus / HistoricoPedidos) */
window.abrirModalHistorico = function(idPedido) {
  const pedido = APP_STORE.pedidos.find(p => p.idPedido === idPedido);
  if (!pedido) return;

  const modal = document.getElementById('historyModal');
  const metaBox = document.getElementById('historyOrderMeta');
  const tbody = document.getElementById('historyTableBody');

  const entradasHistorico = APP_STORE.historico.filter(h => h.idPedido === idPedido);
  entradasHistorico.sort((a, b) => new Date(a.dataHoraMudanca) - new Date(b.dataHoraMudanca));

  metaBox.innerHTML = `
    <div style="background: var(--color-surface-hover); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--color-line);">
      <div style="display: flex; justify-content: space-between; font-weight: 800;">
        <span>Pedido #${pedido.numero} (${pedido.tipoAtendimento})</span>
        <span>Total: R$ ${pedido.valorTotal.toFixed(2).replace('.', ',')}</span>
      </div>
      <div style="font-size: 0.85rem; color: var(--color-muted); margin-top: 4px;">
        Situação Atual: <strong>${pedido.situacaoPreparo}</strong> | Pagamento: <strong>${pedido.situacaoPagamento}</strong>
      </div>
    </div>
  `;

  tbody.innerHTML = entradasHistorico.map(h => {
    const hora = new Date(h.dataHoraMudanca).toLocaleString('pt-BR');
    return `
      <tr>
        <td>${hora}</td>
        <td><span class="badge badge--warning">${h.situacaoAnterior}</span></td>
        <td><span class="badge badge--success">${h.situacaoNova}</span></td>
        <td>${h.nomeFuncionario} <small class="text-muted">(${h.cargoFuncionario})</small></td>
      </tr>
    `;
  }).join('');

  modal.classList.add('modal-overlay--active');
};

/* --------------------------------------------------------------------------
   9. VITRINE & CARDÁPIO ONLINE (RF09)
   -------------------------------------------------------------------------- */

function renderizarVitrineCardapio(filtro = 'todos', busca = '') {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;

  let produtosFiltrados = filtro === 'todos'
    ? APP_STORE.produtos
    : APP_STORE.produtos.filter(p => p.categoria === filtro);

  if (busca) {
    produtosFiltrados = produtosFiltrados.filter(p =>
      p.nome.toLowerCase().includes(busca) ||
      p.descricao.toLowerCase().includes(busca) ||
      p.ingredientes.some(ing => ing.toLowerCase().includes(busca))
    );
  }

  if (produtosFiltrados.length === 0) {
    grid.innerHTML = '<p class="text-muted" style="grid-column: 1/-1; text-align: center; padding: 40px;">Nenhum produto encontrado para os filtros selecionados.</p>';
    return;
  }

  grid.innerHTML = produtosFiltrados.map(prod => `
    <article class="menu-card" data-id="${prod.id}">
      <div class="menu-card__media">
        <span class="badge ${prod.tagClass} menu-card__tag">${prod.tag}</span>
        <img class="menu-card__image" src="${prod.imagem}" alt="${prod.nome}" loading="lazy" width="400" height="250">
      </div>
      <div class="menu-card__content">
        <div class="menu-card__header">
          <h3 class="menu-card__title">${prod.nome}</h3>
          <span class="menu-card__price">R$ ${prod.preco.toFixed(2).replace('.', ',')}</span>
        </div>
        <p class="menu-card__desc">${prod.descricao}</p>
        <div class="menu-card__footer">
          <span class="badge ${prod.ativo && prod.quantidadeEstoque > 0 ? 'badge--success' : 'badge--danger'}">
            ${prod.ativo && prod.quantidadeEstoque > 0 ? `Estoque: ${prod.quantidadeEstoque}` : (prod.ativo ? 'Esgotado' : 'Indisponível')}
          </span>
          <button type="button" class="btn btn--primary btn--sm btn-open-customizer" data-id="${prod.id}" ${!prod.ativo || prod.quantidadeEstoque <= 0 ? 'disabled' : ''}>
            ${prod.ativo && prod.quantidadeEstoque > 0 ? 'Personalizar & Pedir' : 'Indisponível'}
          </button>
        </div>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.btn-open-customizer').forEach(btn => {
    btn.addEventListener('click', () => {
      const prodId = parseInt(btn.dataset.id, 10);
      abrirCustomizadorVitrine(prodId);
    });
  });
}

function inicializarVitrineFiltros() {
  const btns = document.querySelectorAll('.menu-filters .filter-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('filter-btn--active'));
      btn.classList.add('filter-btn--active');
      APP_STORE.filtroCategoriaVitrine = btn.dataset.filter;
      renderizarVitrineCardapio(APP_STORE.filtroCategoriaVitrine, APP_STORE.buscaVitrine);
    });
  });
}

let itemVitrineCustomizando = null;
let qtdVitrine = 1;

function abrirCustomizadorVitrine(prodId) {
  const produto = APP_STORE.produtos.find(p => p.id === prodId);
  if (!produto || !produto.ativo || produto.quantidadeEstoque <= 0) return;

  itemVitrineCustomizando = produto;
  qtdVitrine = 1;

  const modal = document.getElementById('customizerModal');
  const title = document.getElementById('modalProductTitle');
  const desc = document.getElementById('modalProductDesc');
  const options = document.getElementById('modalOptionsContainer');

  title.textContent = produto.nome;
  desc.textContent = produto.descricao;

  options.innerHTML = `
    <div class="form-field">
      <label class="form-label-sm">1. Escolha o Pão:</label>
      <div class="option-pills">
        <label class="pill-option">
          <input type="radio" name="vitrineBread" value="Pão Brioche Selado" checked>
          <span>Brioche Selado na Manteiga</span>
        </label>
        <label class="pill-option">
          <input type="radio" name="vitrineBread" value="Pão Tradicional">
          <span>Pão Tradicional de Hot Dog</span>
        </label>
      </div>
    </div>

    <div class="form-field" style="margin-top: 14px;">
      <label class="form-label-sm">2. Adicionais Pagos (RF03, RF04):</label>
      <div class="checkbox-tags">
        ${APP_STORE.adicionais.map(ad => `
          <label class="tag-checkbox">
            <span>+ ${ad.nome} (+ R$ ${ad.preco.toFixed(2).replace('.', ',')})</span>
            <input type="checkbox" class="vitrine-extra-check" data-id="${ad.id}" data-name="${ad.nome}" data-price="${ad.preco}">
          </label>
        `).join('')}
      </div>
    </div>
  `;

  options.querySelectorAll('input').forEach(i => i.addEventListener('change', atualizarPrecoVitrineModal));
  atualizarPrecoVitrineModal();

  modal.classList.add('modal-overlay--active');
}

function atualizarPrecoVitrineModal() {
  if (!itemVitrineCustomizando) return;
  let unit = itemVitrineCustomizando.preco;

  document.querySelectorAll('.vitrine-extra-check:checked').forEach(c => {
    unit += parseFloat(c.dataset.price);
  });

  const total = unit * qtdVitrine;
  document.getElementById('qtyValue').textContent = qtdVitrine;
  document.getElementById('modalTotalPrice').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// Fechamento e Adição do Customizador Vitrine
const closeModalBtn = document.getElementById('closeModalBtn');
closeModalBtn?.addEventListener('click', () => {
  document.getElementById('customizerModal')?.classList.remove('modal-overlay--active');
});

const qtyMinusVitrine = document.getElementById('qtyMinus');
const qtyPlusVitrine = document.getElementById('qtyPlus');
qtyMinusVitrine?.addEventListener('click', () => {
  if (qtdVitrine > 1) {
    qtdVitrine--;
    atualizarPrecoVitrineModal();
  }
});
qtyPlusVitrine?.addEventListener('click', () => {
  qtdVitrine++;
  atualizarPrecoVitrineModal();
});

const btnAddCartVitrine = document.getElementById('addToCartModalBtn');
btnAddCartVitrine?.addEventListener('click', () => {
  if (!itemVitrineCustomizando) return;

  const breadRadio = document.querySelector('input[name="vitrineBread"]:checked');
  const pao = breadRadio ? breadRadio.value : 'Pão Brioche';

  const extras = [];
  document.querySelectorAll('.vitrine-extra-check:checked').forEach(c => {
    extras.push({ id: parseInt(c.dataset.id, 10), nome: c.dataset.name, preco: parseFloat(c.dataset.price) });
  });

  let unit = itemVitrineCustomizando.preco + extras.reduce((s, e) => s + e.preco, 0);

  APP_STORE.carrinhoVitrine.push({
    id: Date.now(),
    nome: itemVitrineCustomizando.nome,
    pao,
    extras,
    quantidade: qtdVitrine,
    unitPrice: unit,
    totalPrice: unit * qtdVitrine
  });

  document.getElementById('customizerModal')?.classList.remove('modal-overlay--active');
  atualizarBadgesHeader();
  abrirDrawerCarrinho();
  renderizarCarrinhoDrawer();
  mostrarToast(`"${itemVitrineCustomizando.nome}" adicionado ao carrinho!`, 'info');
});

/* Drawer do Carrinho Online */
const cartTrigger = document.getElementById('cartTrigger');
const heroCartBtn = document.getElementById('heroCartBtn');
const cartDrawer = document.getElementById('cartDrawer');
const closeCartBtn = document.getElementById('closeCartBtn');

cartTrigger?.addEventListener('click', abrirDrawerCarrinho);
heroCartBtn?.addEventListener('click', abrirDrawerCarrinho);
closeCartBtn?.addEventListener('click', () => cartDrawer?.classList.remove('cart-drawer--active'));

function abrirDrawerCarrinho() {
  cartDrawer?.classList.add('cart-drawer--active');
  renderizarCarrinhoDrawer();
}

function renderizarCarrinhoDrawer() {
  const container = document.getElementById('cartItemsList');
  const totalAmountEl = document.getElementById('cartTotalAmount');

  if (!container) return;

  if (APP_STORE.carrinhoVitrine.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: var(--color-muted);">
        <span style="font-size: 3rem; display: block; margin-bottom: 10px;">🌭</span>
        <p>Seu carrinho online está vazio.</p>
      </div>
    `;
    if (totalAmountEl) totalAmountEl.textContent = 'R$ 0,00';
    return;
  }

  let totalGeral = 0;
  container.innerHTML = APP_STORE.carrinhoVitrine.map((item, idx) => {
    totalGeral += item.totalPrice;
    return `
      <div class="pdv-ticket-item">
        <div class="pdv-ticket-item__details">
          <div class="pdv-ticket-item__title">${item.quantidade}x ${item.nome}</div>
          <div class="pdv-ticket-item__sub">Pão: ${item.pao}</div>
          ${item.extras.length > 0 ? `<div class="pdv-ticket-item__sub pdv-ticket-item__sub--extra">+ ${item.extras.map(e => e.nome).join(', ')}</div>` : ''}
          <div style="font-weight: 700; margin-top: 4px;">R$ ${item.totalPrice.toFixed(2).replace('.', ',')}</div>
        </div>
        <button type="button" class="pdv-ticket-item__del" onclick="removerItemCarrinhoVitrine(${idx})">✕</button>
      </div>
    `;
  }).join('');

  if (totalAmountEl) totalAmountEl.textContent = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
}

window.removerItemCarrinhoVitrine = function(idx) {
  APP_STORE.carrinhoVitrine.splice(idx, 1);
  atualizarBadgesHeader();
  renderizarCarrinhoDrawer();
};

// 1. Finalização do Pedido pelo Cliente (Simulação 100% Client-Side no LocalStorage)
const btnConfirmClientOrder = document.getElementById('btnConfirmClientOrder');
btnConfirmClientOrder?.addEventListener('click', () => {
  if (APP_STORE.carrinhoVitrine.length === 0) {
    mostrarToast('Adicione ao menos um item ao carrinho antes de finalizar.', 'error');
    return;
  }

  // RNF07: Prevenção de cliques repetidos (Anti-duplo clique / pedido duplicado)
  if (btnConfirmClientOrder.disabled) return;
  btnConfirmClientOrder.disabled = true;
  const conteudoOriginalBtn = btnConfirmClientOrder.innerHTML;
  btnConfirmClientOrder.innerHTML = '<span>⏳ Processando Pedido Único...</span>';

  const nome = document.getElementById('checkoutName')?.value.trim() || 'Lucas Silva (Cliente)';
  const cpf = document.getElementById('checkoutCpf')?.value.trim() || '111.222.333-44';
  const modalidade = document.getElementById('checkoutOrderType')?.value || 'Balcão / Retirada';
  const formaPag = document.getElementById('checkoutPayment')?.value || 'Pix';

  // Converte itens do carrinho para o formato de itens do pedido
  const itensPedido = APP_STORE.carrinhoVitrine.map((item, idx) => {
    return new ItemPedido(
      Date.now() + idx,
      item.id,
      item.nome,
      item.quantidade,
      item.unitPrice,
      [],
      item.pao,
      item.extras.map(e => new ItemAdicional(Date.now() + Math.random(), e.id, e.nome, 1, e.preco)),
      `Pedido Web (${cpf})`
    );
  });

  const numeroPedido = APP_STORE.proximoNumeroPedido++;
  const idPedido = Date.now();

  const novoPedido = new Pedido(
    idPedido,
    numeroPedido,
    0, // ID Cliente
    'Autoatendimento / Online',
    modalidade,
    null,
    null,
    `CPF: ${cpf}`,
    itensPedido,
    nome,
    formaPag
  );

  const historicoInicial = new HistoricoStatus(
    Date.now(),
    idPedido,
    0,
    nome,
    'Cliente',
    'INÍCIO',
    'RECEBIDO'
  );

  APP_STORE.pedidos.push(novoPedido);
  APP_STORE.historico.push(historicoInicial);
  APP_STORE.carrinhoVitrine = [];

  // Salva no LocalStorage do Navegador
  salvarEstadoPersistido();
  tocarAlertaSonoro();

  // Fecha o drawer do carrinho e atualiza as telas
  document.getElementById('cartDrawer')?.classList.remove('cart-drawer--active');
  atualizarBadgesHeader();
  renderizarKDS();
  renderizarTabelaBalcao('todos');
  renderizarPainelGerencial();

  mostrarToast(`🎉 Pedido #${numeroPedido} gravado no LocalStorage como "RECEBIDO"!`, 'success');
  mostrarToast(`👉 Simulação: Alterne para o perfil "Atendente" ou "Chefe de Cozinha" no menu superior para ver a esteira em tempo real!`, 'info');

  btnConfirmClientOrder.disabled = false;
  btnConfirmClientOrder.innerHTML = conteudoOriginalBtn;
});

// 2. Encaminhamento do Pedido para o WhatsApp
function encaminharPedidoWhatsApp(pedido) {
  if (!pedido) return;
  const telefone = '5562994866465';
  let msg = `*🌭 NOVO PEDIDO #${pedido.numero} - HOT DOG DO ZÉ*\n`;
  msg += `*Cliente:* ${pedido.nomeCliente || 'Cliente'}\n`;
  msg += `*Modalidade:* ${pedido.tipoAtendimento}${pedido.numeroMesa ? ` (Mesa ${pedido.numeroMesa})` : ''}\n`;
  msg += `*Forma de Pagamento:* ${pedido.formaPagamento || 'Pix'}\n`;
  msg += `*Situação Atual:* ${pedido.situacaoPreparo}\n\n`;
  msg += `*ITENS DO PEDIDO:*\n`;

  pedido.itens.forEach((it, idx) => {
    msg += `${idx + 1}. ${it.quantidade}x ${it.nomeProduto} - R$ ${it.valorTotalItem.toFixed(2).replace('.', ',')}\n`;
    if (it.pao) msg += `   🍞 Pão: ${it.pao}\n`;
    if (it.adicionais && it.adicionais.length > 0) {
      msg += `   ➕ Extras: ${it.adicionais.map(a => a.nome).join(', ')}\n`;
    }
    if (it.ingredientesRemovidos && it.ingredientesRemovidos.length > 0) {
      msg += `   ➖ Sem: ${it.ingredientesRemovidos.join(', ')}\n`;
    }
    if (it.observacao) msg += `   📝 Obs: ${it.observacao}\n`;
  });

  msg += `\n*TOTAL A PAGAR: R$ ${pedido.valorTotal.toFixed(2).replace('.', ',')}*`;
  window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// 3. Botão WhatsApp do Carrinho Online
const btnCheckoutWhatsApp = document.getElementById('checkoutWhatsAppBtn');
btnCheckoutWhatsApp?.addEventListener('click', () => {
  if (APP_STORE.carrinhoVitrine.length === 0) {
    mostrarToast('Adicione ao menos um item ao carrinho primeiro.', 'error');
    return;
  }

  const nome = document.getElementById('checkoutName')?.value.trim() || 'Cliente';
  const tipo = document.getElementById('checkoutOrderType')?.value || 'Balcão / Retirada';
  const pag = document.getElementById('checkoutPayment')?.value || 'Pix';

  let msg = `*🌭 NOVO PEDIDO - HOT DOG DO ZÉ*\n`;
  msg += `*Cliente:* ${nome}\n*Modalidade:* ${tipo}\n`;
  msg += `*Pagamento:* ${pag}\n\n*ITENS:*\n`;

  let total = 0;
  APP_STORE.carrinhoVitrine.forEach((item, i) => {
    total += item.totalPrice;
    msg += `${i + 1}. ${item.quantidade}x ${item.nome} (${item.pao}) - R$ ${item.totalPrice.toFixed(2).replace('.', ',')}\n`;
    if (item.extras.length > 0) msg += `   + Extras: ${item.extras.map(e => e.nome).join(', ')}\n`;
  });

  msg += `\n*TOTAL: R$ ${total.toFixed(2).replace('.', ',')}*`;
  window.open(`https://wa.me/5562994866465?text=${encodeURIComponent(msg)}`, '_blank');
});

/* --------------------------------------------------------------------------
   10. MÓDULO GERENCIAL, RELATÓRIO DO DIA & CRUD DE CARDÁPIO (RF01, RF08, RF10)
   -------------------------------------------------------------------------- */

function renderizarPainelGerencial() {
  const kpiTotal = document.getElementById('kpiTotalRevenue');
  const kpiPaid = document.getElementById('kpiPaidRevenue');
  const kpiPending = document.getElementById('kpiPendingRevenue');
  const kpiOrders = document.getElementById('kpiOrdersCount');
  const rankingList = document.getElementById('rankingTopProductsList');

  if (!kpiTotal || !kpiPaid || !kpiPending || !kpiOrders) return;

  const pedidosValidos = APP_STORE.pedidos.filter(p => p.situacaoPreparo !== 'CANCELADO');

  // Cálculos de faturamento e valores recebidos (RF08)
  const faturamentoTotal = pedidosValidos.reduce((acc, p) => acc + p.valorTotal, 0);
  const totalRecebidoPago = pedidosValidos.filter(p => p.situacaoPagamento === 'PAGO').reduce((acc, p) => acc + p.valorTotal, 0);
  const totalPendente = pedidosValidos.filter(p => p.situacaoPagamento === 'PENDENTE').reduce((acc, p) => acc + p.valorTotal, 0);

  kpiTotal.textContent = `R$ ${faturamentoTotal.toFixed(2).replace('.', ',')}`;
  kpiPaid.textContent = `R$ ${totalRecebidoPago.toFixed(2).replace('.', ',')}`;
  kpiPending.textContent = `R$ ${totalPendente.toFixed(2).replace('.', ',')}`;
  kpiOrders.textContent = APP_STORE.pedidos.length;

  // Ranking de Produtos Mais Vendidos por Dia (RF08)
  const contagemVendas = {};
  pedidosValidos.forEach(pedido => {
    pedido.itens.forEach(item => {
      contagemVendas[item.nomeProduto] = (contagemVendas[item.nomeProduto] || 0) + item.quantidade;
    });
  });

  const rankingOrdenado = Object.entries(contagemVendas).sort((a, b) => b[1] - a[1]);
  const maxVendas = rankingOrdenado.length > 0 ? rankingOrdenado[0][1] : 1;

  if (rankingList) {
    if (rankingOrdenado.length === 0) {
      rankingList.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">Nenhuma venda registrada ainda hoje.</p>';
    } else {
      rankingList.innerHTML = rankingOrdenado.map(([nome, qtd], index) => {
        const percentual = Math.round((qtd / maxVendas) * 100);
        return `
          <div class="ranking-item">
            <div class="ranking-item__header">
              <span>#${index + 1} ${nome}</span>
              <span class="badge badge--primary">${qtd} unidade(s)</span>
            </div>
            <div class="ranking-progress-bar">
              <div class="ranking-progress-fill" style="width: ${percentual}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Renderiza tabelas de gerenciamento de cardápio e adicionais
  renderizarTabelaProdutosGerente();
  renderizarTabelaAdicionaisGerente();
}

function renderizarTabelaProdutosGerente() {
  const tbody = document.getElementById('managerProductsTableBody');
  if (!tbody) return;

  tbody.innerHTML = APP_STORE.produtos.map(p => {
    return `
      <tr>
        <td><strong>${p.nome}</strong></td>
        <td><span style="text-transform: capitalize; font-size: 0.8rem; color: var(--color-muted);">${p.categoria}</span></td>
        <td><strong>R$ ${p.preco.toFixed(2).replace('.', ',')}</strong></td>
        <td><span class="badge ${p.quantidadeEstoque > 5 ? 'badge--success' : (p.quantidadeEstoque > 0 ? 'badge--warning' : 'badge--danger')}">${p.quantidadeEstoque} un</span></td>
        <td><span class="badge ${p.ativo ? 'badge--success' : 'badge--danger'}">${p.ativo ? 'Ativo' : 'Desativado'}</span></td>
        <td>
          <div class="action-buttons-group">
            <button type="button" class="btn btn--secondary btn--sm" onclick="editarProdutoGerente(${p.id})">✏️ Editar</button>
            <button type="button" class="btn ${p.ativo ? 'btn--secondary' : 'btn--success'} btn--sm" onclick="toggleProdutoAtivoGerente(${p.id})">
              ${p.ativo ? '🚫 Desativar' : '✅ Ativar'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderizarTabelaAdicionaisGerente() {
  const tbody = document.getElementById('managerExtrasTableBody');
  if (!tbody) return;

  tbody.innerHTML = APP_STORE.adicionais.map(ad => {
    return `
      <tr>
        <td><strong>${ad.nome}</strong></td>
        <td><strong>R$ ${ad.preco.toFixed(2).replace('.', ',')}</strong></td>
        <td>
          <div class="action-buttons-group">
            <button type="button" class="btn btn--secondary btn--sm" onclick="editarAdicionalGerente(${ad.id})">✏️ Editar</button>
            <button type="button" class="btn btn--secondary btn--sm" style="color: var(--color-danger);" onclick="removerAdicionalGerente(${ad.id})">🗑️ Excluir</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function inicializarModaisGerente() {
  // Modal de Produto (RF01, RF10)
  const prodModal = document.getElementById('productFormModal');
  const btnOpenProd = document.getElementById('btnOpenNewProductModal');
  const closeProdBtn = document.getElementById('closeProductFormModalBtn');
  const cancelProdBtn = document.getElementById('btnCancelProductForm');
  const saveProdBtn = document.getElementById('btnSaveProductForm');

  btnOpenProd?.addEventListener('click', () => {
    document.getElementById('inputProductId').value = '';
    document.getElementById('productFormModalTitle').textContent = 'Cadastrar Novo Produto (RF01)';
    document.getElementById('inputProductName').value = '';
    document.getElementById('selectProductCategory').value = 'favoritos';
    document.getElementById('inputProductPrice').value = '';
    document.getElementById('inputProductStock').value = '30';
    document.getElementById('inputProductTag').value = 'Especial ✨';
    document.getElementById('inputProductDesc').value = '';
    document.getElementById('inputProductIngredients').value = '';
    document.getElementById('productFormError').style.display = 'none';
    prodModal.classList.add('modal-overlay--active');
  });

  closeProdBtn?.addEventListener('click', () => prodModal.classList.remove('modal-overlay--active'));
  cancelProdBtn?.addEventListener('click', () => prodModal.classList.remove('modal-overlay--active'));
  saveProdBtn?.addEventListener('click', salvarFormularioProduto);

  // Modal de Adicional (RF01)
  const extraModal = document.getElementById('extraFormModal');
  const btnOpenExtra = document.getElementById('btnOpenNewExtraModal');
  const closeExtraBtn = document.getElementById('closeExtraFormModalBtn');
  const cancelExtraBtn = document.getElementById('btnCancelExtraForm');
  const saveExtraBtn = document.getElementById('btnSaveExtraForm');

  btnOpenExtra?.addEventListener('click', () => {
    document.getElementById('inputExtraId').value = '';
    document.getElementById('extraFormModalTitle').textContent = 'Cadastrar Novo Adicional (RF01)';
    document.getElementById('inputExtraName').value = '';
    document.getElementById('inputExtraPrice').value = '';
    document.getElementById('extraFormError').style.display = 'none';
    extraModal.classList.add('modal-overlay--active');
  });

  closeExtraBtn?.addEventListener('click', () => extraModal.classList.remove('modal-overlay--active'));
  cancelExtraBtn?.addEventListener('click', () => extraModal.classList.remove('modal-overlay--active'));
  saveExtraBtn?.addEventListener('click', salvarFormularioAdicional);
}

function salvarFormularioProduto() {
  const idStr = document.getElementById('inputProductId').value;
  const nome = document.getElementById('inputProductName').value.trim();
  const categoria = document.getElementById('selectProductCategory').value;
  const preco = parseFloat(document.getElementById('inputProductPrice').value);
  const estoque = parseInt(document.getElementById('inputProductStock').value, 10);
  const tag = document.getElementById('inputProductTag').value.trim() || 'Artesanal ⭐';
  const descricao = document.getElementById('inputProductDesc').value.trim();
  const ingStr = document.getElementById('inputProductIngredients').value.trim();
  const imagem = document.getElementById('inputProductImage').value.trim();
  const errorBox = document.getElementById('productFormError');

  errorBox.style.display = 'none';

  if (!nome || isNaN(preco) || preco < 0) {
    errorBox.textContent = 'Erro: Informe o nome e um preço válido maior ou igual a zero.';
    errorBox.style.display = 'block';
    return;
  }

  const ingredientes = ingStr ? ingStr.split(',').map(s => s.trim()).filter(Boolean) : [];

  if (idStr) {
    // Editar produto existente (RF10, RN06: pedidos anteriores continuam com seus preços preservados)
    const prod = APP_STORE.produtos.find(p => p.id === parseInt(idStr, 10));
    if (prod) {
      prod.nome = nome;
      prod.categoria = categoria;
      prod.preco = preco;
      prod.quantidadeEstoque = isNaN(estoque) ? prod.quantidadeEstoque : estoque;
      prod.tag = tag;
      prod.descricao = descricao;
      if (ingredientes.length > 0) prod.ingredientes = ingredientes;
      if (imagem) prod.imagem = imagem;
      mostrarToast(`Produto "${prod.nome}" atualizado com sucesso! (RN06: pedidos já efetuados mantêm preço da venda).`, 'success');
    }
  } else {
    // Criar novo produto (RF01)
    const novoId = APP_STORE.produtos.length > 0 ? Math.max(...APP_STORE.produtos.map(p => p.id)) + 1 : 1;
    const novoProduto = new Produto(
      novoId,
      nome,
      categoria,
      preco,
      true,
      isNaN(estoque) ? 30 : estoque,
      ingredientes,
      imagem,
      tag,
      'badge--accent',
      descricao
    );
    APP_STORE.produtos.push(novoProduto);
    mostrarToast(`Novo produto "${nome}" cadastrado com sucesso no cardápio (RF01)!`, 'success');
  }

  salvarEstadoPersistido();
  renderizarVitrineCardapio(APP_STORE.filtroCategoriaVitrine, APP_STORE.buscaVitrine);
  renderizarProdutosPDV(APP_STORE.buscaPDV);
  renderizarPainelGerencial();

  document.getElementById('productFormModal').classList.remove('modal-overlay--active');
}

window.editarProdutoGerente = function(id) {
  const prod = APP_STORE.produtos.find(p => p.id === id);
  if (!prod) return;

  document.getElementById('inputProductId').value = prod.id;
  document.getElementById('productFormModalTitle').textContent = `Editar Produto: ${prod.nome} (RF10)`;
  document.getElementById('inputProductName').value = prod.nome;
  document.getElementById('selectProductCategory').value = prod.categoria;
  document.getElementById('inputProductPrice').value = prod.preco.toFixed(2);
  document.getElementById('inputProductStock').value = prod.quantidadeEstoque;
  document.getElementById('inputProductTag').value = prod.tag;
  document.getElementById('inputProductDesc').value = prod.descricao;
  document.getElementById('inputProductIngredients').value = prod.ingredientes.join(', ');
  document.getElementById('inputProductImage').value = prod.imagem;
  document.getElementById('productFormError').style.display = 'none';

  document.getElementById('productFormModal').classList.add('modal-overlay--active');
};

window.toggleProdutoAtivoGerente = function(id) {
  const prod = APP_STORE.produtos.find(p => p.id === id);
  if (!prod) return;

  prod.ativo = !prod.ativo;
  salvarEstadoPersistido();
  renderizarVitrineCardapio(APP_STORE.filtroCategoriaVitrine, APP_STORE.buscaVitrine);
  renderizarProdutosPDV(APP_STORE.buscaPDV);
  renderizarPainelGerencial();

  mostrarToast(`Produto "${prod.nome}" agora está: ${prod.ativo ? 'ATIVO' : 'DESATIVADO'} no cardápio (RF10).`, 'info');
};

function salvarFormularioAdicional() {
  const idStr = document.getElementById('inputExtraId').value;
  const nome = document.getElementById('inputExtraName').value.trim();
  const preco = parseFloat(document.getElementById('inputExtraPrice').value);
  const errorBox = document.getElementById('extraFormError');

  errorBox.style.display = 'none';

  if (!nome || isNaN(preco) || preco < 0) {
    errorBox.textContent = 'Erro: Informe o nome e um preço válido.';
    errorBox.style.display = 'block';
    return;
  }

  if (idStr) {
    const extra = APP_STORE.adicionais.find(a => a.id === parseInt(idStr, 10));
    if (extra) {
      extra.nome = nome;
      extra.preco = preco;
      mostrarToast(`Adicional "${nome}" atualizado!`, 'success');
    }
  } else {
    const novoId = APP_STORE.adicionais.length > 0 ? Math.max(...APP_STORE.adicionais.map(a => a.id)) + 1 : 1;
    APP_STORE.adicionais.push(new Adicional(novoId, nome, preco));
    mostrarToast(`Novo adicional "${nome}" cadastrado com sucesso (RF01)!`, 'success');
  }

  salvarEstadoPersistido();
  renderizarPainelGerencial();
  document.getElementById('extraFormModal').classList.remove('modal-overlay--active');
}

window.editarAdicionalGerente = function(id) {
  const ad = APP_STORE.adicionais.find(a => a.id === id);
  if (!ad) return;

  document.getElementById('inputExtraId').value = ad.id;
  document.getElementById('extraFormModalTitle').textContent = `Editar Adicional: ${ad.nome}`;
  document.getElementById('inputExtraName').value = ad.nome;
  document.getElementById('inputExtraPrice').value = ad.preco.toFixed(2);
  document.getElementById('extraFormError').style.display = 'none';

  document.getElementById('extraFormModal').classList.add('modal-overlay--active');
};

window.removerAdicionalGerente = function(id) {
  const idx = APP_STORE.adicionais.findIndex(a => a.id === id);
  if (idx !== -1) {
    const nome = APP_STORE.adicionais[idx].nome;
    APP_STORE.adicionais.splice(idx, 1);
    salvarEstadoPersistido();
    renderizarPainelGerencial();
    mostrarToast(`Adicional "${nome}" excluído.`, 'info');
  }
};

/* --------------------------------------------------------------------------
   11. UTILITÁRIOS: ALERTA SONORO, NOTIFICAÇÕES & TEMA
   -------------------------------------------------------------------------- */

// Síntese de Alerta Sonoro de Cozinha via Web Audio API (sem dependência de arquivos)
function tocarAlertaSonoro() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.warn('Web Audio não suportado ou bloqueado.', e);
  }
}

function mostrarToast(mensagem, tipo = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${tipo}`;
  toast.innerHTML = `<span>${mensagem}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function atualizarBadgesHeader() {
  const kdsCount = document.getElementById('kdsActiveCount');
  const readyCount = document.getElementById('readyActiveCount');
  const notifBadge = document.getElementById('notifBadge');
  const cartCount = document.getElementById('cartCount');

  const ativosKds = APP_STORE.pedidos.filter(p => ['RECEBIDO', 'EM PREPARO'].includes(p.situacaoPreparo)).length;
  const prontos = APP_STORE.pedidos.filter(p => p.situacaoPreparo === 'PRONTO').length;
  const itensCarrinho = APP_STORE.carrinhoVitrine.reduce((sum, item) => sum + item.quantidade, 0);

  if (kdsCount) kdsCount.textContent = ativosKds;
  if (readyCount) readyCount.textContent = prontos;
  if (notifBadge) {
    notifBadge.textContent = prontos;
    if (prontos > 0) {
      notifBadge.classList.add('notif-badge--pulse');
    } else {
      notifBadge.classList.remove('notif-badge--pulse');
    }
  }
  if (cartCount) cartCount.textContent = itensCarrinho;
}

function inicializarThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  const savedTheme = localStorage.getItem('ze_integrated_theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('ze_integrated_theme', newTheme);
  });
}

/* Persistência em LocalStorage */
function salvarEstadoPersistido() {
  try {
    const data = {
      pedidos: APP_STORE.pedidos,
      historico: APP_STORE.historico,
      proximoNumeroPedido: APP_STORE.proximoNumeroPedido,
      produtos: APP_STORE.produtos,
      adicionais: APP_STORE.adicionais
    };
    localStorage.setItem('ze_integrated_store_v1', JSON.stringify(data));
  } catch (e) {
    console.warn('Erro ao salvar estado.', e);
  }
}

function carregarEstadoPersistido() {
  try {
    const raw = localStorage.getItem('ze_integrated_store_v1');
    if (raw) {
      const data = JSON.parse(raw);
      if (data.pedidos && Array.isArray(data.pedidos)) {
        APP_STORE.pedidos = data.pedidos;
      }
      if (data.historico && Array.isArray(data.historico)) {
        APP_STORE.historico = data.historico;
      }
      if (data.proximoNumeroPedido) {
        APP_STORE.proximoNumeroPedido = data.proximoNumeroPedido;
      }
      if (data.produtos && Array.isArray(data.produtos)) {
        APP_STORE.produtos = data.produtos.map(p => new Produto(
          p.id, p.nome, p.categoria, p.preco, p.ativo, p.quantidadeEstoque,
          p.ingredientes, p.imagem, p.tag, p.tagClass, p.descricao
        ));
      }
      if (data.adicionais && Array.isArray(data.adicionais)) {
        APP_STORE.adicionais = data.adicionais.map(a => new Adicional(a.id, a.nome, a.preco));
      }
    }
  } catch (e) {
    console.warn('Erro ao restaurar estado do LocalStorage.', e);
  }

  // Se não houver pedidos no LocalStorage, inicializa Mock Data para a apresentação acadêmica
  if (!APP_STORE.pedidos || APP_STORE.pedidos.length === 0) {
    inicializarMockDataInicial();
  }
}

function inicializarMockDataInicial() {
  const agora = Date.now();

  // 1. Pedido RECEBIDO (Novo Pedido do Cliente para Atendente despachar)
  const item1 = new ItemPedido(
    agora + 1, 1, 'Hot Dog do Zé Tradicional', 1, 16.00, [], 'Pão Brioche Selado',
    [new ItemAdicional(agora + 2, 2, 'Bacon Crocante Extra', 5.00, 1)],
    'Caprichar no molho defumado'
  );
  const pedido1 = new Pedido(
    agora + 10, 101, 0, 'Autoatendimento', 'Balcão', null, null, 'Comanda #101',
    [item1], 'Lucas Silva (Cliente)', 'Pix'
  );
  const hist1 = new HistoricoStatus(agora + 11, agora + 10, 0, 'Lucas Silva', 'Cliente', 'INÍCIO', 'RECEBIDO');

  // 2. Pedido EM PREPARO (Na Cozinha sendo preparado pelo Chef Zé)
  const item2 = new ItemPedido(
    agora + 20, 2, 'Chef’s Bacon & Cheddar Vulcão', 1, 24.00, [], 'Pão Brioche Selado',
    [new ItemAdicional(agora + 21, 1, 'Cheddar Cremoso Artesanal', 4.50, 1)],
    'Sem cebola crispy'
  );
  const pedido2 = new Pedido(
    agora + 30, 102, 1, 'Maria Santos', 'Mesa', 4, 4, 'Mesa 04',
    [item2], 'Camila Rocha', 'Cartão de Crédito'
  );
  pedido2.situacaoPreparo = 'EM PREPARO';
  const hist2_1 = new HistoricoStatus(agora + 31, agora + 30, 1, 'Maria Santos', 'Atendente', 'INÍCIO', 'RECEBIDO');
  const hist2_2 = new HistoricoStatus(agora + 32, agora + 30, 2, 'Chef Zé', 'Chefe de Cozinha', 'RECEBIDO', 'EM PREPARO');

  // 3. Pedido PRONTO (Pronto no Balcão para entrega e pagamento)
  const item3_1 = new ItemPedido(agora + 40, 5, 'Batata Suprema Recheada', 1, 18.00, [], 'Padrão', [], '');
  const item3_2 = new ItemPedido(agora + 41, 7, 'Coca-Cola Original 350ml', 2, 6.00, [], 'Lata', [], 'Gelo e limão');
  const pedido3 = new Pedido(
    agora + 50, 103, 1, 'Maria Santos', 'Balcão', null, null, 'Balcão #103',
    [item3_1, item3_2], 'Rodrigo Mendes', 'Dinheiro'
  );
  pedido3.situacaoPreparo = 'PRONTO';
  const hist3_1 = new HistoricoStatus(agora + 51, agora + 50, 1, 'Maria Santos', 'Atendente', 'INÍCIO', 'RECEBIDO');
  const hist3_2 = new HistoricoStatus(agora + 52, agora + 50, 2, 'Chef Zé', 'Chefe de Cozinha', 'RECEBIDO', 'EM PREPARO');
  const hist3_3 = new HistoricoStatus(agora + 53, agora + 50, 2, 'Chef Zé', 'Chefe de Cozinha', 'EM PREPARO', 'PRONTO');

  APP_STORE.pedidos = [pedido1, pedido2, pedido3];
  APP_STORE.historico = [hist1, hist2_1, hist2_2, hist3_1, hist3_2, hist3_3];
  APP_STORE.proximoNumeroPedido = 104;

  salvarEstadoPersistido();
}
