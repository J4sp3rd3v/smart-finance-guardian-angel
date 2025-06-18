import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Plus, BarChart3, Brain, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from './theme/ThemeToggle';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import FinancialChart from './FinancialChart';
import FinancialAssistant from './FinancialAssistant';

interface Stats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
}

interface MobileDashboardProps {
  onShowSettings: () => void;
}

const MobileDashboard = ({ onShowSettings }: MobileDashboardProps) => {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [stats, setStats] = useState<Stats>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savingsRate: 0,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, refreshKey]);

  const fetchStats = async () => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user?.id);

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
    setShowQuickAdd(false);
  };

  if (!isMobile) {
    return null; // Usa Dashboard standard per desktop
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header Mobile */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 ios-safe-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              Ciao, {user?.user_metadata?.full_name?.split(' ')[0] || 'Utente'}! 👋
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Gestisci le tue finanze
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button 
              variant="outline" 
              size="sm"
              onClick={onShowSettings}
              className="p-2"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={signOut}
              className="p-2"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Summary compatto */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Saldo</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    €{stats.totalBalance.toLocaleString('it-IT', { minimumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Risparmio</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {stats.savingsRate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Action Button */}
        <Button 
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          <Plus className="h-5 w-5 mr-2" />
          Aggiungi Transazione
        </Button>

        {/* Quick Add Form */}
        {showQuickAdd && (
          <div className="animate-fade-in">
            <TransactionForm onSuccess={handleTransactionSuccess} />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 ios-safe-bottom">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-transparent border-0 h-16">
            <TabsTrigger 
              value="overview" 
              className="flex flex-col items-center gap-1 py-2 data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900"
            >
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Home</span>
            </TabsTrigger>
            <TabsTrigger 
              value="chart" 
              className="flex flex-col items-center gap-1 py-2 data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs">Grafici</span>
            </TabsTrigger>
            <TabsTrigger 
              value="assistant" 
              className="flex flex-col items-center gap-1 py-2 data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900"
            >
              <Brain className="h-4 w-4" />
              <span className="text-xs">AI</span>
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="flex flex-col items-center gap-1 py-2 data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900"
            >
              <Wallet className="h-4 w-4" />
              <span className="text-xs">Storia</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="p-4 max-h-96 overflow-y-auto">
            <TabsContent value="overview" className="mt-0">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Entrate</p>
                      <p className="text-base font-semibold text-green-600">
                        €{stats.monthlyIncome.toLocaleString('it-IT')}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Uscite</p>
                      <p className="text-base font-semibold text-red-600">
                        €{stats.monthlyExpenses.toLocaleString('it-IT')}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="chart" className="mt-0">
              <FinancialChart key={refreshKey} />
            </TabsContent>
            
            <TabsContent value="assistant" className="mt-0">
              <FinancialAssistant />
            </TabsContent>
            
            <TabsContent value="history" className="mt-0">
              <TransactionList key={refreshKey} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default MobileDashboard; 