
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, MinusCircle, Calendar, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import SmartDescriptionInput from './SmartDescriptionInput';

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
}

interface TransactionFormProps {
  onSuccess: () => void;
  onShowRecurring?: () => void;
}

const TransactionForm = ({ onSuccess, onShowRecurring }: TransactionFormProps) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchCategories();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: parseFloat(formData.amount),
          description: formData.description,
          category_id: formData.categoryId,
          type: transactionType,
          date: formData.date,
        });

      if (error) throw error;

      toast({
        title: "Transazione aggiunta",
        description: `${transactionType === 'income' ? 'Entrata' : 'Uscita'} di €${formData.amount} aggiunta con successo`,
      });

      // Reset form
      setFormData({
        amount: '',
        description: '',
        categoryId: '',
        date: new Date().toISOString().split('T')[0],
      });

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

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {transactionType === 'income' ? (
            <>
              <PlusCircle className="h-5 w-5 text-green-600" />
              Aggiungi Entrata
            </>
          ) : (
            <>
              <MinusCircle className="h-5 w-5 text-red-600" />
              Aggiungi Uscita
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs 
          value={transactionType} 
          onValueChange={(value) => {
            setTransactionType(value as 'income' | 'expense');
            setFormData({ ...formData, categoryId: '' });
          }}
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="income" className="text-green-600">
              <PlusCircle className="h-4 w-4 mr-2" />
              Entrata
            </TabsTrigger>
            <TabsTrigger value="expense" className="text-red-600">
              <MinusCircle className="h-4 w-4 mr-2" />
              Uscita
            </TabsTrigger>
          </TabsList>

          <TabsContent value={transactionType}>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Importo (€)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="h-12 text-lg sm:h-10 sm:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Data
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 sm:top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="pl-10 h-12 sm:h-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Descrizione
                </label>
                <SmartDescriptionInput
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  categoryId={formData.categoryId}
                  placeholder={
                    transactionType === 'expense' 
                      ? "Es: Benzina moto, Spesa supermercato, Bolletta luce"
                      : "Es: Stipendio gennaio, Vendita auto, Rimborso assicurazione"
                  }
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Categoria
                </label>
                <Select 
                  value={formData.categoryId} 
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  required
                >
                  <SelectTrigger className="h-12 sm:h-10">
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

              <Button 
                type="submit" 
                className={`w-full h-12 sm:h-10 text-base sm:text-sm font-semibold ${
                  transactionType === 'income' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Aggiunta...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {transactionType === 'income' ? (
                      <PlusCircle className="h-4 w-4" />
                    ) : (
                      <MinusCircle className="h-4 w-4" />
                    )}
                    Aggiungi {transactionType === 'income' ? 'Entrata' : 'Uscita'}
                  </div>
                )}
              </Button>
            </form>

            {/* Link ai pagamenti ricorrenti */}
            {onShowRecurring && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 mb-1">
                      Pagamenti Ricorrenti
                    </h4>
                    <p className="text-xs text-blue-600">
                      Configura mutui, stipendi, bollette e altri pagamenti automatici
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onShowRecurring}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Gestisci
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TransactionForm;
