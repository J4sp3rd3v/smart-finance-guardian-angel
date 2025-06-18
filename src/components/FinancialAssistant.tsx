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
    // Per ora utilizziamo dati mock, implementeremo Supabase dopo aver aggiornato le tabelle
    const mockGoals: FinancialGoal[] = [
      {
        id: '1',
        title: 'Fondo Emergenza',
        target_amount: 5000,
        current_amount: 2300,
        deadline: '2024-12-31',
        category: 'emergenza',
        priority: 'high',
        status: 'active'
      },
      {
        id: '2',
        title: 'Vacanze Estate',
        target_amount: 2000,
        current_amount: 800,
        deadline: '2024-06-30',
        category: 'svago',
        priority: 'medium',
        status: 'active'
      },
      {
        id: '3',
        title: 'Nuovo Laptop',
        target_amount: 1500,
        current_amount: 450,
        deadline: '2024-03-31',
        category: 'tecnologia',
        priority: 'low',
        status: 'active'
      }
    ];
    setGoals(mockGoals);
  };

  const analyzeSpendingPatterns = async () => {
    // Analisi pattern di spesa basata su transazioni reali
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user?.id)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (transactions) {
      // Genera insights
      const mockInsights: SpendingInsight[] = [
        {
          category: 'Alimentari',
          amount: 450,
          trend: 'up',
          percentage_change: 15,
          recommendation: 'Considera di pianificare i pasti per ridurre sprechi'
        },
        {
          category: 'Trasporti',
          amount: 280,
          trend: 'down',
          percentage_change: -8,
          recommendation: 'Ottimo! Stai risparmiando sui trasporti'
        },
        {
          category: 'Intrattenimento',
          amount: 320,
          trend: 'up',
          percentage_change: 22,
          recommendation: 'Spese per intrattenimento in aumento, considera un budget fisso'
        }
      ];
      setInsights(mockInsights);
    }
  };

  const generateSmartSuggestions = async () => {
    const smartSuggestions: SmartSuggestion[] = [
      {
        id: '1',
        type: 'tip',
        title: 'Risparmio Automatico',
        description: 'Imposta un trasferimento automatico di €100/mese verso il tuo fondo emergenza',
        action: 'Configura',
        priority: 1
      },
      {
        id: '2',
        type: 'warning',
        title: 'Budget Superato',
        description: 'Hai superato il budget mensile per "Intrattenimento" del 15%',
        priority: 2
      },
      {
        id: '3',
        type: 'achievement',
        title: 'Obiettivo Raggiunto!',
        description: 'Complimenti! Hai risparmiato €200 in più rispetto al mese scorso',
        priority: 3
      }
    ];
    setSuggestions(smartSuggestions);
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

    // TODO: Salvare nel database quando le tabelle saranno create
    // const { error } = await supabase
    //   .from('financial_goals')
    //   .insert([{
    //     user_id: user?.id,
    //     title: goal.title,
    //     target_amount: goal.target_amount,
    //     category: goal.category,
    //     deadline: goal.deadline
    //   }]);

    setGoals([...goals, goal]);
    setNewGoal({ title: '', target_amount: '', deadline: '', category: 'risparmio' });
  };

  const updateGoalProgress = async (goalId: string, amount: number) => {
    setGoals(goals.map(goal => 
      goal.id === goalId 
        ? { ...goal, current_amount: Math.min(goal.current_amount + amount, goal.target_amount) }
        : goal
    ));
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
            {suggestions.map((suggestion) => (
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
            ))}
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
              {goals.map((goal) => {
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
              })}

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
            {insights.map((insight, index) => (
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
            ))}
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