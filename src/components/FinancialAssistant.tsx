import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Lightbulb,
  PiggyBank,
  Calendar,
  BarChart3,
  Zap
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FinancialGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'completed' | 'paused';
}

interface SpendingInsight {
  category: string;
  amount: number;
  trend: 'up' | 'down' | 'stable';
  percentage_change: number;
  recommendation: string;
}

interface SmartSuggestion {
  id: string;
  type: 'warning' | 'tip' | 'goal' | 'achievement';
  title: string;
  description: string;
  action?: string;
  priority: number;
}

export default function FinancialAssistant() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [newGoal, setNewGoal] = useState({
    title: '',
    target_amount: '',
    deadline: '',
    category: 'risparmio'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFinancialData();
    }
  }, [user]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadGoals(),
        analyzeSpendingPatterns(),
        generateSmartSuggestions()
      ]);
    } catch (error) {
      console.error('Errore caricamento dati finanziari:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGoals = async () => {
    // Carica obiettivi reali dal localStorage per ora (simulando persistenza)
    const savedGoals = localStorage.getItem(`financial_goals_${user?.id}`);
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    } else {
      // Inizia con array vuoto se non ci sono obiettivi salvati
      setGoals([]);
    }
  };

  const analyzeSpendingPatterns = async () => {
    try {
      // Analisi pattern di spesa basata su transazioni reali
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*, categories(name)')
        .eq('user_id', user?.id)
        .eq('type', 'expense')
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (transactions && transactions.length > 0) {
        // Raggruppa per categoria
        const categorySpending = transactions.reduce((acc, transaction) => {
          const categoryName = transaction.categories?.name || 'Altro';
          if (!acc[categoryName]) {
            acc[categoryName] = { total: 0, count: 0 };
          }
          acc[categoryName].total += transaction.amount;
          acc[categoryName].count += 1;
          return acc;
        }, {} as Record<string, { total: number; count: number }>);

        // Genera insights reali
        const realInsights: SpendingInsight[] = Object.entries(categorySpending).map(([category, data]) => {
          const avgAmount = data.total / data.count;
          let trend: 'up' | 'down' | 'stable' = 'stable';
          let recommendation = `Hai speso €${data.total.toFixed(2)} in ${category} questo mese.`;

          // Logica semplificata per trend (puoi migliorarla)
          if (data.total > 500) {
            trend = 'up';
            recommendation = `Spese elevate per ${category}. Considera di impostare un budget mensile.`;
          } else if (data.total < 100) {
            trend = 'down';
            recommendation = `Spese contenute per ${category}. Ottimo controllo!`;
          }

          return {
            category,
            amount: data.total,
            trend,
            percentage_change: 0, // Calcolo semplificato per ora
            recommendation
          };
        });

        setInsights(realInsights);
      } else {
        // Se non ci sono transazioni, array vuoto
        setInsights([]);
      }
    } catch (error) {
      console.error('Errore analisi spese:', error);
      setInsights([]);
    }
  };

  const generateSmartSuggestions = async () => {
    try {
      const suggestions: SmartSuggestion[] = [];
      
      // Ottieni statistiche dell'ultimo mese
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (transactions && transactions.length > 0) {
        const totalExpenses = transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const totalIncome = transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);

        // Suggerimento basato su spese elevate
        if (totalExpenses > 1000) {
          suggestions.push({
            id: 'high-spending',
            type: 'warning',
            title: 'Spese Elevate Rilevate',
            description: `Hai speso €${totalExpenses.toFixed(2)} questo mese. Considera di rivedere il tuo budget.`,
            priority: 1
          });
        }

        // Suggerimento per risparmio positivo
        if (totalIncome > totalExpenses) {
          const savings = totalIncome - totalExpenses;
          suggestions.push({
            id: 'positive-savings',
            type: 'achievement',
            title: 'Ottimo Risparmio!',
            description: `Hai risparmiato €${savings.toFixed(2)} questo mese. Considera di investire parte di questa somma.`,
            priority: 2
          });
        }

        // Suggerimento per poche transazioni
        if (transactions.length < 5) {
          suggestions.push({
            id: 'track-more',
            type: 'tip',
            title: 'Traccia Più Transazioni',
            description: 'Registra tutte le tue spese per avere analisi più accurate e consigli personalizzati.',
            action: 'Aggiungi Transazione',
            priority: 3
          });
        }
      } else {
        // Nessuna transazione - suggerimento per iniziare
        suggestions.push({
          id: 'get-started',
          type: 'tip',
          title: 'Inizia a Tracciare le Tue Finanze',
          description: 'Aggiungi le tue prime transazioni per ricevere analisi personalizzate e consigli intelligenti.',
          action: 'Aggiungi Prima Transazione',
          priority: 1
        });
      }

      setSuggestions(suggestions);
    } catch (error) {
      console.error('Errore generazione suggerimenti:', error);
      setSuggestions([]);
    }
  };

  const createGoal = async () => {
    if (!newGoal.title || !newGoal.target_amount) return;

    const goal: FinancialGoal = {
      id: Date.now().toString(),
      title: newGoal.title,
      target_amount: parseFloat(newGoal.target_amount),
      current_amount: 0,
      deadline: newGoal.deadline,
      category: newGoal.category,
      priority: 'medium',
      status: 'active'
    };

    // Salva nel localStorage per persistenza
    const updatedGoals = [...goals, goal];
    setGoals(updatedGoals);
    localStorage.setItem(`financial_goals_${user?.id}`, JSON.stringify(updatedGoals));
    
    setNewGoal({ title: '', target_amount: '', deadline: '', category: 'risparmio' });
  };

  const updateGoalProgress = async (goalId: string, amount: number) => {
    const updatedGoals = goals.map(goal => 
      goal.id === goalId 
        ? { ...goal, current_amount: Math.min(goal.current_amount + amount, goal.target_amount) }
        : goal
    );
    setGoals(updatedGoals);
    // Salva nel localStorage
    localStorage.setItem(`financial_goals_${user?.id}`, JSON.stringify(updatedGoals));
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'tip': return <Lightbulb className="h-4 w-4 text-blue-500" />;
      case 'goal': return <Target className="h-4 w-4 text-green-500" />;
      case 'achievement': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Analizzando i tuoi dati finanziari...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Assistente Finanziario Intelligente
          </CardTitle>
          <CardDescription>
            Analisi personalizzata e consigli per migliorare la tua situazione finanziaria
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Consigli
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Obiettivi
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analisi
          </TabsTrigger>
          <TabsTrigger value="planning" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Pianificazione
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-4">
          <div className="grid gap-4">
            {suggestions.length > 0 ? (
              suggestions.map((suggestion) => (
                <Alert key={suggestion.id} className="border-l-4 border-l-primary">
                  <div className="flex items-start gap-3">
                    {getSuggestionIcon(suggestion.type)}
                    <div className="flex-1">
                      <h4 className="font-semibold">{suggestion.title}</h4>
                      <AlertDescription className="mt-1">
                        {suggestion.description}
                      </AlertDescription>
                      {suggestion.action && (
                        <Button size="sm" className="mt-2">
                          {suggestion.action}
                        </Button>
                      )}
                    </div>
                  </div>
                </Alert>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nessun Consiglio Disponibile</h3>
                  <p className="text-muted-foreground">
                    Aggiungi alcune transazioni per ricevere consigli personalizzati sui tuoi pattern di spesa.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5" />
                I Tuoi Obiettivi Finanziari
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {goals.length > 0 ? (
                goals.map((goal) => {
                const progress = (goal.current_amount / goal.target_amount) * 100;
                return (
                  <div key={goal.id} className="space-y-2 p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{goal.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          €{goal.current_amount.toFixed(2)} / €{goal.target_amount.toFixed(2)}
                        </p>
                      </div>
                      <Badge variant={goal.priority === 'high' ? 'destructive' : 'secondary'}>
                        {goal.priority}
                      </Badge>
                    </div>
                    <Progress value={progress} className="w-full" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Scadenza: {new Date(goal.deadline).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateGoalProgress(goal.id, 50)}
                        >
                          +€50
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateGoalProgress(goal.id, 100)}
                        >
                          +€100
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <Target className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nessun Obiettivo Impostato</h3>
                    <p className="text-muted-foreground mb-4">
                      Crea il tuo primo obiettivo finanziario per iniziare a tracciare i progressi.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="goal-title">Titolo Obiettivo</Label>
                      <Input
                        id="goal-title"
                        value={newGoal.title}
                        onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                        placeholder="es. Fondo Emergenza"
                      />
                    </div>
                    <div>
                      <Label htmlFor="goal-amount">Importo Target (€)</Label>
                      <Input
                        id="goal-amount"
                        type="number"
                        value={newGoal.target_amount}
                        onChange={(e) => setNewGoal({...newGoal, target_amount: e.target.value})}
                        placeholder="1000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="goal-deadline">Scadenza</Label>
                      <Input
                        id="goal-deadline"
                        type="date"
                        value={newGoal.deadline}
                        onChange={(e) => setNewGoal({...newGoal, deadline: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="goal-category">Categoria</Label>
                      <select
                        id="goal-category"
                        className="w-full p-2 border rounded"
                        value={newGoal.category}
                        onChange={(e) => setNewGoal({...newGoal, category: e.target.value})}
                      >
                        <option value="risparmio">Risparmio</option>
                        <option value="emergenza">Emergenza</option>
                        <option value="investimento">Investimento</option>
                        <option value="svago">Svago</option>
                        <option value="casa">Casa</option>
                      </select>
                    </div>
                  </div>
                  <Button onClick={createGoal} className="mt-4 w-full">
                    Crea Obiettivo
                  </Button>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4">
            {insights.length > 0 ? (
              insights.map((insight, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTrendIcon(insight.trend)}
                        <div>
                          <h4 className="font-semibold">{insight.category}</h4>
                          <p className="text-sm text-muted-foreground">
                            €{insight.amount.toFixed(2)} questo mese
                          </p>
                        </div>
                      </div>
                      <Badge variant={insight.trend === 'up' ? 'destructive' : 'default'}>
                        {insight.percentage_change > 0 ? '+' : ''}{insight.percentage_change}%
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {insight.recommendation}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nessuna Analisi Disponibile</h3>
                  <p className="text-muted-foreground">
                    Registra alcune spese per vedere l'analisi dei tuoi pattern di consumo.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pianificazione Finanziaria</CardTitle>
              <CardDescription>
                Strumenti per pianificare il tuo futuro finanziario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <PiggyBank className="h-6 w-6 mb-2" />
                  Calcolatore Risparmio
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Target className="h-6 w-6 mb-2" />
                  Pianificatore Obiettivi
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <BarChart3 className="h-6 w-6 mb-2" />
                  Analisi Trend
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Calendar className="h-6 w-6 mb-2" />
                  Budget Previsionale
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 