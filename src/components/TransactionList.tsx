import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
}

const TransactionList = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

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

      fetchTransactions();
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

  return (
    <div className="space-y-1">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center gap-3 p-4 hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors group rounded-lg"
        >
          {/* Amount */}
          <div className={`p-2 rounded-lg ${
            transaction.type === 'income' 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
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
              <p className="font-medium text-foreground truncate">
                {transaction.description}
              </p>
              <p className={`font-semibold ${
                transaction.type === 'income' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatAmount(transaction.amount, transaction.type)}
              </p>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-muted-foreground">
                {transaction.categories.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(transaction.date)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteTransaction(transaction.id)}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionList;
