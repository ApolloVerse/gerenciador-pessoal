import React, { useState, useEffect, useMemo, Component } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  TrendingUp, 
  PieChart, 
  FileText, 
  ArrowLeftRight, 
  Wallet, 
  Building2, 
  ChevronDown, 
  ChevronUp,
  Download, 
  Printer,
  LayoutDashboard,
  LogOut,
  Search,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  FileCheck,
  Info,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RePieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { GoogleGenAI } from "@google/genai";
import { cn } from './lib/utils';
import { Asset, AssetType, Transaction, Dividend, Broker, AppData } from './types';
import { ASSET_TYPES, ASSET_COLORS } from './constants';
import { supabase } from './lib/supabase';
import { Login } from './components/Login';
import pkg from '../package.json';

const IRPF_CODES: Record<AssetType, { group: string; code: string }> = {
  'Ação': { group: '03', code: '01' },
  'FII': { group: '07', code: '03' },
  'BDR': { group: '04', code: '04' },
  'CDB': { group: '04', code: '02' },
  'Tesouro Direto': { group: '04', code: '01' },
  'Crypto': { group: '08', code: '01' },
};

// Configure PDF.js worker using the local bundled worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}


// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
    outline: 'bg-transparent border border-slate-200 hover:bg-slate-50 text-slate-600',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button 
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, title, description, footer, ...props }: { 
  children: React.ReactNode; 
  className?: string;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden', className)} {...props}>
    {(title || description) && (
      <div className="px-6 py-4 border-bottom border-slate-100">
        {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
    )}
    <div className="p-6">{children}</div>
    {footer && <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">{footer}</div>}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, footer }: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode;
  footer?: React.ReactNode;
}) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
          {footer && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const Input = ({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
    <input 
      className={cn(
        "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
        error && "border-red-500 focus:ring-red-500/20 focus:border-red-500"
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
  </div>
);

const Select = ({ label, options, error, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: { label: string; value: string }[]; error?: string }) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
    <select 
      className={cn(
        "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none",
        error && "border-red-500 focus:ring-red-500/20 focus:border-red-500"
      )}
      {...props}
    >
      <option value="">Selecione...</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
  </div>
);

// --- Error Boundary ---

// --- Sub-components ---

const TabButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all whitespace-nowrap",
      active 
        ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200" 
        : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
    )}
  >
    {icon}
    {label}
  </button>
);

const StatCard = ({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: 'blue' | 'emerald' | 'amber' | 'violet' }) => {
  const colors = {
    blue: 'bg-blue-50 border-blue-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
    violet: 'bg-violet-50 border-violet-100',
  };
  return (
    <Card className={cn("p-6 border-l-4", colors[color])}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        </div>
        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
          {icon}
        </div>
      </div>
    </Card>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      console.log("ErrorBoundary rendering fallback UI");
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Algo deu errado</h2>
            <p className="text-slate-600">Ocorreu um erro inesperado ao carregar a aplicação.</p>
            <div className="bg-red-50 p-3 rounded-lg text-xs text-red-800 font-mono text-left overflow-auto max-h-32">
              {this.state.error?.message}
            </div>
            <div className="flex flex-col gap-2 pt-4">
              <Button onClick={() => window.location.reload()}>Recarregar Página</Button>
              <Button variant="outline" onClick={() => {
                localStorage.removeItem('lino_invest_data');
                window.location.reload();
              }}>Limpar Dados e Recomeçar</Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Main App ---

export default function App() {
  console.log("App component rendering");
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [data, setData] = useState<AppData>({ brokers: [], currentBrokerId: null });

  // Auth Listener
  useEffect(() => {
    console.log("Supabase Client Status:", supabase ? "Ready" : "Not Configured");
    
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial Session Fetch:", session?.user ? "Authenticated" : "Not Authenticated");
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth State Changed:", _event, session?.user ? "User Present" : "No User");
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch data from Supabase
  const fetchData = async () => {
    if (!user || !supabase) return;
    setSyncLoading(true);
    try {
      const { data: brokers, error: bError } = await supabase.from('brokers').select('*');
      if (bError) throw bError;

      const fullBrokers = await Promise.all(brokers.map(async (broker) => {
        const [assets, transactions, dividends, irpfItems] = await Promise.all([
          supabase.from('assets').select('*').eq('broker_id', broker.id),
          supabase.from('transactions').select('*').eq('broker_id', broker.id),
          supabase.from('dividends').select('*').eq('broker_id', broker.id),
          supabase.from('irpf_items').select('*').eq('broker_id', broker.id),
        ]);

        return {
          ...broker,
          assets: assets.data || [],
          transactions: transactions.data || [],
          dividends: dividends.data || [],
          irpfItems: irpfItems.data || []
        };
      }));

      setData({
        brokers: fullBrokers,
        currentBrokerId: fullBrokers[0]?.id || null
      });
    } catch (err) {
      console.error('Erro ao buscar dados do Supabase:', err);
      showNotify('Erro ao carregar dados', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setData({ brokers: [], currentBrokerId: null });
    }
  }, [user]);

  const [activeTab, setActiveTab] = useState<'assets' | 'transactions' | 'dividends' | 'analysis' | 'report' | 'irpf'>('assets');
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isDividendModalOpen, setIsDividendModalOpen] = useState(false);
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);
  const [isCnpjModalOpen, setIsCnpjModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isIrpfPdfModalOpen, setIsIrpfPdfModalOpen] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterDay, setFilterDay] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [dividendFilterAsset, setDividendFilterAsset] = useState<string>('all');
  const [dividendFilterType, setDividendFilterType] = useState<string>('all');
  const [dividendFilterYear, setDividendFilterYear] = useState<string>('all');
  const [dividendFilterMonth, setDividendFilterMonth] = useState<string>('all');
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  const [reportFilterType, setReportFilterType] = useState<string>('all');
  const [irpfFilterTopic, setIrpfFilterTopic] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const currentBroker = useMemo(() => {
    if (!data || !Array.isArray(data.brokers)) return null;
    return data.brokers.find(b => b.id === data.currentBrokerId) || null;
  }, [data.brokers, data.currentBrokerId]);

  useEffect(() => {
    setSearchTerm('');
    setFilterYear('all');
    setFilterMonth('all');
    setFilterDay('all');
    setFilterType('all');
    setDividendFilterAsset('all');
    setDividendFilterType('all');
    setDividendFilterYear('all');
    setDividendFilterMonth('all');
    setReportSearchTerm('');
    setReportFilterType('all');
    setIrpfFilterTopic('all');
  }, [data.currentBrokerId]);

  useEffect(() => {
    if (dividendFilterType !== 'all' && dividendFilterAsset !== 'all') {
      const selectedAsset = currentBroker?.assets.find(a => a.id === dividendFilterAsset);
      if (selectedAsset && selectedAsset.type !== dividendFilterType) {
        setDividendFilterAsset('all');
      }
    }
  }, [dividendFilterType, dividendFilterAsset, currentBroker]);

  // --- Calculations ---

  const assetStats = useMemo(() => {
    if (!currentBroker) return {};
    const results: Record<string, { 
      quantity: number; 
      totalInvested: number; 
      avgPrice: number;
      boughtQuantity: number;
      soldQuantity: number;
      quantity2023: number;
      totalInvested2023: number;
      totalDividends: number;
      yieldOnCost: number;
    }> = {};

    (currentBroker.assets || []).forEach(asset => {
      const itemStats: any = {
        quantity: 0,
        totalInvested: 0,
        avgPrice: 0,
        boughtQuantity: 0,
        soldQuantity: 0,
        quantity2023: 0,
        totalInvested2023: 0,
        totalDividends: 0,
        yieldOnCost: 0
      };

      const transactions = [...(currentBroker.transactions || [])]
        .filter(t => t.asset_id === asset.id)
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      transactions.forEach(t => {
        const isBefore2024 = t.date && t.date < '2024-01-01';
        if (t.type === 'Compra') {
          itemStats.boughtQuantity += t.quantity;
          const newQuantity = itemStats.quantity + t.quantity;
          const newTotalInvested = itemStats.totalInvested + (t.quantity * t.price);
          itemStats.quantity = newQuantity;
          itemStats.totalInvested = newTotalInvested;
          itemStats.avgPrice = itemStats.quantity > 0 ? itemStats.totalInvested / itemStats.quantity : 0;
        } else {
          itemStats.soldQuantity += t.quantity;
          const saleQuantity = Math.abs(t.quantity);
          if (itemStats.quantity > 0) {
            const ratio = (itemStats.quantity - saleQuantity) / itemStats.quantity;
            itemStats.quantity = Math.max(0, itemStats.quantity - saleQuantity);
            itemStats.totalInvested = itemStats.quantity > 0 ? itemStats.totalInvested * ratio : 0;
          } else {
            itemStats.quantity = 0;
            itemStats.totalInvested = 0;
            itemStats.avgPrice = 0;
          }
        }

        if (isBefore2024) {
          itemStats.quantity2023 = itemStats.quantity;
          itemStats.totalInvested2023 = itemStats.totalInvested;
        }
      });

      // Calcular Yield on Cost
      const dividends = (currentBroker.dividends || []).filter(d => d.asset_id === asset.id);
      itemStats.totalDividends = dividends.reduce((acc, curr) => acc + curr.dividend_value + curr.jcp_value, 0);
      itemStats.yieldOnCost = itemStats.totalInvested > 0 ? (itemStats.totalDividends / itemStats.totalInvested) * 100 : 0;

      results[asset.id] = itemStats;
    });
    return results;
  }, [currentBroker]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getBensEDireitosDescription = (asset: Asset, stats: any) => {
    const codes = IRPF_CODES[asset.type] || { group: '99', code: '99' };
    const typeLabel = asset.type === 'Ação' ? 'Ações' : asset.type === 'FII' ? 'Cotas de Fundo de Investimento Imobiliário' : asset.type;
    const brokerCnpj = currentBroker?.cnpj ? ` (CNPJ: ${currentBroker.cnpj})` : '';
    const assetCnpj = asset.cnpj ? ` (CNPJ: ${asset.cnpj})` : '';
    
    return `DECLARAÇÃO DE BENS E DIREITOS - GRUPO ${codes.group}, CÓDIGO ${codes.code}: ${stats.quantity.toLocaleString('pt-BR')} ${typeLabel} de ${asset.name}${assetCnpj} (${asset.code}), custodiadas na corretora ${currentBroker?.name}${brokerCnpj}. Custo médio de aquisição: ${formatCurrency(stats.avgPrice)}. Total investido: ${formatCurrency(stats.totalInvested)}.`;
  };

  const allIrpfItems = useMemo(() => {
    if (!currentBroker) return [];
    const items: any[] = [];
    (currentBroker.assets || []).forEach(asset => {
      const stats = assetStats[asset.id];
      if (stats && stats.quantity > 0) {
        const codes = IRPF_CODES[asset.type] || { group: '99', code: '99' };
        items.push({
          id: `auto-bens-${asset.id}`,
          topic: 'Bens e Direitos',
          ficha: 'Bens e Direitos',
          group: codes.group,
          code: codes.code,
          description: getBensEDireitosDescription(asset, stats),
          value: stats.totalInvested,
          previous_value: stats.totalInvested2023,
          cnpj: asset.cnpj || currentBroker.cnpj
        });
      }
    });

    const dividendsByAsset: Record<string, { dividend: number; jcp: number }> = {};
    (currentBroker.dividends || []).forEach(div => {
      if (!dividendsByAsset[div.asset_id]) {
        dividendsByAsset[div.asset_id] = { dividend: 0, jcp: 0 };
      }
      dividendsByAsset[div.asset_id].dividend += div.dividend_value || 0;
      dividendsByAsset[div.asset_id].jcp += div.jcp_value || 0;
    });

    Object.entries(dividendsByAsset).forEach(([asset_id, values]) => {
      const asset = (currentBroker.assets || []).find(a => a.id === asset_id);
      if (!asset) return;

      if (values.dividend > 0) {
        const code = asset.type === 'Ação' ? '09' : '26';
        items.push({
          id: `auto-div-${asset_id}`,
          topic: 'Rendimentos Isentos',
          ficha: 'Rendimentos Isentos e Não Tributáveis',
          code: code,
          description: `Rendimentos isentos de ${asset.name} (${asset.code}) - ${currentBroker.name}`,
          value: values.dividend,
          cnpj: asset.cnpj || currentBroker.cnpj
        });
      }

      if (values.jcp > 0) {
        items.push({
          id: `auto-jcp-${asset_id}`,
          topic: 'Rendimentos Sujeitos à Tributação Exclusiva',
          ficha: 'Rendimentos Sujeitos à Tributação Exclusiva/Definitiva',
          code: '10',
          description: `Juros sobre Capital Próprio de ${asset.name} (${asset.code}) - ${currentBroker.name}`,
          value: values.jcp,
          cnpj: asset.cnpj || currentBroker.cnpj
        });
      }
    });

    const manualItems = currentBroker ? (currentBroker.irpfItems || []) : [];
    return [...items, ...manualItems];
  }, [currentBroker, assetStats]);

  const filteredDividends = useMemo(() => {
    if (!currentBroker) return [];
    return (currentBroker.dividends || []).filter(d => {
      const asset = (currentBroker.assets || []).find(a => a.id === d.asset_id);
      const matchAsset = dividendFilterAsset === 'all' || d.asset_id === dividendFilterAsset;
      const matchType = dividendFilterType === 'all' || asset?.type === dividendFilterType;
      const date = parseISO(d.date);
      const matchYear = dividendFilterYear === 'all' || format(date, 'yyyy') === dividendFilterYear;
      const matchMonth = dividendFilterMonth === 'all' || format(date, 'MM') === dividendFilterMonth;
      return matchAsset && matchType && matchYear && matchMonth;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [currentBroker, dividendFilterAsset, dividendFilterType, dividendFilterYear, dividendFilterMonth]);

  const monthlyTaxData = useMemo(() => {
    if (!currentBroker) return [];
    const monthlyGains: Record<string, any> = {};
    const assetAvgPrices: Record<string, { quantity: number; totalInvested: number; avgPrice: number }> = {};
    const allTransactions = [...(currentBroker.transactions || [])]
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    allTransactions.forEach(t => {
      const asset = (currentBroker.assets || []).find(a => a.id === t.asset_id);
      if (!asset) return;

      const monthKey = t.date.substring(0, 7);
      if (!monthlyGains[monthKey]) {
        monthlyGains[monthKey] = { month: monthKey, stockSales: 0, stockProfit: 0, fiiProfit: 0, bdrProfit: 0, otherProfit: 0 };
      }

      if (!assetAvgPrices[t.asset_id]) {
        assetAvgPrices[t.asset_id] = { quantity: 0, totalInvested: 0, avgPrice: 0 };
      }
      const stats = assetAvgPrices[t.asset_id];

      if (t.type === 'Compra') {
        stats.quantity += t.quantity;
        stats.totalInvested += (t.quantity * t.price);
        stats.avgPrice = stats.quantity > 0 ? stats.totalInvested / stats.quantity : 0;
      } else {
        const saleValue = t.quantity * t.price;
        const costValue = t.quantity * stats.avgPrice;
        const profit = saleValue - costValue;

        if (asset.type === 'Ação') {
          monthlyGains[monthKey].stockSales += saleValue;
          monthlyGains[monthKey].stockProfit += profit;
        } else if (asset.type === 'FII') {
          monthlyGains[monthKey].fiiProfit += profit;
        } else if (asset.type === 'BDR') {
          monthlyGains[monthKey].bdrProfit += profit;
        } else {
          monthlyGains[monthKey].otherProfit += profit;
        }

        // Update stats for next transactions
        if (stats.quantity > 0) {
          const ratio = (stats.quantity - t.quantity) / stats.quantity;
          stats.quantity = Math.max(0, stats.quantity - t.quantity);
          stats.totalInvested = stats.quantity > 0 ? stats.totalInvested * ratio : 0;
        }
      }
    });

    return Object.values(monthlyGains).map(data => {
      // Apply rules
      // Stocks: Exemption if sales <= 20000
      const stockTax = data.stockSales > 20000 ? Math.max(0, data.stockProfit * 0.15) : 0;
      // FIIs: 20% tax, no exemption
      const fiiTax = Math.max(0, data.fiiProfit * 0.20);
      // BDRs: 15% tax, no exemption
      const bdrTax = Math.max(0, data.bdrProfit * 0.15);
      // Others: 15% tax
      const otherTax = Math.max(0, data.otherProfit * 0.15);
      
      return {
        ...data,
        stockTax,
        fiiTax,
        bdrTax,
        otherTax,
        totalDarf: stockTax + fiiTax + bdrTax + otherTax
      };
    }).sort((a, b) => b.month.localeCompare(a.month));
  }, [currentBroker]);

  const totalPortfolioValue = useMemo(() => {
    return Object.values(assetStats).reduce((acc: number, curr: any) => {
      return acc + (curr.totalInvested || 0);
    }, 0);
  }, [assetStats]);

  const filteredAssets = useMemo(() => {
    if (!currentBroker) return [];
    const filtered = (currentBroker.assets || []).filter(a => 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'name' || sortField === 'code' || sortField === 'type') {
        valA = a[sortField as keyof Asset] || '';
        valB = b[sortField as keyof Asset] || '';
      } else {
        const statsA = assetStats[a.id];
        const statsB = assetStats[b.id];
        
        switch (sortField) {
          case 'quantity': valA = statsA?.quantity || 0; valB = statsB?.quantity || 0; break;
          case 'avgPrice': valA = statsA?.avgPrice || 0; valB = statsB?.avgPrice || 0; break;
          case 'totalInvested': valA = statsA?.totalInvested || 0; valB = statsB?.totalInvested || 0; break;
          case 'boughtQuantity': valA = statsA?.boughtQuantity || 0; valB = statsB?.boughtQuantity || 0; break;
          case 'soldQuantity': valA = statsA?.soldQuantity || 0; valB = statsB?.soldQuantity || 0; break;
          default: valA = 0; valB = 0;
        }
      }

      if (typeof valA === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [currentBroker, searchTerm, sortField, sortDirection, assetStats]);

  const filterOptions = useMemo(() => {
    if (!currentBroker) return { years: [], months: [], days: [] };
    const years = new Set<string>();
    const months = new Set<string>();
    const days = new Set<string>();
    
    // De transações
    currentBroker.transactions.forEach(t => {
      if (!t.date) return;
      try {
        const date = parseISO(t.date);
        if (!isNaN(date.getTime())) {
          years.add(format(date, 'yyyy'));
          months.add(format(date, 'MM'));
          days.add(format(date, 'dd'));
        }
      } catch (e) {
        console.error('Erro ao formatar data:', t.date, e);
      }
    });

    // De rendimentos
    currentBroker.dividends.forEach(d => {
      if (!d.date) return;
      try {
        const date = parseISO(d.date);
        if (!isNaN(date.getTime())) {
          years.add(format(date, 'yyyy'));
          months.add(format(date, 'MM'));
        }
      } catch (e) {
        console.error('Erro ao formatar data:', d.date, e);
      }
    });
    
    return {
      years: Array.from(years).sort((a, b) => b.localeCompare(a)),
      months: Array.from(months).sort(),
      days: Array.from(days).sort()
    };
  }, [currentBroker]);

  // Sync removal (handled by Supabase now)
  // useEffect(() => {
  //   localStorage.setItem('lino_invest_data', JSON.stringify(data));
  // }, [data]);

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const askConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const totalDividends = useMemo(() => {
    if (!currentBroker) return 0;
    return currentBroker.dividends.reduce((acc, curr) => acc + curr.dividend_value + curr.jcp_value, 0);
  }, [currentBroker]);

  // --- Handlers ---

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    if (!currentBroker) return;
    const exportData = {
      broker: currentBroker.name,
      cnpj: currentBroker.cnpj,
      assets: currentBroker.assets.map(a => ({
        ...a,
        stats: assetStats[a.id]
      })),
      transactions: currentBroker.transactions,
      dividends: currentBroker.dividends,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-ir-${currentBroker.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotify('Relatório exportado com sucesso!');
  };

  const handleCreateBroker = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const cnpj = formData.get('cnpj') as string;
    if (!name) return;

    setSyncLoading(true);
    try {
      const { data: newBroker, error } = await supabase
        .from('brokers')
        .insert([{ name, cnpj, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      const brokerWithDetails: Broker = {
        ...newBroker,
        assets: [],
        transactions: [],
        dividends: [],
        irpfItems: []
      };

      setData(prev => ({
        ...prev,
        brokers: [...prev.brokers, brokerWithDetails],
        currentBrokerId: newBroker.id
      }));
      setIsBrokerModalOpen(false);
      showNotify('Corretora criada com sucesso!');
    } catch (err) {
      console.error(err);
      showNotify('Erro ao criar corretora', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSaveAsset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentBroker || !user) return;
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as AssetType;
    const name = formData.get('name') as string;
    const code = formData.get('code') as string;
    const cnpj = formData.get('cnpj') as string;

    setSyncLoading(true);
    try {
      if (editingAsset) {
        const { error } = await supabase
          .from('assets')
          .update({ type, name, code, cnpj })
          .eq('id', editingAsset.id);
        
        if (error) throw error;

        setData(prev => ({
          ...prev,
          brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
            ...b,
            assets: (b.assets || []).map(a => a.id === editingAsset.id ? { ...a, type, name, code, cnpj } : a)
          } : b)
        }));
        showNotify('Ativo atualizado!');
      } else {
        const { data: newAsset, error } = await supabase
          .from('assets')
          .insert([{ type, name, code, cnpj, broker_id: currentBroker.id, user_id: user.id }])
          .select()
          .single();

        if (error) throw error;

        setData(prev => ({
          ...prev,
          brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
            ...b,
            assets: [...(b.assets || []), newAsset]
          } : b)
        }));
        showNotify('Ativo adicionado!');
      }
      setIsAssetModalOpen(false);
      setEditingAsset(null);
    } catch (err) {
      console.error(err);
      showNotify('Erro ao salvar ativo', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!currentBroker) return;
    if ((currentBroker.transactions || []).some(t => t.asset_id === id)) {
      showNotify('Não é possível excluir ativo com transações!', 'error');
      return;
    }

    setSyncLoading(true);
    try {
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (error) throw error;

      setData(prev => ({
        ...prev,
        brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
          ...b,
          assets: (b.assets || []).filter(a => a.id !== id)
        } : b)
      }));
      showNotify('Ativo removido');
    } catch (err) {
      console.error(err);
      showNotify('Erro ao remover ativo', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    if (!currentBroker) return;
    askConfirm(
      'Excluir Transação',
      'Tem certeza que deseja remover esta transação?',
      async () => {
        setSyncLoading(true);
        try {
          const { error } = await supabase.from('transactions').delete().eq('id', id);
          if (error) throw error;

          setData(prev => ({
            ...prev,
            brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
              ...b,
              transactions: (b.transactions || []).filter(t => t.id !== id)
            } : b)
          }));
          showNotify('Transação removida');
        } catch (err) {
          console.error(err);
          showNotify('Erro ao remover transação', 'error');
        } finally {
          setSyncLoading(false);
        }
      }
    );
  };

  const handleDeleteDividend = (id: string) => {
    if (!currentBroker) return;
    askConfirm(
      'Excluir Rendimento',
      'Tem certeza que deseja remover este rendimento?',
      async () => {
        setSyncLoading(true);
        try {
          const { error } = await supabase.from('dividends').delete().eq('id', id);
          if (error) throw error;

          setData(prev => ({
            ...prev,
            brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
              ...b,
              dividends: (b.dividends || []).filter(d => d.id !== id)
            } : b)
          }));
          showNotify('Rendimento removido');
        } catch (err) {
          console.error(err);
          showNotify('Erro ao remover rendimento', 'error');
        } finally {
          setSyncLoading(false);
        }
      }
    );
  };

  const handleSaveTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentBroker || !user) return;
    const formData = new FormData(e.currentTarget);
    const asset_id = formData.get('asset_id') as string;
    const date = formData.get('date') as string;
    const type = formData.get('type') as 'Compra' | 'Venda';
    const quantity = parseFloat(formData.get('quantity') as string);
    const price = parseFloat(formData.get('price') as string);

    setSyncLoading(true);
    try {
      const { data: newTransaction, error } = await supabase
        .from('transactions')
        .insert([{ asset_id, date, quantity, price, type, broker_id: currentBroker.id, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      // Update state
      setData(prev => ({
        ...prev,
        brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
          ...b,
          transactions: [...(b.transactions || []), newTransaction]
        } : b)
      }));
      setIsTransactionModalOpen(false);
      showNotify('Transação registrada!');
    } catch (err) {
      console.error(err);
      showNotify('Erro ao salvar transação', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSaveDividend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentBroker || !user) return;
    const formData = new FormData(e.currentTarget);
    const asset_id = formData.get('asset_id') as string;
    const date = formData.get('date') as string;
    const dividend_value = parseFloat(formData.get('dividend_value') as string || '0');
    const jcp_value = parseFloat(formData.get('jcp_value') as string || '0');

    setSyncLoading(true);
    try {
      const { data: newDividend, error } = await supabase
        .from('dividends')
        .insert([{ asset_id, date, dividend_value, jcp_value, broker_id: currentBroker.id, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setData(prev => ({
        ...prev,
        brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
          ...b,
          dividends: [...(b.dividends || []), newDividend]
        } : b)
      }));
      setIsDividendModalOpen(false);
      showNotify('Rendimento registrado!');
    } catch (err) {
      console.error(err);
      showNotify('Erro ao salvar rendimento', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentBroker) return;

    setIsProcessingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      const loadingTask = pdfjsLib.getDocument(typedArray);
      const pdf = await loadingTask.promise;
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let lastY;
        let pageText = "";
        for (const item of textContent.items as any[]) {
          if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += "\n";
          }
          pageText += item.str + " ";
          lastY = item.transform[5];
        }
        fullText += pageText + "\n--- NOVA PÁGINA ---\n";
      }

      const extractedData = await extractDataFromPdf(fullText);
      if (extractedData) {
        if (extractedData.type === 'informe' && extractedData.irpf_items?.length > 0) {
          await processExtractedIrpfData(extractedData.irpf_items);
          showNotify(`${extractedData.irpf_items.length} itens do Informe de Rendimentos carregados!`);
        } else if (extractedData.transactions?.length > 0 || extractedData.dividends?.length > 0) {
          await processExtractedData(extractedData);
          showNotify(`Importação concluída.`);
        } else {
           showNotify('Nenhuma informação relevante encontrada.', 'error');
        }
        setIsPdfModalOpen(false);
      }
    } catch (error: any) {
      showNotify(error.message || 'Erro ao processar o PDF.', 'error');
    } finally {
      setIsProcessingPdf(false);
      e.target.value = '';
    }
  };

  const extractDataFromPdf = async (text: string) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your_google_gemini_api_key' || apiKey === 'undefined') {
      throw new Error('Chave de API do Gemini não configurada.');
    }

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Você é um especialista em mercado financeiro brasileiro. Analise o documento financeiro (Nota de Corretagem ou Informe de Rendimentos) e extraia TODOS os dados relevantes.
      
      Regras de Extração:
      1. DATA: Use o formato YYYY-MM-DD.
      2. ATIVO (code): Ticker oficial (ex: PETR4, IVVB11).
      3. NOME (name): Razão Social ou Nome Completo do Fundo/Empresa. Importante!
      4. TIPO (type): Escolha entre 'Ação', 'FII', 'BDR', 'CDB', 'Tesouro Direto', 'Crypto'.
      5. CNPJ: Extraia o CNPJ do ativo ou da fonte pagadora se estiver no texto.
      6. VALORES: Números decimais puros (use ponto para decimal).
      
      Identifique se o documento é uma 'nota' (operações de compra/venda) ou 'informe' (saldos e rendimentos anuais).
      
      Retorne um objeto JSON rigoroso:
      {
        "type": "nota" | "informe",
        "transactions": [{ "code", "name", "type", "date", "quantity", "price", "type_op": "Compra" | "Venda", "cnpj" }],
        "dividends": [{ "code", "name", "type", "date", "dividend_value", "jcp_value", "cnpj" }],
        "irpf_items": [{ "topic", "ficha", "group", "code", "description", "cnpj", "value", "previous_value", "asset_code" }]
      }
      
      Texto do documento:
      ${text}`,
      config: {
        responseMimeType: "application/json",
      }
    });

    try {
      const result = JSON.parse(response.text || '{"transactions": [], "dividends": [], "irpf_items": []}');
      return result;
    } catch (e) {
      console.error('Erro ao parsear resposta do Gemini:', e, response.text);
      throw new Error('A IA retornou um formato inválido.');
    }
  };

  const processExtractedData = async (extracted: { transactions: any[], dividends: any[] }) => {
    if (!currentBroker || !user) return;

    setSyncLoading(true);
    try {
      const broker = data.brokers.find(b => b.id === data.currentBrokerId)!;
      const currentAssets = [...broker.assets];
      
      // 1. Handle Assets (Ensure all exist in DB)
      const uniqueAssetCodes = new Set([
        ...(extracted.transactions || []).map(t => t.code.toUpperCase().trim()),
        ...(extracted.dividends || []).map(d => d.code.toUpperCase().trim())
      ]);

      const assetMap: Record<string, string> = {};
      currentAssets.forEach(a => assetMap[a.code.toUpperCase()] = a.id);

      for (const item of [...(extracted.transactions || []), ...(extracted.dividends || [])]) {
        const code = item.code?.toUpperCase().trim();
        if (!code) continue;
        
        if (!assetMap[code]) {
          const name = item.name || code;
          const type = item.type || 'Ação';
          const cnpj = item.cnpj || '';

          const { data: newAsset, error } = await supabase
            .from('assets')
            .insert([{ code, name, type, cnpj, broker_id: broker.id, user_id: user.id }])
            .select()
            .single();
          
          if (error) throw error;
          assetMap[code] = newAsset.id;
          currentAssets.push(newAsset);
        }
      }

      // 2. Prepare Transactions
      const transactionsToInsert = (extracted.transactions || []).map(item => {
        const isVenda = item.type_op?.toLowerCase().includes('venda') || item.type?.toLowerCase().includes('venda') || item.type_op === 'V' || item.type === 'V';
        return {
          asset_id: assetMap[item.code.toUpperCase().trim()],
          date: item.date,
          quantity: Math.abs(item.quantity),
          price: item.price,
          type: isVenda ? 'Venda' : 'Compra',
          broker_id: broker.id,
          user_id: user.id
        };
      });

      // 3. Prepare Dividends
      const dividendsToInsert = (extracted.dividends || []).map(item => ({
        asset_id: assetMap[item.code.toUpperCase().trim()],
        date: item.date,
        dividend_value: item.dividend_value || 0,
        jcp_value: item.jcp_value || 0,
        broker_id: broker.id,
        user_id: user.id
      }));

      // 4. Bulk Insert
      if (transactionsToInsert.length > 0) {
        const { error } = await supabase.from('transactions').insert(transactionsToInsert);
        if (error) throw error;
      }
      if (dividendsToInsert.length > 0) {
        const { error } = await supabase.from('dividends').insert(dividendsToInsert);
        if (error) throw error;
      }

      // 5. Final State Update
      await fetchData(); // Refresh everything to be safe and consistent
    } catch (err) {
      console.error(err);
      showNotify('Erro ao processar dados importados', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleIrpfPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentBroker) return;

    setIsProcessingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      const loadingTask = pdfjsLib.getDocument(typedArray);
      const pdf = await loadingTask.promise;
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let lastY;
        let pageText = "";
        for (const item of textContent.items as any[]) {
          if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += "\n";
          }
          pageText += item.str + " ";
          lastY = item.transform[5];
        }
        fullText += pageText + "\n--- NOVA PÁGINA ---\n";
      }

      if (!fullText.trim() || fullText.length < 50) {
        throw new Error('O Informe de Rendimentos parece estar vazio ou é uma imagem não legível.');
      }

      const irpfData = await extractIrpfDataFromPdf(fullText);
      if (irpfData && irpfData.length > 0) {
        processExtractedIrpfData(irpfData);
        showNotify(`${irpfData.length} itens do Informe de Rendimentos importados!`);
        setIsIrpfPdfModalOpen(false);
      } else {
        showNotify('Nenhum dado de IR encontrado no documento.', 'error');
      }
    } catch (error: any) {
      console.error('Erro ao processar Informe:', error);
      showNotify(error.message || 'Erro ao processar o Informe.', 'error');
    } finally {
      setIsProcessingPdf(false);
      e.target.value = '';
    }
  };

  const extractIrpfDataFromPdf = async (text: string) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your_google_gemini_api_key' || apiKey === 'undefined') {
      throw new Error('Chave de API do Gemini não configurada no .env ou Vercel. Verifique as variáveis de ambiente.');
    }

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Você é um especialista em IRPF (Imposto de Renda Pessoa Física) do Brasil.
      Analise o Informe de Rendimentos fornecido e extraia TODOS os dados para a declaração anual.
      O objetivo é capturar tanto RENDIMENTOS DE INVESTIMENTOS quanto RENDIMENTOS PESSOAIS (Salários, Aluguéis, etc.).

      Categorias (topic):
      1. 'Bens e Direitos': Saldos, Ações, FIIs, Tesouro, Moedas (Posição anterior e atual).
      2. 'Rendimentos Isentos': Dividendos, Rendimentos FII, Poupança, Lucros.
      3. 'Rendimentos Sujeitos à Tributação Exclusiva': JCP, Rendimentos de Aplicações (CDB, etc.).
      4. 'Rendimentos Tributáveis': SALÁRIOS, PROLABORE, ALUGUÉIS, APOSENTADORIA.
      5. 'Imposto Retido na Fonte': Imposto retido sobre salários ou aplicações.
      6. 'Rendimentos Recebidos Acumuladamente': Seções específicas de anos anteriores.

      Para cada item:
      - topic: Uma das categorias acima.
      - ficha: Nome exato da ficha no programa IRPF.
      - group/code: Códigos oficiais da Receita Federal.
      - description: Descrição completa. Inclua: Nome da Fonte Pagadora/Empresa, CNPJ, e detalhes do rendimento.
      - cnpj: CNPJ da fonte pagadora.
      - value: Valor do rendimento ou saldo atual.
      - previous_value: Saldo no ano anterior (para Bens e Direitos).
      - asset_code: Ticker (se for investimento).

      Retorne um JSON array de objetos (snake_case):
      (topic, ficha, group, code, description, cnpj, value, previous_value, asset_code).
      
      Texto:
      ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              topic: { type: "string" },
              ficha: { type: "string" },
              group: { type: "string" },
              code: { type: "string" },
              description: { type: "string" },
              cnpj: { type: "string" },
              value: { type: "number" },
              previous_value: { type: "number" },
              asset_code: { type: "string" }
            },
            required: ["topic", "code", "description", "value"]
          }
        }
      }
    });

    try {
      const result = JSON.parse(response.text || '[]');
      return result;
    } catch (e) {
      console.error('Erro ao parsear resposta do Gemini:', e, response.text);
      return [];
    }
  };

  const processExtractedIrpfData = async (items: any[]) => {
    if (!currentBroker || !user) return;
    setSyncLoading(true);
    try {
      const itemsToInsert = items.map(item => ({
        ...item,
        broker_id: currentBroker.id,
        user_id: user.id
      }));

      const { error } = await supabase.from('irpf_items').insert(itemsToInsert);
      if (error) throw error;

      await fetchData();
    } catch (err) {
      console.error(err);
      showNotify('Erro ao salvar itens de IR', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const groupedTransactions: Record<string, Transaction[]> = useMemo(() => {
    if (!currentBroker) return {};
    const grouped: Record<string, Transaction[]> = {};
    [...currentBroker.transactions]
      .filter(t => {
        if (!t.date) return false;
        try {
          const date = parseISO(t.date);
          if (isNaN(date.getTime())) return false;
          
          const year = format(date, 'yyyy');
          const month = format(date, 'MM');
          const day = format(date, 'dd');
          
          const matchYear = filterYear === 'all' || year === filterYear;
          const matchMonth = filterMonth === 'all' || month === filterMonth;
          const matchDay = filterDay === 'all' || day === filterDay;
          const matchType = filterType === 'all' || t.type === filterType;
          
          return matchYear && matchMonth && matchDay && matchType;
        } catch (e) {
          return false;
        }
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .forEach(t => {
        try {
          const date = parseISO(t.date);
          if (isNaN(date.getTime())) return;
          const month = format(date, 'MMMM yyyy', { locale: ptBR });
          if (!grouped[month]) grouped[month] = [];
          grouped[month].push(t);
        } catch (e) {}
      });
    return grouped;
  }, [currentBroker, filterYear, filterMonth, filterDay, filterType]);

  const transactionTotals = useMemo(() => {
    if (!currentBroker) return { buy: 0, sell: 0, total: 0 };
    const filtered = (currentBroker.transactions || []).filter(t => {
      if (!t.date) return false;
      try {
        const date = parseISO(t.date);
        if (isNaN(date.getTime())) return false;
        
        const year = format(date, 'yyyy');
        const month = format(date, 'MM');
        const day = format(date, 'dd');
        
        const matchYear = filterYear === 'all' || year === filterYear;
        const matchMonth = filterMonth === 'all' || month === filterMonth;
        const matchDay = filterDay === 'all' || day === filterDay;
        const matchType = filterType === 'all' || t.type === filterType;
        
        return matchYear && matchMonth && matchDay && matchType;
      } catch (e) {
        return false;
      }
    });

    return filtered.reduce((acc, t) => {
      const value = (t.quantity || 0) * (t.price || 0);
      if (t.type === 'Compra') acc.buy += value;
      else acc.sell += value;
      acc.total += value;
      return acc;
    }, { buy: 0, sell: 0, total: 0 });
  }, [currentBroker, filterYear, filterMonth, filterDay, filterType]);

  // --- Chart Data ---

  const pieData = useMemo(() => {
    if (!currentBroker) return [];
    const totals: Record<string, number> = {};
    (currentBroker.assets || []).forEach(asset => {
      const stats = assetStats[asset.id];
      if (stats) {
        totals[asset.type] = (totals[asset.type] || 0) + (stats as { totalInvested: number }).totalInvested;
      }
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [currentBroker, assetStats]);

  const monthlyDividendsData = useMemo(() => {
    if (!currentBroker) return [];
    const months = subMonths(new Date(), 11);
    const interval = eachMonthOfInterval({ start: months, end: new Date() });
    
    return interval.map(date => {
      const monthStr = format(date, 'yyyy-MM');
      const filtered = (currentBroker.dividends || []).filter(d => d.date.startsWith(monthStr));
      return {
        name: format(date, 'MMM/yy', { locale: ptBR }),
        total: filtered.reduce((acc, curr) => acc + (curr.dividend_value || 0) + (curr.jcp_value || 0), 0)
      };
    });
  }, [currentBroker]);

  // --- Render ---

  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-xl w-full p-8 border-t-4 border-t-red-500 shadow-xl">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 mb-2">Configuração Necessária</h1>
              <p className="text-slate-500">O sistema está no ar, mas você ainda não configurou as chaves do banco de dados.</p>
            </div>
            
            <div className="bg-slate-100 p-6 rounded-2xl w-full text-left space-y-4">
              <p className="text-sm font-bold text-slate-700 uppercase">O que fazer agora:</p>
              <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                <li>Vá no seu painel da **Vercel** ou arquivo **.env**.</li>
                <li>Adicione as chaves: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.</li>
                <li>Não esqueça da `VITE_GEMINI_API_KEY` para a IA funcionar.</li>
                <li>Faça o deploy novamente ou recarregue a página.</li>
              </ol>
            </div>
            
            <p className="text-xs text-slate-400 italic">Isso evita a "tela branca" e garante que seus dados estejam seguros e persistentes.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={fetchData} />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 flex flex-col">
      {syncLoading && (
        <div className="fixed top-0 left-0 w-full h-1 bg-blue-500/20 z-[60] overflow-hidden">
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            className="w-1/2 h-full bg-blue-600"
          />
        </div>
      )}
      {!currentBroker ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <Card className="text-center p-10">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-10 h-10 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Bem-vindo ao Gerenciador de IR</h1>
              <p className="text-slate-500 mb-8">Para começar, crie ou selecione uma corretora para gerenciar seus ativos.</p>
              
              <form onSubmit={handleCreateBroker} className="space-y-4">
                <Input name="name" label="Nome da Corretora" placeholder="Ex: XP, Rico, BTG..." required />
                <Input name="cnpj" label="CNPJ da Corretora" placeholder="00.000.000/0001-00" />
                <Button type="submit" className="w-full py-3">Criar Corretora</Button>
              </form>

              {data.brokers.length > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Ou selecione uma existente</p>
                  <div className="space-y-2">
                    {data.brokers.map(b => (
                      <div key={b.id} className="flex gap-2 group">
                        <button 
                          onClick={() => setData(prev => ({ ...prev, currentBrokerId: b.id }))}
                          className="flex-1 flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                          <div className="text-left">
                            <p className="font-semibold text-slate-700">{b.name}</p>
                            {b.cnpj && <p className="text-[10px] text-slate-400 font-mono">{b.cnpj}</p>}
                          </div>
                          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-blue-500 -rotate-90" />
                        </button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            askConfirm(
                              'Excluir Corretora',
                              `Deseja realmente excluir a corretora ${b.name} e todos os seus dados? Esta ação não pode ser desfeita.`,
                              () => {
                                setData(prev => {
                                  const newBrokers = prev.brokers.filter(br => br.id !== b.id);
                                  return {
                                    ...prev,
                                    brokers: newBrokers,
                                    currentBrokerId: b.id === prev.currentBrokerId ? (newBrokers[0]?.id || null) : prev.currentBrokerId
                                  };
                                });
                                showNotify('Corretora removida');
                              }
                            );
                          }}
                          className="h-auto px-4 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight flex items-center">
                  Gerenciador de IR
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 tracking-wider">
                    v1.4.0
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">{currentBroker?.name || 'Nenhuma corretora selecionada'}</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <TabButton active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} icon={<Wallet className="w-4 h-4" />} label="Ativos" />
              <TabButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<ArrowLeftRight className="w-4 h-4" />} label="Transações" />
              <TabButton active={activeTab === 'dividends'} onClick={() => setActiveTab('dividends')} icon={<TrendingUp className="w-4 h-4" />} label="Rendimentos" />
              <TabButton active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} icon={<PieChart className="w-4 h-4" />} label="Análises" />
              <TabButton active={activeTab === 'report'} onClick={() => setActiveTab('report')} icon={<FileText className="w-4 h-4" />} label="Portfólio" />
              <TabButton active={activeTab === 'irpf'} onClick={() => setActiveTab('irpf')} icon={<ShieldCheck className="w-4 h-4" />} label="Relatório IRPF" />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsBrokerModalOpen(true)} className="hidden sm:inline-flex">
                <Building2 className="w-4 h-4 mr-2" /> Corretoras
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:inline-flex text-red-500 hover:bg-red-50">
                <LogOut className="w-4 h-4 mr-2" /> Sair da Conta
              </Button>
              <div className="md:hidden">
                <Button variant="secondary" size="sm" onClick={() => setIsBrokerModalOpen(true)}>
                  <LayoutDashboard className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden bg-white border-b border-slate-200 overflow-x-auto no-scrollbar no-print">
        <div className="flex p-2 gap-1 min-w-max">
          <TabButton active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} icon={<Wallet className="w-4 h-4" />} label="Ativos" />
          <TabButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<ArrowLeftRight className="w-4 h-4" />} label="Transações" />
          <TabButton active={activeTab === 'dividends'} onClick={() => setActiveTab('dividends')} icon={<TrendingUp className="w-4 h-4" />} label="Rendimentos" />
          <TabButton active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} icon={<PieChart className="w-4 h-4" />} label="Análises" />
          <TabButton active={activeTab === 'report'} onClick={() => setActiveTab('report')} icon={<FileText className="w-4 h-4" />} label="Portfólio" />
          <TabButton active={activeTab === 'irpf'} onClick={() => setActiveTab('irpf')} icon={<ShieldCheck className="w-4 h-4" />} label="Relatório IRPF" />
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 no-print">
          <StatCard title="Patrimônio Total" value={formatCurrency(totalPortfolioValue)} icon={<Wallet className="text-blue-600" />} color="blue" />
          <StatCard title="Total Rendimentos" value={formatCurrency(totalDividends)} icon={<TrendingUp className="text-emerald-600" />} color="emerald" />
          <StatCard title="Total Ativos" value={currentBroker ? (currentBroker.assets || []).length.toString() : '0'} icon={<PieChart className="text-amber-600" />} color="amber" />
          <StatCard title="Transações" value={currentBroker ? (currentBroker.transactions || []).length.toString() : '0'} icon={<ArrowLeftRight className="text-violet-600" />} color="violet" />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'assets' && (
            <motion.div key="assets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Seus Ativos</h2>
                <div className="flex w-full sm:w-auto gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar ativo..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <Button variant="outline" onClick={() => setIsCnpjModalOpen(true)}>
                    <Building2 className="w-4 h-4 mr-2" /> CNPJs
                  </Button>
                  <Button onClick={() => { setEditingAsset(null); setIsAssetModalOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" /> Novo
                  </Button>
                </div>
              </div>

              <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('type')}>
                          <div className="flex items-center">
                            Tipo {sortField === 'type' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('name')}>
                          <div className="flex items-center">
                            Ativo {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('code')}>
                          <div className="flex items-center">
                            Código {sortField === 'code' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('boughtQuantity')}>
                          <div className="flex items-center justify-end">
                            Cotas Compradas {sortField === 'boughtQuantity' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('soldQuantity')}>
                          <div className="flex items-center justify-end">
                            Cotas Vendidas {sortField === 'soldQuantity' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('quantity')}>
                          <div className="flex items-center justify-end">
                            Cotas em Carteira {sortField === 'quantity' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('avgPrice')}>
                          <div className="flex items-center justify-end">
                            Preço Médio {sortField === 'avgPrice' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('totalInvested')}>
                          <div className="flex items-center justify-end">
                            Investimento Total {sortField === 'totalInvested' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                          <div className="flex items-center justify-end">
                            Yield on Cost
                          </div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAssets.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-12 text-center text-slate-400 italic">
                            {searchTerm ? 'Nenhum ativo encontrado para sua busca.' : 'Nenhum ativo cadastrado.'}
                          </td>
                        </tr>
                      ) : (
                        filteredAssets.map(asset => {
                          const stats = assetStats[asset.id];
                          return (
                            <tr key={asset.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  asset.type === 'Ação' && "bg-blue-100 text-blue-700",
                                  asset.type === 'FII' && "bg-red-100 text-red-700",
                                  asset.type === 'BDR' && "bg-amber-100 text-amber-700",
                                  asset.type === 'CDB' && "bg-emerald-100 text-emerald-700",
                                  asset.type === 'Tesouro Direto' && "bg-violet-100 text-violet-700",
                                  asset.type === 'Crypto' && "bg-orange-100 text-orange-700",
                                )}>
                                  {asset.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-semibold text-slate-900">{asset.name}</td>
                              <td className="px-6 py-4 font-mono text-sm text-slate-500">{asset.code}</td>
                              <td className="px-6 py-4 text-right text-slate-600">{stats?.boughtQuantity?.toLocaleString('pt-BR') || '0'}</td>
                              <td className="px-6 py-4 text-right text-slate-600">{stats?.soldQuantity?.toLocaleString('pt-BR') || '0'}</td>
                              <td className="px-6 py-4 text-right font-medium text-slate-700">{stats?.quantity?.toLocaleString('pt-BR') || '0'}</td>
                              <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(stats?.avgPrice || 0)}</td>
                              <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(stats?.totalInvested || 0)}</td>
                              <td className="px-6 py-4 text-right text-emerald-600 font-bold">
                                {stats?.yieldOnCost ? `${stats.yieldOnCost.toFixed(2)}%` : '0.00%'}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="sm" onClick={() => { setEditingAsset(asset); setIsAssetModalOpen(true); }}>
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteAsset(asset.id)} className="text-red-500 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <motion.div key="transactions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Transações</h2>
                  <p className="text-sm text-slate-500">Visualize e filtre suas operações por período.</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                  <div className="flex gap-2 flex-1 lg:flex-none">
                    <select 
                      value={filterYear} 
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="all">Todos os Anos</option>
                      {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select 
                      value={filterMonth} 
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="all">Todos os Meses</option>
                      {filterOptions.months.map(m => {
                        let monthName = m;
                        try {
                          monthName = format(new Date(2000, parseInt(m) - 1, 1), 'MMMM', { locale: ptBR });
                        } catch (e) {}
                        return (
                          <option key={m} value={m}>
                            {monthName}
                          </option>
                        );
                      })}
                    </select>
                    <select 
                      value={filterDay} 
                      onChange={(e) => setFilterDay(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="all">Todos os Dias</option>
                      {filterOptions.days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select 
                      value={filterType} 
                      onChange={(e) => setFilterType(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="all">Todos os Tipos</option>
                      <option value="Compra">Apenas Compras</option>
                      <option value="Venda">Apenas Vendas</option>
                    </select>
                  </div>
                  <div className="flex gap-2 w-full lg:w-auto">
                    <Button variant="outline" className="flex-1 lg:flex-none" onClick={() => setIsPdfModalOpen(true)}>
                      <FileText className="w-4 h-4 mr-2" /> Importar PDF
                    </Button>
                    <Button className="flex-1 lg:flex-none" onClick={() => setIsTransactionModalOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Nova
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="p-4 bg-blue-50 border-blue-100">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Patrimônio Filtrado</p>
                  <p className="text-xl font-bold text-blue-900">{formatCurrency(transactionTotals.buy - transactionTotals.sell)}</p>
                </Card>
                <Card className="p-4 bg-emerald-50 border-emerald-100">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total de Compras</p>
                  <p className="text-xl font-bold text-emerald-900">{formatCurrency(transactionTotals.buy)}</p>
                </Card>
                <Card className="p-4 bg-red-50 border-red-100">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Total de Vendas</p>
                  <p className="text-xl font-bold text-red-900">{formatCurrency(transactionTotals.sell)}</p>
                </Card>
                <Card className="p-4 bg-slate-50 border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total da Operação</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(transactionTotals.total)}</p>
                </Card>
              </div>

              {Object.keys(groupedTransactions).length === 0 ? (
                <Card className="p-12 text-center text-slate-400 italic">
                  Nenhuma transação registrada.
                </Card>
              ) : (
                Object.entries(groupedTransactions).map(([month, transactions]) => (
                  <div key={month} className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">{month}</h3>
                    <Card className="p-0 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ativo</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Qtd</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Preço</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(transactions as Transaction[]).map(t => {
                              const asset = (currentBroker.assets || []).find(a => a.id === t.asset_id);
                              return (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 text-sm text-slate-600">{format(parseISO(t.date), 'dd/MM/yyyy')}</td>
                                  <td className="px-6 py-4 font-semibold text-slate-900">{asset?.code || 'Desconhecido'}</td>
                                  <td className="px-6 py-4">
                                    <span className={cn(
                                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                                      t.type === 'Compra' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                    )}>
                                      {t.type}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right text-slate-700">{t.quantity.toLocaleString('pt-BR')}</td>
                                  <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(t.price)}</td>
                                  <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(t.quantity * t.price)}</td>
                                  <td className="px-6 py-4 text-center">
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteTransaction(t.id)} className="text-red-500">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'dividends' && (
            <motion.div key="dividends" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Rendimentos</h2>
                  <p className="text-sm text-slate-500">Visualize e filtre seus rendimentos recebidos.</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <select 
                    value={dividendFilterYear} 
                    onChange={(e) => setDividendFilterYear(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex-1 sm:flex-none"
                  >
                    <option value="all">Ano</option>
                    {filterOptions.years.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                  <select 
                    value={dividendFilterMonth} 
                    onChange={(e) => setDividendFilterMonth(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex-1 sm:flex-none"
                  >
                    <option value="all">Mês</option>
                    {filterOptions.months.map(month => (
                      <option key={month} value={month}>
                        {format(parseISO(`2024-${month}-01`), 'MMMM', { locale: ptBR })}
                      </option>
                    ))}
                  </select>
                  <select 
                    value={dividendFilterType} 
                    onChange={(e) => setDividendFilterType(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex-1 sm:flex-none"
                  >
                    <option value="all">Todos os Tipos</option>
                    {ASSET_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <select 
                    value={dividendFilterAsset} 
                    onChange={(e) => setDividendFilterAsset(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex-1 sm:flex-none"
                  >
                    <option value="all">Todos os Ativos</option>
                    {(currentBroker?.assets || [])
                      .filter(asset => dividendFilterType === 'all' || asset.type === dividendFilterType)
                      .map(asset => (
                        <option key={asset.id} value={asset.id}>{asset.code} - {asset.name}</option>
                      ))}
                  </select>
                  <Button variant="success" onClick={() => setIsDividendModalOpen(true)} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" /> Novo Rendimento
                  </Button>
                </div>
              </div>
              <Card className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ativo</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Dividendos</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">JCP</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
                      </tr>
                    </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(!currentBroker || filteredDividends.length === 0) ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                              {dividendFilterAsset !== 'all' || dividendFilterType !== 'all' ? 'Nenhum rendimento encontrado para os filtros selecionados.' : 'Nenhum rendimento registrado.'}
                            </td>
                          </tr>
                        ) : (
                          filteredDividends.map(d => {
                            const asset = (currentBroker.assets || []).find(a => a.id === d.asset_id);
                            return (
                              <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-600">{format(parseISO(d.date), 'dd/MM/yyyy')}</td>
                                <td className="px-6 py-4 font-semibold text-slate-900">{asset?.code || 'Desconhecido'}</td>
                                <td className="px-6 py-4 text-right text-emerald-600">{formatCurrency(d.dividend_value)}</td>
                                <td className="px-6 py-4 text-right text-blue-600">{formatCurrency(d.jcp_value)}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency((d.dividend_value || 0) + (d.jcp_value || 0))}</td>
                                <td className="px-6 py-4 text-center">
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteDividend(d.id)} className="text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'analysis' && (
            <motion.div key="analysis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Alocação por Tipo">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={ASSET_COLORS[entry.name as AssetType] || '#cbd5e1'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card title="Rendimentos Mensais (Últimos 12 meses)">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyDividendsData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `R$ ${val}`} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <Card title="Controle de DARF Mensal (Ganhos de Capital)">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3">
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-bold mb-1">Regras Aplicadas:</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li><strong>Ações:</strong> Isenção para vendas totais até R$ 20.000/mês. Acima disso, 15% sobre o lucro.</li>
                        <li><strong>FIIs:</strong> Alíquota fixa de 20% sobre o lucro em qualquer venda.</li>
                        <li><strong>BDRs/ETFs:</strong> Alíquota fixa de 15% sobre o lucro (sem isenção).</li>
                        <li><strong>Compensação:</strong> Prejuízos podem ser compensados (não implementado nesta versão simplificada).</li>
                      </ul>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="py-3 text-xs font-bold text-slate-500 uppercase">Mês/Ano</th>
                          <th className="py-3 text-xs font-bold text-slate-500 uppercase text-right">Vendas Ações</th>
                          <th className="py-3 text-xs font-bold text-slate-500 uppercase text-right">Lucro/Prejuízo</th>
                          <th className="py-3 text-xs font-bold text-slate-500 uppercase text-right">DARF Estimado</th>
                          <th className="py-3 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {monthlyTaxData.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 italic">Nenhuma venda registrada para cálculo de impostos.</td>
                          </tr>
                        ) : (
                          monthlyTaxData.map(data => {
                            const totalProfit = data.stockProfit + data.fiiProfit + data.bdrProfit + data.otherProfit;
                            const isExempt = data.stockSales <= 20000 && data.stockProfit > 0;
                            
                            return (
                              <tr key={data.month} className="hover:bg-slate-50 transition-colors">
                                <td className="py-4 font-medium text-slate-900">{format(parseISO(`${data.month}-01`), 'MMMM/yyyy', { locale: ptBR })}</td>
                                <td className="py-4 text-right text-slate-600">{formatCurrency(data.stockSales)}</td>
                                <td className={`py-4 text-right font-medium ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {formatCurrency(totalProfit)}
                                </td>
                                <td className="py-4 text-right font-bold text-slate-900">
                                  {data.totalDarf > 0 ? formatCurrency(data.totalDarf) : 'Isento / R$ 0,00'}
                                </td>
                                <td className="py-4 text-center">
                                  {data.totalDarf > 10 ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      Pendente DARF
                                    </span>
                                  ) : data.totalDarf > 0 ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                      Abaixo de R$ 10
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                      OK / Isento
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {monthlyTaxData.some(d => d.totalDarf > 0) && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <h4 className="text-sm font-bold text-slate-900 mb-2">Orientações para DARF:</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        O DARF deve ser pago até o último dia útil do mês subsequente ao da venda. 
                        O código para pessoa física é <strong>6015</strong>. 
                        Valores inferiores a R$ 10,00 devem ser acumulados para os meses seguintes até atingir o valor mínimo.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'report' && (
            <motion.div key="report" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Relatório de Portfólio</h2>
                <div className="flex flex-wrap gap-2 no-print w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar ativo ou código..." 
                      value={reportSearchTerm}
                      onChange={(e) => setReportSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <select 
                    value={reportFilterType} 
                    onChange={(e) => setReportFilterType(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">Todos os Tipos</option>
                    {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" /> Imprimir
                  </Button>
                  <Button variant="secondary" onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" /> Exportar JSON
                  </Button>
                </div>
              </div>

              <div className="space-y-6 print:space-y-8">
                {ASSET_TYPES.filter(type => reportFilterType === 'all' || type === reportFilterType).map(type => {
                  const assets = currentBroker ? (currentBroker.assets || []).filter(a => a.type === type) : [];
                  const activeAssets = assets.filter(a => {
                    const stats = assetStats[a.id];
                    const hasQuantity = (stats?.quantity || 0) > 0;
                    const matchesSearch = a.code.toLowerCase().includes(reportSearchTerm.toLowerCase()) || 
                                         a.name.toLowerCase().includes(reportSearchTerm.toLowerCase());
                    return hasQuantity && matchesSearch;
                  });
                  
                  if (activeAssets.length === 0) return null;

                  return (
                    <div key={type} className="space-y-6">
                      <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                        <h3 className="text-lg font-bold text-slate-800">{type}</h3>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total na Categoria</p>
                          <p className="text-sm font-bold text-slate-700">
                            {formatCurrency(activeAssets.reduce((acc, a) => acc + (assetStats[a.id]?.totalInvested || 0), 0))}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-6">
                        {activeAssets.map(asset => {
                          const stats = assetStats[asset.id];
                          const assetDivs = currentBroker ? (currentBroker.dividends || []).filter(d => d.asset_id === asset.id) : [];
                          const totalDiv = assetDivs.reduce((acc, curr) => acc + (curr.dividend_value || 0) + (curr.jcp_value || 0), 0);
                          
                          return (
                            <Card key={asset.id} className="p-6 border-l-4 border-l-blue-500 bg-white shadow-md hover:shadow-lg transition-shadow">
                              <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="space-y-4 flex-1">
                                  <div className="flex items-center gap-3">
                                    <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold text-lg border border-blue-100 uppercase tracking-wider">
                                      {asset.code}
                                    </div>
                                    <h4 className="text-xl font-black text-slate-800">{asset.name}</h4>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Posição Atual</p>
                                      <p className="text-lg font-bold text-slate-900">{stats?.quantity?.toLocaleString('pt-BR')} cotas</p>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 font-medium">
                                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Custo Médio</p>
                                      <p className="text-lg font-bold text-blue-900">{formatCurrency(stats?.avgPrice || 0)}</p>
                                    </div>
                                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 font-medium">
                                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Total Recebido</p>
                                      <p className="text-lg font-bold text-emerald-900">{formatCurrency(totalDiv)}</p>
                                    </div>
                                    <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 font-medium">
                                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Yield on Cost</p>
                                      <p className="text-lg font-bold text-indigo-900">{stats?.yieldOnCost?.toFixed(2)}%</p>
                                    </div>
                                  </div>

                                  {asset.cnpj && (
                                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                                      <Building2 className="w-3 h-3" />
                                      CNPJ: {asset.cnpj}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="md:w-64 pt-4 md:pt-0 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100 md:pl-6">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Investimento Total</p>
                                  <p className="text-2xl font-black text-slate-900">{formatCurrency(stats?.totalInvested || 0)}</p>
                                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-500">Cotas Compradas:</span>
                                      <span className="font-bold text-slate-700">{stats?.boughtQuantity?.toLocaleString('pt-BR')}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-500">Cotas Vendidas:</span>
                                      <span className="font-bold text-slate-700">{stats?.soldQuantity?.toLocaleString('pt-BR')}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'irpf' && (
            <motion.div key="irpf" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Relatório para IRPF</h2>
                <div className="flex flex-wrap gap-2 no-print w-full md:w-auto">
                  <select 
                    value={irpfFilterTopic} 
                    onChange={(e) => setIrpfFilterTopic(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">Todos os Tópicos</option>
                    <option value="Bens e Direitos">Bens e Direitos</option>
                    <option value="Rendimentos Isentos">Rendimentos Isentos</option>
                    <option value="Rendimentos Sujeitos à Tributação Exclusiva">Tributação Exclusiva</option>
                    <option value="Rendimentos Tributáveis">Rendimentos Tributáveis</option>
                    <option value="Imposto Retido na Fonte">Imposto Retido</option>
                    <option value="Rendimentos Recebidos Acumuladamente">Rendimentos Acumulados</option>
                  </select>
                  <Button variant="outline" onClick={() => setIsIrpfPdfModalOpen(true)}>
                    <FileCheck className="w-4 h-4 mr-2" /> Importar Informe
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" /> Imprimir
                  </Button>
                </div>
              </div>

              <div className="space-y-8">
                {[
                  'Bens e Direitos', 
                  'Rendimentos Isentos', 
                  'Rendimentos Sujeitos à Tributação Exclusiva',
                  'Rendimentos Tributáveis',
                  'Imposto Retido na Fonte',
                  'Rendimentos Recebidos Acumuladamente'
                ].filter(topic => irpfFilterTopic === 'all' || topic === irpfFilterTopic).map(topic => {
                  const items = allIrpfItems.filter(item => item.topic === topic);
                  
                  if (items.length === 0) {
                    if (irpfFilterTopic !== 'all' && irpfFilterTopic === topic) {
                      return (
                        <div key={topic} className="space-y-4">
                          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">{topic}</h3>
                          <Card className="p-8 text-center text-slate-400 italic">
                            Nenhum item encontrado para este tópico.
                          </Card>
                        </div>
                      );
                    }
                    return null;
                  }

                  return (
                    <div key={topic} className="space-y-4">
                      <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">{topic}</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {items.map(item => (
                          <div key={item.id}>
                            <Card className="p-4 border-l-4 border-l-blue-500 print:shadow-none print:border-slate-300">
                              <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                                      {item.topic === 'Bens e Direitos' ? `Grupo ${item.group || '--'} | Código ${item.code}` : `Código ${item.code}`}
                                    </span>
                                    {item.ficha && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Onde declarar:</span>
                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase">
                                          {item.ficha}
                                        </span>
                                      </div>
                                    )}
                                    {item.id.toString().startsWith('auto-') ? (
                                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">
                                        Automático
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">
                                        Importado
                                      </span>
                                    )}
                                    {item.cnpj && (
                                      <span className="text-[10px] font-mono text-slate-400">CNPJ: {item.cnpj}</span>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-700 leading-relaxed mb-2">
                                    {item.description}
                                  </p>
                                  {item.guide && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-2">
                                      <p className="text-[10px] font-bold text-blue-600 uppercase mb-1 flex items-center gap-1">
                                        <Info size={10} /> Dica de Lançamento
                                      </p>
                                      <p className="text-xs text-blue-800 italic">
                                        {item.guide}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  {topic === 'Bens e Direitos' ? (
                                    <div className="space-y-2">
                                      <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Situação em 31/12/2023</p>
                                        <p className="text-lg font-bold text-slate-900">{formatCurrency(item.previous_value || 0)}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Situação em 31/12/2024</p>
                                        <p className="text-lg font-bold text-blue-600">{formatCurrency(item.value)}</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase">Valor</p>
                                      <p className={cn(
                                        "text-lg font-bold",
                                        topic === 'Imposto Retido na Fonte' ? "text-red-600" : "text-emerald-600"
                                      )}>{formatCurrency(item.value)}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  )}

  {/* Modals */}
      <Modal isOpen={isCnpjModalOpen} onClose={() => setIsCnpjModalOpen(false)} title="Gerenciar CNPJs dos Ativos">
        <div className="space-y-6">
          <p className="text-sm text-slate-500">Insira os CNPJs de todos os seus ativos para que apareçam corretamente nos relatórios de Bens e Direitos.</p>
          <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Ativo</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">CNPJ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentBroker?.assets.map(asset => (
                  <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{asset.name}</td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-500">{asset.code}</td>
                    <td className="px-4 py-3">
                      <input 
                        type="text"
                        placeholder="00.000.000/0000-00"
                        defaultValue={asset.cnpj || ''}
                        onBlur={async (e) => {
                          const newCnpj = e.target.value;
                          if (newCnpj === asset.cnpj) return;
                          setSyncLoading(true);
                          try {
                            const { error } = await supabase
                              .from('assets')
                              .update({ cnpj: newCnpj })
                              .eq('id', asset.id);
                            if (error) throw error;

                            setData(prev => ({
                              ...prev,
                              brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
                                ...b,
                                assets: b.assets.map(a => a.id === asset.id ? { ...a, cnpj: newCnpj } : a)
                              } : b)
                            }));
                          } catch (err) {
                            console.error(err);
                            showNotify('Erro ao atualizar CNPJ', 'error');
                          } finally {
                            setSyncLoading(false);
                          }
                        }}
                        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </td>
                  </tr>
                ))}
                {(!currentBroker || currentBroker.assets.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">Nenhum ativo cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsCnpjModalOpen(false)}>Fechar</Button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isAssetModalOpen} 
        onClose={() => { setIsAssetModalOpen(false); setEditingAsset(null); }} 
        title={editingAsset ? "Editar Ativo" : "Novo Ativo"}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setIsAssetModalOpen(false); setEditingAsset(null); }}>Cancelar</Button>
            <Button type="submit" form="asset-form">Salvar Ativo</Button>
          </>
        }
      >
        <form id="asset-form" onSubmit={handleSaveAsset} className="space-y-4">
          <Select 
            name="type" 
            label="Tipo de Ativo" 
            defaultValue={editingAsset?.type || ''}
            options={ASSET_TYPES.map(t => ({ label: t, value: t }))} 
            required 
          />
          <Input name="name" label="Nome do Ativo" defaultValue={editingAsset?.name || ''} placeholder="Ex: Banco do Brasil S.A." required />
          <div className="grid grid-cols-2 gap-4">
            <Input name="code" label="Código (Ticker)" defaultValue={editingAsset?.code || ''} placeholder="Ex: BBAS3" required />
            <Input name="cnpj" label="CNPJ" defaultValue={editingAsset?.cnpj || ''} placeholder="00.000.000/0001-00" />
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isTransactionModalOpen} 
        onClose={() => setIsTransactionModalOpen(false)} 
        title="Nova Transação"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsTransactionModalOpen(false)}>Cancelar</Button>
            <Button type="submit" form="transaction-form">Registrar</Button>
          </>
        }
      >
        <form id="transaction-form" onSubmit={handleSaveTransaction} className="space-y-4">
          <Select 
            name="asset_id" 
            label="Ativo" 
            options={currentBroker ? (currentBroker.assets || []).map(a => ({ label: `${a.code} - ${a.name}`, value: a.id })) : []} 
            required 
          />
          <Select 
            name="type" 
            label="Tipo de Operação" 
            options={[{ label: 'Compra', value: 'Compra' }, { label: 'Venda', value: 'Venda' }]} 
            required 
          />
          <Input name="date" label="Data da Operação" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
          <div className="grid grid-cols-2 gap-4">
            <Input name="quantity" label="Quantidade" type="number" step="0.0001" placeholder="0" required />
            <Input name="price" label="Preço Unitário" type="number" step="0.01" placeholder="0,00" required />
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isDividendModalOpen} 
        onClose={() => setIsDividendModalOpen(false)} 
        title="Novo Rendimento"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDividendModalOpen(false)}>Cancelar</Button>
            <Button type="submit" form="dividend-form" variant="success">Salvar</Button>
          </>
        }
      >
        <form id="dividend-form" onSubmit={handleSaveDividend} className="space-y-4">
          <Select 
            name="asset_id" 
            label="Ativo" 
            options={currentBroker ? (currentBroker.assets || []).map(a => ({ label: `${a.code} - ${a.name}`, value: a.id })) : []} 
            required 
          />
          <Input name="date" label="Data de Pagamento" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
          <div className="grid grid-cols-2 gap-4">
            <Input name="dividend_value" label="Dividendos (R$)" type="number" step="0.01" placeholder="0,00" />
            <Input name="jcp_value" label="JCP (R$)" type="number" step="0.01" placeholder="0,00" />
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isBrokerModalOpen} 
        onClose={() => setIsBrokerModalOpen(false)} 
        title="Gerenciar Corretoras"
      >
        <div className="space-y-6">
          <form onSubmit={handleCreateBroker} className="space-y-3">
            <Input name="name" label="Nova Corretora" placeholder="Nome da corretora..." required />
            <Input name="cnpj" label="CNPJ da Corretora" placeholder="00.000.000/0001-00" />
            <Button type="submit" className="w-full">Adicionar Corretora</Button>
          </form>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suas Corretoras</p>
            {data.brokers.map(b => (
              <div key={b.id} className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all",
                b.id === data.currentBrokerId ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100 hover:bg-slate-50"
              )}>
                <button 
                  onClick={() => { setData(prev => ({ ...prev, currentBrokerId: b.id })); setIsBrokerModalOpen(false); }}
                  className="flex-1 text-left"
                >
                  <p className="font-semibold text-slate-700">{b.name}</p>
                  {b.cnpj && <p className="text-[10px] text-slate-400 font-mono">{b.cnpj}</p>}
                </button>
                <div className="flex items-center gap-1">
                  {b.id === data.currentBrokerId && <CheckCircle2 className="w-4 h-4 text-blue-600 mr-2" />}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      askConfirm(
                        'Excluir Corretora',
                        `Deseja realmente excluir a corretora ${b.name} e todos os seus dados? Esta ação não pode ser desfeita.`,
                        async () => {
                          setSyncLoading(true);
                          try {
                            const { error } = await supabase.from('brokers').delete().eq('id', b.id);
                            if (error) throw error;

                            setData(prev => {
                              const newBrokers = prev.brokers.filter(br => br.id !== b.id);
                              return {
                                ...prev,
                                brokers: newBrokers,
                                currentBrokerId: b.id === prev.currentBrokerId ? (newBrokers[0]?.id || null) : prev.currentBrokerId
                              };
                            });
                            showNotify('Corretora removida');
                          } catch (err) {
                            console.error(err);
                            showNotify('Erro ao remover corretora', 'error');
                          } finally {
                            setSyncLoading(false);
                          }
                        }
                      );
                    }}
                    className="text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isIrpfPdfModalOpen} 
        onClose={() => !isProcessingPdf && setIsIrpfPdfModalOpen(false)} 
        title="Importar Informe de Rendimentos"
      >
        <div className="space-y-6">
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-3">
            <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-sm text-emerald-800">
              <p className="font-bold mb-1">Relatório para IRPF</p>
              <p>Envie o PDF do seu Informe de Rendimentos anual. Nossa IA irá organizar os dados nas fichas corretas (Bens e Direitos, Rendimentos Isentos, etc.) com os códigos oficiais.</p>
            </div>
          </div>

          <div className="relative">
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleIrpfPdfUpload}
              disabled={isProcessingPdf}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={cn(
              "p-8 border-2 border-dashed rounded-2xl text-center transition-all",
              isProcessingPdf ? "bg-slate-50 border-slate-200" : "bg-white border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50"
            )}>
              {isProcessingPdf ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-bold text-emerald-700">Processando Informe...</p>
                  <p className="text-xs text-slate-500 italic">Isso pode levar alguns segundos enquanto a IA analisa o documento.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Download className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Clique ou arraste o PDF aqui</p>
                  <p className="text-xs text-slate-500">Apenas arquivos .pdf são suportados</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isPdfModalOpen} 
        onClose={() => !isProcessingPdf && setIsPdfModalOpen(false)} 
        title="Importar Nota de Negociação"
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-bold mb-1">Como funciona?</p>
              <p>Envie o PDF da sua nota de negociação. Nossa IA irá extrair automaticamente a data, o ativo, a quantidade e o preço das operações.</p>
            </div>
          </div>

          <div className="relative">
            <input 
              type="file" 
              accept="application/pdf" 
              onChange={handlePdfUpload}
              disabled={isProcessingPdf}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className={cn(
              "border-2 border-dashed rounded-2xl p-10 text-center transition-all",
              isProcessingPdf ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/30"
            )}>
              {isProcessingPdf ? (
                <div className="space-y-4">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-bold text-slate-600 animate-pulse">Processando nota com IA...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Download className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Clique ou arraste o PDF aqui</p>
                  <p className="text-xs text-slate-500">Suporta notas da XP, Rico, Clear, BTG, etc.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
        title={confirmModal.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>Cancelar</Button>
            <Button variant="danger" onClick={confirmModal.onConfirm}>Confirmar Exclusão</Button>
          </>
        }
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-slate-600">{confirmModal.message}</p>
        </div>
      </Modal>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={cn(
              "fixed bottom-8 left-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-2xl shadow-xl text-white font-semibold",
              notification.type === 'success' ? "bg-emerald-600" : "bg-red-600"
            )}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
