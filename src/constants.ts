import { AssetType } from './types';

export const APP_VERSION = '1.7.0';

export const APP_CHANGELOG = [
  {
    version: '1.7.0',
    date: '2026-04-06',
    changes: [
      'Nova interface de Relatório IRPF inspirada no programa da Receita Federal.',
      'Implementada funcionalidade de "Marcar como Declarado" na ficha de Bens e Direitos.',
      'Adicionada tabela detalhada para Bens e Direitos com suporte a Grupo e Código.',
      'Melhoria visual e usabilidade na conferência de ativos para declaração anual.'
    ]
  },
  {
    version: '1.6.9',
    date: '2026-04-01',
    changes: [
      'Normalização de Tickers (ex: PETR4F -> PETR4) para evitar ativos duplicados.',
      'Inferência automática de tipo de ativo (Ação, FII, BDR, etc.) na importação.',
      'Verificação de duplicatas rigorosa para transações, rendimentos e itens de IRPF.',
      'Aprimoramento do prompt da IA para maior precisão contábil e tratamento de taxas.',
      'Consolidação automática de dados após cada importação de PDF.'
    ]
  },
  {
    version: '1.6.8',
    date: '2026-03-30',
    changes: [
      'Modo Contador: Separação clara entre Patrimônio (Custo) e Patrimônio (Mercado).',
      'Ajuste na IA para extração precisa de "Situação em 31/12" de Informes de Rendimentos.',
      'Novas legendas e tooltips explicativas sobre métricas contábeis no Dashboard.',
      'Renomeação de colunas para termos técnicos: Custo de Aquisição e Valor de Mercado.',
      'Sincronização matemática absoluta entre as abas de Ativos e Transações.'
    ]
  },
  {
    version: '1.6.7',
    date: '2026-03-30',
    changes: [
      'Correção na ordenação de transações (Compras antes de Vendas no mesmo dia).',
      'Sincronização total entre Patrimônio do Dashboard e das Transações.',
      'Correção de bug com quantidades negativas em transações.',
      'Melhoria na robustez do cálculo de custo médio e lucro realizado.'
    ]
  },
  {
    version: '1.6.5',
    date: '2026-03-30',
    changes: [
      'Implementação de métricas contábeis avançadas: Custo das Vendas (Baixas) e Lucro Realizado.',
      'Sincronização matemática perfeita: Total de Compras - Custo das Vendas = Patrimônio Líquido (Custo).',
      'Ajuste na aba de transações para refletir o impacto real no patrimônio, separando o lucro do capital investido.'
    ]
  },
  {
    version: '1.6.4',
    date: '2026-03-30',
    changes: [
      'Correção no gráfico de evolução do patrimônio para refletir o custo de aquisição acumulado corretamente.',
      'Deduplicação centralizada de rendimentos (dividendos/JCP) para maior precisão nos totais.',
      'Sincronização entre os valores do dashboard e o gráfico histórico.'
    ]
  },
  {
    version: '1.6.2',
    date: '2026-03-30',
    changes: [
      'Implementação de deduplicação global de transações para garantir consistência em todos os cálculos.',
      'Correção no cálculo de patrimônio para refletir fielmente o saldo líquido de compras e vendas.',
      'Atualização de todos os resumos financeiros para usar dados únicos e consolidados.',
      'Melhoria na visualização de transações únicas no dashboard principal.'
    ]
  },
  {
    version: '1.6.1',
    date: '2026-03-30',
    changes: [
      'Correção de precisão na deduplicação de transações e dividendos.',
      'Normalização de datas e arredondamento de valores para evitar duplicatas fantasmas.',
      'Garantia de unicidade no cálculo de totais de transações no dashboard.'
    ]
  },
  {
    version: '1.6.0',
    date: '2026-03-30',
    changes: [
      'Correção crítica de duplicidade no cálculo de Patrimônio e Dividendos.',
      'Novo sistema de consolidação automática de ativos por código (Ticker).',
      'Refinamento de métricas: Volume Total e Investimento Líquido.',
      'Melhoria na extração de PDFs: Consideração de taxas e emolumentos.',
      'Aviso de Ativos Duplicados no painel com ação rápida de correção.',
      'Ferramenta de manutenção manual para limpeza de dados duplicados.'
    ]
  },
  {
    version: '1.5.0',
    date: '30/03/2026',
    changes: [
      'Filtro de rendimentos por tipo de ativo corrigido',
      'Resumo de rendimentos filtrados (Dividendos, JCP e Total)',
      'Relatório IRPF com seleção dinâmica de ano',
      'Remoção do gráfico de aportes mensais na aba de análises',
      'Melhorias na descrição de Bens e Direitos para declaração'
    ]
  },
  {
    version: '1.4.0',
    date: '2026-03-30',
    changes: [
      'Implementação de criptografia de dados (AES-GCM) com senha mestre.',
      'Bloqueio de tela para proteção de dados sensíveis.',
      'Backup e restauração com suporte a dados criptografados.',
      'Melhoria na segurança da persistência local.'
    ]
  },
  {
    version: '1.3.0',
    date: '2026-03-30',
    changes: [
      'Sistema de filtragem avançada na aba de Ativos.',
      'Importação automática de CNPJs via PDF para múltiplos ativos.',
      'Histórico de Versões detalhado acessível no cabeçalho.',
      'Melhorias na interface de busca e organização de dados.'
    ]
  },
  {
    version: '1.2.0',
    date: '2026-03-29',
    changes: [
      'Sistema de Versão e Snapshots de Dados.',
      'Melhorias na visualização de Tickers (Código do Ativo).',
      'Configuração de IA para GitHub Pages (Chave de API do Usuário).',
      'Automação de implantação no GitHub Pages.'
    ]
  },
  {
    version: '1.1.0',
    date: '2026-03-28',
    changes: [
      'Relatório IRPF com Grupos e Códigos oficiais.',
      'Dicas de preenchimento para cada ficha do IR.',
      'Filtros de Mês e Ano em Rendimentos.'
    ]
  },
  {
    version: '1.0.0',
    date: '2026-03-27',
    changes: [
      'Lançamento inicial do Gerenciador de Investimentos.',
      'Importação de PDFs via IA.',
      'Cálculo de preço médio e patrimônio.'
    ]
  }
];

export const ASSET_TYPES: AssetType[] = [
  'Ação',
  'FII',
  'BDR',
  'CDB',
  'Tesouro Direto',
  'Crypto',
];

export const ASSET_COLORS: Record<AssetType, string> = {
  'Ação': '#3b82f6', // blue-500
  'FII': '#ef4444',  // red-500
  'BDR': '#f59e0b',  // amber-500
  'CDB': '#10b981',  // emerald-500
  'Tesouro Direto': '#8b5cf6', // violet-500
  'Crypto': '#f97316', // orange-500
};
