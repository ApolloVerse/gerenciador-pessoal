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
