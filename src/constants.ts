import { AssetType } from './types';

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

export const APP_CHANGELOG = [
  {
    version: '1.4.1',
    date: '2026-03-29',
    updates: [
      'Correção do bug de sincronização que impedia a exibição de dados na aba de Ativos',
      'Correção do erro 429 (Quota Exceeded) ajustando o modelo para Gemini 1.5 Flash',
      'Restaurada visibilidade de categorias e rendimentos no Portfólio'
    ]
  },
  {
    version: '1.4.0',
    date: '2026-03-29',
    updates: [
      'Extração Inteligente: Nomes reais dos ativos agora são puxados via IA',
      'Categorização Dinâmica: Fim da lógica manual de tipos por ticker',
      'Yield on Cost: Adicionado cálculo de rendimento real sobre custo médio',
      'Relatório Premium: Design de portfólio renovado com CNPJ e análises por ativo',
      'Suporte IRPF Expandido: Melhor detecção de rendimentos tributáveis pessoais'
    ]
  },
  {
    version: '1.3.0',
    date: '2026-03-29',
    updates: [
      'Modelo da IA atualizado para Gemini 2.5 Flash (Estabilidade e Cota)',
      'Melhoria na extração de texto de PDF (Preservação de quebras de linha)',
      'Refinamento do Prompt para melhor detecção de ativos brasileiros',
      'Correção de erros de autenticação (403 Leaked Key) com novas chaves'
    ]
  },
  {
    version: '1.1.0',
    date: '2026-03-29',
    updates: [
      'Integração com Supabase (Persistência em Nuvem)',
      'Correção de estabilidade do processador de PDF',
      'Correção na inicialização da API do Gemini',
      'Adicionado sistema de numeração de versão'
    ]
  },
  {
    version: '1.0.0',
    date: '2026-03-27',
    updates: [
      'Lançamento Inicial Local',
      'Gerenciamento de Múltiplas Corretoras',
      'Dashboard com Gráficos Recharts',
      'Leitura de Notas de Corretagem B3 via IA'
    ]
  }
];
