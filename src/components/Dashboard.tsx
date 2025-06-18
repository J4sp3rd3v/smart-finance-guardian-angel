
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, TrendingDown, Wallet, LogOut, RefreshCw, Settings, Database, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FinancialChart from './FinancialChart';
import TransactionList from './TransactionList';
import TransactionForm from './TransactionForm';
import RecurringTransactionForm from './RecurringTransactionForm';
import { ThemeToggle } from './theme/ThemeToggle';
import AccountSettings from './AccountSettings';
import DatabaseTest from './DatabaseTest';
import FinancialAssistant from './FinancialAssistant';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savingsRate: 0,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showDbTest, setShowDbTest] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, refreshKey]);

  const fetchStats = async () => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Fetch all transactions for total balance
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user?.id);

      // Fetch current month transactions
      const { data: monthlyTransactions } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user?.id)
        .gte('date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

      if (allTransactions) {
        const totalBalance = allTransactions.reduce((acc, transaction) => {
          return transaction.type === 'income' 
            ? acc + transaction.amount 
            : acc - transaction.amount;
        }, 0);

        const monthlyIncome = monthlyTransactions?.reduce((acc, transaction) => {
          return transaction.type === 'income' ? acc + transaction.amount : acc;
        }, 0) || 0;

        const monthlyExpenses = monthlyTransactions?.reduce((acc, transaction) => {
          return transaction.type === 'expense' ? acc + transaction.amount : acc;
        }, 0) || 0;

        const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

        setStats({
          totalBalance,
          monthlyIncome,
          monthlyExpenses,
          savingsRate,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleTransactionSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const statsData = [
    {
      title: "Saldo Totale",
      amount: `€${stats.totalBalance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
      change: stats.totalBalance >= 0 ? "Positivo" : "Negativo",
      trend: stats.totalBalance >= 0 ? "up" : "down",
      icon: Wallet,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "Entrate Mensili",
      amount: `€${stats.monthlyIncome.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
      change: "Questo mese",
      trend: "up",
      icon: TrendingUp,
      gradient: "from-green-500 to-emerald-500"
    },
    {
      title: "Uscite Mensili",
      amount: `€${stats.monthlyExpenses.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
      change: "Questo mese",
      trend: "down",
      icon: TrendingDown,
      gradient: "from-orange-500 to-red-500"
    },
    {
      title: "Tasso di Risparmio",
      amount: `${stats.savingsRate.toFixed(1)}%`,
      change: "Questo mese",
      trend: stats.savingsRate > 0 ? "up" : "down",
      icon: DollarSign,
      gradient: "from-purple-500 to-pink-500"
    }
  ];

  // Se showSettings è true, mostra solo le impostazioni
  if (showSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => setShowSettings(false)}
              className="flex items-center gap-2"
            >
              ← Torna al Dashboard
            </Button>
          </div>
          <AccountSettings />
        </div>
      </div>
    );
  }

  // Se showDbTest è true, mostra test database
  if (showDbTest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => setShowDbTest(false)}
              className="flex items-center gap-2"
            >
              ← Torna al Dashboard
            </Button>
          </div>
          <DatabaseTest />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">
              Ciao, {user?.user_metadata?.full_name || user?.email}! 👋
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Ecco la panoramica delle tue finanze
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDbTest(!showDbTest)}
              className="hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Test DB
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Impostazioni
            </Button>
            <ThemeToggle />
          <Button 
            variant="outline" 
            onClick={signOut}
            className="hover:scale-105 transition-transform"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {statsData.map((stat, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stat.amount}
                    </p>
                    <p className={`text-sm flex items-center mt-1 ${
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {stat.change}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient} group-hover:scale-110 transition-transform`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl mx-auto mb-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Panoramica
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Transazioni
            </TabsTrigger>
            <TabsTrigger value="assistant" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Assistente
            </TabsTrigger>
            <TabsTrigger value="recurring" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Ricorrenti
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Cronologia
            </TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                  Andamento Finanziario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FinancialChart key={refreshKey} />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Quick Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <TransactionForm onSuccess={handleTransactionSuccess} />
              </div>
              <div>
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Transazioni Recenti
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <TransactionList key={refreshKey} />
                  </CardContent>
                </Card>
              </div>
          </div>
          </TabsContent>
          
          {/* Financial Assistant Tab */}
          <TabsContent value="assistant" className="space-y-6">
            <FinancialAssistant />
          </TabsContent>
          
          {/* Recurring Payments Tab */}
          <TabsContent value="recurring" className="space-y-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Gestione Pagamenti Ricorrenti
                </h2>
                <p className="text-slate-600">
                  Configura mutui, stipendi, bollette e altri pagamenti automatici
                </p>
              </div>
              <RecurringTransactionForm onSuccess={handleTransactionSuccess} />
            </div>
          </TabsContent>
          
          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-purple-600" />
                  Storico Completo Transazioni
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TransactionList key={refreshKey} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
