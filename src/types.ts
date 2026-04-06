export type AssetType = 'Ação' | 'FII' | 'BDR' | 'CDB' | 'Tesouro Direto' | 'Crypto';

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  code: string;
  cnpj?: string;
  corporateName?: string;
  currentPrice?: number;
  lastPriceUpdate?: string; // ISO date string
}

export interface Transaction {
  id: string;
  date: string;
  assetId: string;
  quantity: number;
  price: number;
  type: 'Compra' | 'Venda';
  source?: 'Manual' | 'Nota de Corretagem' | 'Informe de Rendimentos' | 'Extrato de Custódia';
}

export interface Dividend {
  id: string;
  date: string;
  assetId: string;
  dividendValue: number;
  jcpValue: number;
  source?: 'Manual' | 'Informe de Rendimentos' | 'Extrato de Custódia';
}

export interface IrpfItem {
  id: string;
  topic: 
    | 'Bens e Direitos' 
    | 'Rendimentos Isentos' 
    | 'Rendimentos Sujeitos à Tributação Exclusiva'
    | 'Rendimentos Tributáveis'
    | 'Imposto Retido na Fonte'
    | 'Rendimentos Recebidos Acumuladamente';
  ficha?: string;
  group?: string;
  code: string;
  description: string;
  cnpj?: string;
  value: number;
  previousValue?: number;
  assetCode?: string;
  year?: string;
  isDeclared?: boolean;
}

export interface Broker {
  id: string;
  name: string;
  cnpj?: string;
  assets: Asset[];
  transactions: Transaction[];
  dividends: Dividend[];
  irpfItems?: IrpfItem[];
  declaredItemIds?: string[];
}

export interface DataSnapshot {
  id: string;
  version: string;
  date: string;
  data: Broker[];
  label?: string;
}

export interface AppData {
  brokers: Broker[];
  currentBrokerId: string | null;
  snapshots?: DataSnapshot[];
  lastBackupPrompt?: string; // ISO date string
  isEncrypted?: boolean;
  passwordHash?: string;
}
