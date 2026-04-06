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
  Settings,
  RefreshCw,
  Star,
  Check,
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
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from './lib/utils';
import { Asset, AssetType, Transaction, Dividend, Broker, AppData, DataSnapshot, IrpfItem } from './types';
import { ASSET_TYPES, ASSET_COLORS, APP_VERSION, APP_CHANGELOG } from './constants';
import { encryptData, decryptData, hashPassword } from './lib/crypto';
import { fetchB3CompanyInfo } from './services/b3Service';

const IRPF_CODES: Record<AssetType, { group: string; code: string }> = {
  'Ação': { group: '03', code: '01' },
  'FII': { group: '07', code: '03' },
  'BDR': { group: '04', code: '04' },
  'CDB': { group: '04', code: '02' },
  'Tesouro Direto': { group: '04', code: '01' },
  'Crypto': { group: '08', code: '01' },
};

// Configure PDF.js worker using the local bundled worker to avoid version mismatch
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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

const Card = ({ children, className, title, description, footer }: { 
  children: React.ReactNode; 
  className?: string;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
}) => (
  <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden', className)}>
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

const StatCard = ({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: 'blue' | 'emerald' | 'amber' | 'violet' | 'indigo' }) => {
  const colors = {
    blue: 'bg-blue-50 border-blue-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
    violet: 'bg-violet-50 border-violet-100',
    indigo: 'bg-indigo-50 border-indigo-100',
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
  const [data, setData] = useState<AppData>(() => {
    const defaultValue: AppData = { brokers: [], currentBrokerId: null };
    try {
      const saved = localStorage.getItem('lino_invest_data');
      if (!saved) return defaultValue;
      
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== 'object') return defaultValue;

      // If it's encrypted, we return the structure but we'll need to unlock it
      if (parsed.isEncrypted) {
        return parsed;
      }
      
      const brokers = Array.isArray(parsed.brokers) ? parsed.brokers : [];
      
      // Migration: ensure arrays exist for all brokers
      const migratedBrokers = brokers.map((b: any) => ({
        ...b,
        assets: Array.isArray(b.assets) ? b.assets : [],
        transactions: Array.isArray(b.transactions) ? b.transactions : [],
        dividends: Array.isArray(b.dividends) ? b.dividends : [],
        irpfItems: Array.isArray(b.irpfItems) ? b.irpfItems : []
      }));
      
      return {
        ...parsed,
        brokers: migratedBrokers,
        currentBrokerId: parsed.currentBrokerId || (migratedBrokers[0]?.id || null)
      };
    } catch (e) {
      console.error('Erro ao carregar dados do localStorage:', e);
      return defaultValue;
    }
  });

  const [isLocked, setIsLocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  useEffect(() => {
    if (data.isEncrypted && !masterPassword) {
      setIsLocked(true);
    }
  }, []);

  useEffect(() => {
    const saveData = async () => {
      if (data.isEncrypted && masterPassword) {
        try {
          // Encrypt sensitive parts
          const sensitiveData = JSON.stringify({
            brokers: data.brokers,
            snapshots: data.snapshots,
            currentBrokerId: data.currentBrokerId
          });
          const encryptedPayload = await encryptData(sensitiveData, masterPassword);
          
          const wrapper = {
            isEncrypted: true,
            passwordHash: data.passwordHash,
            lastBackupPrompt: data.lastBackupPrompt,
            payload: encryptedPayload
          };
          localStorage.setItem('lino_invest_data', JSON.stringify(wrapper));
        } catch (e) {
          console.error('Erro ao salvar dados criptografados:', e);
        }
      } else if (!data.isEncrypted) {
        localStorage.setItem('lino_invest_data', JSON.stringify(data));
      }
    };

    saveData();
  }, [data, masterPassword]);

  const [activeTab, setActiveTab] = useState<'assets' | 'transactions' | 'dividends' | 'analysis' | 'report' | 'irpf'>('assets');
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isTransactionHistoryOpen, setIsTransactionHistoryOpen] = useState(false);
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<Asset | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isDividendModalOpen, setIsDividendModalOpen] = useState(false);
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);
  const [isCnpjModalOpen, setIsCnpjModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isIrpfPdfModalOpen, setIsIrpfPdfModalOpen] = useState(false);
  const [isIrpfModalOpen, setIsIrpfModalOpen] = useState(false);
  const [selectedIrpfItem, setSelectedIrpfItem] = useState<IrpfItem | null>(null);
  const [irpfForm, setIrpfForm] = useState({
    topic: 'Bens e Direitos',
    group: '',
    code: '',
    description: '',
    cnpj: '',
    value: 0,
    previousValue: 0,
    ticker: ''
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [assetFilterType, setAssetFilterType] = useState<string>('all');
  const [userApiKey, setUserApiKey] = useState(localStorage.getItem('USER_GEMINI_API_KEY') || '');
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [isAutoFillingCnpjs, setIsAutoFillingCnpjs] = useState(false);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'primary' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionFilterYear, setTransactionFilterYear] = useState<string>('all');
  const [transactionFilterMonth, setTransactionFilterMonth] = useState<string>('all');
  const [transactionFilterDay, setTransactionFilterDay] = useState<string>('all');
  const [transactionFilterType, setTransactionFilterType] = useState<string>('all');
  const [transactionFilterSource, setTransactionFilterSource] = useState<string>('all');
  const [transactionFilterBroker, setTransactionFilterBroker] = useState<string>('all');
  const [transactionFilterAsset, setTransactionFilterAsset] = useState<string>('all');
  const [dividendFilterBroker, setDividendFilterBroker] = useState<string>('all');
  const [dividendFilterAsset, setDividendFilterAsset] = useState<string>('all');
  const [dividendFilterType, setDividendFilterType] = useState<string>('all');
  const [dividendFilterYear, setDividendFilterYear] = useState<string>('all');
  const [dividendFilterMonth, setDividendFilterMonth] = useState<string>('all');
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  const [reportFilterType, setReportFilterType] = useState<string>('all');
  const [irpfFilterBroker, setIrpfFilterBroker] = useState<string>('all');
  const [irpfFilterTopic, setIrpfFilterTopic] = useState<string>('all');
  const [irpfYear, setIrpfYear] = useState<string>((new Date().getFullYear() - 1).toString());
  const [sortField, setSortField] = useState<string>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (isIrpfModalOpen) {
      if (selectedIrpfItem) {
        setIrpfForm({
          topic: selectedIrpfItem.topic || 'Bens e Direitos',
          group: selectedIrpfItem.group || '',
          code: selectedIrpfItem.code || '',
          description: selectedIrpfItem.description || '',
          cnpj: selectedIrpfItem.cnpj || '',
          value: selectedIrpfItem.value || 0,
          previousValue: selectedIrpfItem.previousValue || 0,
          ticker: ''
        });
      } else {
        setIrpfForm({
          topic: 'Bens e Direitos',
          group: '',
          code: '',
          description: '',
          cnpj: '',
          value: 0,
          previousValue: 0,
          ticker: ''
        });
      }
    }
  }, [selectedIrpfItem, isIrpfModalOpen]);

  const handleIrpfTickerChange = (ticker: string) => {
    const normalizedTicker = ticker.trim().toUpperCase();
    setIrpfForm(prev => ({ ...prev, ticker: normalizedTicker }));
    
    if (!currentBroker) return;
    
    const asset = (currentBroker.assets || []).find(a => a.code.trim().toUpperCase() === normalizedTicker);
    if (asset) {
      const codes = IRPF_CODES[asset.type] || { group: '99', code: '99' };
      const stats = assetStats[asset.id] || { quantityCurrentYear: 0, avgPrice: 0, totalInvestedCurrentYear: 0, totalInvestedPreviousYear: 0 };
      const calendarYear = parseInt(irpfYear);
      
      let description = irpfForm.description;
      if (irpfForm.topic === 'Bens e Direitos') {
        description = getBensEDireitosDescription(asset, stats, calendarYear, currentBroker);
      }
      
      setIrpfForm(prev => ({
        ...prev,
        group: codes.group,
        code: codes.code,
        cnpj: asset.cnpj || prev.cnpj,
        description: description,
        value: stats.totalInvestedCurrentYear || prev.value,
        previousValue: stats.totalInvestedPreviousYear || prev.previousValue
      }));
    }
  };

  const currentBroker = useMemo(() => {
    if (!data || !Array.isArray(data.brokers)) return null;
    return data.brokers.find(b => b.id === data.currentBrokerId) || null;
  }, [data.brokers, data.currentBrokerId]);

  useEffect(() => {
    setSearchTerm('');
    setTransactionFilterYear('all');
    setTransactionFilterMonth('all');
    setTransactionFilterDay('all');
    setTransactionFilterType('all');
    setTransactionFilterSource('all');
    setDividendFilterAsset('all');
    setDividendFilterType('all');
    setDividendFilterYear('all');
    setDividendFilterMonth('all');
    setReportSearchTerm('');
    setReportFilterType('all');
    setIrpfFilterTopic('all');
    setAssetFilterType('all');
  }, [data.currentBrokerId]);

  useEffect(() => {
    if (dividendFilterType !== 'all' && dividendFilterAsset !== 'all') {
      const selectedAsset = currentBroker?.assets.find(a => a.id === dividendFilterAsset);
      if (selectedAsset && selectedAsset.type !== dividendFilterType) {
        setDividendFilterAsset('all');
      }
    }
  }, [dividendFilterType, dividendFilterAsset, currentBroker]);

  useEffect(() => {
    const checkBackup = () => {
      const lastPrompt = data.lastBackupPrompt ? new Date(data.lastBackupPrompt) : null;
      const now = new Date();
      
      // If never prompted or 5 days passed (5 * 24 * 60 * 60 * 1000 ms)
      if (!lastPrompt || (now.getTime() - lastPrompt.getTime()) > 5 * 24 * 60 * 60 * 1000) {
        askConfirm(
          'Backup de Segurança',
          'Já faz algum tempo desde o seu último backup. Deseja baixar uma cópia de segurança de todos os seus dados agora para garantir que nada seja perdido?',
          () => {
            handleFullBackup();
            setData(prev => ({ ...prev, lastBackupPrompt: new Date().toISOString() }));
          },
          'Confirmar Exportação',
          'primary'
        );
        // Even if they cancel, we update the prompt date so we don't annoy them every reload
        if (lastPrompt) {
           setData(prev => ({ ...prev, lastBackupPrompt: new Date().toISOString() }));
        } else {
           // First time prompt, set it anyway
           setData(prev => ({ ...prev, lastBackupPrompt: new Date().toISOString() }));
        }
      }
    };

    const timer = setTimeout(checkBackup, 3000);
    return () => clearTimeout(timer);
  }, [data.lastBackupPrompt]);

  // --- Calculations ---

  const uniqueTransactions = useMemo(() => {
    const allTransactions: (Transaction & { brokerName: string; brokerId: string })[] = [];
    
    data.brokers.forEach(broker => {
      const assetIdToCode = new Map<string, string>();
      (broker.assets || []).forEach(a => assetIdToCode.set(a.id, a.code.trim().toUpperCase()));

      const seen = new Map<string, Transaction>();
      const unique: Transaction[] = [];
      
      [...(broker.transactions || [])]
        .sort((a, b) => {
          const dateCompare = (a.date || '').localeCompare(b.date || '');
          if (dateCompare !== 0) return dateCompare;
          
          const sourcePriority: Record<string, number> = {
            'Nota de Corretagem': 1,
            'Manual': 2,
            'Extrato de Custódia': 3,
            'Informe de Rendimentos': 4
          };
          const aPrio = sourcePriority[a.source as string] || 5;
          const bPrio = sourcePriority[b.source as string] || 5;
          if (aPrio !== bPrio) return aPrio - bPrio;

          if (a.type === 'Compra' && b.type === 'Venda') return -1;
          if (a.type === 'Venda' && b.type === 'Compra') return 1;
          return 0;
        })
        .forEach(t => {
          const code = assetIdToCode.get(t.assetId) || 'UNKNOWN';
          const date = (t.date || '').split('T')[0];
          const qty = Math.abs(t.quantity || 0).toFixed(4);
          const type = t.type;
          
          const key = `${code}-${date}-${type}-${qty}`;
          
          const existing = seen.get(key);
          if (existing) {
            const sourcePriority: Record<string, number> = { 'Nota de Corretagem': 1, 'Manual': 2, 'Extrato de Custódia': 3, 'Informe de Rendimentos': 4 };
            const existingPrio = sourcePriority[existing.source as string] || 5;
            const currentPrio = sourcePriority[t.source as string] || 5;
            
            if (currentPrio >= existingPrio) return;
            
            const idx = unique.indexOf(existing);
            if (idx !== -1) unique.splice(idx, 1);
          }
          
          seen.set(key, t);
          unique.push(t);
        });
      
      unique.forEach(t => allTransactions.push({ ...t, brokerName: broker.name, brokerId: broker.id }));
    });
    
    return allTransactions;
  }, [data.brokers]);

  const uniqueDividends = useMemo(() => {
    const allDividends: (Dividend & { brokerName: string; brokerId: string })[] = [];
    
    data.brokers.forEach(broker => {
      const assetIdToCode = new Map<string, string>();
      (broker.assets || []).forEach(a => assetIdToCode.set(a.id, a.code.trim().toUpperCase()));

      const seen = new Map<string, Dividend>();
      const unique: Dividend[] = [];
      
      [...(broker.dividends || [])]
        .sort((a, b) => {
          const dateCompare = (a.date || '').localeCompare(b.date || '');
          if (dateCompare !== 0) return dateCompare;
          
          const sourcePriority: Record<string, number> = { 'Manual': 1, 'Extrato de Custódia': 2, 'Informe de Rendimentos': 3 };
          const aPrio = sourcePriority[a.source as string] || 4;
          const bPrio = sourcePriority[b.source as string] || 4;
          return aPrio - bPrio;
        })
        .forEach(d => {
          const code = assetIdToCode.get(d.assetId) || 'UNKNOWN';
          const date = (d.date || '').split('T')[0];
          const val = (d.dividendValue || 0).toFixed(2);
          const jcp = (d.jcpValue || 0).toFixed(2);
          
          const key = `${code}-${date}-${val}-${jcp}`;
          
          const existing = seen.get(key);
          if (existing) {
            const sourcePriority: Record<string, number> = { 'Manual': 1, 'Extrato de Custódia': 2, 'Informe de Rendimentos': 3 };
            const existingPrio = sourcePriority[existing.source as string] || 4;
            const currentPrio = sourcePriority[d.source as string] || 4;
            
            if (currentPrio >= existingPrio) return;
            
            const idx = unique.indexOf(existing);
            if (idx !== -1) unique.splice(idx, 1);
          }
          
          seen.set(key, d);
          unique.push(d);
        });
      
      unique.forEach(d => allDividends.push({ ...d, brokerName: broker.name, brokerId: broker.id }));
    });
    
    return allDividends;
  }, [data.brokers]);

  const assetStats = useMemo(() => {
    const stats: Record<string, { 
      quantity: number; 
      totalInvested: number; 
      avgPrice: number;
      currentPrice: number;
      currentValue: number;
      profit: number;
      profitPercentage: number;
      boughtQuantity: number;
      soldQuantity: number;
      quantityCurrentYear: number;
      totalInvestedCurrentYear: number;
      quantityPreviousYear: number;
      totalInvestedPreviousYear: number;
    }> = {};

    const calendarYear = parseInt(irpfYear);
    const previousYear = calendarYear - 1;
    const currentYearEnd = `${calendarYear}-12-31`;
    const previousYearEnd = `${previousYear}-12-31`;

    data.brokers.forEach(broker => {
      const assetsByCode: Record<string, Asset[]> = {};
      (broker.assets || []).forEach(a => {
        const code = a.code.trim().toUpperCase();
        if (!assetsByCode[code]) assetsByCode[code] = [];
        assetsByCode[code].push(a);
      });

      const assetIdToCode = new Map<string, string>();
      (broker.assets || []).forEach(a => assetIdToCode.set(a.id, a.code.trim().toUpperCase()));

      Object.values(assetsByCode).forEach(assetsWithThisCode => {
        const firstAsset = assetsWithThisCode[0];
        const code = firstAsset.code.trim().toUpperCase();
        
        const transactions = uniqueTransactions
          .filter(t => t.brokerId === broker.id && assetIdToCode.get(t.assetId) === code)
          .sort((a, b) => {
            const dateCompare = (a.date || '').localeCompare(b.date || '');
            if (dateCompare !== 0) return dateCompare;
            if (a.type === 'Compra' && b.type === 'Venda') return -1;
            if (a.type === 'Venda' && b.type === 'Compra') return 1;
            return 0;
          });

        let quantity = 0;
        let totalInvested = 0;
        let avgPrice = 0;
        let boughtQuantity = 0;
        let soldQuantity = 0;
        let quantityCurrentYear = 0;
        let totalInvestedCurrentYear = 0;
        let quantityPreviousYear = 0;
        let totalInvestedPreviousYear = 0;

        transactions.forEach(t => {
          const absQty = Math.abs(t.quantity || 0);
          const price = t.price || 0;
          
          if (t.type === 'Compra') {
            boughtQuantity += absQty;
            const newQuantity = quantity + absQty;
            const newTotalInvested = totalInvested + (absQty * price);
            quantity = newQuantity;
            totalInvested = newTotalInvested;
            avgPrice = quantity > 0 ? totalInvested / quantity : 0;
          } else {
            soldQuantity += absQty;
            if (quantity > 0) {
              const ratio = (quantity - absQty) / quantity;
              quantity = Math.max(0, quantity - absQty);
              totalInvested = quantity > 0 ? totalInvested * ratio : 0;
            } else {
              quantity = 0;
              totalInvested = 0;
              avgPrice = 0;
            }
          }

          if (t.date && t.date <= previousYearEnd) {
            quantityPreviousYear = quantity;
            totalInvestedPreviousYear = totalInvested;
          }
          if (t.date && t.date <= currentYearEnd) {
            quantityCurrentYear = quantity;
            totalInvestedCurrentYear = totalInvested;
          }
        });

        const currentPrice = firstAsset.currentPrice || 0;
        const currentValue = quantity * currentPrice;
        const profit = quantity > 0 ? currentValue - totalInvested : 0;
        const profitPercentage = (quantity > 0 && totalInvested > 0) ? (profit / totalInvested) * 100 : 0;

        const consolidatedStat = {
          quantity,
          totalInvested,
          avgPrice,
          currentPrice,
          currentValue,
          profit,
          profitPercentage,
          boughtQuantity,
          soldQuantity,
          quantityCurrentYear,
          totalInvestedCurrentYear,
          quantityPreviousYear,
          totalInvestedPreviousYear
        };

        // Map this stat to ALL asset IDs in this group for robustness
        assetsWithThisCode.forEach(a => {
          stats[a.id] = consolidatedStat;
        });
      });
    });

    return stats;
  }, [data.brokers, irpfYear, uniqueTransactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getBensEDireitosDescription = (asset: Asset, stats: any, calendarYear: number, broker: Broker) => {
    const codes = IRPF_CODES[asset.type] || { group: '99', code: '99' };
    const typeLabel = asset.type === 'Ação' ? 'Ações' : asset.type === 'FII' ? 'Cotas de Fundo de Investimento Imobiliário' : asset.type;
    const brokerCnpj = broker?.cnpj ? ` (CNPJ: ${broker.cnpj})` : '';
    const assetCnpj = asset.cnpj ? ` (CNPJ: ${asset.cnpj})` : '';
    const nameToUse = asset.corporateName || asset.name;
    
    return `${stats.quantityCurrentYear.toLocaleString('pt-BR')} ${typeLabel} de ${asset.code} - ${nameToUse}${assetCnpj}, custodiadas na corretora ${broker?.name}${brokerCnpj}. Custo médio de aquisição: ${formatCurrency(stats.avgPrice)}. Situação em 31/12/${calendarYear - 1}: ${formatCurrency(stats.totalInvestedPreviousYear || 0)}. Situação em 31/12/${calendarYear}: ${formatCurrency(stats.totalInvestedCurrentYear || 0)}.`;
  };

  const allIrpfItems = useMemo(() => {
    const brokersToProcess = irpfFilterBroker === 'all' 
      ? data.brokers 
      : data.brokers.filter(b => b.id === irpfFilterBroker);
    
    const items: any[] = [];
    const calendarYear = parseInt(irpfYear);
    const calendarYearStr = calendarYear.toString();

    brokersToProcess.forEach(broker => {
      // Group assets by code for IRPF
      const uniqueAssetsMap = new Map<string, Asset>();
      (broker.assets || []).forEach(a => {
        const code = a.code.trim().toUpperCase();
        if (!uniqueAssetsMap.has(code)) uniqueAssetsMap.set(code, a);
      });
      const uniqueAssets = Array.from(uniqueAssetsMap.values());
      
      // 1. Bens e Direitos from Assets
      uniqueAssets.forEach(asset => {
        const stats = assetStats[asset.id];
        if (stats && (stats.quantityCurrentYear > 0 || stats.quantityPreviousYear > 0)) {
          const codes = IRPF_CODES[asset.type] || { group: '99', code: '99' };
          items.push({
            id: `auto-bens-${asset.id}`,
            brokerId: broker.id,
            brokerName: broker.name,
            topic: 'Bens e Direitos',
            ficha: 'Bens e Direitos',
            group: codes.group,
            code: codes.code,
            description: getBensEDireitosDescription(asset, stats, calendarYear, broker),
            value: stats.totalInvestedCurrentYear,
            previousValue: stats.totalInvestedPreviousYear,
            cnpj: asset.cnpj || broker.cnpj,
            guide: `Declare no grupo ${codes.group} e código ${codes.code}. No campo 'Discriminação', informe a quantidade, o nome do ativo, o CNPJ da empresa e a corretora onde estão custodiados.`
          });
        }
      });

      // 2. Rendimentos from Dividends
      const dividendsByAssetCode: Record<string, { dividend: number; jcp: number }> = {};
      const assetIdToCode = new Map<string, string>();
      (broker.assets || []).forEach(a => assetIdToCode.set(a.id, a.code.trim().toUpperCase()));

      (broker.dividends || []).forEach(div => {
        if (div.date.startsWith(calendarYearStr)) {
          const code = assetIdToCode.get(div.assetId);
          if (code) {
            if (!dividendsByAssetCode[code]) {
              dividendsByAssetCode[code] = { dividend: 0, jcp: 0 };
            }
            dividendsByAssetCode[code].dividend += div.dividendValue || 0;
            dividendsByAssetCode[code].jcp += div.jcpValue || 0;
          }
        }
      });

      Object.entries(dividendsByAssetCode).forEach(([code, values]) => {
        const asset = uniqueAssets.find(a => a.code.trim().toUpperCase() === code);
        if (!asset) return;

        if (values.dividend > 0) {
          const code = asset.type === 'Ação' ? '09' : '26';
          const nameToUse = asset.corporateName || asset.name;
          items.push({
            id: `auto-div-${broker.id}-${asset.id}`,
            brokerId: broker.id,
            brokerName: broker.name,
            topic: 'Rendimentos Isentos',
            ficha: 'Rendimentos Isentos e Não Tributáveis',
            code: code,
            description: `Rendimentos isentos de ${nameToUse} (${asset.code}) - ${broker.name}`,
            value: values.dividend,
            cnpj: asset.cnpj || broker.cnpj,
            guide: `Declare na ficha 'Rendimentos Isentos e Não Tributáveis', sob o código ${code}. Informe o CNPJ da fonte pagadora e o valor total recebido no ano.`
          });
        }

        if (values.jcp > 0) {
          const nameToUse = asset.corporateName || asset.name;
          items.push({
            id: `auto-jcp-${broker.id}-${asset.id}`,
            brokerId: broker.id,
            brokerName: broker.name,
            topic: 'Rendimentos Sujeitos à Tributação Exclusiva',
            ficha: 'Rendimentos Sujeitos à Tributação Exclusiva/Definitiva',
            code: '10',
            description: `Juros sobre Capital Próprio de ${nameToUse} (${asset.code}) - ${broker.name}`,
            value: values.jcp,
            cnpj: asset.cnpj || broker.cnpj,
            guide: `Declare na ficha 'Rendimentos Sujeitos à Tributação Exclusiva/Definitiva', sob o código 10. Informe o CNPJ da fonte pagadora e o valor total recebido no ano.`
          });
        }
      });

      // 3. Manual Items
      (broker.irpfItems || []).forEach(item => {
        if (item.year === calendarYearStr) {
          items.push({
            ...item,
            brokerId: broker.id,
            brokerName: broker.name
          });
        }
      });
    });

    return items;
  }, [data.brokers, irpfFilterBroker, irpfYear, assetStats]);

  const filteredDividends = useMemo(() => {
    return uniqueDividends.filter(d => {
      const matchBroker = dividendFilterBroker === 'all' || d.brokerId === dividendFilterBroker;
      const matchAsset = dividendFilterAsset === 'all' || d.assetId === dividendFilterAsset;
      
      const broker = data.brokers.find(b => b.id === d.brokerId);
      const asset = (broker?.assets || []).find(a => a.id === d.assetId);
      const matchType = dividendFilterType === 'all' || asset?.type === dividendFilterType;
      
      const date = d.date ? parseISO(d.date) : null;
      if (!date || !isValid(date)) return false;
      
      const matchYear = dividendFilterYear === 'all' || format(date, 'yyyy') === dividendFilterYear;
      const matchMonth = dividendFilterMonth === 'all' || format(date, 'MM') === dividendFilterMonth;
      
      return matchBroker && matchAsset && matchType && matchYear && matchMonth;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [data.brokers, uniqueDividends, dividendFilterBroker, dividendFilterAsset, dividendFilterType, dividendFilterYear, dividendFilterMonth]);

  const filteredDividendsTotals = useMemo(() => {
    return filteredDividends.reduce((acc, curr) => ({
      dividend: acc.dividend + (curr.dividendValue || 0),
      jcp: acc.jcp + (curr.jcpValue || 0),
      total: acc.total + (curr.dividendValue || 0) + (curr.jcpValue || 0)
    }), { dividend: 0, jcp: 0, total: 0 });
  }, [filteredDividends]);

  const monthlyTaxData = useMemo(() => {
    const monthlyGains: Record<string, { 
      month: string; 
      stockSales: number; 
      stockProfit: number; 
      fiiProfit: number; 
      bdrProfit: number;
      otherProfit: number;
    }> = {};

    const assetAvgPrices: Record<string, { quantity: number; totalInvested: number; avgPrice: number }> = {};
    
    // Create a global asset lookup
    const allAssets = data.brokers.flatMap(b => b.assets || []);

    // Sort all transactions chronologically
    const allTransactions = [...uniqueTransactions]
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    allTransactions.forEach(t => {
      const broker = data.brokers.find(b => b.id === t.brokerId);
      const asset = (broker?.assets || []).find(a => a.id === t.assetId);
      if (!asset) return;

      const code = asset.code.trim().toUpperCase();
      const monthKey = t.date.substring(0, 7); // YYYY-MM
      if (!monthlyGains[monthKey]) {
        monthlyGains[monthKey] = { 
          month: monthKey, 
          stockSales: 0, 
          stockProfit: 0, 
          fiiProfit: 0, 
          bdrProfit: 0, 
          otherProfit: 0 
        };
      }

      // Average price should be per broker/asset code
      const statsKey = `${t.brokerId}-${code}`;
      if (!assetAvgPrices[statsKey]) {
        assetAvgPrices[statsKey] = { quantity: 0, totalInvested: 0, avgPrice: 0 };
      }

      const stats = assetAvgPrices[statsKey];

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
  }, [data.brokers, uniqueTransactions]);

  const hasDuplicates = useMemo(() => {
    if (!currentBroker) return false;
    const codes = (currentBroker.assets || []).map(a => a.code.trim().toUpperCase());
    return new Set(codes).size !== codes.length;
  }, [currentBroker]);

  const totalPortfolioValue = useMemo(() => {
    if (!currentBroker) return 0;
    // Group by code to avoid double counting duplicate assets
    const uniqueStatsByCode = new Map<string, any>();
    (currentBroker.assets || []).forEach(a => {
      const code = a.code.trim().toUpperCase();
      if (!uniqueStatsByCode.has(code) && assetStats[a.id]) {
        uniqueStatsByCode.set(code, assetStats[a.id]);
      }
    });
    
    return Array.from(uniqueStatsByCode.values()).reduce((acc: number, curr: any) => {
      // Use current market value if currentPrice is set, otherwise use cost basis
      const value = curr.currentPrice > 0 ? curr.currentValue : curr.totalInvested;
      return acc + (value || 0);
    }, 0);
  }, [assetStats, currentBroker]);

  const totalProfit = useMemo(() => {
    if (!currentBroker) return 0;
    const uniqueStatsByCode = new Map<string, any>();
    (currentBroker.assets || []).forEach(a => {
      const code = a.code.trim().toUpperCase();
      if (!uniqueStatsByCode.has(code) && assetStats[a.id]) {
        uniqueStatsByCode.set(code, assetStats[a.id]);
      }
    });
    
    return Array.from(uniqueStatsByCode.values()).reduce((acc: number, curr: any) => {
      return acc + (curr.currentPrice > 0 ? curr.profit : 0);
    }, 0);
  }, [assetStats, currentBroker]);

  const totalCostBasis = useMemo(() => {
    if (!currentBroker) return 0;
    const uniqueStatsByCode = new Map<string, any>();
    (currentBroker.assets || []).forEach(a => {
      const code = a.code.trim().toUpperCase();
      if (!uniqueStatsByCode.has(code) && assetStats[a.id]) {
        uniqueStatsByCode.set(code, assetStats[a.id]);
      }
    });
    
    return Array.from(uniqueStatsByCode.values()).reduce((acc: number, curr: any) => {
      return acc + (curr.totalInvested || 0);
    }, 0);
  }, [assetStats, currentBroker]);

  const filteredAssets = useMemo(() => {
    if (!currentBroker) return [];
    
    // Group assets by code to avoid duplicates in the list
    const uniqueAssetsMap = new Map<string, Asset>();
    (currentBroker.assets || []).forEach(a => {
      const code = a.code.trim().toUpperCase();
      if (!uniqueAssetsMap.has(code)) {
        uniqueAssetsMap.set(code, a);
      }
    });
    
    const uniqueAssets = Array.from(uniqueAssetsMap.values());

    const filtered = uniqueAssets.filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           a.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = assetFilterType === 'all' || a.type === assetFilterType;
      return matchesSearch && matchesType;
    });

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
          case 'currentPrice': valA = statsA?.currentPrice || 0; valB = statsB?.currentPrice || 0; break;
          case 'totalInvested': valA = statsA?.totalInvested || 0; valB = statsB?.totalInvested || 0; break;
          case 'currentValue': valA = statsA?.currentValue || 0; valB = statsB?.currentValue || 0; break;
          case 'profit': valA = statsA?.profit || 0; valB = statsB?.profit || 0; break;
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
  }, [currentBroker, searchTerm, assetFilterType, sortField, sortDirection, assetStats]);

  const filterOptions = useMemo(() => {
    const years = new Set<string>();
    const months = new Set<string>();
    const days = new Set<string>();
    
    data.brokers.forEach(broker => {
      // De transações
      (broker.transactions || []).forEach(t => {
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
      (broker.dividends || []).forEach(d => {
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
    });
    
    return {
      years: Array.from(years).sort((a, b) => b.localeCompare(a)),
      months: Array.from(months).sort(),
      days: Array.from(days).sort()
    };
  }, [data.brokers]);

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const askConfirm = (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    confirmText: string = 'Confirmar', 
    variant: 'danger' | 'primary' | 'success' = 'danger'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      variant,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const totalDividends = useMemo(() => {
    return uniqueDividends.reduce((acc, curr) => acc + (curr.dividendValue || 0) + (curr.jcpValue || 0), 0);
  }, [uniqueDividends]);

  // --- Handlers ---

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleUnlock = async (password: string) => {
    if (!data.isEncrypted || !data.payload) return;
    
    try {
      const decrypted = await decryptData(data.payload, password);
      const parsed = JSON.parse(decrypted);
      
      setMasterPassword(password);
      setData(prev => ({
        ...prev,
        brokers: parsed.brokers || [],
        snapshots: parsed.snapshots || [],
        currentBrokerId: parsed.currentBrokerId || prev.currentBrokerId
      }));
      setIsLocked(false);
      showNotify('Dados desbloqueados com sucesso!');
    } catch (e) {
      showNotify('Senha incorreta!', 'error');
    }
  };

  const handleSetPassword = async (password: string) => {
    if (!password) {
      // Disable encryption
      askConfirm(
        'Desativar Criptografia',
        'Deseja realmente desativar a criptografia? Seus dados serão salvos em texto simples no navegador.',
        () => {
          setData(prev => ({ ...prev, isEncrypted: false, passwordHash: undefined }));
          setMasterPassword('');
          setIsSettingPassword(false);
          showNotify('Criptografia desativada.');
        }
      );
      return;
    }

    try {
      const hash = await hashPassword(password);
      setMasterPassword(password);
      setData(prev => ({ ...prev, isEncrypted: true, passwordHash: hash }));
      setIsSettingPassword(false);
      showNotify('Criptografia ativada com sucesso!');
    } catch (e) {
      showNotify('Erro ao configurar senha.', 'error');
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

  const handleFullBackup = async () => {
    let backupData: any = { ...data };
    
    if (data.isEncrypted && masterPassword) {
      try {
        const sensitiveData = JSON.stringify({
          brokers: data.brokers,
          snapshots: data.snapshots,
          currentBrokerId: data.currentBrokerId
        });
        const encryptedPayload = await encryptData(sensitiveData, masterPassword);
        backupData = {
          isEncrypted: true,
          passwordHash: data.passwordHash,
          lastBackupPrompt: data.lastBackupPrompt,
          payload: encryptedPayload,
          backupVersion: APP_VERSION,
          exportedAt: new Date().toISOString()
        };
      } catch (e) {
        showNotify('Erro ao criptografar backup.', 'error');
        return;
      }
    } else {
      backupData = {
        ...data,
        backupVersion: APP_VERSION,
        exportedAt: new Date().toISOString()
      };
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-total-investimentos-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotify('Backup completo exportado com sucesso!');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        
        if (!importedData.brokers || !Array.isArray(importedData.brokers)) {
          throw new Error('Formato de arquivo inválido. Certifique-se de que é um backup do Gerenciador de IR.');
        }

        askConfirm(
          'Importar Backup',
          'Isso irá substituir TODOS os seus dados atuais (corretoras, ativos, transações e versões) pelos dados do arquivo. Deseja continuar?',
          () => {
            if (importedData.isEncrypted) {
              setMasterPassword('');
              setIsLocked(true);
            }
            setData({
              ...importedData,
              currentBrokerId: importedData.currentBrokerId || (importedData.brokers?.[0]?.id || null)
            });
            showNotify('Backup carregado com sucesso! ' + (importedData.isEncrypted ? 'Insira a senha para desbloquear.' : ''));
            setIsSnapshotModalOpen(false);
          },
          'Confirmar Importação',
          'primary'
        );
      } catch (err) {
        showNotify('Erro ao importar backup: ' + (err as Error).message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreateSnapshot = (label?: string) => {
    const newSnapshot: DataSnapshot = {
      id: crypto.randomUUID(),
      version: APP_VERSION,
      date: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(data.brokers)),
      label: label || `Snapshot v${APP_VERSION}`
    };

    setData(prev => ({
      ...prev,
      snapshots: [newSnapshot, ...(prev.snapshots || [])]
    }));
    showNotify('Ponto de restauração criado!');
  };

  const handleRestoreSnapshot = (snapshot: DataSnapshot) => {
    askConfirm(
      'Restaurar Versão de Dados',
      `Deseja realmente restaurar os dados da versão ${snapshot.version} criada em ${snapshot.date && isValid(parseISO(snapshot.date)) ? format(parseISO(snapshot.date), 'dd/MM/yyyy HH:mm') : 'data desconhecida'}? Os dados atuais serão substituídos.`,
      () => {
        setData(prev => ({
          ...prev,
          brokers: JSON.parse(JSON.stringify(snapshot.data)),
          currentBrokerId: snapshot.data[0]?.id || null
        }));
        showNotify('Dados restaurados com sucesso!');
        setIsSnapshotModalOpen(false);
      }
    );
  };

  const handleDeleteSnapshot = (id: string) => {
    setData(prev => ({
      ...prev,
      snapshots: (prev.snapshots || []).filter(s => s.id !== id)
    }));
    showNotify('Snapshot removido');
  };
  const handleCreateBroker = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const cnpj = formData.get('cnpj') as string;
    if (!name) return;

    const newBroker: Broker = {
      id: crypto.randomUUID(),
      name,
      cnpj,
      assets: [],
      transactions: [],
      dividends: []
    };

    setData(prev => ({
      ...prev,
      brokers: [...prev.brokers, newBroker],
      currentBrokerId: newBroker.id
    }));
    setIsBrokerModalOpen(false);
    showNotify('Corretora criada com sucesso!');
  };

  const handleSaveAsset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentBroker) return;
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as AssetType;
    const name = formData.get('name') as string;
    const code = formData.get('code') as string;
    const cnpj = formData.get('cnpj') as string;
    const corporateName = formData.get('corporateName') as string;
    const currentPriceStr = formData.get('currentPrice') as string;
    const currentPrice = currentPriceStr ? parseFloat(currentPriceStr) : undefined;

    if (editingAsset) {
      setData(prev => ({
        ...prev,
        brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
          ...b,
          assets: (b.assets || []).map(a => a.id === editingAsset.id ? { 
            ...a, 
            type, 
            name, 
            code, 
            cnpj, 
            corporateName,
            currentPrice,
            lastPriceUpdate: currentPrice !== a.currentPrice ? new Date().toISOString() : a.lastPriceUpdate
          } : a)
        } : b)
      }));
      showNotify('Ativo atualizado!');
    } else {
      // Check for duplicate code
      const existingAsset = (currentBroker.assets || []).find(a => a.code.trim().toUpperCase() === code.trim().toUpperCase());
      if (existingAsset) {
        showNotify(`Ativo com código ${code.toUpperCase()} já existe!`, 'error');
        return;
      }

      const newAsset: Asset = { 
        id: crypto.randomUUID(), 
        type, 
        name, 
        code, 
        cnpj, 
        corporateName,
        currentPrice,
        lastPriceUpdate: currentPrice !== undefined ? new Date().toISOString() : undefined
      };
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
  };

  const handleUpdatePrices = async () => {
    if (!currentBroker || currentBroker.assets.length === 0) return;
    
    const apiKey = userApiKey || localStorage.getItem('USER_GEMINI_API_KEY');
    if (!apiKey) {
      showNotify('Por favor, configure sua Chave API Gemini nas Configurações para atualizar preços automaticamente.', 'error');
      setIsSettingsModalOpen(true);
      return;
    }

    setIsUpdatingPrices(true);
    showNotify('Buscando preços atuais via IA...');

    try {
      const ai = new GoogleGenAI({ apiKey });
      const tickers = currentBroker.assets.map(a => a.code.trim().toUpperCase()).join(', ');
      
      const prompt = `Você é um analista financeiro. Busque o preço de fechamento atual (ou o mais recente do último mês) para os seguintes ativos da B3 (Brasil): ${tickers}.
      Retorne APENAS um JSON no formato: [{"code": "TICKER", "price": 0.00}, ...].
      Certifique-se de que os preços são em Reais (BRL). Se não encontrar um preço exato, use o valor de mercado mais recente disponível.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                code: { type: Type.STRING },
                price: { type: Type.NUMBER }
              },
              required: ["code", "price"]
            }
          }
        }
      });

      const result = JSON.parse(response.text);
      if (Array.isArray(result)) {
        setData(prev => ({
          ...prev,
          brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
            ...b,
            assets: (b.assets || []).map(a => {
              const found = result.find(r => r.code.trim().toUpperCase() === a.code.trim().toUpperCase());
              if (found) {
                return { 
                  ...a, 
                  currentPrice: found.price, 
                  lastPriceUpdate: new Date().toISOString() 
                };
              }
              return a;
            })
          } : b)
        }));
        showNotify('Preços atualizados com sucesso!');
      }
    } catch (e) {
      console.error('Erro ao atualizar preços:', e);
      showNotify('Erro ao buscar preços. Verifique sua chave API ou tente novamente.', 'error');
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  const handleAutoFillCnpjs = async () => {
    if (!currentBroker || !userApiKey) {
      showNotify('Configure sua chave API Gemini nas configurações primeiro!', 'error');
      return;
    }

    setIsAutoFillingCnpjs(true);
    setProcessingProgress(0);
    setProcessingStatus('Iniciando busca automática de CNPJs...');
    let count = 0;
    
    try {
      const updatedAssets = [...currentBroker.assets];
      const assetsToUpdate = updatedAssets.filter(a => !a.cnpj || !a.corporateName);
      
      for (let i = 0; i < assetsToUpdate.length; i++) {
        const asset = assetsToUpdate[i];
        const progress = (i / assetsToUpdate.length) * 100;
        setProcessingProgress(progress);
        setProcessingStatus(`Buscando informações para ${asset.code} (${i + 1}/${assetsToUpdate.length})...`);

        const info = await fetchB3CompanyInfo(asset.code, userApiKey);
        if (info) {
          const index = updatedAssets.findIndex(a => a.id === asset.id);
          if (index !== -1) {
            updatedAssets[index] = {
              ...asset,
              cnpj: asset.cnpj || info.cnpj,
              corporateName: asset.corporateName || info.corporateName
            };
            count++;
          }
        }
      }

      setProcessingProgress(100);
      if (count > 0) {
        setData(prev => ({
          ...prev,
          brokers: prev.brokers.map(b => b.id === currentBroker.id ? { ...b, assets: updatedAssets } : b)
        }));
        showNotify(`${count} ativos atualizados com sucesso!`);
      } else {
        showNotify('Nenhuma informação nova encontrada ou todos já preenchidos.');
      }
    } catch (error) {
      showNotify('Erro ao buscar informações da B3.', 'error');
    } finally {
      setIsAutoFillingCnpjs(false);
      setProcessingProgress(0);
      setProcessingStatus('');
    }
  };

  const handleConsolidateData = () => {
    if (!currentBroker) return;

    askConfirm(
      'Consolidar Dados',
      'Isso irá mesclar ativos com o mesmo código e remover transações/dividendos duplicados. Deseja continuar?',
      () => {
        setData(prev => {
          const broker = prev.brokers.find(b => b.id === prev.currentBrokerId);
          if (!broker) return prev;

          const assetsByCode = new Map<string, Asset[]>();
          (broker.assets || []).forEach(a => {
            const code = a.code.trim().toUpperCase();
            if (!assetsByCode.has(code)) assetsByCode.set(code, []);
            assetsByCode.get(code)!.push(a);
          });

          const newAssets: Asset[] = [];
          const assetIdMap = new Map<string, string>(); // oldId -> newId

          assetsByCode.forEach((assets, code) => {
            const primaryAsset = assets[0];
            const mergedAsset = { ...primaryAsset };
            assets.forEach(a => {
              if (!mergedAsset.cnpj && a.cnpj) mergedAsset.cnpj = a.cnpj;
              if (!mergedAsset.corporateName && a.corporateName) mergedAsset.corporateName = a.corporateName;
            });
            newAssets.push(mergedAsset);
            assets.forEach(a => assetIdMap.set(a.id, primaryAsset.id));
          });

          const relinkedTransactions = (broker.transactions || []).map(t => ({
            ...t,
            assetId: assetIdMap.get(t.assetId) || t.assetId
          }));

          const relinkedDividends = (broker.dividends || []).map(d => ({
            ...d,
            assetId: assetIdMap.get(d.assetId) || d.assetId
          }));

          const assetIdToCode = new Map<string, string>();
          newAssets.forEach(a => assetIdToCode.set(a.id, a.code.trim().toUpperCase()));

          // Deduplicate transactions
          const uniqueTransactions: Transaction[] = [];
          const txKeys = new Map<string, Transaction>();
          relinkedTransactions.forEach(t => {
            const tCode = assetIdToCode.get(t.assetId) || '';
            const tDate = t.date.split('T')[0];
            const qty = Number(t.quantity).toFixed(4);
            const key = `${tCode}-${tDate}-${qty}-${t.type}`;
            
            const existing = txKeys.get(key);
            if (existing) {
              const sourcePriority: Record<string, number> = { 'Nota de Corretagem': 1, 'Manual': 2, 'Extrato de Custódia': 3, 'Informe de Rendimentos': 4 };
              const existingPrio = sourcePriority[existing.source as string] || 5;
              const currentPrio = sourcePriority[t.source as string] || 5;
              if (currentPrio >= existingPrio) return;
              
              const idx = uniqueTransactions.indexOf(existing);
              if (idx !== -1) uniqueTransactions.splice(idx, 1);
            }
            
            txKeys.set(key, t);
            uniqueTransactions.push(t);
          });

          // Deduplicate dividends
          const uniqueDividends: Dividend[] = [];
          const divKeys = new Map<string, Dividend>();
          relinkedDividends.forEach(d => {
            const dCode = assetIdToCode.get(d.assetId) || '';
            const dDate = d.date.split('T')[0];
            const val = Number(d.dividendValue).toFixed(2);
            const jcp = Number(d.jcpValue).toFixed(2);
            const key = `${dCode}-${dDate}-${val}-${jcp}`;
            
            const existing = divKeys.get(key);
            if (existing) {
              const sourcePriority: Record<string, number> = { 'Manual': 1, 'Extrato de Custódia': 2, 'Informe de Rendimentos': 3 };
              const existingPrio = sourcePriority[existing.source as string] || 4;
              const currentPrio = sourcePriority[d.source as string] || 4;
              if (currentPrio >= existingPrio) return;
              
              const idx = uniqueDividends.indexOf(existing);
              if (idx !== -1) uniqueDividends.splice(idx, 1);
            }
            
            divKeys.set(key, d);
            uniqueDividends.push(d);
          });

          return {
            ...prev,
            brokers: prev.brokers.map(b => b.id === broker.id ? {
              ...b,
              assets: newAssets,
              transactions: uniqueTransactions,
              dividends: uniqueDividends
            } : b)
          };
        });
        showNotify('Dados consolidados com sucesso!');
      }
    );
  };

  const toggleDeclaredItem = (itemId: string) => {
    if (!currentBroker) return;
    setData(prev => {
      const broker = prev.brokers.find(b => b.id === prev.currentBrokerId);
      if (!broker) return prev;
      
      const declaredIds = broker.declaredItemIds || [];
      const isDeclared = declaredIds.includes(itemId);
      
      const newDeclaredIds = isDeclared 
        ? declaredIds.filter(id => id !== itemId)
        : [...declaredIds, itemId];
        
      return {
        ...prev,
        brokers: prev.brokers.map(b => b.id === prev.currentBrokerId ? { ...b, declaredItemIds: newDeclaredIds } : b)
      };
    });
  };

  const handleDeleteIrpfItem = (id: string) => {
    if (!currentBroker) return;
    askConfirm(
      'Excluir Item IRPF',
      'Deseja realmente excluir este item do relatório de IRPF?',
      () => {
        setData(prev => {
          const broker = prev.brokers.find(b => b.id === prev.currentBrokerId);
          if (!broker) return prev;
          return {
            ...prev,
            brokers: prev.brokers.map(b => b.id === prev.currentBrokerId ? {
              ...b,
              irpfItems: (b.irpfItems || []).filter(item => item.id !== id)
            } : b)
          };
        });
        showNotify('Item excluído com sucesso!');
      }
    );
  };

  const handleDeleteAsset = (id: string) => {
    if (!currentBroker) return;
    if ((currentBroker.transactions || []).some(t => t.assetId === id)) {
      showNotify('Não é possível excluir ativo com transações!', 'error');
      return;
    }
    setData(prev => ({
      ...prev,
      brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
        ...b,
        assets: (b.assets || []).filter(a => a.id !== id)
      } : b)
    }));
    showNotify('Ativo removido');
  };

  const handleDeleteTransaction = (id: string) => {
    if (!currentBroker) return;
    askConfirm(
      'Excluir Transação',
      'Tem certeza que deseja remover esta transação?',
      () => {
        setData(prev => ({
          ...prev,
          brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
            ...b,
            transactions: (b.transactions || []).filter(t => t.id !== id)
          } : b)
        }));
        showNotify('Transação removida');
      }
    );
  };

  const handleDeleteDividend = (id: string) => {
    if (!currentBroker) return;
    askConfirm(
      'Excluir Rendimento',
      'Tem certeza que deseja remover este rendimento?',
      () => {
        setData(prev => ({
          ...prev,
          brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
            ...b,
            dividends: (b.dividends || []).filter(d => d.id !== id)
          } : b)
        }));
        showNotify('Rendimento removido');
      }
    );
  };

  const handleSaveTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentBroker) return;
    const formData = new FormData(e.currentTarget);
    const assetId = formData.get('assetId') as string;
    const date = formData.get('date') as string;
    const type = formData.get('type') as 'Compra' | 'Venda';
    const quantity = parseFloat(formData.get('quantity') as string);
    const price = parseFloat(formData.get('price') as string);
    const source = (formData.get('source') as any) || 'Manual';

    const newTransaction: Transaction = { id: crypto.randomUUID(), assetId, date, quantity, price, type, source };
    setData(prev => ({
      ...prev,
      brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
        ...b,
        transactions: [...(b.transactions || []), newTransaction]
      } : b)
    }));
    setIsTransactionModalOpen(false);
    showNotify('Transação registrada!');
  };

  const handleSaveDividend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentBroker) return;
    const formData = new FormData(e.currentTarget);
    const assetId = formData.get('assetId') as string;
    const date = formData.get('date') as string;
    const dividendValue = parseFloat(formData.get('dividendValue') as string || '0');
    const jcpValue = parseFloat(formData.get('jcpValue') as string || '0');
    const source = (formData.get('source') as any) || 'Manual';

    const newDividend: Dividend = { id: crypto.randomUUID(), assetId, date, dividendValue, jcpValue, source };
    setData(prev => ({
      ...prev,
      brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
        ...b,
        dividends: [...(b.dividends || []), newDividend]
      } : b)
    }));
    setIsDividendModalOpen(false);
    showNotify('Rendimento registrado!');
  };

  const getGeminiErrorMessage = (error: any): string => {
    const message = error?.message || String(error);
    console.log('Parsing Gemini error:', message);
    
    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
      if (message.includes('spending cap')) {
        return 'Limite de gastos (Spending Cap) atingido no Google Cloud. Verifique suas configurações de faturamento ou use outra chave de API.';
      }
      return 'Limite de uso atingido (Quota Exceeded). Por favor, aguarde alguns minutos ou verifique sua cota no Google AI Studio.';
    }
    
    if (message.includes('API_KEY_INVALID') || message.includes('403') || message.includes('Forbidden')) {
      return 'Chave de API inválida ou sem permissão (Forbidden). Verifique se a chave inserida nas configurações está correta e se o faturamento está ativo no Google Cloud.';
    }

    if (message.includes('Requested entity was not found') || message.includes('404')) {
      return 'Modelo não encontrado ou erro de acesso. Verifique se sua chave tem acesso ao modelo gemini-3-flash-preview.';
    }
    
    if (message.includes('fetch failed')) {
      return 'Erro de conexão. Verifique sua internet ou se o serviço do Google está disponível.';
    }
    
    return message;
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0 || !currentBroker) return;

    setIsProcessingPdf(true);
    setProcessingProgress(0);
    
    let totalTransactions = 0;
    let totalDividends = 0;
    let successCount = 0;

    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const fileProgressBase = (index / files.length) * 100;
        const nextFileProgressBase = ((index + 1) / files.length) * 100;

        setProcessingStatus(`Processando arquivo ${index + 1} de ${files.length}: ${file.name}`);
        setProcessingProgress(fileProgressBase);

        try {
          const arrayBuffer = await file.arrayBuffer();
          const typedArray = new Uint8Array(arrayBuffer);
          
          const loadingTask = pdfjsLib.getDocument(typedArray);
          const pdf = await loadingTask.promise;
          
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            setProcessingStatus(`Lendo página ${i} de ${pdf.numPages} do arquivo ${file.name}...`);
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(" ");
            fullText += pageText + "\n";
            
            // Update progress within file reading
            const pageProgress = fileProgressBase + ((i / pdf.numPages) * (nextFileProgressBase - fileProgressBase) * 0.3);
            setProcessingProgress(pageProgress);
          }

          if (!fullText.trim()) {
            console.warn(`Não foi possível extrair texto do arquivo: ${file.name}`);
            continue;
          }

          setProcessingStatus(`IA analisando dados de ${file.name}...`);
          setProcessingProgress(fileProgressBase + (nextFileProgressBase - fileProgressBase) * 0.5);
          
          const extractedData = await extractDataFromPdf(fullText);
          
          if (extractedData && (extractedData.transactions?.length > 0 || extractedData.dividends?.length > 0)) {
            processExtractedData(extractedData);
            totalTransactions += extractedData.transactions?.length || 0;
            totalDividends += extractedData.dividends?.length || 0;
            successCount++;
          }
        } catch (fileError) {
          console.error(`Erro ao processar arquivo ${file.name}:`, fileError);
          showNotify(`Erro ao processar ${file.name}: ${fileError instanceof Error ? fileError.message : 'Erro desconhecido'}`, 'error');
        }
        
        setProcessingProgress(nextFileProgressBase);
      }

      if (successCount > 0) {
        showNotify(`Importação concluída: ${totalTransactions} transações e ${totalDividends} rendimentos de ${successCount} arquivos.`);
        setIsPdfModalOpen(false);
      } else if (files.length > 0) {
        showNotify('Nenhum dado relevante foi extraído dos arquivos selecionados.', 'error');
      }
    } catch (error: any) {
      console.error('Erro geral no processamento de PDFs:', error);
      const userFriendlyMessage = getGeminiErrorMessage(error);
      showNotify(userFriendlyMessage, 'error');
      
      if (userFriendlyMessage.includes('Chave de API') || userFriendlyMessage.includes('Limite')) {
        setIsSettingsModalOpen(true);
      }
    } finally {
      setIsProcessingPdf(false);
      setProcessingProgress(0);
      setProcessingStatus('');
      if (e.target) e.target.value = '';
    }
  };

  const normalizeTicker = (ticker: string) => {
    let t = ticker.trim().toUpperCase();
    // Remove 'F' suffix for fractional shares if it's a standard ticker (e.g., PETR4F -> PETR4)
    if (t.length > 4 && t.endsWith('F') && !t.startsWith('BOVA') && !t.startsWith('SMAL')) {
      const base = t.substring(0, t.length - 1);
      if (/^[A-Z]{4}[0-9]{1,2}$/.test(base)) {
        return base;
      }
    }
    return t;
  };

  const inferAssetType = (code: string): AssetType => {
    const c = code.toUpperCase().trim();
    if (c.includes('CDB')) return 'CDB';
    if (c.includes('TESOURO') || c.includes('TD ')) return 'Tesouro Direto';
    if (c.endsWith('34')) return 'BDR';
    if (c.endsWith('11')) {
      if (c.startsWith('BOVA') || c.startsWith('SMAL') || c.startsWith('IVVB') || c.startsWith('HASH') || c.startsWith('QBTC') || c.startsWith('ETHE')) {
        return 'Ação';
      }
      return 'FII';
    }
    return 'Ação';
  };

  const extractDataFromPdf = async (text: string) => {
    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setIsSettingsModalOpen(true);
      throw new Error('Chave de API do Gemini não configurada. Por favor, insira sua chave nas configurações.');
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Você é um CONTADOR especializado em mercado financeiro brasileiro e IRPF. 
      Sua missão é extrair dados de documentos financeiros para compor o patrimônio e rendimentos do usuário com precisão contábil absoluta.
      
      TIPOS DE DOCUMENTOS COMUNS:
      - Nota de Corretagem: Extraia transações de compra/venda do dia. (Fonte: 'Nota de Corretagem')
      - Informe de Rendimentos: Extraia o SALDO (Situação em 31/12) e os RENDIMENTOS (Dividendos/JCP) do ano. (Fonte: 'Informe de Rendimentos')
      - Extratos de Custódia: Extraia a posição atual (quantidade e preço médio/custo). (Fonte: 'Extrato de Custódia')
      
      REGRAS CRÍTICAS:
      1. CORRETORA: Identifique o nome da corretora (ex: XP, BTG, Rico, Clear, NuInvest, etc.).
      2. TRANSAÇÕES: Se o documento for um Informe de Rendimentos e mostrar "Situação em 31/12/XXXX", extraia a QUANTIDADE e o CUSTO TOTAL. Converta isso em uma transação de 'Compra' com data de 31/12 daquele ano, usando o preço unitário (Custo Total / Quantidade). Defina o 'source' como 'Informe de Rendimentos'.
      3. PREÇOS ATUAIS: Se o documento contiver o valor de mercado atual (ex: cotação de fechamento), extraia como 'assetPrices'.
      4. TAXAS: Em Notas de Corretagem, some todas as taxas (corretagem, emolumentos, ISS) ao valor da compra ou subtraia do valor da venda para obter o PREÇO LÍQUIDO. Defina o 'source' como 'Nota de Corretagem'.
      5. RENDIMENTOS: Extraia Dividendos e JCP separadamente. Se o valor for "por cota", multiplique pela quantidade ou use o valor total creditado.
      6. NÃO EXTRAIA TOTAIS: Ignore linhas que mostram "Total da Nota", "Valor Líquido da Nota", "Resumo Financeiro" ou totais de movimentação como se fossem transações individuais. Extraia apenas as operações de compra e venda de ativos específicos.
      7. TICKERS: Normalize tickers para o formato padrão (ex: PETR4, MXRF11). Se houver um 'F' no final indicando mercado fracionário (ex: PETR4F), mantenha o ticker base (PETR4).
      
      Retorne um objeto JSON com quatro campos: "brokerName", "transactions", "dividends" e "assetPrices".
      Certifique-se de que os números sejam decimais puros (ex: 1234.56), sem símbolos de moeda ou separadores de milhar.
      
      Texto do documento:
      ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brokerName: { type: Type.STRING, description: "Nome da corretora identificada no documento" },
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
                  code: { type: Type.STRING, description: "Código do ativo (ex: PETR4)" },
                  type: { type: Type.STRING, description: "Tipo: 'Compra' ou 'Venda'" },
                  quantity: { type: Type.NUMBER },
                  price: { type: Type.NUMBER },
                  source: { type: Type.STRING, enum: ['Nota de Corretagem', 'Informe de Rendimentos', 'Extrato de Custódia'] }
                },
                required: ["date", "code", "type", "quantity", "price", "source"]
              }
            },
            dividends: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
                  code: { type: Type.STRING, description: "Código do ativo (ex: PETR4)" },
                  dividendValue: { type: Type.NUMBER, description: "Valor de dividendos ou rendimentos isentos" },
                  jcpValue: { type: Type.NUMBER, description: "Valor de JCP (Juros sobre Capital Próprio)" },
                  source: { type: Type.STRING, enum: ['Informe de Rendimentos', 'Extrato de Custódia'] }
                },
                required: ["date", "code", "source"]
              }
            },
            assetPrices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING, description: "Código do ativo (ex: PETR4)" },
                  price: { type: Type.NUMBER, description: "Preço unitário atual ou de fechamento citado no documento" }
                },
                required: ["code", "price"]
              }
            }
          },
          required: ["brokerName", "transactions", "dividends", "assetPrices"]
        }
      }
    });

    try {
      const result = JSON.parse(response.text || '{"brokerName": "", "transactions": [], "dividends": [], "assetPrices": []}');
      return result;
    } catch (e) {
      console.error('Erro ao parsear resposta do Gemini:', e, response.text);
      throw new Error('A IA retornou um formato inválido. Tente novamente.');
    }
  };

  const processExtractedData = (extracted: { brokerName?: string, transactions: any[], dividends: any[], assetPrices?: any[] }) => {
    setData(prev => {
      let newBrokers = [...prev.brokers];
      let targetBrokerId = prev.currentBrokerId;
      
      if (extracted.brokerName) {
        const normalizedBrokerName = extracted.brokerName.trim().toUpperCase();
        const existingBrokerIdx = newBrokers.findIndex(b => 
          b.name.trim().toUpperCase().includes(normalizedBrokerName) || 
          normalizedBrokerName.includes(b.name.trim().toUpperCase())
        );
        
        if (existingBrokerIdx !== -1) {
          targetBrokerId = newBrokers[existingBrokerIdx].id;
        } else {
          const newBroker: Broker = {
            id: crypto.randomUUID(),
            name: extracted.brokerName.trim(),
            cnpj: '',
            assets: [],
            transactions: [],
            dividends: [],
            irpfItems: [],
            declaredItemIds: []
          };
          newBrokers = [...newBrokers, newBroker];
          targetBrokerId = newBroker.id;
        }
      }
      
      const brokerIdx = newBrokers.findIndex(b => b.id === targetBrokerId);
      if (brokerIdx === -1) return prev;
      
      const broker = newBrokers[brokerIdx];
      const newAssets = [...broker.assets];
      const newTransactions = [...broker.transactions];
      const newDividends = [...broker.dividends];

      const assetIdToCode = new Map<string, string>();
      newAssets.forEach(a => assetIdToCode.set(a.id, a.code.trim().toUpperCase()));

      // Processar Transações
      extracted.transactions?.forEach(item => {
        const code = normalizeTicker(item.code);
        let asset = newAssets.find(a => normalizeTicker(a.code) === code);
        
        if (!asset) {
          const type = inferAssetType(code);
          asset = { 
            id: crypto.randomUUID(), 
            code: code, 
            name: code, 
            type: type,
            cnpj: '',
            averagePrice: 0,
            quantity: 0,
            totalInvested: 0
          };
          newAssets.push(asset);
          assetIdToCode.set(asset.id, code);
        }

        const isVenda = item.type.toLowerCase().includes('venda') || item.type.toUpperCase() === 'V' || item.type.toUpperCase() === 'VENDA';
        const type: 'Compra' | 'Venda' = isVenda ? 'Venda' : 'Compra';
        const quantity = Math.abs(item.quantity);
        const price = item.price;
        
        // Normalizar data para comparação
        const normalizedItemDate = item.date.split('T')[0];
        
        // Evitar duplicatas
        const isDuplicate = newTransactions.some(t => {
          const tCode = assetIdToCode.get(t.assetId);
          const tDate = t.date.split('T')[0];
          
          if (tCode === code && tDate === normalizedItemDate && t.type === type) {
            const qtyMatch = Math.abs(t.quantity - quantity) < 0.0001;
            const priceMatch = Math.abs(t.price - price) < 0.01;
            
            if (qtyMatch && priceMatch) return true;
            
            if (item.source === 'Informe de Rendimentos' && t.source === 'Nota de Corretagem') {
              const itemYear = normalizedItemDate.split('-')[0];
              const tYear = tDate.split('-')[0];
              if (itemYear === tYear) return true;
            }
          }
          return false;
        });

        if (isDuplicate) return;

        newTransactions.push({
          id: crypto.randomUUID(),
          assetId: asset.id,
          date: item.date,
          quantity: quantity,
          price: price,
          type: type,
          source: item.source || 'Nota de Corretagem'
        });
      });

      // Processar Rendimentos
      extracted.dividends?.forEach(item => {
        const code = normalizeTicker(item.code);
        let asset = newAssets.find(a => normalizeTicker(a.code) === code);
        
        if (!asset) {
          const type = inferAssetType(code);
          asset = { 
            id: crypto.randomUUID(), 
            code: code, 
            name: code, 
            type: type,
            cnpj: '',
            averagePrice: 0,
            quantity: 0,
            totalInvested: 0
          };
          newAssets.push(asset);
          assetIdToCode.set(asset.id, code);
        }

        const divValue = item.dividendValue || 0;
        const jcpValue = item.jcpValue || 0;
        const normalizedItemDate = item.date.split('T')[0];

        // Evitar duplicatas
        const isDuplicate = newDividends.some(d => {
          const dCode = assetIdToCode.get(d.assetId);
          const dDate = d.date.split('T')[0];
          return dCode === code && 
                 dDate === normalizedItemDate && 
                 Math.abs(d.dividendValue - divValue) < 0.0001 && 
                 Math.abs(d.jcpValue - jcpValue) < 0.0001;
        });

        if (isDuplicate) return;

        newDividends.push({
          id: crypto.randomUUID(),
          assetId: asset.id,
          date: item.date,
          dividendValue: divValue,
          jcpValue: jcpValue
        });
      });

      // Processar Preços de Ativos
      extracted.assetPrices?.forEach(item => {
        const code = item.code.toUpperCase().trim();
        const price = item.price;
        const assetIdx = newAssets.findIndex(a => a.code.toUpperCase().trim() === code);
        
        if (assetIdx !== -1) {
          newAssets[assetIdx] = { 
            ...newAssets[assetIdx], 
            currentPrice: price, 
            lastPriceUpdate: new Date().toISOString() 
          };
        }
      });

      return {
        ...prev,
        currentBrokerId: targetBrokerId,
        brokers: newBrokers.map(b => b.id === targetBrokerId ? {
          ...b,
          assets: newAssets,
          transactions: newTransactions,
          dividends: newDividends
        } : b)
      };
    });

    const priceCount = extracted.assetPrices?.length || 0;
    showNotify(`Processamento concluído: ${extracted.transactions.length} transações, ${extracted.dividends.length} rendimentos e ${priceCount} preços encontrados.`);
    
    // Auto-consolidate after import to ensure clean data
    setTimeout(() => {
      handleConsolidateData();
    }, 1000);
  };

  const handleIrpfPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0 || !currentBroker) return;

    setIsProcessingPdf(true);
    setProcessingProgress(0);
    
    let totalItems = 0;
    let successCount = 0;

    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const fileProgressBase = (index / files.length) * 100;
        const nextFileProgressBase = ((index + 1) / files.length) * 100;

        setProcessingStatus(`Processando Informe ${index + 1} de ${files.length}: ${file.name}`);
        setProcessingProgress(fileProgressBase);

        try {
          const arrayBuffer = await file.arrayBuffer();
          const typedArray = new Uint8Array(arrayBuffer);
          const loadingTask = pdfjsLib.getDocument(typedArray);
          const pdf = await loadingTask.promise;
          
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            setProcessingStatus(`Lendo página ${i} de ${pdf.numPages} do Informe ${file.name}...`);
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(" ");
            fullText += pageText + "\n";
            
            const pageProgress = fileProgressBase + ((i / pdf.numPages) * (nextFileProgressBase - fileProgressBase) * 0.3);
            setProcessingProgress(pageProgress);
          }

          if (fullText.trim().length === 0) {
            console.error(`Não foi possível extrair texto do informe ${file.name}. O PDF pode ser uma imagem ou estar protegido.`);
            continue;
          }

          if (fullText.trim().length < 50) {
            console.warn(`Texto extraído do informe ${file.name} é muito curto (${fullText.length} caracteres).`);
            // Se o texto for muito curto, pode ser um PDF de imagem ou erro na leitura
          }

          setProcessingStatus(`IA analisando Informe ${file.name}...`);
          setProcessingProgress(fileProgressBase + (nextFileProgressBase - fileProgressBase) * 0.5);
          
          const irpfData = await extractIrpfDataFromPdf(fullText);
          
          if (irpfData && irpfData.length > 0) {
            processExtractedIrpfData(irpfData);
            totalItems += irpfData.length;
            successCount++;
          } else {
            console.warn(`IA não encontrou dados de IR no informe ${file.name}. Texto extraído (primeiros 500 chars):`, fullText.substring(0, 500));
          }
        } catch (fileError) {
          console.error(`Erro ao processar informe ${file.name}:`, fileError);
          showNotify(`Erro ao processar ${file.name}: ${fileError instanceof Error ? fileError.message : 'Erro desconhecido'}`, 'error');
        }
        
        setProcessingProgress(nextFileProgressBase);
      }

      if (successCount > 0) {
        showNotify(`${totalItems} itens importados de ${successCount} Informes de Rendimentos!`);
        setIsIrpfPdfModalOpen(false);
      } else if (files.length > 0) {
        showNotify('Nenhum dado de IR encontrado nos documentos selecionados.', 'error');
      }
    } catch (error: any) {
      console.error('Erro ao processar Informes:', error);
      const userFriendlyMessage = getGeminiErrorMessage(error);
      showNotify(userFriendlyMessage, 'error');
      
      if (userFriendlyMessage.includes('Chave de API') || userFriendlyMessage.includes('Limite')) {
        setIsSettingsModalOpen(true);
      }
    } finally {
      setIsProcessingPdf(false);
      setProcessingProgress(0);
      setProcessingStatus('');
      e.target.value = '';
    }
  };

  const handleCnpjPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0 || !currentBroker) return;

    setIsProcessingPdf(true);
    setProcessingProgress(0);
    let totalUpdated = 0;
    let successCount = 0;

    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const fileProgressBase = (index / files.length) * 100;
        const nextFileProgressBase = ((index + 1) / files.length) * 100;

        setProcessingStatus(`Extraindo CNPJs de ${file.name}...`);
        setProcessingProgress(fileProgressBase);

        try {
          const arrayBuffer = await file.arrayBuffer();
          const typedArray = new Uint8Array(arrayBuffer);
          const loadingTask = pdfjsLib.getDocument(typedArray);
          const pdf = await loadingTask.promise;
          
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(" ");
            fullText += pageText + "\n";
            
            const pageProgress = fileProgressBase + ((i / pdf.numPages) * (nextFileProgressBase - fileProgressBase) * 0.3);
            setProcessingProgress(pageProgress);
          }

          setProcessingStatus(`IA analisando CNPJs em ${file.name}...`);
          setProcessingProgress(fileProgressBase + (nextFileProgressBase - fileProgressBase) * 0.5);

          const cnpjData = await extractCnpjsFromPdf(fullText);
          if (cnpjData && cnpjData.length > 0) {
            let count = 0;
            setData(prev => {
              const broker = prev.brokers.find(b => b.id === prev.currentBrokerId)!;
              const newAssets = broker.assets.map(asset => {
                const match = cnpjData.find(d => d.code.toUpperCase() === asset.code.toUpperCase());
                if (match && match.cnpj && match.cnpj !== asset.cnpj) {
                  count++;
                  return { ...asset, cnpj: match.cnpj };
                }
                return asset;
              });
              totalUpdated += count;
              return {
                ...prev,
                brokers: prev.brokers.map(b => b.id === broker.id ? { ...b, assets: newAssets } : b)
              };
            });
            successCount++;
          }
        } catch (fileError) {
          console.error(`Erro ao processar CNPJs de ${file.name}:`, fileError);
        }
        
        setProcessingProgress(nextFileProgressBase);
      }

      if (successCount > 0) {
        showNotify(`${totalUpdated} CNPJs atualizados com sucesso de ${successCount} arquivos!`);
      } else if (files.length > 0) {
        showNotify('Nenhum CNPJ encontrado nos documentos selecionados.', 'error');
      }
    } catch (error: any) {
      console.error('Erro ao processar CNPJs:', error);
      const userFriendlyMessage = getGeminiErrorMessage(error);
      showNotify(userFriendlyMessage, 'error');
      if (userFriendlyMessage.includes('Chave de API') || userFriendlyMessage.includes('Limite')) {
        setIsSettingsModalOpen(true);
      }
    } finally {
      setIsProcessingPdf(false);
      setProcessingProgress(0);
      setProcessingStatus('');
      e.target.value = '';
    }
  };

  const extractCnpjsFromPdf = async (text: string) => {
    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setIsSettingsModalOpen(true);
      throw new Error('Chave de API do Gemini não configurada. Por favor, insira sua chave nas configurações.');
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Você é um especialista em mercado financeiro brasileiro.
      Analise o documento fornecido e extraia o CNPJ de cada ativo financeiro mencionado.
      Geralmente esses dados estão em Informes de Rendimentos ou Extratos de Custódia.
      
      Identifique o CÓDIGO DO ATIVO (Ticker, ex: PETR4, MXRF11, IVVB11) e o respectivo CNPJ da empresa ou fundo.
      Normalize os tickers para o formato padrão (ex: PETR4, MXRF11). Se houver um 'F' no final indicando mercado fracionário (ex: PETR4F), mantenha o ticker base (PETR4).
      
      Retorne um JSON array de objetos com as propriedades "code" e "cnpj".
      
      Texto do documento:
      ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING, description: "Código do ativo (ex: PETR4)" },
              cnpj: { type: Type.STRING, description: "CNPJ formatado (00.000.000/0000-00)" }
            },
            required: ["code", "cnpj"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || '[]');
    } catch (e) {
      console.error('Erro ao parsear resposta do Gemini:', e);
      return [];
    }
  };

  const extractIrpfDataFromPdf = async (text: string) => {
    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setIsSettingsModalOpen(true);
      throw new Error('Chave de API do Gemini não configurada. Por favor, insira sua chave nas configurações.');
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Você é um especialista em IRPF (Imposto de Renda Pessoa Física) do Brasil e contador especializado em investimentos.
      Analise o texto extraído de um Informe de Rendimentos e extraia TODOS os dados relevantes para a declaração anual.
      O objetivo é que o usuário saiba exatamente o que preencher em cada ficha do programa da Receita Federal.

      REGRAS DE EXTRAÇÃO:
      1. Identifique o Ano-Calendário (ano em que os rendimentos foram recebidos). Ex: "Ano-Calendário: 2024".
      2. Extraia Saldos (Bens e Direitos), Rendimentos Isentos (Dividendos), Rendimentos Sujeitos à Tributação Exclusiva (JCP, Aplicações) e Imposto Retido.
      3. Para cada item, identifique o Grupo e Código oficial do IRPF.
      4. Se o texto estiver confuso, tente inferir pelo contexto dos nomes das seções (ex: "4. Rendimentos Sujeitos à Tributação Exclusiva").

      Categorias (topic):
      - 'Bens e Direitos'
      - 'Rendimentos Isentos'
      - 'Rendimentos Sujeitos à Tributação Exclusiva'
      - 'Rendimentos Tributáveis'
      - 'Imposto Retido na Fonte'
      - 'Rendimentos Recebidos Acumuladamente'

      REGRAS DE TICKER:
      Normalize os tickers para o formato padrão (ex: PETR4, MXRF11). Se houver um 'F' no final indicando mercado fracionário (ex: PETR4F), mantenha o ticker base (PETR4).

      Retorne um JSON array de objetos com:
      - topic: Categoria acima.
      - ficha: Nome da ficha no programa IRPF.
      - group: Grupo (para Bens e Direitos).
      - code: Código do item.
      - description: Discriminação completa (Fonte, CNPJ, Ticker, Qtd, Corretora).
      - cnpj: CNPJ da fonte pagadora.
      - value: Valor (saldo atual ou rendimento).
      - previousValue: Saldo no ano anterior (para Bens e Direitos).
      - assetCode: Ticker se disponível.
      - year: Ano-Calendário (ex: "2024").

      Texto do informe:
      ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              ficha: { type: Type.STRING },
              group: { type: Type.STRING },
              code: { type: Type.STRING },
              description: { type: Type.STRING },
              cnpj: { type: Type.STRING },
              value: { type: Type.NUMBER },
              previousValue: { type: Type.NUMBER },
              assetCode: { type: Type.STRING },
              year: { type: Type.STRING }
            },
            required: ["topic", "code", "description", "value"]
          }
        }
      }
    });

    try {
      let jsonStr = response.text || '[]';
      // Limpeza extra caso o modelo retorne markdown mesmo com responseMimeType
      if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```json|```/g, '').trim();
      }
      
      const data = JSON.parse(jsonStr);
      
      if (!Array.isArray(data)) {
        console.warn('IA retornou um objeto em vez de um array:', data);
        return [];
      }

      // Se o ano estiver faltando em algum item, tenta preencher com o ano atual ou o ano encontrado no texto
      const yearMatch = text.match(/Ano-Calendário:?\s*(\d{4})/i) || text.match(/Ano\s*base:?\s*(\d{4})/i) || text.match(/Exercício:?\s*(\d{4})/i);
      const inferredYear = yearMatch ? (yearMatch[0].toLowerCase().includes('exercício') ? (parseInt(yearMatch[1]) - 1).toString() : yearMatch[1]) : (new Date().getFullYear() - 1).toString();

      console.log(`Dados de IR extraídos: ${data.length} itens. Ano inferido: ${inferredYear}`);

      return data.map((item: any) => ({
        ...item,
        year: item.year || inferredYear
      }));
    } catch (e) {
      console.error('Erro ao parsear resposta do Gemini:', e);
      console.log('Resposta bruta da IA:', response.text);
      return [];
    }
  };

  const processExtractedIrpfData = (items: any[]) => {
    if (!currentBroker) return;
    setData(prev => {
      const broker = prev.brokers.find(b => b.id === prev.currentBrokerId);
      if (!broker) return prev;

      const existingItems = broker.irpfItems || [];
      const newItems = items.filter(item => {
        // Verificar duplicata exata
        return !existingItems.some(existing => 
          existing.topic === item.topic &&
          existing.code === item.code &&
          existing.year === item.year &&
          Math.abs(existing.value - item.value) < 0.01 &&
          existing.description === item.description
        );
      }).map(item => ({ ...item, id: crypto.randomUUID() }));

      if (newItems.length === 0) return prev;

      return {
        ...prev,
        brokers: prev.brokers.map(b => b.id === prev.currentBrokerId ? {
          ...b,
          irpfItems: [...existingItems, ...newItems]
        } : b)
      };
    });
  };

  const filteredTransactions = useMemo(() => {
    return uniqueTransactions.filter(t => {
      const matchBroker = transactionFilterBroker === 'all' || t.brokerId === transactionFilterBroker;
      const matchAsset = transactionFilterAsset === 'all' || t.assetId === transactionFilterAsset;
      const matchType = transactionFilterType === 'all' || t.type === transactionFilterType;
      
      const date = t.date ? parseISO(t.date) : null;
      if (!date || !isValid(date)) return false;
      
      const matchYear = transactionFilterYear === 'all' || format(date, 'yyyy') === transactionFilterYear;
      const matchMonth = transactionFilterMonth === 'all' || format(date, 'MM') === transactionFilterMonth;
      const matchDay = transactionFilterDay === 'all' || format(date, 'dd') === transactionFilterDay;
      
      return matchBroker && matchAsset && matchType && matchYear && matchMonth && matchDay;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [uniqueTransactions, transactionFilterBroker, transactionFilterAsset, transactionFilterType, transactionFilterYear, transactionFilterMonth, transactionFilterDay]);

  const groupedTransactions: Record<string, (Transaction & { brokerName: string; brokerId: string })[]> = useMemo(() => {
    const grouped: Record<string, (Transaction & { brokerName: string; brokerId: string })[]> = {};
    filteredTransactions.forEach(t => {
      try {
        const date = parseISO(t.date);
        if (isNaN(date.getTime())) return;
        const month = format(date, 'MMMM yyyy', { locale: ptBR });
        if (!grouped[month]) grouped[month] = [];
        grouped[month].push(t);
      } catch (e) {}
    });
    return grouped;
  }, [filteredTransactions]);

  const transactionTotals = useMemo(() => {
    const assetStates: Record<string, { quantity: number; totalInvested: number }> = {};
    
    let buy = 0;
    let sell = 0;
    let costOfSales = 0;
    let realizedProfit = 0;

    // We need to process ALL transactions in chronological order to calculate realized profit correctly
    // but only sum the ones that match the current filter
    const allTransactions = [...uniqueTransactions].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    allTransactions.forEach(t => {
      const broker = data.brokers.find(b => b.id === t.brokerId);
      const asset = (broker?.assets || []).find(a => a.id === t.assetId);
      if (!asset) return;

      const code = asset.code.trim().toUpperCase();
      const statsKey = `${t.brokerId}-${code}`;
      
      if (!assetStates[statsKey]) assetStates[statsKey] = { quantity: 0, totalInvested: 0 };
      const state = assetStates[statsKey];
      
      const absQty = Math.abs(t.quantity || 0);
      const price = t.price || 0;
      const value = absQty * price;
      
      const isFiltered = filteredTransactions.some(ft => ft.id === t.id);

      if (t.type === 'Compra') {
        if (isFiltered) buy += value;
        state.quantity += absQty;
        state.totalInvested += value;
      } else {
        if (isFiltered) sell += value;
        
        const avgPrice = state.quantity > 0 ? state.totalInvested / state.quantity : 0;
        const currentCostOfSale = absQty * avgPrice;
        const currentProfit = value - currentCostOfSale;
        
        if (isFiltered) {
          costOfSales += currentCostOfSale;
          realizedProfit += currentProfit;
        }

        if (state.quantity > 0) {
          const ratio = (state.quantity - absQty) / state.quantity;
          state.quantity = Math.max(0, state.quantity - absQty);
          state.totalInvested = state.quantity > 0 ? state.totalInvested * ratio : 0;
        } else {
          state.quantity = 0;
          state.totalInvested = 0;
        }
      }
    });

    return { 
      buy, 
      sell, 
      volume: buy + sell, 
      net: buy - sell, 
      costOfSales, 
      realizedProfit 
    };
  }, [data.brokers, uniqueTransactions, filteredTransactions]);

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

  const monthlyInvestmentsData = useMemo(() => {
    if (!currentBroker) return [];
    const months = subMonths(new Date(), 11);
    const interval = eachMonthOfInterval({ start: months, end: new Date() });
    
    return interval.map(date => {
      const monthStr = format(date, 'yyyy-MM');
      const filtered = (currentBroker.transactions || []).filter(t => t.date && t.date.startsWith(monthStr) && t.type === 'Compra');
      return {
        name: format(date, 'MMM/yy', { locale: ptBR }),
        total: filtered.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0)
      };
    });
  }, [currentBroker]);

  const equityEvolutionData = useMemo(() => {
    if (!currentBroker) return [];
    const months = subMonths(new Date(), 11);
    const interval = eachMonthOfInterval({ start: months, end: new Date() });
    
    const assetIdToCode = new Map<string, string>();
    (currentBroker.assets || []).forEach(a => assetIdToCode.set(a.id, a.code.trim().toUpperCase()));

    // Track state per asset code to correctly handle cost basis evolution
    const assetStates: Record<string, { quantity: number; totalInvested: number }> = {};
    
    const allTransactions = [...uniqueTransactions]
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    let transactionIdx = 0;

    return interval.map(date => {
      const monthEnd = endOfMonth(date);
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

      // Process all transactions up to the end of this month
      while (transactionIdx < allTransactions.length && allTransactions[transactionIdx].date <= monthEndStr) {
        const t = allTransactions[transactionIdx];
        const code = assetIdToCode.get(t.assetId) || 'UNKNOWN';
        
        if (!assetStates[code]) {
          assetStates[code] = { quantity: 0, totalInvested: 0 };
        }
        
        const state = assetStates[code];
        if (t.type === 'Compra') {
          state.totalInvested += (t.quantity * t.price);
          state.quantity += t.quantity;
        } else {
          const saleQuantity = Math.abs(t.quantity);
          if (state.quantity > 0) {
            // Reduce total invested proportionally to the quantity sold (cost basis reduction)
            const ratio = (state.quantity - saleQuantity) / state.quantity;
            state.quantity = Math.max(0, state.quantity - saleQuantity);
            state.totalInvested = state.quantity > 0 ? state.totalInvested * ratio : 0;
          } else {
            state.quantity = 0;
            state.totalInvested = 0;
          }
        }
        transactionIdx++;
      }

      const totalPatrimonio = Object.values(assetStates).reduce((acc, curr) => acc + curr.totalInvested, 0);

      return {
        name: format(date, 'MMM/yy', { locale: ptBR }),
        patrimonio: Math.max(0, totalPatrimonio)
      };
    });
  }, [currentBroker, uniqueTransactions]);

  const monthlyDividendsData = useMemo(() => {
    if (!currentBroker) return [];
    const months = subMonths(new Date(), 11);
    const interval = eachMonthOfInterval({ start: months, end: new Date() });
    
    return interval.map(date => {
      const monthStr = format(date, 'yyyy-MM');
      const filtered = uniqueDividends.filter(d => d.date && d.date.startsWith(monthStr));
      return {
        name: format(date, 'MMM/yy', { locale: ptBR }),
        total: filtered.reduce((acc, curr) => acc + (curr.dividendValue || 0) + (curr.jcpValue || 0), 0)
      };
    });
  }, [currentBroker, uniqueDividends]);

  // --- Render ---

  return (
    <ErrorBoundary>
      <AnimatePresence>
        {isLocked && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-6"
          >
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 text-center space-y-8">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldCheck className="w-10 h-10 text-blue-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Aplicativo Bloqueado</h2>
                <p className="text-sm text-slate-500">Seus dados estão protegidos por criptografia. Insira sua senha mestre para acessar.</p>
              </div>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const pwd = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
                  handleUnlock(pwd);
                }}
                className="space-y-4"
              >
                <Input 
                  name="password" 
                  type="password" 
                  label="Senha Mestre" 
                  placeholder="Digite sua senha..." 
                  autoFocus 
                  required 
                />
                <Button type="submit" className="w-full py-3">Desbloquear Dados</Button>
              </form>
              
              <div className="pt-6 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  <b>Atenção:</b> Se você esquecer sua senha, não será possível recuperar os dados criptografados. 
                  A criptografia é feita localmente no seu navegador e nós não temos acesso à sua senha.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-slate-50 flex flex-col">
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
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 leading-tight">Gerenciador de IR</h1>
                  <button 
                    onClick={() => setIsChangelogModalOpen(true)}
                    className="px-1.5 py-0.5 bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors rounded text-[10px] font-mono font-bold cursor-pointer"
                  >
                    v{APP_VERSION}
                  </button>
                </div>
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
              <Button variant="ghost" size="sm" onClick={() => setIsSnapshotModalOpen(true)} className="hidden lg:inline-flex">
                <ArrowLeftRight className="w-4 h-4 mr-2" /> Versões
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsSettingsModalOpen(true)} className="hidden sm:inline-flex">
                <Settings className="w-4 h-4 mr-2" /> IA
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setData(prev => ({ ...prev, currentBrokerId: null }))} className="hidden sm:inline-flex">
                <LogOut className="w-4 h-4 mr-2" /> Sair
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
          <button 
            onClick={() => setIsSnapshotModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-slate-50 text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Versões</span>
          </button>
          <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-slate-50 text-slate-600 hover:bg-slate-100"
          >
            <Settings className="w-4 h-4" />
            <span>IA</span>
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 no-print">
          <div className="relative group">
            <StatCard title="Patrimônio (Custo)" value={formatCurrency(totalCostBasis)} icon={<Wallet className="text-blue-600" />} color="blue" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-48 text-center shadow-xl">
              Soma do custo de aquisição de todos os ativos em carteira. Valor base para o IRPF.
            </div>
          </div>
          <div className="relative group">
            <StatCard title="Patrimônio (Mercado)" value={formatCurrency(totalPortfolioValue)} icon={<Wallet className="text-indigo-600" />} color="indigo" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-48 text-center shadow-xl">
              Valor atualizado pela cotação de mercado. Reflete o seu poder de compra atual.
            </div>
          </div>
          <StatCard title="Total Rendimentos" value={formatCurrency(totalDividends)} icon={<TrendingUp className="text-emerald-600" />} color="emerald" />
          <div className="relative group">
            <StatCard title="Lucro/Prejuízo Total" value={formatCurrency(totalProfit)} icon={<TrendingUp className={cn(totalProfit >= 0 ? "text-emerald-600" : "text-red-600")} />} color={totalProfit >= 0 ? "emerald" : "amber"} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-48 text-center shadow-xl">
              Diferença entre o Valor de Mercado e o Custo de Aquisição dos ativos atuais.
            </div>
          </div>
        </div>

        {hasDuplicates && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">Ativos Duplicados Detectados</p>
                <p className="text-xs text-amber-700">Existem ativos com o mesmo código que podem estar afetando os cálculos.</p>
              </div>
            </div>
            <Button 
              variant="primary" 
              size="sm" 
              className="bg-amber-600 hover:bg-amber-700 border-none"
              onClick={handleConsolidateData}
            >
              Consolidar Agora
            </Button>
          </div>
        )}

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
                  <select 
                    value={assetFilterType}
                    onChange={(e) => setAssetFilterType(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">Todos os Tipos</option>
                    {ASSET_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <Button variant="outline" onClick={() => setIsCnpjModalOpen(true)}>
                    <Building2 className="w-4 h-4 mr-2" /> CNPJs
                  </Button>
                  <Button variant="outline" onClick={handleUpdatePrices} disabled={isUpdatingPrices}>
                    <ArrowLeftRight className={cn("w-4 h-4 mr-2", isUpdatingPrices && "animate-spin")} /> 
                    {isUpdatingPrices ? 'Atualizando...' : 'Atualizar Preços'}
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
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('code')}>
                          <div className="flex items-center">
                            Código {sortField === 'code' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('name')}>
                          <div className="flex items-center">
                            Ativo {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}
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
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('currentPrice')}>
                          <div className="flex items-center justify-end">
                            Preço Atual {sortField === 'currentPrice' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('totalInvested')}>
                          <div className="flex items-center justify-end">
                            Custo de Aquisição {sortField === 'totalInvested' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('currentValue')}>
                          <div className="flex items-center justify-end">
                            Valor de Mercado {sortField === 'currentValue' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('profit')}>
                          <div className="flex items-center justify-end">
                            Lucro/Prejuízo {sortField === 'profit' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}
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
                              <td className="px-6 py-4 font-mono text-sm font-bold text-slate-900">{asset.code}</td>
                              <td className="px-6 py-4 font-medium text-slate-600">{asset.name}</td>
                              <td className="px-6 py-4 text-right text-slate-600">{stats?.boughtQuantity?.toLocaleString('pt-BR') || '0'}</td>
                              <td className="px-6 py-4 text-right text-slate-600">{stats?.soldQuantity?.toLocaleString('pt-BR') || '0'}</td>
                              <td className="px-6 py-4 text-right font-medium text-slate-700">{stats?.quantity?.toLocaleString('pt-BR') || '0'}</td>
                              <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(stats?.avgPrice || 0)}</td>
                              <td className="px-6 py-4 text-right text-slate-600">{stats?.currentPrice ? formatCurrency(stats.currentPrice) : '-'}</td>
                              <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(stats?.totalInvested || 0)}</td>
                              <td className="px-6 py-4 text-right font-bold text-slate-900">{stats?.currentPrice ? formatCurrency(stats.currentValue) : '-'}</td>
                              <td className={cn(
                                "px-6 py-4 text-right font-bold",
                                (stats?.profit || 0) > 0 ? "text-emerald-600" : (stats?.profit || 0) < 0 ? "text-red-600" : "text-slate-600"
                              )}>
                                {stats?.currentPrice ? (
                                  <div className="flex flex-col items-end">
                                    <span>{formatCurrency(stats.profit)}</span>
                                    <span className="text-[10px] font-medium">({stats.profitPercentage.toFixed(2)}%)</span>
                                  </div>
                                ) : '-'}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="sm" onClick={() => { setSelectedAssetForHistory(asset); setIsTransactionHistoryOpen(true); }} title="Ver Histórico">
                                    <ArrowLeftRight className="w-4 h-4" />
                                  </Button>
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
                    <Button variant="outline" size="sm" onClick={handleConsolidateData} title="Remover duplicatas e consolidar ativos">
                      <RefreshCw className="w-4 h-4 mr-2" /> Consolidar
                    </Button>
                    <select 
                      value={transactionFilterBroker} 
                      onChange={(e) => setTransactionFilterBroker(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="all">Todas as Corretoras</option>
                      {data.brokers.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <select 
                      value={transactionFilterAsset} 
                      onChange={(e) => setTransactionFilterAsset(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="all">Todos os Ativos</option>
                      {Array.from(new Set(uniqueTransactions.map(t => t.assetId))).map(assetId => {
                        const broker = data.brokers.find(b => b.assets.some(a => a.id === assetId));
                        const asset = broker?.assets.find(a => a.id === assetId);
                        return asset ? (
                          <option key={assetId} value={assetId}>{asset.code}</option>
                        ) : null;
                      })}
                    </select>
                    <select 
                      value={transactionFilterYear} 
                      onChange={(e) => setTransactionFilterYear(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="all">Todos os Anos</option>
                      {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select 
                      value={transactionFilterMonth} 
                      onChange={(e) => setTransactionFilterMonth(e.target.value)}
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
                      value={transactionFilterDay} 
                      onChange={(e) => setTransactionFilterDay(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="all">Todos os Dias</option>
                      {filterOptions.days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select 
                      value={transactionFilterType} 
                      onChange={(e) => setTransactionFilterType(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="all">Todos os Tipos</option>
                      <option value="Compra">Apenas Compras</option>
                      <option value="Venda">Apenas Vendas</option>
                    </select>
                    <select 
                      value={transactionFilterSource} 
                      onChange={(e) => setTransactionFilterSource(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="all">Todas as Fontes</option>
                      <option value="Nota de Corretagem">Nota de Corretagem</option>
                      <option value="Informe de Rendimentos">Informe de Rendimentos</option>
                      <option value="Extrato de Custódia">Extrato de Custódia</option>
                      <option value="Manual">Manual</option>
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
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                    {transactionFilterYear === 'all' && transactionFilterMonth === 'all' ? 'Total de Compras' : 'Compras no Período'}
                  </p>
                  <p className="text-xl font-bold text-blue-900">{formatCurrency(transactionTotals.buy)}</p>
                </Card>
                <Card className="p-4 bg-red-50 border-red-100">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">
                    {transactionFilterYear === 'all' && transactionFilterMonth === 'all' ? 'Custo das Vendas (Baixas)' : 'Vendas no Período'}
                  </p>
                  <p className="text-xl font-bold text-red-900">
                    {transactionFilterYear === 'all' && transactionFilterMonth === 'all' 
                      ? formatCurrency(transactionTotals.costOfSales) 
                      : formatCurrency(transactionTotals.sell)}
                  </p>
                </Card>
                <Card className="p-4 bg-emerald-50 border-emerald-100">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Lucro Realizado</p>
                  <p className="text-xl font-bold text-emerald-900">{formatCurrency(transactionTotals.realizedProfit)}</p>
                </Card>
                <Card className="p-4 bg-indigo-50 border-indigo-100">
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                    {transactionFilterYear === 'all' && transactionFilterMonth === 'all' ? 'Patrimônio (Custo)' : 'Saldo do Período'}
                  </p>
                  <p className="text-xl font-bold text-indigo-900">
                    {transactionFilterYear === 'all' && transactionFilterMonth === 'all' 
                      ? formatCurrency(transactionTotals.net) 
                      : formatCurrency(transactionTotals.buy - transactionTotals.sell)}
                  </p>
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
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fonte</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Qtd</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Preço</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(transactions as Transaction[]).map(t => {
                              const asset = (currentBroker.assets || []).find(a => a.id === t.assetId);
                              return (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 text-sm text-slate-600">
                                  {t.date && isValid(parseISO(t.date)) ? format(parseISO(t.date), 'dd/MM/yyyy') : '-'}
                                </td>
                                  <td className="px-6 py-4 font-semibold text-slate-900">{asset?.code || 'Desconhecido'}</td>
                                  <td className="px-6 py-4">
                                    <span className={cn(
                                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                                      t.type === 'Compra' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                    )}>
                                      {t.type}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-[10px] text-slate-400 font-medium italic">
                                    {t.source || 'Manual'}
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
                    value={dividendFilterBroker} 
                    onChange={(e) => setDividendFilterBroker(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex-1 sm:flex-none"
                  >
                    <option value="all">Todas as Corretoras</option>
                    {data.brokers.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
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
                    {data.brokers.flatMap(b => b.assets)
                      .filter(asset => dividendFilterType === 'all' || asset.type === dividendFilterType)
                      .filter((asset, index, self) => self.findIndex(a => a.code === asset.code) === index)
                      .map(asset => (
                        <option key={asset.id} value={asset.id}>{asset.code} - {asset.name}</option>
                      ))}
                  </select>
                  <Button variant="success" onClick={() => setIsDividendModalOpen(true)} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" /> Novo Rendimento
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4 bg-emerald-50 border-emerald-100">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Dividendos Filtrados</p>
                  <p className="text-2xl font-bold text-emerald-700">{formatCurrency(filteredDividendsTotals.dividend)}</p>
                </Card>
                <Card className="p-4 bg-blue-50 border-blue-100">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">JCP Filtrado</p>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(filteredDividendsTotals.jcp)}</p>
                </Card>
                <Card className="p-4 bg-indigo-50 border-indigo-100">
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Total Filtrado</p>
                  <p className="text-2xl font-bold text-indigo-700">{formatCurrency(filteredDividendsTotals.total)}</p>
                </Card>
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
                            const asset = (currentBroker.assets || []).find(a => a.id === d.assetId);
                            return (
                              <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-600">
                                  {d.date && isValid(parseISO(d.date)) ? format(parseISO(d.date), 'dd/MM/yyyy') : '-'}
                                </td>
                                <td className="px-6 py-4 font-semibold text-slate-900">{asset?.code || 'Desconhecido'}</td>
                                <td className="px-6 py-4 text-right text-emerald-600">{formatCurrency(d.dividendValue)}</td>
                                <td className="px-6 py-4 text-right text-blue-600">{formatCurrency(d.jcpValue)}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency((d.dividendValue || 0) + (d.jcpValue || 0))}</td>
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
                <Card title="Evolução do Patrimônio (Custo de Aquisição)">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={equityEvolutionData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `R$ ${val}`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Line type="monotone" dataKey="patrimonio" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>



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

                <Card title="Rendimentos Mensais (Dividendos/JCP)">
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
                                <td className="py-4 font-medium text-slate-900">
                                  {isValid(parseISO(`${data.month}-01`)) ? format(parseISO(`${data.month}-01`), 'MMMM/yyyy', { locale: ptBR }) : data.month}
                                </td>
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

              {/* Data Audit Section */}
              <Card className="p-6 border-amber-100 bg-amber-50/30">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <h3 className="text-lg font-bold text-slate-900">Auditoria de Dados</h3>
                </div>
                <p className="text-sm text-slate-600 mb-6">
                  Esta seção ajuda a identificar possíveis erros em seus documentos ou no sistema, como transações duplicadas ou saldos inconsistentes.
                </p>

                <div className="space-y-4">
                  {/* Negative Quantities */}
                  {Object.entries(assetStats).filter(([_, s]: [string, any]) => s.quantity < 0).length > 0 && (
                    <div className="p-4 bg-white border border-red-100 rounded-lg shadow-sm">
                      <h4 className="text-sm font-bold text-red-700 mb-2 flex items-center">
                        <ArrowLeftRight className="w-4 h-4 mr-2" /> Saldo Negativo Detectado
                      </h4>
                      <p className="text-xs text-slate-500 mb-3">Estes ativos possuem mais vendas do que compras registradas. Isso indica que faltam documentos de compra no sistema.</p>
                      <ul className="space-y-1">
                        {Object.entries(assetStats).filter(([_, s]: [string, any]) => s.quantity < 0).map(([id, s]: [string, any]) => {
                          const asset = (currentBroker?.assets || []).find(a => a.id === id);
                          return (
                            <li key={id} className="text-xs font-mono text-red-600">
                              {asset?.code}: {s.quantity.toLocaleString('pt-BR')} cotas
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Potential Duplicates */}
                  {(() => {
                    const potentialDuplicates: any[] = [];
                    const seen = new Set<string>();
                    const transactions = currentBroker?.transactions || [];
                    
                    transactions.forEach((t, i) => {
                      const key = `${t.date}-${t.assetId}-${t.type}-${t.quantity}-${t.price}`;
                      for (let j = i + 1; j < transactions.length; j++) {
                        const t2 = transactions[j];
                        const key2 = `${t2.date}-${t2.assetId}-${t2.type}-${t2.quantity}-${t2.price}`;
                        if (key === key2 && !seen.has(key)) {
                          potentialDuplicates.push(t);
                          seen.add(key);
                        }
                      }
                    });

                    if (potentialDuplicates.length === 0) return null;

                    return (
                      <div className="p-4 bg-white border border-amber-100 rounded-lg shadow-sm">
                        <h4 className="text-sm font-bold text-amber-700 mb-2 flex items-center">
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Possíveis Duplicatas
                        </h4>
                        <p className="text-xs text-slate-500 mb-3">Foram encontradas transações com os mesmos dados no mesmo dia. Use o botão "Consolidar" na aba Transações para resolver.</p>
                        <ul className="space-y-1">
                          {potentialDuplicates.slice(0, 5).map(t => {
                            const asset = (currentBroker?.assets || []).find(a => a.id === t.assetId);
                            return (
                              <li key={t.id} className="text-xs font-mono text-amber-600">
                                {t.date}: {t.type} {asset?.code} ({t.quantity} x {formatCurrency(t.price)})
                              </li>
                            );
                          })}
                          {potentialDuplicates.length > 5 && <li className="text-xs text-slate-400">... e mais {potentialDuplicates.length - 5} itens.</li>}
                        </ul>
                      </div>
                    );
                  })()}

                  {/* High Value Transactions */}
                  {(() => {
                    const highValue = (currentBroker?.transactions || []).filter(t => t.quantity * t.price > 100000);
                    if (highValue.length === 0) return null;

                    return (
                      <div className="p-4 bg-white border border-blue-100 rounded-lg shadow-sm">
                        <h4 className="text-sm font-bold text-blue-700 mb-2 flex items-center">
                          <TrendingUp className="w-4 h-4 mr-2" /> Transações de Alto Valor
                        </h4>
                        <p className="text-xs text-slate-500 mb-3">Estas transações possuem valores individuais acima de R$ 100.000,00. Verifique se os números foram lidos corretamente.</p>
                        <ul className="space-y-1">
                          {highValue.slice(0, 5).map(t => {
                            const asset = (currentBroker?.assets || []).find(a => a.id === t.assetId);
                            return (
                              <li key={t.id} className="text-xs font-mono text-blue-600">
                                {t.date}: {t.type} {asset?.code} - {formatCurrency(t.quantity * t.price)}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })()}

                  {Object.entries(assetStats).filter(([_, s]: [string, any]) => s.quantity < 0).length === 0 && 
                   (currentBroker?.transactions || []).filter(t => t.quantity * t.price > 100000).length === 0 && (
                    <div className="flex items-center justify-center p-8 text-slate-400 italic text-sm">
                      Nenhuma inconsistência óbvia detectada nos dados atuais.
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
                  <select 
                    value={irpfYear} 
                    onChange={(e) => setIrpfYear(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i - 1;
                      return <option key={year} value={year.toString()}>Ano-Calendário {year}</option>;
                    })}
                  </select>
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
                      <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">{type}</h3>
                      <div className="grid grid-cols-1 gap-6">
                        {activeAssets.map(asset => {
                          const stats = assetStats[asset.id];
                          const assetDivs = currentBroker ? (currentBroker.dividends || []).filter(d => d.assetId === asset.id) : [];
                          const totalDiv = assetDivs.reduce((acc, curr) => acc + (curr.dividendValue || 0) + (curr.jcpValue || 0), 0);
                          const yieldOnCost = stats.totalInvested > 0 ? (totalDiv / stats.totalInvested) * 100 : 0;

                          return (
                            <div key={asset.id} className="print-break-inside-avoid">
                              <Card className="print:shadow-none print:border-slate-300">
                                <div className="p-4">
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <h4 className="font-bold text-slate-900 text-lg">{asset.code} - {asset.name}</h4>
                                    <p className="text-sm text-slate-500 font-mono">{asset.cnpj || 'CNPJ não informado'}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custo Total</p>
                                    <p className="text-xl font-bold text-blue-600">{formatCurrency(stats.totalInvested)}</p>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-slate-100 mb-4">
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Quantidade Atual</p>
                                    <p className="text-sm font-semibold text-slate-700">{stats.quantity.toLocaleString('pt-BR')}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Preço Médio</p>
                                    <p className="text-sm font-semibold text-slate-700">{formatCurrency(stats.avgPrice)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Rendimentos Totais</p>
                                    <p className="text-sm font-semibold text-emerald-600">{formatCurrency(totalDiv)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Yield on Cost</p>
                                    <p className="text-sm font-semibold text-blue-600">{yieldOnCost.toFixed(2)}%</p>
                                  </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Discriminação para Bens e Direitos (IRPF)</p>
                                  </div>
                                  <p className="text-sm text-slate-600 leading-relaxed italic">
                                    "{getBensEDireitosDescription(asset, stats, parseInt(irpfYear), currentBroker!)}"
                                  </p>
                                </div>
                              </div>
                            </Card>
                          </div>
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
              {(() => {
                const calendarYear = parseInt(irpfYear);
                return (
                  <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Relatório para IRPF</h2>
                <div className="flex flex-wrap gap-2 no-print w-full md:w-auto">
                  <select 
                    value={irpfFilterBroker} 
                    onChange={(e) => setIrpfFilterBroker(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">Todas as Corretoras</option>
                    {data.brokers.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <select 
                    value={irpfYear} 
                    onChange={(e) => setIrpfYear(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i - 1;
                      return <option key={year} value={year.toString()}>Ano-Calendário {year}</option>;
                    })}
                  </select>
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

                  if (topic === 'Bens e Direitos') {
                    return (
                      <div key={topic} className="space-y-0 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                        {/* Header estilo Receita */}
                        <div className="bg-[#004b8d] text-white px-4 py-3 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5" />
                            <h3 className="text-lg font-bold uppercase tracking-wide">Bens e Direitos</h3>
                          </div>
                          <Star className="w-5 h-5 text-white/50" />
                        </div>

                        {/* Info Box estilo Receita */}
                        <div className="bg-[#e3f2fd] border-b border-slate-200 p-4 flex gap-3 items-start">
                          <Info className="w-5 h-5 text-[#01579b] shrink-0 mt-0.5" />
                          <p className="text-sm text-[#01579b] leading-relaxed">
                            Nesta ficha devem ser informados os bens e direitos, no Brasil e no exterior, de propriedade do contribuinte e seus dependentes em 31/12/{calendarYear}. 
                            Utilize o botão "Marcar" para controlar quais itens você já lançou no programa oficial.
                          </p>
                        </div>

                        {/* Tabela estilo Receita */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse bg-white">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 text-[10px] font-bold text-[#004b8d] uppercase tracking-wider w-12">Marcar</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-[#004b8d] uppercase tracking-wider w-16">Item</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-[#004b8d] uppercase tracking-wider w-16">Grupo</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-[#004b8d] uppercase tracking-wider w-16">Cód.</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-[#004b8d] uppercase tracking-wider">Discriminação</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-[#004b8d] uppercase tracking-wider text-right w-32">Situação em 31/12/{calendarYear - 1} (R$)</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-[#004b8d] uppercase tracking-wider text-right w-32">Situação em 31/12/{calendarYear} (R$)</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-[#004b8d] uppercase tracking-wider text-center w-24 no-print">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {items.map((item, idx) => {
                                const isDeclared = (currentBroker?.declaredItemIds || []).includes(item.id);
                                return (
                                  <tr key={item.id} className={cn(
                                    "hover:bg-blue-50/30 transition-colors group",
                                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                                    isDeclared && "bg-emerald-50/30"
                                  )}>
                                    <td className="px-4 py-3 text-center">
                                      <button 
                                        onClick={() => toggleDeclaredItem(item.id)}
                                        className={cn(
                                          "w-5 h-5 rounded border flex items-center justify-center transition-all",
                                          isDeclared 
                                            ? "bg-emerald-500 border-emerald-600 text-white" 
                                            : "bg-white border-slate-300 text-transparent hover:border-blue-400"
                                        )}
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{idx + 1}</td>
                                    <td className="px-4 py-3 text-xs font-bold text-slate-700">{item.group || '--'}</td>
                                    <td className="px-4 py-3 text-xs font-bold text-slate-700">{item.code}</td>
                                    <td className="px-4 py-3">
                                      <div className="space-y-1">
                                        <p className="text-xs text-slate-700 leading-relaxed line-clamp-3 group-hover:line-clamp-none">
                                          {item.description}
                                        </p>
                                        {item.cnpj && (
                                          <p className="text-[10px] font-mono text-slate-400">CNPJ: {item.cnpj}</p>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono text-slate-600 text-right">
                                      {formatCurrency(item.previousValue || 0)}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono font-bold text-blue-700 text-right">
                                      {formatCurrency(item.value)}
                                    </td>
                                    <td className="px-4 py-3 text-center no-print">
                                      <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={() => {
                                            setSelectedIrpfItem(item);
                                            setIsIrpfModalOpen(true);
                                          }}
                                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                                          title="Editar"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        {!item.id.toString().startsWith('auto-') && (
                                          <button 
                                            onClick={() => handleDeleteIrpfItem(item.id)}
                                            className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                                            title="Excluir"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Footer Buttons estilo Receita */}
                        <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-wrap justify-between items-center gap-4 no-print">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => {
                              // Repetir valores: copia valores de 31/12/anterior para 31/12/atual se for manual?
                              // Ou apenas um placeholder para função semelhante
                              showNotify('Função "Repetir Valores" em desenvolvimento. Ela copiará os saldos do ano anterior.');
                            }}>
                              <RefreshCw className="w-4 h-4 mr-2" /> Repetir valores
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => {
                              setSelectedIrpfItem(null);
                              setIsIrpfModalOpen(true);
                            }}>
                              <Plus className="w-4 h-4 mr-2" /> Novo
                            </Button>
                            <Button variant="outline" size="sm" disabled>
                              <Edit2 className="w-4 h-4 mr-2" /> Editar
                            </Button>
                            <Button variant="outline" size="sm" disabled>
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
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
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Situação em 31/12/{calendarYear - 1}</p>
                                        <p className="text-lg font-bold text-slate-900">{formatCurrency(item.previousValue || 0)}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Situação em 31/12/{calendarYear}</p>
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
            </>
          );
        })()}
      </motion.div>
    )}
  </AnimatePresence>
</main>
    </>
  )}

  {/* Modals */}
      <Modal 
        isOpen={isIrpfModalOpen} 
        onClose={() => setIsIrpfModalOpen(false)} 
        title={selectedIrpfItem ? "Editar Item IRPF" : "Novo Item IRPF"}
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const newItem: any = {
            id: selectedIrpfItem?.id || Date.now().toString(),
            topic: irpfForm.topic,
            group: irpfForm.group,
            code: irpfForm.code,
            description: irpfForm.description,
            cnpj: irpfForm.cnpj,
            value: irpfForm.value,
            previousValue: irpfForm.previousValue,
            year: irpfYear
          };

          setData(prev => {
            const broker = prev.brokers.find(b => b.id === prev.currentBrokerId);
            if (!broker) return prev;
            
            const existingItems = broker.irpfItems || [];
            const updatedItems = selectedIrpfItem 
              ? existingItems.map(item => item.id === selectedIrpfItem.id ? newItem : item)
              : [...existingItems, newItem];
              
            return {
              ...prev,
              brokers: prev.brokers.map(b => b.id === prev.currentBrokerId ? { ...b, irpfItems: updatedItems } : b)
            };
          });
          
          setIsIrpfModalOpen(false);
          showNotify(selectedIrpfItem ? 'Item atualizado!' : 'Item adicionado!');
        }} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Ticker do Ativo (Auto-preencher)</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Ex: PETR4, ITUB4"
                value={irpfForm.ticker}
                onChange={(e) => handleIrpfTickerChange(e.target.value)}
                className="w-full bg-blue-50/50 border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-blue-700"
              />
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-blue-400" />
            </div>
            <p className="text-[10px] text-blue-500 italic">Digite o código para preencher grupo, código, CNPJ e descrição automaticamente.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Tópico</label>
              <select 
                value={irpfForm.topic}
                onChange={(e) => setIrpfForm(prev => ({ ...prev, topic: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Bens e Direitos">Bens e Direitos</option>
                <option value="Rendimentos Isentos">Rendimentos Isentos</option>
                <option value="Rendimentos Sujeitos à Tributação Exclusiva">Tributação Exclusiva</option>
                <option value="Rendimentos Tributáveis">Rendimentos Tributáveis</option>
                <option value="Imposto Retido na Fonte">Imposto Retido</option>
                <option value="Rendimentos Recebidos Acumuladamente">Rendimentos Acumulados</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">CNPJ (Opcional)</label>
              <input 
                type="text" 
                placeholder="00.000.000/0000-00"
                value={irpfForm.cnpj}
                onChange={(e) => setIrpfForm(prev => ({ ...prev, cnpj: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Grupo (Bens)</label>
              <input 
                type="text" 
                placeholder="Ex: 03"
                value={irpfForm.group}
                onChange={(e) => setIrpfForm(prev => ({ ...prev, group: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Código</label>
              <input 
                type="text" 
                placeholder="Ex: 01"
                required
                value={irpfForm.code}
                onChange={(e) => setIrpfForm(prev => ({ ...prev, code: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Discriminação</label>
            <textarea 
              rows={4}
              required
              value={irpfForm.description}
              onChange={(e) => setIrpfForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Situação Anterior</label>
              <input 
                type="number" 
                step="0.01"
                value={irpfForm.previousValue}
                onChange={(e) => setIrpfForm(prev => ({ ...prev, previousValue: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Situação Atual / Valor</label>
              <input 
                type="number" 
                step="0.01"
                required
                value={irpfForm.value}
                onChange={(e) => setIrpfForm(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsIrpfModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Salvar Item</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isCnpjModalOpen} onClose={() => setIsCnpjModalOpen(false)} title="Gerenciar CNPJs dos Ativos">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-sm text-slate-500">Insira os CNPJs de todos os seus ativos para que apareçam corretamente nos relatórios de Bens e Direitos.</p>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button 
                variant="primary" 
                size="sm" 
                className="w-full sm:w-auto"
                onClick={handleAutoFillCnpjs}
                disabled={isAutoFillingCnpjs}
              >
                {isAutoFillingCnpjs ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{Math.round(processingProgress)}%</span>
                  </div>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" /> Auto-preencher via IA
                  </>
                )}
              </Button>
              <input 
                type="file" 
                id="cnpj-pdf-upload" 
                className="hidden" 
                accept=".pdf" 
                multiple
                onChange={handleCnpjPdfUpload}
                disabled={isProcessingPdf}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full sm:w-auto"
                onClick={() => document.getElementById('cnpj-pdf-upload')?.click()}
                disabled={isProcessingPdf}
              >
                {isProcessingPdf ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>{Math.round(processingProgress)}%</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" /> Importar de PDF
                  </>
                )}
              </Button>
            </div>
          </div>
          {(isAutoFillingCnpjs || isProcessingPdf) && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-blue-600 uppercase">
                <span>{processingStatus}</span>
                <span>{Math.round(processingProgress)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                <motion.div 
                  className="bg-blue-600 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${processingProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
          <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Ativo / Nome Social</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">CNPJ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentBroker?.assets.map(asset => (
                  <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{asset.name}</p>
                      <input 
                        type="text"
                        placeholder="Razão Social..."
                        defaultValue={asset.corporateName || ''}
                        onBlur={(e) => {
                          const newName = e.target.value;
                          if (newName === asset.corporateName) return;
                          setData(prev => ({
                            ...prev,
                            brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
                              ...b,
                              assets: b.assets.map(a => a.id === asset.id ? { ...a, corporateName: newName } : a)
                            } : b)
                          }));
                        }}
                        className="w-full mt-1 px-2 py-1 text-[10px] border border-slate-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-500">{asset.code}</td>
                    <td className="px-4 py-3">
                      <input 
                        type="text"
                        placeholder="00.000.000/0000-00"
                        defaultValue={asset.cnpj || ''}
                        onBlur={(e) => {
                          const newCnpj = e.target.value;
                          if (newCnpj === asset.cnpj) return;
                          setData(prev => ({
                            ...prev,
                            brokers: prev.brokers.map(b => b.id === currentBroker.id ? {
                              ...b,
                              assets: b.assets.map(a => a.id === asset.id ? { ...a, cnpj: newCnpj } : a)
                            } : b)
                          }));
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
        isOpen={isTransactionHistoryOpen} 
        onClose={() => setIsTransactionHistoryOpen(false)} 
        title={`Histórico de Transações: ${selectedAssetForHistory?.code}`}
      >
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Qtd</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Preço</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Total</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Fonte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedAssetForHistory && uniqueTransactions
                  .filter(t => {
                    const asset = (currentBroker?.assets || []).find(a => a.id === t.assetId);
                    return asset?.code.trim().toUpperCase() === selectedAssetForHistory.code.trim().toUpperCase();
                  })
                  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                  .map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {t.date && isValid(parseISO(t.date)) ? format(parseISO(t.date), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          t.type === 'Compra' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        )}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{t.quantity.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{formatCurrency(t.price)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">{formatCurrency(t.quantity * t.price)}</td>
                      <td className="px-4 py-3 text-[10px] text-slate-400 italic">{t.source || 'Manual'}</td>
                    </tr>
                  ))}
                {(!selectedAssetForHistory || uniqueTransactions.filter(t => {
                  const asset = (currentBroker?.assets || []).find(a => a.id === t.assetId);
                  return asset?.code.trim().toUpperCase() === selectedAssetForHistory.code.trim().toUpperCase();
                }).length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">Nenhuma transação encontrada para este ativo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setIsTransactionHistoryOpen(false)}>Fechar</Button>
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
          <div className="grid grid-cols-2 gap-4">
            <Input name="code" label="Código (Ticker)" defaultValue={editingAsset?.code || ''} placeholder="Ex: BBAS3" required />
            <Input name="cnpj" label="CNPJ" defaultValue={editingAsset?.cnpj || ''} placeholder="00.000.000/0001-00" />
          </div>
          <Input name="corporateName" label="Nome Social / Razão Social" defaultValue={editingAsset?.corporateName || ''} placeholder="Ex: Banco do Brasil S.A." />
          <div className="grid grid-cols-2 gap-4">
            <Input name="name" label="Nome de Exibição" defaultValue={editingAsset?.name || ''} placeholder="Ex: Banco do Brasil" required />
            <Input name="currentPrice" label="Preço Atual (R$)" type="number" step="0.01" defaultValue={editingAsset?.currentPrice || ''} placeholder="0,00" />
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
            name="assetId" 
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
          <input type="hidden" name="source" value="Manual" />
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
            name="assetId" 
            label="Ativo" 
            options={currentBroker ? (currentBroker.assets || []).map(a => ({ label: `${a.code} - ${a.name}`, value: a.id })) : []} 
            required 
          />
          <Input name="date" label="Data de Pagamento" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
          <div className="grid grid-cols-2 gap-4">
            <Input name="dividendValue" label="Dividendos (R$)" type="number" step="0.01" placeholder="0,00" />
            <Input name="jcpValue" label="JCP (R$)" type="number" step="0.01" placeholder="0,00" />
          </div>
          <input type="hidden" name="source" value="Manual" />
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
              multiple
              onChange={handleIrpfPdfUpload}
              disabled={isProcessingPdf}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={cn(
              "p-8 border-2 border-dashed rounded-2xl text-center transition-all",
              isProcessingPdf ? "bg-slate-50 border-slate-200" : "bg-white border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50"
            )}>
              {isProcessingPdf ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-16 h-16">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path
                        className="text-slate-200"
                        strokeDasharray="100, 100"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <motion.path
                        className="text-emerald-600"
                        strokeDasharray={`${processingProgress}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-emerald-700">{Math.round(processingProgress)}%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-emerald-700">{processingStatus}</p>
                    <p className="text-[10px] text-slate-500 italic">Aguarde enquanto a IA processa seus documentos...</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Download className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Clique ou arraste os PDFs aqui</p>
                  <p className="text-xs text-slate-500">Você pode selecionar vários arquivos de uma vez</p>
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
              multiple
              onChange={handlePdfUpload}
              disabled={isProcessingPdf}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className={cn(
              "border-2 border-dashed rounded-2xl p-10 text-center transition-all",
              isProcessingPdf ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/30"
            )}>
              {isProcessingPdf ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-16 h-16">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path
                        className="text-slate-200"
                        strokeDasharray="100, 100"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <motion.path
                        className="text-blue-600"
                        strokeDasharray={`${processingProgress}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-700">{Math.round(processingProgress)}%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-blue-700">{processingStatus}</p>
                    <p className="text-[10px] text-slate-500 italic">Extraindo operações com inteligência artificial...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Download className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Clique ou arraste os PDFs aqui</p>
                  <p className="text-xs text-slate-500">Suporta notas da XP, Rico, Clear, BTG, etc.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
        title="Configurações de IA"
        footer={
          <Button onClick={() => setIsSettingsModalOpen(false)} className="w-full">Fechar</Button>
        }
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-blue-900">Sobre a Inteligência Artificial</p>
              <p className="text-xs text-blue-800 leading-relaxed">
                Este aplicativo utiliza a IA do Google Gemini para extrair dados de PDFs e analisar seu portfólio. 
                Se você estiver vendo o erro "Spending Cap", significa que o limite de gastos da sua conta Google Cloud foi atingido. 
                Você pode aumentar esse limite no console do Google Cloud ou usar uma chave de API gratuita do Google AI Studio.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sua Chave de API Gemini</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={userApiKey}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUserApiKey(val);
                    localStorage.setItem('USER_GEMINI_API_KEY', val);
                  }}
                  placeholder="Insira sua chave API aqui..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <p className="text-[10px] text-slate-400 italic">
                Sua chave é salva apenas no seu navegador (localStorage) e nunca é enviada para nossos servidores.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Manutenção de Dados</h3>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Consolidar Ativos e Transações</p>
                      <p className="text-[10px] text-slate-500">Mescla ativos duplicados e remove duplicatas.</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleConsolidateData}
                  >
                    Consolidar
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Segurança e Privacidade</h3>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      data.isEncrypted ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
                    )}>
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Criptografia de Dados</p>
                      <p className="text-[10px] text-slate-500">{data.isEncrypted ? 'Ativada' : 'Desativada'}</p>
                    </div>
                  </div>
                  <Button 
                    variant={data.isEncrypted ? "outline" : "primary"} 
                    size="sm"
                    onClick={() => setIsSettingPassword(true)}
                  >
                    {data.isEncrypted ? 'Alterar Senha' : 'Ativar'}
                  </Button>
                </div>
                {data.isEncrypted && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-red-500 hover:bg-red-50"
                    onClick={() => handleSetPassword('')}
                  >
                    Desativar Criptografia
                  </Button>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                Como obter uma chave gratuita? <ArrowLeftRight className="w-3 h-3 rotate-45" />
              </a>
            </div>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isSettingPassword} 
        onClose={() => setIsSettingPassword(false)} 
        title={data.isEncrypted ? "Alterar Senha Mestre" : "Ativar Criptografia"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsSettingPassword(false)}>Cancelar</Button>
            <Button type="submit" form="password-form">Salvar Senha</Button>
          </>
        }
      >
        <form 
          id="password-form" 
          onSubmit={(e) => {
            e.preventDefault();
            const pwd = (e.currentTarget.elements.namedItem('new-password') as HTMLInputElement).value;
            const confirm = (e.currentTarget.elements.namedItem('confirm-password') as HTMLInputElement).value;
            if (pwd !== confirm) {
              showNotify('As senhas não coincidem!', 'error');
              return;
            }
            handleSetPassword(pwd);
          }}
          className="space-y-4"
        >
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <b>Importante:</b> Esta senha será necessária toda vez que você abrir o aplicativo. 
              Se você perdê-la, seus dados ficarão inacessíveis permanentemente.
            </p>
          </div>
          <Input name="new-password" type="password" label="Nova Senha Mestre" placeholder="Mínimo 6 caracteres" required minLength={6} />
          <Input name="confirm-password" type="password" label="Confirmar Senha" placeholder="Repita a senha" required minLength={6} />
        </form>
      </Modal>

      <Modal 
        isOpen={isChangelogModalOpen} 
        onClose={() => setIsChangelogModalOpen(false)} 
        title="Histórico de Versões"
        footer={
          <Button onClick={() => setIsChangelogModalOpen(false)} className="w-full">Fechar</Button>
        }
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Info className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">Versão Atual: v{APP_VERSION}</p>
                <p className="text-[10px] text-blue-700">Acompanhe as atualizações do sistema.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {APP_CHANGELOG.map((entry, idx) => (
              <div key={entry.version} className="relative pl-6 border-l-2 border-slate-100 last:border-0 pb-6 last:pb-0">
                <div className="absolute left-[-9px] top-0 w-4 h-4 bg-white border-2 border-blue-500 rounded-full" />
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-slate-900">v{entry.version}</span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {entry.date && isValid(parseISO(entry.date)) ? format(parseISO(entry.date), 'dd/MM/yyyy') : '-'}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {entry.changes.map((change, cIdx) => (
                    <li key={cIdx} className="text-xs text-slate-600 flex items-start gap-2">
                      <div className="w-1 h-1 bg-slate-300 rounded-full mt-1.5 shrink-0" />
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isSnapshotModalOpen} 
        onClose={() => setIsSnapshotModalOpen(false)} 
        title="Versões e Pontos de Restauração"
        footer={
          <Button onClick={() => setIsSnapshotModalOpen(false)} className="w-full">Fechar</Button>
        }
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Histórico de Versões</h3>
            <Button size="sm" onClick={() => handleCreateSnapshot()}>
              <Plus className="w-4 h-4 mr-2" /> Criar Ponto
            </Button>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {(!data.snapshots || data.snapshots.length === 0) ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-400 italic">Nenhum ponto de restauração criado.</p>
              </div>
            ) : (
              data.snapshots.map(snapshot => (
                <div key={snapshot.id} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-mono font-bold">v{snapshot.version}</span>
                        <p className="text-sm font-bold text-slate-800">{snapshot.label}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {snapshot.date && isValid(parseISO(snapshot.date)) ? format(parseISO(snapshot.date), 'dd/MM/yyyy HH:mm') : '-'}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => handleRestoreSnapshot(snapshot)} className="text-blue-600">
                        <ArrowLeftRight className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSnapshot(snapshot.id)} className="text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-4 text-[10px] text-slate-500">
                    <p><b>{snapshot.data.length}</b> Corretoras</p>
                    <p><b>{snapshot.data.reduce((acc, b) => {
                      const uniqueCodes = new Set((b.assets || []).map(a => a.code.trim().toUpperCase()));
                      return acc + uniqueCodes.size;
                    }, 0)}</b> Ativos</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Backup Externo</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="sm" onClick={handleFullBackup}>
                <Download className="w-4 h-4 mr-2" /> Exportar Tudo
              </Button>
              <div className="relative">
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportBackup}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <Button variant="outline" size="sm" className="w-full">
                  <ArrowLeftRight className="w-4 h-4 mr-2" /> Importar Backup
                </Button>
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-[10px] text-amber-800 leading-relaxed">
                <b>Dica:</b> Use o backup externo para salvar seus dados fora do navegador. Recomendamos fazer o download pelo menos uma vez por mês ou antes de limpar o histórico do navegador.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">O que há de novo?</h4>
            <div className="space-y-4">
              {APP_CHANGELOG.map(item => (
                <div key={item.version} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">v{item.version}</span>
                    <span className="text-[10px] text-slate-400">{item.date}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {item.changes.map((change, idx) => (
                      <li key={idx} className="text-[10px] text-slate-500 leading-relaxed">{change}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 text-center">
            <p className="text-[9px] text-slate-300 font-medium tracking-wider uppercase">
              Produzido por Lino Botelho de Souza &copy; 2026
            </p>
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
            <Button variant={confirmModal.variant || 'danger'} onClick={confirmModal.onConfirm}>
              {confirmModal.confirmText || 'Confirmar'}
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
            confirmModal.variant === 'primary' ? "bg-blue-50" : 
            confirmModal.variant === 'success' ? "bg-emerald-50" : "bg-red-50"
          )}>
            <AlertCircle className={cn(
              "w-6 h-6",
              confirmModal.variant === 'primary' ? "text-blue-500" : 
              confirmModal.variant === 'success' ? "text-emerald-500" : "text-red-500"
            )} />
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
