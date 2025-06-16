import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, Edit, Trash2, PlusCircle, MinusCircle } from 'lucide-react';
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

interface RecurringTransactionFormProps {
  onSuccess: () => void;
}

const RecurringTransactionForm = ({ onSuccess }: RecurringTransactionFormProps) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  
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
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecurringTransactions(data || []);
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
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

      // Reset form
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
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Pagamenti Ricorrenti - Mutui, Stipendi, Bollette
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs 
            value={transactionType} 
            onValueChange={(value) => {
              setTransactionType(value as 'income' | 'expense');
              setFormData({ ...formData, categoryId: '' });
              setEditingTransaction(null);
            }}
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="income" className="text-green-600">
                <PlusCircle className="h-4 w-4 mr-2" />
                Entrate Ricorrenti
              </TabsTrigger>
              <TabsTrigger value="expense" className="text-red-600">
                <MinusCircle className="h-4 w-4 mr-2" />
                Uscite Ricorrenti
              </TabsTrigger>
            </TabsList>

            <TabsContent value={transactionType}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Importo (€)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="800.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Frequenza
                    </label>
                    <Select 
                      value={formData.frequency} 
                      onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensile</SelectItem>
                        <SelectItem value="yearly">Annuale</SelectItem>
                        <SelectItem value="weekly">Settimanale</SelectItem>
                        <SelectItem value="daily">Giornaliero</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Descrizione
                  </label>
                  <Input
                    placeholder="Es: Mutuo casa, Stipendio mensile, Rata auto"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Categoria
                  </label>
                  <Select 
                    value={formData.categoryId} 
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona una categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Data Inizio
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Data Fine (opzionale)
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Durata Pagamento (es: mutuo 30 anni)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-blue-700 mb-1 block">
                        Anni (es: 30 per mutuo)
                      </label>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        max="50"
                        value={formData.durationYears}
                        onChange={(e) => setFormData({ ...formData, durationYears: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                    <div>  
                      <label className="text-sm font-medium text-blue-700 mb-1 block">
                        Mesi aggiuntivi
                      </label>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        max="11"
                        value={formData.durationMonths}
                        onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 Perfetto per mutui, finanziamenti auto, abbonamenti a lungo termine
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Salvando...' : (editingTransaction ? 'Modifica Pagamento' : 'Aggiungi Pagamento Ricorrente')}
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
                    >
                      Annulla
                    </Button>
                  )}
                </div>
              </form>

              {/* Lista dei pagamenti ricorrenti */}  
              {filteredRecurringTransactions.length > 0 && (
                <div className="mt-8 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-blue-600" />
                    I tuoi pagamenti ricorrenti
                  </h3>
                  
                  {filteredRecurringTransactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className={`p-4 rounded-lg border-2 ${
                        transaction.is_active 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">
                              {transaction.description}
                            </h4>
                            <Badge variant={transaction.is_active ? "default" : "secondary"}>
                              {transaction.is_active ? 'Attivo' : 'Sospeso'}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Importo:</strong> €{transaction.amount.toFixed(2)}</p>
                            <p><strong>Frequenza:</strong> {
                              transaction.frequency === 'monthly' ? 'Mensile' :
                              transaction.frequency === 'yearly' ? 'Annuale' :
                              transaction.frequency === 'weekly' ? 'Settimanale' : 'Giornaliero'
                            }</p>
                            <p><strong>Categoria:</strong> {transaction.category?.name}</p>
                            <p><strong>Prossimo pagamento:</strong> {new Date(transaction.next_date).toLocaleDateString('it-IT')}</p>
                            {transaction.end_date && (
                              <p><strong>Scadenza:</strong> {new Date(transaction.end_date).toLocaleDateString('it-IT')}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
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
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
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
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecurringTransactionForm; 