import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, Edit, Trash2, PlusCircle, MinusCircle, Clock, DollarSign, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
}

interface RecurringTransaction {
  id: string;
  amount: number;
  description: string;
  category_id: string;
  type: 'income' | 'expense';
  frequency: string;
  start_date: string;
  end_date: string | null;
  next_date: string;
  is_active: boolean;
  category?: Category;
}

interface RecurringTransactionMobileProps {
  onSuccess: () => void;
}

const RecurringTransactionMobile = ({ onSuccess }: RecurringTransactionMobileProps) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    categoryId: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    durationYears: '',
    durationMonths: '',
  });

  useEffect(() => {
    fetchCategories();
    fetchRecurringTransactions();
  }, [user]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchRecurringTransactions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (error) {
        console.error('Errore nel fetch delle transazioni ricorrenti:', error);
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          setTableExists(false);
          return;
        }
        setTableExists(true);
        return;
      }

      setTableExists(true);

      const { data: fullData, error: fullError } = await supabase
        .from('recurring_transactions')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fullError) {
        console.error('Errore nel fetch completo:', fullError);
        const { data: basicData, error: basicError } = await supabase
          .from('recurring_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (basicError) throw basicError;
        setRecurringTransactions(basicData?.map(item => ({
          ...item,
          type: item.type as 'income' | 'expense'
        })) || []);
      } else {
        setRecurringTransactions(fullData?.map(item => ({
          ...item,
          type: item.type as 'income' | 'expense'
        })) || []);
      }
    } catch (error: any) {
      console.error('Error fetching recurring transactions:', error);
      setTableExists(false);
    }
  };

  const calculateEndDate = () => {
    if (!formData.durationYears && !formData.durationMonths) return null;
    
    const startDate = new Date(formData.startDate);
    const years = parseInt(formData.durationYears) || 0;
    const months = parseInt(formData.durationMonths) || 0;
    
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + years);
    endDate.setMonth(endDate.getMonth() + months);
    
    return endDate.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const endDate = formData.endDate || calculateEndDate();
      
      const transactionData = {
        user_id: user.id,
        amount: parseFloat(formData.amount),
        description: formData.description,
        category_id: formData.categoryId,
        type: transactionType,
        frequency: formData.frequency,
        start_date: formData.startDate,
        end_date: endDate,
        next_date: formData.startDate,
        is_active: true
      };

      let error;
      if (editingTransaction) {
        ({ error } = await supabase
          .from('recurring_transactions')
          .update(transactionData)
          .eq('id', editingTransaction)
          .eq('user_id', user.id));
      } else {
        ({ error } = await supabase
          .from('recurring_transactions')
          .insert(transactionData));
      }

      if (error) throw error;

      toast({
        title: editingTransaction ? "Pagamento modificato" : "Pagamento ricorrente aggiunto",
        description: `${transactionType === 'income' ? 'Entrata' : 'Uscita'} ricorrente di €${formData.amount} ${editingTransaction ? 'modificata' : 'aggiunta'} con successo`,
      });

      setFormData({
        amount: '',
        description: '',
        categoryId: '',
        frequency: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        durationYears: '',
        durationMonths: '',
      });
      setEditingTransaction(null);
      
      await fetchRecurringTransactions();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === transactionType);
  const filteredRecurringTransactions = recurringTransactions.filter(t => t.type === transactionType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* iOS-style Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Pagamenti Ricorrenti</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Mutui, Stipendi, Bollette</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 sm:px-6 max-w-md mx-auto">
        {/* Messaggio quando la tabella non esiste */}
        {tableExists === false && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Configurazione Richiesta
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                  La tabella per i pagamenti ricorrenti non è ancora configurata nel database.
                </p>
                <div className="mt-3 p-2 bg-amber-100/50 dark:bg-amber-800/30 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-mono">
                    📄 sql-steps/CREATE_RECURRING_TRANSACTIONS_TABLE.sql
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contenuto principale */}
        {tableExists !== false && (
          <>
            {/* iOS-style Segmented Control */}
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-2 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => {
                    setTransactionType('expense');
                    setFormData({ ...formData, categoryId: '' });
                    setEditingTransaction(null);
                  }}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    transactionType === 'expense'
                      ? 'bg-red-500 text-white shadow-lg transform scale-95'
                      : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
                >
                  <MinusCircle className="h-4 w-4 mx-auto mb-1" />
                  Uscite
                </button>
                <button
                  onClick={() => {
                    setTransactionType('income');
                    setFormData({ ...formData, categoryId: '' });
                    setEditingTransaction(null);
                  }}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    transactionType === 'income'
                      ? 'bg-green-500 text-white shadow-lg transform scale-95'
                      : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                  }`}
                >
                  <PlusCircle className="h-4 w-4 mx-auto mb-1" />
                  Entrate
                </button>
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Importo e Frequenza */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Importo
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="800.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="pl-10 bg-slate-50/50 dark:bg-slate-700/50 border-slate-200/50 dark:border-slate-600/50 rounded-xl h-12 text-base"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Frequenza
                    </label>
                    <Select 
                      value={formData.frequency} 
                      onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                    >
                      <SelectTrigger className="bg-slate-50/50 dark:bg-slate-700/50 border-slate-200/50 dark:border-slate-600/50 rounded-xl h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="monthly">📅 Mensile</SelectItem>
                        <SelectItem value="yearly">🗓️ Annuale</SelectItem>
                        <SelectItem value="weekly">📆 Settimanale</SelectItem>
                        <SelectItem value="daily">⏰ Giornaliero</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Descrizione */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Descrizione
                  </label>
                  <Input
                    placeholder="Es: Mutuo casa, Stipendio mensile, Rata auto"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-slate-50/50 dark:bg-slate-700/50 border-slate-200/50 dark:border-slate-600/50 rounded-xl h-12 text-base"
                    required
                  />
                </div>

                {/* Categoria */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Categoria
                  </label>
                  <Select 
                    value={formData.categoryId} 
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                    required
                  >
                    <SelectTrigger className="bg-slate-50/50 dark:bg-slate-700/50 border-slate-200/50 dark:border-slate-600/50 rounded-xl h-12">
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Data Inizio
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="pl-10 bg-slate-50/50 dark:bg-slate-700/50 border-slate-200/50 dark:border-slate-600/50 rounded-xl h-12"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Data Fine
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="pl-10 bg-slate-50/50 dark:bg-slate-700/50 border-slate-200/50 dark:border-slate-600/50 rounded-xl h-12"
                      />
                    </div>
                  </div>
                </div>

                {/* Durata Card - iOS Style */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-800/50">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                        Durata Pagamento
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Es: mutuo 30 anni
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-blue-800 dark:text-blue-300">
                        Anni
                      </label>
                      <Input
                        type="number"
                        placeholder="30"
                        min="0"
                        max="50"
                        value={formData.durationYears}
                        onChange={(e) => setFormData({ ...formData, durationYears: e.target.value })}
                        className="bg-white/70 dark:bg-slate-700/70 border-blue-200/50 dark:border-blue-700/50 rounded-xl h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-blue-800 dark:text-blue-300">
                        Mesi extra
                      </label>
                      <Input
                        type="number"
                        placeholder="6"
                        min="0"
                        max="11"
                        value={formData.durationMonths}
                        onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                        className="bg-white/70 dark:bg-slate-700/70 border-blue-200/50 dark:border-blue-700/50 rounded-xl h-10 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-blue-100/50 dark:bg-blue-800/30 rounded-xl">
                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                      💡 Perfetto per mutui, finanziamenti auto, abbonamenti a lungo termine
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-2">
                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg transform transition-all duration-200 active:scale-95"
                  >
                    {loading ? 'Salvando...' : (editingTransaction ? 'Modifica' : 'Aggiungi')}
                  </Button>
                  {editingTransaction && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setEditingTransaction(null);
                        setFormData({
                          amount: '',
                          description: '',
                          categoryId: '',
                          frequency: 'monthly',
                          startDate: new Date().toISOString().split('T')[0],
                          endDate: '',
                          durationYears: '',
                          durationMonths: '',
                        });
                      }}
                      className="h-12 px-6 rounded-xl border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Annulla
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* Lista Pagamenti - iOS Style Cards */}
            {filteredRecurringTransactions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 px-2">
                  <RefreshCw className="h-4 w-4 text-slate-500" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    I tuoi pagamenti ricorrenti
                  </h3>
                </div>
                
                <div className="space-y-3">
                  {filteredRecurringTransactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-4 shadow-sm border transition-all duration-200 active:scale-95 ${
                        transaction.is_active 
                          ? 'border-green-200/50 dark:border-green-700/50' 
                          : 'border-slate-200/50 dark:border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              transaction.type === 'income' 
                                ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                                : 'bg-gradient-to-r from-red-400 to-rose-500'
                            }`}>
                              {transaction.type === 'income' ? (
                                <PlusCircle className="h-5 w-5 text-white" />
                              ) : (
                                <MinusCircle className="h-5 w-5 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                                {transaction.description}
                              </h4>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge 
                                  variant={transaction.is_active ? "default" : "secondary"}
                                  className="text-xs px-2 py-0.5 rounded-full"
                                >
                                  {transaction.is_active ? 'Attivo' : 'Sospeso'}
                                </Badge>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {transaction.frequency === 'monthly' ? 'Mensile' :
                                   transaction.frequency === 'yearly' ? 'Annuale' :
                                   transaction.frequency === 'weekly' ? 'Settimanale' : 'Giornaliero'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                            <div className="flex justify-between">
                              <span>Importo:</span>
                              <span className="font-semibold">€{transaction.amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Prossimo:</span>
                              <span>{new Date(transaction.next_date).toLocaleDateString('it-IT')}</span>
                            </div>
                            {transaction.end_date && (
                              <div className="flex justify-between">
                                <span>Scadenza:</span>
                                <span>{new Date(transaction.end_date).toLocaleDateString('it-IT')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 ml-3">
                          <button
                            onClick={() => {
                              setFormData({
                                amount: transaction.amount.toString(),
                                description: transaction.description,
                                categoryId: transaction.category_id,
                                frequency: transaction.frequency,
                                startDate: transaction.start_date,
                                endDate: transaction.end_date || '',
                                durationYears: '',
                                durationMonths: '',
                              });
                              setTransactionType(transaction.type);
                              setEditingTransaction(transaction.id);
                            }}
                            className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('Sei sicuro di voler eliminare questo pagamento ricorrente?')) return;
                              
                              try {
                                const { error } = await supabase
                                  .from('recurring_transactions')
                                  .delete()
                                  .eq('id', transaction.id)
                                  .eq('user_id', user?.id);

                                if (error) throw error;

                                toast({
                                  title: "Pagamento eliminato",
                                  description: "Il pagamento ricorrente è stato eliminato con successo",
                                });

                                fetchRecurringTransactions();
                              } catch (error: any) {
                                toast({
                                  title: "Errore",
                                  description: error.message,
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* iOS-style bottom safe area */}
      <div className="h-8 bg-transparent"></div>
    </div>
  );
};

export default RecurringTransactionMobile;
