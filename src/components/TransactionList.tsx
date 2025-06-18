import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Trash2, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: string;
  date: string;
  categories: {
    name: string;
    color: string;
  };
  category_id: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
}

const TransactionList = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    description: '',
    category_id: '',
    date: '',
    type: ''
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchCategories();
    }
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

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Transazione eliminata",
        description: "La transazione è stata eliminata con successo",
      });

      // Animazione di rimozione fluida
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      amount: transaction.amount.toString(),
      description: transaction.description,
      category_id: transaction.category_id,
      date: transaction.date,
      type: transaction.type
    });
    setIsEditModalOpen(true);
  };

  const updateTransaction = async () => {
    if (!editingTransaction) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          amount: parseFloat(editForm.amount),
          description: editForm.description,
          category_id: editForm.category_id,
          date: editForm.date,
          type: editForm.type
        })
        .eq('id', editingTransaction.id);

      if (error) throw error;

      toast({
        title: "Transazione aggiornata",
        description: "La transazione è stata modificata con successo",
      });

      setIsEditModalOpen(false);
      setEditingTransaction(null);
      fetchTransactions(); // Ricarica i dati
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatAmount = (amount: number, type: string) => {
    const formatted = amount.toLocaleString('it-IT', {
      style: 'currency',
      currency: 'EUR'
    });
    return type === 'income' ? `+${formatted}` : `-${formatted}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: 'numeric',
      month: 'short' 
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-muted h-16 rounded-lg"></div>
        ))}  
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nessuna transazione ancora.</p>
        <p className="text-sm">Aggiungi la tua prima entrata o uscita!</p>
      </div>
    );
  }

  const filteredCategories = categories.filter(cat => cat.type === editForm.type);

  return (
    <>
      <div className="space-y-2">
        {transactions.map((transaction, index) => (
          <div
            key={transaction.id}
            className="flex items-center gap-3 p-4 hover:bg-muted/30 dark:hover:bg-muted/10 transition-all duration-200 group rounded-lg border border-transparent hover:border-border/30 hover:shadow-sm animate-fade-in"
            style={{
              animationDelay: `${index * 50}ms`
            }}
          >
            {/* Icon */}
            <div className={`p-2 rounded-lg transition-transform group-hover:scale-110 ${
              transaction.type === 'income' 
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
                : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
            }`}>
              {transaction.type === 'income' ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownLeft className="h-4 w-4" />
              )}
            </div>

            {/* Transaction Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground truncate transition-colors">
                  {transaction.description}
                </p>
                <p className={`font-semibold transition-all ${
                  transaction.type === 'income' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatAmount(transaction.amount, transaction.type)}
                </p>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: transaction.categories.color }}
                  ></div>
                  <p className="text-sm text-muted-foreground">
                    {transaction.categories.name}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(transaction.date)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startEdit(transaction)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteTransaction(transaction.id)}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Modifica Transazione
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Importo (€)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Data
                </label>
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Descrizione
              </label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Descrizione della transazione"
                className="transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Categoria
              </label>
              <Select 
                value={editForm.category_id} 
                onValueChange={(value) => setEditForm({ ...editForm, category_id: value })}
              >
                <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{category.icon}</span>
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={updateTransaction}
                className="flex-1 bg-blue-600 hover:bg-blue-700 transition-all"
              >
                <Save className="h-4 w-4 mr-2" />
                Salva Modifiche
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
                className="transition-all"
              >
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TransactionList;
