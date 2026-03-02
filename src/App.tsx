import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Users as UsersIcon, 
  FileText, 
  UserCircle, 
  LogOut, 
  Bell, 
  Sun, 
  Moon, 
  Menu, 
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  Plus,
  Search,
  Download,
  Filter,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  QrCode,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  History,
  Tag,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import Fuse from 'fuse.js';
import { cn, type User, type Transaction, type Stats } from './types';
import { Login } from './components/Login';

// Components
const StatCard = ({ title, value, icon: Icon, trend, color, onRefresh }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative group"
  >
    <div className="flex justify-between items-start">
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex gap-2">
        {onRefresh && (
          <button 
            onClick={onRefresh}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        )}
        {trend && (
          <span className={cn("text-xs font-medium px-2 py-1 rounded-full", trend > 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600")}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
    </div>
    <div className="mt-4">
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold mt-1 dark:text-white">
        {new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD' }).format(value).replace('LYD', 'د.ل')}
      </h3>
    </div>
  </motion.div>
);

const AppTooltip = ({ text, children }: { text: string, children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded whitespace-nowrap z-50"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick, isCollapsed }: any) => (
  <AppTooltip text={isCollapsed ? label : `الانتقال إلى ${label}`}>
    <motion.button
      whileHover={{ scale: 1.02, x: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
        active 
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none" 
          : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50",
        isCollapsed && "justify-center px-0"
      )}
    >
      <Icon className="w-5 h-5" />
      {!isCollapsed && <span className="font-medium">{label}</span>}
    </motion.button>
  </AppTooltip>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({ revenue: 0, expense: 0, pettyCash: 0, balance: 0, netProfit: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showCategoryDeleteConfirm, setShowCategoryDeleteConfirm] = useState<number | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [linkedTransactions, setLinkedTransactions] = useState<Transaction[]>([]);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [expiryDateRange, setExpiryDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [profileData, setProfileData] = useState<any>(null);
  const [isProfileChanged, setIsProfileChanged] = useState(false);
  const [reportTab, setReportTab] = useState('all'); // all, daily, weekly, monthly
  const [isSearching, setIsSearching] = useState(false);
  const [selectedType, setSelectedType] = useState('expense');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendDays, setExtendDays] = useState(7);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [visibleColumns, setVisibleColumns] = useState(['code', 'date', 'description', 'amount', 'user', 'type']);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      setProfileData(u);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    setProfileData(u);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchStats();
    fetchTransactions();
    fetchUsers();
    fetchNotifications();
    fetchExpenseCategories();
    fetchAuditLogs();
  }, [isAuthenticated]);

  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    if (reportSearchQuery) {
      const fuse = new Fuse(filtered, {
        keys: ['description', 'code', 'user_name'],
        threshold: 0.4
      });
      filtered = fuse.search(reportSearchQuery).map(result => result.item);
    }

    // Apply other filters if needed (already handled by backend mostly, but for client-side search we re-apply)
    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleColumn = (col: string) => {
    if (visibleColumns.includes(col)) {
      setVisibleColumns(visibleColumns.filter(c => c !== col));
    } else {
      setVisibleColumns([...visibleColumns, col]);
    }
  };

  useEffect(() => {
    // Check for expiring petty cash allocations
    const expiring = transactions.filter(t => 
      t.type === 'petty_cash' && 
      t.status === 'pending' && 
      t.expiry_date && 
      Math.ceil((new Date(t.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 3
    );

    if (expiring.length > 0) {
      expiring.forEach(t => {
        const alreadyNotified = notifications.some(n => n.message.includes(t.code) && n.type === 'warning');
        if (!alreadyNotified) {
          // In a real app, we'd call an API to create a persistent notification
          // For now, we'll just add it to the local state if it's not there
          const newNotification = {
            id: Date.now() + Math.random(),
            message: `تنبيه: العهدة ${t.code} ستنتهي قريباً (أقل من 3 أيام)`,
            type: 'warning',
            date: format(new Date(), 'dd/MM/yyyy HH:mm')
          };
          setNotifications(prev => [newNotification, ...prev]);
        }
      });
    }
  }, [transactions]);

  useEffect(() => {
    setCurrentPage(1);
    fetchTransactions();
  }, [filterType, dateRange, reportTab, selectedUserId]);

  const exportToCSV = () => {
    const filtered = transactions.filter(t => 
      t.description.toLowerCase().includes(reportSearchQuery.toLowerCase()) || 
      t.code.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
      (t.user_name && t.user_name.toLowerCase().includes(reportSearchQuery.toLowerCase()))
    );
    const data = filtered.map(t => ({
      'الرمز': t.code,
      'التاريخ': format(new Date(t.date), 'dd/MM/yyyy'),
      'البيان': t.description,
      'المبلغ': t.amount,
      'النوع': t.type === 'revenue' ? 'إيراد' : t.type === 'expense' ? 'مصروف' : 'عهدة',
      'المستخدم': t.user_name || 'غير معروف'
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_العمليات_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.addFont('https://fonts.gstatic.com/s/cairo/v28/SLXGc1j9F3837vU_G7mX.ttf', 'Cairo', 'normal');
    doc.setFont('Cairo');
    
    const filtered = transactions.filter(t => 
      t.description.toLowerCase().includes(reportSearchQuery.toLowerCase()) || 
      t.code.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
      (t.user_name && t.user_name.toLowerCase().includes(reportSearchQuery.toLowerCase()))
    );
    
    doc.setFontSize(18);
    doc.text('تقرير العمليات المالية', 105, 15, { align: 'center' });
    
    const tableData = filtered.map(t => [
      t.code,
      format(new Date(t.date), 'dd/MM/yyyy'),
      t.description,
      new Intl.NumberFormat('ar-LY').format(t.amount),
      t.type === 'revenue' ? 'إيراد' : t.type === 'expense' ? 'مصروف' : 'عهدة',
      t.user_name || '-'
    ]);

    (doc as any).autoTable({
      head: [['الرمز', 'التاريخ', 'البيان', 'المبلغ', 'النوع', 'المستخدم']],
      body: tableData,
      startY: 25,
      styles: { font: 'Cairo', halign: 'right' },
      headStyles: { fillColor: [79, 70, 229], halign: 'right' },
      columnStyles: {
        0: { halign: 'right' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    });

    doc.save(`report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleProfileChange = (field: string, value: string) => {
    const newData = { ...profileData, [field]: value };
    setProfileData(newData);
    setIsProfileChanged(JSON.stringify(newData) !== JSON.stringify(user));
  };

  const handleSaveProfile = async () => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        setUser(profileData);
        setIsProfileChanged(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-trail');
      const data = await res.json();
      setAuditLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchExpenseCategories = async () => {
    try {
      const res = await fetch('/api/expense-categories');
      const data = await res.json();
      setExpenseCategories(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedTransaction?.type === 'petty_cash') {
      fetchLinkedTransactions(selectedTransaction.id);
    }
  }, [selectedTransaction]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('type', filterType);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      if (expiryDateRange.start) params.append('expiryStartDate', expiryDateRange.start);
      if (expiryDateRange.end) params.append('expiryEndDate', expiryDateRange.end);
      if (selectedUserId !== 'all') params.append('user_id', selectedUserId);
      
      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data = await res.json();
      setTransactions(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLinkedTransactions = async (id: number) => {
    try {
      const res = await fetch(`/api/transactions/${id}/linked`);
      const data = await res.json();
      setLinkedTransactions(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      await fetch(`/api/transactions/${id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id })
      });
      fetchStats();
      fetchTransactions();
      fetchAuditLogs();
      setShowDeleteConfirm(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'فشل حذف المستخدم');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExtendPettyCash = async (id: number, days: number) => {
    try {
      const res = await fetch(`/api/transactions/${id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, user_role: user?.role, user_id: user?.id })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchTransactions();
        fetchNotifications();
        setSelectedTransaction(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportPettyCashPDF = (t: Transaction) => {
    const doc = new jsPDF();
    doc.addFont('https://fonts.gstatic.com/s/cairo/v28/SLXGc1j9F3837vU_G7mX.ttf', 'Cairo', 'normal');
    doc.setFont('Cairo');
    
    doc.setFontSize(20);
    doc.text('تفاصيل العهدة المالية', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`رمز العهدة: ${t.code}`, 190, 40, { align: 'right' });
    doc.text(`الوصف: ${t.description}`, 190, 50, { align: 'right' });
    doc.text(`المبلغ الأصلي: ${t.amount} د.ل`, 190, 60, { align: 'right' });
    doc.text(`الرصيد المتبقي: ${t.remaining_balance} د.ل`, 190, 70, { align: 'right' });
    doc.text(`تاريخ الانتهاء: ${t.expiry_date ? format(new Date(t.expiry_date), 'dd/MM/yyyy') : 'غير محدد'}`, 190, 80, { align: 'right' });
    doc.text(`المسؤول: ${t.user_name}`, 190, 90, { align: 'right' });

    // Filter linked transactions
    const linked = transactions.filter(lt => lt.parent_id === t.id);
    const tableData = linked.map(lt => [
      lt.code,
      lt.type === 'revenue' ? 'إيداع' : 'صرف',
      lt.amount,
      format(new Date(lt.date), 'dd/MM/yyyy'),
      lt.description
    ]);

    (doc as any).autoTable({
      startY: 100,
      head: [['الرمز', 'النوع', 'المبلغ', 'التاريخ', 'البيان']],
      body: tableData,
      styles: { font: 'Cairo', halign: 'right' },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`PettyCash-${t.code}.pdf`);
  };

  const handleExportPettyCashCSV = (t: Transaction, linked: Transaction[]) => {
    const data = [
      { 'الرمز': t.code, 'البيان': t.description, 'المبلغ الأصلي': t.amount, 'المتبقي': t.remaining_balance, 'التاريخ': format(new Date(t.date), 'dd/MM/yyyy') },
      ...linked.map(l => ({
        'الرمز': l.code,
        'النوع': l.type === 'revenue' ? 'إيراد' : 'مصروف',
        'البيان': l.description,
        'المبلغ': l.amount,
        'التاريخ': format(new Date(l.date), 'dd/MM/yyyy')
      }))
    ];
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `PettyCash-${t.code}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const url = editingCategory ? `/api/expense-categories/${editingCategory.id}` : '/api/expense-categories';
    const method = editingCategory ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, admin_id: user?.id })
      });
      if (res.ok) {
        fetchExpenseCategories();
        fetchAuditLogs();
        setShowCategoryModal(false);
        setEditingCategory(null);
      } else {
        const err = await res.json();
        alert(err.error || 'فشل حفظ التصنيف');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;
    try {
      const res = await fetch(`/api/expense-categories/${id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: user?.id })
      });
      if (res.ok) {
        fetchExpenseCategories();
        fetchAuditLogs();
      } else {
        const err = await res.json();
        alert(err.error || 'فشل حذف التصنيف');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.addFont('https://fonts.gstatic.com/s/cairo/v28/SLXGc1j9F3837vU_G7mX.ttf', 'Cairo', 'normal');
    doc.setFont('Cairo');
    doc.text('تقرير العمليات المالية', 105, 10, { align: 'center' });
    
    const tableData = transactions.map(t => [
      t.code,
      t.type === 'revenue' ? 'إيراد' : t.type === 'expense' ? 'مصروف' : 'عهدة',
      t.amount,
      format(new Date(t.date), 'dd/MM/yyyy'),
      t.status === 'pending' ? 'معلق' : 'مغلق'
    ]);

    (doc as any).autoTable({
      head: [['الرمز', 'النوع', 'المبلغ', 'التاريخ', 'الحالة']],
      body: tableData,
      styles: { font: 'Cairo', halign: 'right' },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save('financial-report.pdf');
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'financial-report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  return (
    <div className={cn("min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-300", isDarkMode && "dark")}>
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        onMouseEnter={() => isSidebarCollapsed && setIsSidebarCollapsed(false)}
        onMouseLeave={() => !isSidebarCollapsed && window.innerWidth > 1024 && setIsSidebarCollapsed(true)}
        className={cn(
          "fixed lg:sticky top-0 right-0 h-screen z-50 bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 transition-all duration-300",
          !isSidebarOpen ? "translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden" : (isSidebarCollapsed ? "w-20" : "w-72")
        )}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-10 overflow-hidden">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none flex-shrink-0">
              <Wallet className="text-white w-6 h-6" />
            </div>
            {!isSidebarCollapsed && (
              <motion.h1 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xl font-bold dark:text-white whitespace-nowrap"
              >
                المحاسب الذكي
              </motion.h1>
            )}
          </div>

          <nav className="space-y-2 flex-1">
            <SidebarItem 
              icon={LayoutDashboard} 
              label="لوحة التحكم" 
              isCollapsed={isSidebarCollapsed}
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
            <SidebarItem 
              icon={Receipt} 
              label="العمليات المالية" 
              isCollapsed={isSidebarCollapsed}
              active={activeTab === 'transactions'} 
              onClick={() => setActiveTab('transactions')} 
            />
            <SidebarItem 
              icon={FileText} 
              label="التقارير" 
              isCollapsed={isSidebarCollapsed}
              active={activeTab === 'reports'} 
              onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }} 
            />
            {user?.role === 'admin' && (
              <>
                <SidebarItem 
                  icon={Tag} 
                  label="التصنيفات" 
                  isCollapsed={isSidebarCollapsed}
                  active={activeTab === 'categories'} 
                  onClick={() => { setActiveTab('categories'); setIsSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={UsersIcon} 
                  label="المستخدمين" 
                  isCollapsed={isSidebarCollapsed}
                  active={activeTab === 'users'} 
                  onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }} 
                />
              </>
            )}
            <SidebarItem 
              icon={UserCircle} 
              label="الملف الشخصي" 
              isCollapsed={isSidebarCollapsed}
              active={activeTab === 'profile'} 
              onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }} 
            />
            {user?.role === 'admin' && (
              <SidebarItem 
                icon={History} 
                label="سجل الرقابة" 
                isCollapsed={isSidebarCollapsed}
                active={activeTab === 'audit'} 
                onClick={() => { setActiveTab('audit'); setIsSidebarOpen(false); }} 
              />
            )}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
            <AppTooltip text="تسجيل الخروج من النظام">
              <motion.button 
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(244,63,94,0.1)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all",
                  isSidebarCollapsed && "justify-center px-0"
                )}
              >
                <LogOut className="w-5 h-5" />
                {!isSidebarCollapsed && <span className="font-medium">تسجيل الخروج</span>}
              </motion.button>
            </AppTooltip>
            
            <AppTooltip text={isSidebarCollapsed ? "توسيع القائمة" : "طي القائمة"}>
              <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="mt-4 w-full hidden lg:flex items-center justify-center p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"
              >
                {isSidebarCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </AppTooltip>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <AppTooltip text={isSidebarOpen ? "إغلاق القائمة الجانبية" : "فتح القائمة الجانبية"}>
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <Menu className="w-6 h-6 dark:text-white" />
                </button>
              </AppTooltip>
              <h2 className="text-lg font-bold dark:text-white">
                {activeTab === 'dashboard' ? 'لوحة التحكم' : 
                 activeTab === 'transactions' ? 'العمليات المالية' :
                 activeTab === 'reports' ? 'التقارير الشاملة' :
                 activeTab === 'categories' ? 'إدارة التصنيفات' :
                 activeTab === 'users' ? 'إدارة المستخدمين' : 
                 activeTab === 'audit' ? 'سجل الرقابة' : 'الملف الشخصي'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <AppTooltip text={isDarkMode ? "تفعيل الوضع المضيء" : "تفعيل الوضع الليلي"}>
                <motion.button 
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.05)' }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleDarkMode}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
                </motion.button>
              </AppTooltip>
              <div className="relative">
                <AppTooltip text="الإشعارات">
                  <motion.button 
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.05)' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowNotification(!showNotification)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all relative"
                  >
                    <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                  </motion.button>
                </AppTooltip>
                <AnimatePresence>
                  {showNotification && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <h4 className="font-bold dark:text-white">الإشعارات</h4>
                        <span className="text-xs text-indigo-600 font-medium cursor-pointer">تحديد الكل كمقروء</span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-sm">لا توجد إشعارات جديدة</div>
                        ) : notifications.map(n => (
                          <div key={n.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-50 dark:border-slate-700 last:border-0 cursor-pointer">
                            <div className="flex gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                                n.type === 'warning' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600" : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600"
                              )}>
                                {n.type === 'warning' ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                              </div>
                              <div>
                                <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{n.message}</p>
                                <p className="text-xs text-slate-500 mt-1">{n.date}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
              <div className="flex items-center gap-3">
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-bold dark:text-white leading-none">{user.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{user.role === 'admin' ? 'مدير النظام' : 'محاسب مالي'}</p>
                </div>
                <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-indigo-100 dark:border-slate-700 shadow-sm">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                    alt="avatar" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold dark:text-white">نظرة عامة</h3>
                <AppTooltip text="تحديث كافة البيانات">
                  <motion.button 
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(0,0,0,0.05)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { fetchStats(); fetchTransactions(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    تحديث البيانات
                  </motion.button>
                </AppTooltip>
              </div>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard title="إجمالي الإيرادات" value={stats.revenue} icon={TrendingUp} trend={12} color="bg-emerald-500" onRefresh={fetchStats} />
                <StatCard title="إجمالي المصروفات" value={stats.expense} icon={TrendingDown} trend={-5} color="bg-rose-500" onRefresh={fetchStats} />
                <StatCard title="صافي الربح" value={stats.netProfit} icon={TrendingUp} color="bg-indigo-600" onRefresh={fetchStats} />
                <StatCard title="العهد النشطة" value={stats.pettyCash} icon={Clock} color="bg-amber-500" onRefresh={fetchStats} />
                <StatCard title="الرصيد الحالي" value={stats.balance} icon={Wallet} color="bg-indigo-500" onRefresh={fetchStats} />
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold dark:text-white">نظرة عامة على التدفقات</h3>
                    <select className="text-sm bg-slate-50 dark:bg-slate-700 border-0 rounded-lg px-3 py-2 outline-none dark:text-white">
                      <option>آخر 7 أيام</option>
                      <option>آخر 30 يوم</option>
                    </select>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'الأحد', rev: 4000, exp: 2400 },
                        { name: 'الاثنين', rev: 3000, exp: 1398 },
                        { name: 'الثلاثاء', rev: 2000, exp: 9800 },
                        { name: 'الأربعاء', rev: 2780, exp: 3908 },
                        { name: 'الخميس', rev: 1890, exp: 4800 },
                        { name: 'الجمعة', rev: 2390, exp: 3800 },
                        { name: 'السبت', rev: 3490, exp: 4300 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="rev" fill="#10b981" radius={[4, 4, 0, 0]} name="إيرادات" />
                        <Bar dataKey="exp" fill="#f43f5e" radius={[4, 4, 0, 0]} name="مصروفات" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold dark:text-white mb-6">توزيع المصروفات</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'رواتب', value: 400 },
                            { name: 'إيجار', value: 300 },
                            { name: 'مشتريات', value: 300 },
                            { name: 'أخرى', value: 200 },
                          ]}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#6366f1" />
                          <Cell fill="#10b981" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#f43f5e" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3 mt-4">
                    {[
                      { name: 'رواتب', color: 'bg-indigo-500', value: '40%' },
                      { name: 'إيجار', color: 'bg-emerald-500', value: '30%' },
                      { name: 'مشتريات', color: 'bg-amber-500', value: '20%' },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", item.color)}></div>
                          <span className="text-sm text-slate-600 dark:text-slate-400">{item.name}</span>
                        </div>
                        <span className="text-sm font-bold dark:text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold dark:text-white">آخر العمليات</h3>
                <AppTooltip text="عرض كافة العمليات المالية">
                  <button onClick={() => setActiveTab('transactions')} className="text-sm text-indigo-600 font-medium hover:underline">عرض الكل</button>
                </AppTooltip>
              </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50">
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">الرمز</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">العملية</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">المبلغ</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">التاريخ</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">الحالة</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {transactions.slice(0, 5).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all">
                          <td className="px-6 py-4 text-sm font-bold dark:text-white">{t.code}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                t.type === 'revenue' ? "bg-emerald-100 text-emerald-600" : 
                                t.type === 'expense' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                              )}>
                                {t.type === 'revenue' ? <TrendingUp size={16} /> : 
                                 t.type === 'expense' ? <TrendingDown size={16} /> : <Clock size={16} />}
                              </div>
                              <span className="text-sm font-medium dark:text-slate-200">{t.description}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold dark:text-white">
                            <div className="flex flex-col">
                              <span>{new Intl.NumberFormat('ar-LY').format(t.amount)} د.ل</span>
                              {t.type === 'petty_cash' && (
                                <button 
                                  onClick={() => {
                                    setSelectedTransaction(t);
                                    setShowBreakdownModal(true);
                                  }}
                                  className={cn(
                                    "text-[10px] font-bold hover:underline text-right flex items-center gap-1 justify-end",
                                    (t.remaining_balance || 0) < (t.amount * 0.1) ? "text-rose-500" : "text-indigo-500"
                                  )}
                                >
                                  {(t.remaining_balance || 0) < (t.amount * 0.1) && <AlertCircle className="w-3 h-3 animate-pulse" />}
                                  المتبقي: {new Intl.NumberFormat('ar-LY').format(t.remaining_balance || 0)} د.ل
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                            {format(new Date(t.date), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-xs font-bold",
                              t.status === 'closed' ? "bg-emerald-100 text-emerald-600" : 
                              t.status === 'extension_pending' ? "bg-rose-100 text-rose-600" :
                              t.status === 'extended' ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"
                            )}>
                              {t.status === 'closed' ? 'مكتمل' : 
                               t.status === 'extension_pending' ? 'بانتظار التمديد' :
                               t.status === 'extended' ? 'تم التمديد' : 'معلق'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <AppTooltip text="خيارات إضافية">
                              <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                                <MoreVertical className="w-4 h-4 text-slate-400" />
                              </button>
                            </AppTooltip>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-48">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="بحث في العمليات..." 
                        className="w-full pr-10 pl-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <select 
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
                    >
                      <option value="all">كل المستخدمين</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    <select 
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
                    >
                      <option value="all">كل الأنواع</option>
                      <option value="revenue">إيرادات</option>
                      <option value="expense">مصروفات</option>
                      <option value="petty_cash">عهد</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <input 
                        type="date" 
                        value={dateRange.start}
                        onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                        className="px-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs dark:text-white"
                      />
                      <span className="text-slate-400 text-xs">إلى</span>
                      <input 
                        type="date" 
                        value={dateRange.end}
                        onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                        className="px-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs dark:text-white"
                      />
                    </div>
                    {(selectedUserId !== 'all' || filterType !== 'all' || searchQuery || dateRange.start || dateRange.end) && (
                      <button 
                        onClick={() => {
                          setSelectedUserId('all');
                          setFilterType('all');
                          setSearchQuery('');
                          setDateRange({ start: '', end: '' });
                        }}
                        className="text-xs text-rose-500 font-bold hover:underline"
                      >
                        مسح الفلاتر
                      </button>
                    )}
                  </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <AppTooltip text="إضافة عملية مالية جديدة">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowTransactionModal(true)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                      <Plus className="w-5 h-5" />
                      عملية جديدة
                    </motion.button>
                  </AppTooltip>
                <AppTooltip text="تصفية النتائج">
                  <motion.button 
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(0,0,0,0.05)' }}
                    onClick={fetchTransactions}
                    className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                  >
                    <RefreshCw className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </motion.button>
                </AppTooltip>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50">
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">الرمز</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">التاريخ</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">البيان</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">المبلغ</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">النوع</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">QR</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {transactions.filter(t => t.description.includes(searchQuery) || t.code.includes(searchQuery)).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all">
                          <td className="px-6 py-4 text-sm font-bold dark:text-white">{t.code}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                            {format(new Date(t.date), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium dark:text-slate-200">{t.description}</td>
                          <td className="px-6 py-4 text-sm font-bold dark:text-white">
                            <div className="flex flex-col">
                              <span>{new Intl.NumberFormat('ar-LY').format(t.amount)} د.ل</span>
                              {t.type === 'petty_cash' && (
                                <button 
                                  onClick={() => {
                                    setSelectedTransaction(t);
                                    setShowBreakdownModal(true);
                                  }}
                                  className={cn(
                                    "text-[10px] font-bold hover:underline text-right flex items-center gap-1 justify-end",
                                    (t.remaining_balance || 0) < (t.amount * 0.1) ? "text-rose-500" : "text-indigo-500"
                                  )}
                                >
                                  {(t.remaining_balance || 0) < (t.amount * 0.1) && <AlertCircle className="w-3 h-3 animate-pulse" />}
                                  المتبقي: {new Intl.NumberFormat('ar-LY').format(t.remaining_balance || 0)} د.ل
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-xs font-bold",
                              t.type === 'revenue' ? "bg-emerald-100 text-emerald-600" : 
                              t.type === 'expense' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                            )}>
                              {t.type === 'revenue' ? 'إيراد' : t.type === 'expense' ? 'مصروف' : 'عهدة'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <AppTooltip text="عرض تفاصيل QR">
                              <button 
                                onClick={() => setSelectedTransaction(t)}
                                className="p-1 bg-white rounded border border-slate-100 inline-block hover:scale-110 transition-transform"
                              >
                                <QRCodeSVG value={`${window.location.origin}/t/${t.code}`} size={32} />
                              </button>
                            </AppTooltip>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <AppTooltip text="تحميل الوصل">
                                <motion.button 
                                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.05)' }}
                                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"
                                >
                                  <Download className="w-4 h-4" />
                                </motion.button>
                              </AppTooltip>
                              {user?.role === 'admin' && (
                                <AppTooltip text="تعديل العملية">
                                  <motion.button 
                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(79,70,229,0.1)' }}
                                    onClick={() => { setEditingTransaction(t); setShowTransactionModal(true); }}
                                    className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg text-indigo-600"
                                  >
                                    <Receipt className="w-4 h-4" />
                                  </motion.button>
                                </AppTooltip>
                              )}
                              <AppTooltip text="حذف العملية">
                                <motion.button 
                                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(244,63,94,0.1)' }}
                                  onClick={() => setShowDeleteConfirm(t.id)}
                                  className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-rose-500"
                                >
                                  <X className="w-4 h-4" />
                                </motion.button>
                              </AppTooltip>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold dark:text-white">التقارير المالية</h2>
                <div className="flex gap-2 w-full md:w-auto">
                  <AppTooltip text="تصدير التقرير الحالي بصيغة CSV">
                    <button onClick={exportToCSV} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                      <Download className="w-4 h-4" />
                      CSV
                    </button>
                  </AppTooltip>
                  <AppTooltip text="تصدير التقرير الحالي بصيغة PDF">
                    <button onClick={exportToPDF} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                      <FileText className="w-4 h-4" />
                      PDF
                    </button>
                  </AppTooltip>
                </div>
              </div>

              {/* Modern Tabbed Navigation for Reports */}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl w-full max-w-md">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'daily', label: 'يومي' },
                  { id: 'weekly', label: 'أسبوعي' },
                  { id: 'monthly', label: 'شهري' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setReportTab(tab.id)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                      reportTab === tab.id 
                        ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" 
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold dark:text-white flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-indigo-500" />
                        الأعمدة المعروضة
                      </h3>
                      <button 
                        onClick={() => setShowColumnPicker(!showColumnPicker)}
                        className="text-xs text-indigo-600 font-bold hover:underline"
                      >
                        {showColumnPicker ? 'إغلاق' : 'تخصيص'}
                      </button>
                    </div>
                    {showColumnPicker && (
                      <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        {[
                          { id: 'code', label: 'الرمز' },
                          { id: 'date', label: 'التاريخ' },
                          { id: 'description', label: 'البيان' },
                          { id: 'amount', label: 'المبلغ' },
                          { id: 'user', label: 'المستخدم' },
                          { id: 'type', label: 'النوع' }
                        ].map(col => (
                          <label key={col.id} className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={visibleColumns.includes(col.id)}
                              onChange={() => toggleColumn(col.id)}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">{col.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold dark:text-white mb-4 flex items-center gap-2">
                      <Filter className="w-4 h-4 text-indigo-500" />
                      فلاتر البحث
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">بحث سريع</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="وصف، رمز، مستخدم..."
                            value={reportSearchQuery}
                            onChange={(e) => {
                              setReportSearchQuery(e.target.value);
                              setIsSearching(true);
                              setTimeout(() => setIsSearching(false), 500);
                            }}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          {isSearching && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                              <span className="text-[10px] text-indigo-500 font-bold animate-pulse">جاري البحث...</span>
                              <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">من تاريخ</label>
                        <input 
                          type="date" 
                          value={dateRange.start}
                          onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">إلى تاريخ</label>
                        <input 
                          type="date" 
                          value={dateRange.end}
                          onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">المستخدم</label>
                        <select 
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none"
                        >
                          <option value="all">الكل</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">نوع العملية</label>
                        <select 
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none"
                        >
                          <option value="all">الكل</option>
                          <option value="revenue">إيرادات</option>
                          <option value="expense">مصروفات</option>
                          <option value="petty_cash">عهد</option>
                        </select>
                      </div>
                      {filterType === 'petty_cash' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">انتهاء من</label>
                            <input 
                              type="date" 
                              value={expiryDateRange.start}
                              onChange={(e) => setExpiryDateRange({...expiryDateRange, start: e.target.value})}
                              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">انتهاء إلى</label>
                            <input 
                              type="date" 
                              value={expiryDateRange.end}
                              onChange={(e) => setExpiryDateRange({...expiryDateRange, end: e.target.value})}
                              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none" 
                            />
                          </div>
                        </>
                      )}
                      <div className="flex items-end">
                        <AppTooltip text="تحديث النتائج بناءً على الفلاتر">
                          <motion.button 
                            whileHover={{ scale: 1.05, backgroundColor: 'rgba(79,70,229,0.9)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={fetchTransactions}
                            className="w-full bg-indigo-600 text-white py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                          >
                            تطبيق الفلترة
                          </motion.button>
                        </AppTooltip>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3">
                  <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <h3 className="font-bold dark:text-white">نتائج التقرير</h3>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-lg">
                        {transactions.length} عملية
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/50">
                            {visibleColumns.includes('code') && <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">الرمز</th>}
                            {visibleColumns.includes('date') && <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">التاريخ</th>}
                            {visibleColumns.includes('description') && <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">البيان</th>}
                            {visibleColumns.includes('amount') && <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">المبلغ</th>}
                            {visibleColumns.includes('user') && <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">المستخدم</th>}
                            {visibleColumns.includes('type') && <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">النوع</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {paginatedTransactions.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all">
                              {visibleColumns.includes('code') && <td className="px-6 py-4 text-sm font-bold dark:text-white">{t.code}</td>}
                              {visibleColumns.includes('date') && <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{format(new Date(t.date), 'dd/MM/yyyy')}</td>}
                              {visibleColumns.includes('description') && <td className="px-6 py-4 text-sm dark:text-slate-200">{t.description}</td>}
                              {visibleColumns.includes('amount') && (
                                <td className="px-6 py-4 text-sm font-bold dark:text-white">
                                  <div className="flex flex-col">
                                    <span>{new Intl.NumberFormat('ar-LY').format(t.amount)} د.ل</span>
                                    {t.type === 'petty_cash' && (
                                      <button 
                                        onClick={() => {
                                          setSelectedTransaction(t);
                                          setShowBreakdownModal(true);
                                        }}
                                        className={cn(
                                          "text-[10px] font-bold hover:underline text-right flex items-center gap-1 justify-end",
                                          (t.remaining_balance || 0) < (t.amount * 0.1) ? "text-rose-500" : "text-indigo-500"
                                        )}
                                      >
                                        {(t.remaining_balance || 0) < (t.amount * 0.1) && <AlertCircle className="w-3 h-3 animate-pulse" />}
                                        المتبقي: {new Intl.NumberFormat('ar-LY').format(t.remaining_balance || 0)} د.ل
                                      </button>
                                    )}
                                  </div>
                                </td>
                              )}
                              {visibleColumns.includes('user') && <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{t.user_name}</td>}
                              {visibleColumns.includes('type') && (
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "px-2 py-1 rounded-full text-[10px] font-bold",
                                    t.type === 'revenue' ? "bg-emerald-100 text-emerald-600" : 
                                    t.type === 'expense' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                                  )}>
                                    {t.type === 'revenue' ? 'إيراد' : t.type === 'expense' ? 'مصروف' : 'عهدة'}
                                  </span>
                                  {t.status === 'extension_pending' && (
                                    <span className="block mt-1 text-[8px] text-rose-500 font-bold">بانتظار التمديد</span>
                                  )}
                                  {t.status === 'extended' && (
                                    <span className="block mt-1 text-[8px] text-indigo-500 font-bold">تم التمديد</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                          {filteredTransactions.length === 0 && (
                            <tr>
                              <td colSpan={visibleColumns.length} className="px-6 py-12 text-center text-slate-400">
                                <Search className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>لا توجد نتائج تطابق بحثك</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination Controls */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <p className="text-xs text-slate-500 font-medium">عرض {paginatedTransactions.length} من أصل {filteredTransactions.length} عملية</p>
                      <div className="flex gap-2">
                        <button 
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(currentPage - 1)}
                          className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1 px-4">
                          <span className="text-sm font-bold text-indigo-600">{currentPage}</span>
                          <span className="text-sm text-slate-400">/</span>
                          <span className="text-sm text-slate-400">{totalPages || 1}</span>
                        </div>
                        <button 
                          disabled={currentPage === totalPages || totalPages === 0}
                          onClick={() => setCurrentPage(currentPage + 1)}
                          className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'categories' && user?.role === 'admin' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold dark:text-white">تصنيفات المصروفات</h3>
                  <p className="text-slate-500 text-sm mt-1">إدارة وتصنيف أنواع المصروفات في النظام</p>
                </div>
                <AppTooltip text="إضافة تصنيف جديد">
                  <motion.button 
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(79,70,229,0.9)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    <Plus className="w-5 h-5" />
                    تصنيف جديد
                  </motion.button>
                </AppTooltip>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {expenseCategories.map((cat) => (
                  <div key={cat.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                        <Tag className="w-6 h-6" />
                      </div>
                      <div className="flex gap-1">
                        <AppTooltip text="تعديل">
                          <button onClick={() => { setEditingCategory(cat); setShowCategoryModal(true); }} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-400">
                            <Receipt className="w-4 h-4" />
                          </button>
                        </AppTooltip>
                        <AppTooltip text="حذف">
                          <button onClick={() => setShowCategoryDeleteConfirm(cat.id)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-rose-500">
                            <X className="w-4 h-4" />
                          </button>
                        </AppTooltip>
                      </div>
                    </div>
                    <h4 className="font-bold dark:text-white">{cat.name}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold dark:text-white">إدارة المستخدمين والصلاحيات</h3>
                {user?.role === 'admin' && (
                  <AppTooltip text="إضافة مستخدم جديد للنظام">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setEditingUser(null); setShowUserModal(true); }}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                      <Plus className="w-5 h-5" />
                      إضافة مستخدم
                    </motion.button>
                  </AppTooltip>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map((u) => (
                  <div key={u.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-4">
                      <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt="user" className="w-12 h-12 rounded-xl border border-slate-100 dark:border-slate-700" referrerPolicy="no-referrer" />
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold",
                        u.role === 'admin' ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
                      )}>{u.role === 'admin' ? 'مدير' : 'موظف'}</span>
                    </div>
                    <h4 className="font-bold dark:text-white">{u.name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{u.role === 'admin' ? 'مدير النظام' : 'محاسب عمليات'}</p>
                    <p className="text-xs text-slate-400 mt-1">{u.email}</p>
                    <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-700 flex justify-between items-center">
                      <AppTooltip text="تعديل بيانات هذا المستخدم">
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setEditingUser(u); setShowUserModal(true); }}
                          className="text-sm text-indigo-600 font-bold hover:underline"
                        >
                          تعديل البيانات
                        </motion.button>
                      </AppTooltip>
                      {user?.role === 'admin' && u.id !== user.id && (
                        <AppTooltip text="حذف المستخدم">
                          <motion.button 
                            whileHover={{ scale: 1.1, backgroundColor: 'rgba(244,63,94,0.1)' }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-rose-500"
                          >
                            <X className="w-4 h-4" />
                          </motion.button>
                        </AppTooltip>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'profile' && profileData && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="h-32 bg-indigo-600 relative">
                  <div className="absolute -bottom-12 right-8">
                    <div className="relative">
                      <img 
                        src={user.avatar} 
                        alt="profile" 
                        className="w-24 h-24 rounded-3xl border-4 border-white dark:border-slate-800 shadow-lg" 
                        referrerPolicy="no-referrer"
                      />
                      <AppTooltip text="تغيير الصورة الشخصية">
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="absolute bottom-0 left-0 p-2 bg-white dark:bg-slate-700 rounded-xl shadow-md border border-slate-100 dark:border-slate-600"
                        >
                          <UsersIcon className="w-4 h-4 text-indigo-600" />
                        </motion.button>
                      </AppTooltip>
                    </div>
                  </div>
                </div>
                <div className="pt-16 p-8">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-2xl font-bold dark:text-white">{profileData.name}</h3>
                      <p className="text-slate-500 dark:text-slate-400">مدير النظام الرئيسي</p>
                    </div>
                    <div className="flex gap-2">
                      <AnimatePresence>
                        {isProfileChanged && (
                          <motion.button 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onClick={handleSaveProfile}
                            className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none"
                          >
                            حفظ التغييرات
                          </motion.button>
                        )}
                      </AnimatePresence>
                      <AppTooltip text="تعديل بيانات الملف الشخصي">
                        <motion.button 
                          whileHover={{ scale: 1.05, backgroundColor: 'rgba(79,70,229,0.9)' }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                        >
                          تعديل الملف
                        </motion.button>
                      </AppTooltip>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">الاسم بالكامل</label>
                        <input 
                          type="text" 
                          value={profileData.name}
                          onChange={(e) => handleProfileChange('name', e.target.value)}
                          className="w-full mt-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">البريد الإلكتروني</label>
                        <input 
                          type="email" 
                          value={profileData.email}
                          onChange={(e) => handleProfileChange('email', e.target.value)}
                          className="w-full mt-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">تاريخ الانضمام</label>
                        <p className="font-medium dark:text-white mt-1">1 يناير 2024</p>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">الموقع</label>
                        <p className="font-medium dark:text-white mt-1">الرياض، المملكة العربية السعودية</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'audit' && user?.role === 'admin' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="text-xl font-bold dark:text-white">سجل العمليات والرقابة</h3>
                  <p className="text-slate-500 text-sm mt-1">تتبع كافة التغييرات التي تمت على النظام</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50">
                        <th className="px-6 py-4 text-sm font-bold text-slate-500">التاريخ</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500">المستخدم</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500">الإجراء</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500">التفاصيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all">
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold dark:text-white">{log.user_name}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-xs font-bold",
                              log.action.includes('حذف') ? "bg-rose-100 text-rose-600" :
                              log.action.includes('إضافة') ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"
                            )}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Breakdown Modal */}
      <AnimatePresence>
        {showBreakdownModal && selectedTransaction && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBreakdownModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-indigo-600 text-white">
                <div>
                  <h3 className="text-xl font-bold">تفاصيل رصيد العهدة: {selectedTransaction.code}</h3>
                  <p className="text-indigo-100 text-sm">{selectedTransaction.description}</p>
                </div>
                <button onClick={() => setShowBreakdownModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">المبلغ الأصلي</p>
                    <p className="text-lg font-bold dark:text-white">{new Intl.NumberFormat('ar-LY').format(selectedTransaction.amount)} د.ل</p>
                  </div>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                    <p className="text-xs text-emerald-600 mb-1">إجمالي الإيرادات</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">+{new Intl.NumberFormat('ar-LY').format(linkedTransactions.filter(l => l.type === 'revenue').reduce((acc, curr) => acc + curr.amount, 0))} د.ل</p>
                  </div>
                  <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-800">
                    <p className="text-xs text-rose-600 mb-1">إجمالي المصروفات</p>
                    <p className="text-lg font-bold text-rose-700 dark:text-rose-400">-{new Intl.NumberFormat('ar-LY').format(linkedTransactions.filter(l => l.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0))} د.ل</p>
                  </div>
                </div>

                <h4 className="font-bold dark:text-white mb-4 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-500" />
                  العمليات المرتبطة بالعهدة
                </h4>
                <div className="space-y-3">
                  {linkedTransactions.map((l) => (
                    <div key={l.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          l.type === 'revenue' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                        )}>
                          {l.type === 'revenue' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm dark:text-white">{l.description}</p>
                          <p className="text-[10px] text-slate-400">{format(new Date(l.date), 'dd/MM/yyyy')} - {l.category_name || 'بدون تصنيف'}</p>
                        </div>
                      </div>
                      <p className={cn(
                        "font-bold",
                        l.type === 'revenue' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {l.type === 'revenue' ? '+' : '-'}{new Intl.NumberFormat('ar-LY').format(l.amount)} د.ل
                      </p>
                    </div>
                  ))}
                  {linkedTransactions.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <p>لا توجد عمليات مرتبطة بهذه العهدة حتى الآن</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">الرصيد المتبقي النهائي</span>
                  <span className="text-xl font-black text-indigo-600">{new Intl.NumberFormat('ar-LY').format(selectedTransaction.remaining_balance || 0)} د.ل</span>
                </div>
                <button 
                  onClick={() => setShowBreakdownModal(false)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Delete Confirmation Modal */}
      <AnimatePresence>
        {showCategoryDeleteConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCategoryDeleteConfirm(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold dark:text-white mb-2">تأكيد حذف التصنيف</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8">هل أنت متأكد أنك تريد حذف هذا التصنيف؟ سيتم التحقق مما إذا كان مستخدماً في عمليات مالية.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCategoryDeleteConfirm(null)}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  إلغاء
                </button>
                <button 
                  onClick={() => {
                    handleDeleteCategory(showCategoryDeleteConfirm);
                    setShowCategoryDeleteConfirm(null);
                  }}
                  className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 dark:shadow-none"
                >
                  تأكيد الحذف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showExtendModal && selectedTransaction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExtendModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8"
            >
              <h3 className="text-xl font-bold dark:text-white mb-4 text-center">تمديد مدة العهدة</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-center text-sm">أدخل عدد الأيام التي ترغب في تمديد العهدة بها</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">عدد الأيام</label>
                  <input 
                    type="number" 
                    value={extendDays}
                    onChange={(e) => setExtendDays(parseInt(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                    min="1"
                    max="30"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      handleExtendPettyCash(selectedTransaction.id, extendDays);
                      setShowExtendModal(false);
                    }}
                    className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-all"
                  >
                    تأكيد التمديد
                  </button>
                  <button 
                    onClick={() => setShowExtendModal(false)}
                    className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold dark:text-white mb-2">تأكيد الحذف</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8">هل أنت متأكد أنك تريد حذف هذه العملية؟ لا يمكن التراجع عن هذا الإجراء.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  إلغاء
                </button>
                <button 
                  onClick={() => handleDeleteTransaction(showDeleteConfirm)}
                  className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 dark:shadow-none"
                >
                  تأكيد الحذف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Detail Modal */}
      <AnimatePresence>
        {selectedTransaction && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTransaction(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="mb-6">
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold dark:text-white">تفاصيل العملية {selectedTransaction.code}</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{selectedTransaction.description}</p>
              </div>
              
                <div className="bg-white p-4 rounded-2xl border border-slate-100 inline-block mb-6 shadow-sm relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">QR CODE</div>
                  <QRCodeSVG 
                    value={`${window.location.origin}/t/${selectedTransaction.code}`} 
                    size={200}
                    includeMargin={true}
                  />
                </div>

              <div className="grid grid-cols-2 gap-4 text-right mb-8">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <p className="text-xs text-slate-400">المبلغ الأصلي</p>
                  <p className="font-bold dark:text-white">{new Intl.NumberFormat('ar-LY').format(selectedTransaction.amount)} د.ل</p>
                </div>
                {selectedTransaction.type === 'petty_cash' && (
                  <div className={cn(
                    "p-4 rounded-xl col-span-2 flex flex-col items-center justify-center border-2",
                    (selectedTransaction.remaining_balance || 0) < (selectedTransaction.amount * 0.1) 
                      ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800" 
                      : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                  )}>
                    <p className={cn(
                      "text-sm font-bold mb-1",
                      (selectedTransaction.remaining_balance || 0) < (selectedTransaction.amount * 0.1) 
                        ? "text-rose-600" 
                        : "text-emerald-600"
                    )}>الرصيد المتبقي الحالي</p>
                    <p className={cn(
                      "text-3xl font-black",
                      (selectedTransaction.remaining_balance || 0) < (selectedTransaction.amount * 0.1) 
                        ? "text-rose-700 dark:text-rose-400" 
                        : "text-emerald-700 dark:text-emerald-400"
                    )}>{new Intl.NumberFormat('ar-LY').format(selectedTransaction.remaining_balance || 0)} د.ل</p>
                  </div>
                )}
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <p className="text-xs text-slate-400">التاريخ</p>
                  <p className="font-bold dark:text-white">{format(new Date(selectedTransaction.date), 'dd/MM/yyyy')}</p>
                </div>
                {selectedTransaction.expiry_date && (
                   <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <p className="text-xs text-amber-600">تاريخ الانتهاء</p>
                    <p className="font-bold text-amber-700 dark:text-amber-400">{format(new Date(selectedTransaction.expiry_date), 'dd/MM/yyyy')}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {selectedTransaction.type === 'petty_cash' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleExportPettyCashPDF(selectedTransaction)}
                        className="bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        تصدير PDF
                      </button>
                      <button 
                        onClick={() => handleExportPettyCashCSV(selectedTransaction, linkedTransactions)}
                        className="bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        تصدير CSV
                      </button>
                    </div>
                    
                    {['pending', 'extension_pending'].includes(selectedTransaction.status || '') && (
                      <button 
                        onClick={() => setShowExtendModal(true)}
                        className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                      >
                        <Clock className="w-4 h-4" />
                        تمديد مدة العهدة
                      </button>
                    )}
                  </>
                )}

                <button 
                  onClick={() => setSelectedTransaction(null)}
                  className="w-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Modal */}
      <AnimatePresence>
        {showTransactionModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowTransactionModal(false); setEditingTransaction(null); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="text-xl font-bold dark:text-white">
                  {editingTransaction ? `تعديل العملية ${editingTransaction.code}` : 'إضافة عملية مالية جديدة'}
                </h3>
                <button onClick={() => { setShowTransactionModal(false); setEditingTransaction(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <form className="p-6 space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                const type = data.type as string;
                
                if ((type === 'expense' || type === 'revenue') && !data.parent_id) {
                  alert("يجب ربط المصروف أو الإيراد بعهدة مالية");
                  return;
                }

                const url = editingTransaction ? `/api/transactions/${editingTransaction.id}` : '/api/transactions';
                const method = editingTransaction ? 'PUT' : 'POST';

                fetch(url, {
                  method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...data,
                    amount: parseFloat(data.amount as string),
                    user_id: data.user_id ? parseInt(data.user_id as string) : user?.id,
                    parent_id: data.parent_id ? parseInt(data.parent_id as string) : null,
                    category_id: data.category_id ? parseInt(data.category_id as string) : null,
                    admin_id: user?.id // For audit trail
                  })
                }).then(() => {
                  fetchStats();
                  fetchTransactions();
                  fetchAuditLogs();
                  setShowTransactionModal(false);
                  setEditingTransaction(null);
                });
              }}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع العملية</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'revenue', label: 'إيراد', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
                        { id: 'expense', label: 'مصروف', icon: TrendingDown, color: 'text-rose-600 bg-rose-50' },
                        { id: 'petty_cash', label: 'عهدة', icon: Clock, color: 'text-amber-600 bg-amber-50' },
                      ].map(type => (
                        <label key={type.id} className="cursor-pointer">
                          <input 
                            type="radio" 
                            name="type" 
                            value={type.id} 
                            className="peer hidden" 
                            defaultChecked={editingTransaction ? editingTransaction.type === type.id : type.id === 'expense'} 
                            onChange={(e) => setSelectedType(e.target.value)}
                          />
                          <div className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 peer-checked:border-indigo-600 peer-checked:bg-indigo-50/50 dark:peer-checked:bg-indigo-900/20 transition-all",
                            type.color
                          )}>
                            <type.icon className="w-6 h-6" />
                            <span className="text-xs font-bold">{type.label}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المستخدم المسؤول</label>
                    <select name="user_id" defaultValue={editingTransaction?.user_id} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  {(selectedType === 'expense' || selectedType === 'revenue') && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ارتباط بعهدة (إجباري)</label>
                      <select name="parent_id" defaultValue={editingTransaction?.parent_id || ''} required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">اختر العهدة...</option>
                        {transactions.filter(t => t.type === 'petty_cash' && t.status === 'pending').map(t => (
                          <option key={t.id} value={t.id}>{t.code} - {t.description}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedType === 'petty_cash' && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاريخ انتهاء العهدة</label>
                      <input 
                        name="expiry_date" 
                        type="date" 
                        required
                        defaultValue={editingTransaction?.expiry_date ? editingTransaction.expiry_date.split('T')[0] : new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]} 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                      />
                    </div>
                  )}

                  {selectedType === 'expense' && (
                    <div className="col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">فئة المصروف</label>
                        {user?.role === 'admin' && (
                          <button type="button" onClick={() => setShowCategoryModal(true)} className="text-xs text-indigo-600 font-bold hover:underline">إدارة الفئات</button>
                        )}
                      </div>
                      <select name="category_id" defaultValue={editingTransaction?.category_id || ''} required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">اختر الفئة...</option>
                        {expenseCategories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">البيان / الوصف</label>
                    <input name="description" defaultValue={editingTransaction?.description} required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="مثال: شراء قرطاسية للمكتب" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المبلغ (د.ل)</label>
                    <input name="amount" type="number" step="0.001" defaultValue={editingTransaction?.amount} required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التاريخ</label>
                    <div className="relative">
                      <input name="date" type="date" defaultValue={editingTransaction?.date ? editingTransaction.date.split('T')[0] : new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <AppTooltip text="حفظ كافة التغييرات">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none mt-4"
                  >
                    {editingTransaction ? 'تحديث العملية' : 'حفظ العملية'}
                  </motion.button>
                </AppTooltip>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCategoryModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="text-xl font-bold dark:text-white">{editingCategory ? 'تعديل تصنيف' : 'إضافة تصنيف جديد'}</h3>
                <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form className="p-6 space-y-4" onSubmit={handleSaveCategory}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم التصنيف</label>
                  <input 
                    type="text" 
                    name="name" 
                    required 
                    defaultValue={editingCategory?.name}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                    placeholder="مثال: قرطاسية، صيانة، ضيافة..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اللون المميز</label>
                  <input 
                    type="color" 
                    name="color" 
                    defaultValue={editingCategory?.color || '#6366f1'}
                    className="w-full h-12 p-1 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 outline-none cursor-pointer" 
                  />
                </div>
                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    {editingCategory ? 'تحديث التصنيف' : 'إضافة التصنيف'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowUserModal(false); setEditingUser(null); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="text-xl font-bold dark:text-white">
                  {editingUser ? `تعديل المستخدم ${editingUser.name}` : 'إضافة مستخدم جديد'}
                </h3>
                <button onClick={() => { setShowUserModal(false); setEditingUser(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <form className="p-6 space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                
                const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
                const method = editingUser ? 'PUT' : 'POST';

                fetch(url, {
                  method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...data,
                    permissions: ['view_reports', 'add_transactions']
                  })
                }).then(() => {
                  fetchUsers();
                  setShowUserModal(false);
                  setEditingUser(null);
                });
              }}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم بالكامل</label>
                  <input name="name" defaultValue={editingUser?.name} required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="أدخل اسم الموظف" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
                  <input name="email" type="email" defaultValue={editingUser?.email} required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="email@example.com" />
                </div>
                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور</label>
                    <input name="password" type="password" required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="••••••••" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الدور الوظيفي</label>
                  <select name="role" defaultValue={editingUser?.role || 'user'} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="user">موظف / محاسب</option>
                    <option value="admin">مدير نظام</option>
                  </select>
                </div>
                <div className="pt-4">
                  <AppTooltip text="حفظ بيانات المستخدم">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                      {editingUser ? 'تحديث البيانات' : 'إضافة المستخدم'}
                    </motion.button>
                  </AppTooltip>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Management Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCategoryModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold dark:text-white">إدارة أنواع المصروفات</h3>
                <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <form className="flex gap-2 mb-6" onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem('catName') as HTMLInputElement;
                const url = editingCategory ? `/api/expense-categories/${editingCategory.id}` : '/api/expense-categories';
                const method = editingCategory ? 'PUT' : 'POST';

                fetch(url, {
                  method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: input.value })
                }).then(() => {
                  fetchExpenseCategories();
                  input.value = '';
                  setEditingCategory(null);
                });
              }}>
                <input 
                  name="catName" 
                  required 
                  defaultValue={editingCategory?.name || ''}
                  key={editingCategory?.id || 'new'}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none" 
                  placeholder="اسم الفئة..." 
                />
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700">
                  {editingCategory ? 'تعديل' : 'إضافة'}
                </button>
                {editingCategory && (
                  <button 
                    type="button" 
                    onClick={() => setEditingCategory(null)}
                    className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl font-bold"
                  >
                    إلغاء
                  </button>
                )}
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {expenseCategories.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <span className="dark:text-white font-medium">{c.name}</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setEditingCategory(c)}
                        className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          fetch(`/api/expense-categories/${c.id}`, { method: 'DELETE' }).then(fetchExpenseCategories);
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
