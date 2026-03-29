export type AssetType = 'Ação' | 'FII' | 'BDR' | 'CDB' | 'Tesouro Direto' | 'Crypto';

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  code: string;
  cnpj?: string;
}

export interface Transaction {
  id: string;
  date: string;
  asset_id: string; // Changed from assetId
  quantity: number;
  price: number;
  type: 'Compra' | 'Venda';
}

export interface Dividend {
  id: string;
  date: string;
  asset_id: string; // Changed from assetId
  dividend_value: number; // Changed from dividendValue
  jcp_value: number; // Changed from jcpValue
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
  previous_value?: number; // Changed from previousValue
  asset_code?: string; // Changed from assetCode
}

export interface Broker {
  id: string;
  name: string;
  cnpj?: string;
  assets: Asset[];
  transactions: Transaction[];
  dividends: Dividend[];
  irpfItems?: IrpfItem[];
}

export interface AppData {
  brokers: Broker[];
  currentBrokerId: string | null;
}
