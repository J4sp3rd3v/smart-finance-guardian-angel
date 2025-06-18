
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const FinancialChart = () => {
  const { user } = useAuth();
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChartData();
    }
  }, [user, timeframe]);

  const fetchChartData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Calculate date range based on timeframe
      const now = new Date();
      let startDate: Date;
      let dateFormat: string;
      
      switch (timeframe) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFormat = 'MM-DD';
          break;
        case 'year':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          dateFormat = 'YYYY-MM';
          break;
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
          dateFormat = 'MMM';
          break;
      }

      // Fetch transactions from database
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      // Group transactions by time period
      const groupedData: { [key: string]: { income: number; expenses: number } } = {};
      
      transactions?.forEach((transaction) => {
        const date = new Date(transaction.date);
        let key: string;
        
        switch (timeframe) {
          case 'week':
            key = date.toLocaleDateString('it-IT', { month: '2-digit', day: '2-digit' });
            break;
          case 'year':
            key = date.toLocaleDateString('it-IT', { year: 'numeric', month: '2-digit' });
            break;
          default: // month
            key = date.toLocaleDateString('it-IT', { month: 'short' });
            break;
        }
        
        if (!groupedData[key]) {
          groupedData[key] = { income: 0, expenses: 0 };
        }
        
        if (transaction.type === 'income') {
          groupedData[key].income += transaction.amount;
        } else {
          groupedData[key].expenses += transaction.amount;
        }
      });

      // Convert to chart data format
      const chartData = Object.entries(groupedData).map(([name, values]) => ({
        name,
        income: values.income,
        expenses: values.expenses,
        balance: values.income - values.expenses
      }));

      // If no data, show a message instead of empty chart
      if (chartData.length === 0) {
        setData([{ 
          name: 'Nessun Dato', 
          income: 0, 
          expenses: 0, 
          balance: 0 
        }]);
      } else {
        setData(chartData);
      }
      
    } catch (error) {
      console.error('Error fetching chart data:', error);
      // Show error state
      setData([{ 
        name: 'Errore', 
        income: 0, 
        expenses: 0, 
        balance: 0 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-lg">
                          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name === 'income' ? 'Entrate' : 
               entry.name === 'expenses' ? 'Uscite' : entry.name}: €{entry.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="h-80 w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-muted-foreground text-sm">Caricamento dati...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-2">
          <Button
            variant={chartType === 'area' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('area')}
            className="text-xs"
          >
            Area
          </Button>
          <Button
            variant={chartType === 'line' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('line')}
            className="text-xs"
          >
            Line
          </Button>
        </div>
        
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((period) => (
            <Button
              key={period}
              variant={timeframe === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe(period)}
              className="text-xs capitalize"
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="income" 
                stroke="#10b981" 
                strokeWidth={2}
                fill="url(#incomeGradient)" 
              />
              <Area 
                type="monotone" 
                dataKey="expenses" 
                stroke="#ef4444" 
                strokeWidth={2}
                fill="url(#expenseGradient)" 
              />
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="#ef4444" 
                strokeWidth={3}
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-muted-foreground">Entrate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-muted-foreground">Uscite</span>
        </div>
      </div>

      {/* Data Summary */}
      {data.length > 1 && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
          <h4 className="text-sm font-medium text-slate-700 mb-2">Riepilogo Periodo</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
                              <p className="text-xs text-muted-foreground">Entrate Totali</p>
              <p className="text-lg font-semibold text-green-600">
                €{data.reduce((sum, item) => sum + item.income, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
                              <p className="text-xs text-muted-foreground">Uscite Totali</p>
              <p className="text-lg font-semibold text-red-600">
                €{data.reduce((sum, item) => sum + item.expenses, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
                              <p className="text-xs text-muted-foreground">Bilancio</p>
              <p className={`text-lg font-semibold ${data.reduce((sum, item) => sum + item.balance, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                €{data.reduce((sum, item) => sum + item.balance, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {data.length === 1 && data[0].name === 'Nessun Dato' && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-lg mb-2">📊 Nessuna transazione trovata</p>
          <p className="text-sm">Inizia ad aggiungere transazioni per vedere i tuoi dati finanziari qui!</p>
        </div>
      )}
    </div>
  );
};

export default FinancialChart;
