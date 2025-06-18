import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MinusCircle, Target, PieChart, Receipt, Smartphone, Sparkles } from 'lucide-react';

const QuickActions = () => {
  const actions = [
    {
      title: "Visualizza Report",
      description: "Analizza i tuoi pattern di spesa",
      icon: PieChart,
      color: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
      action: () => console.log("View reports clicked")
    },
    {
      title: "Imposta Budget",
      description: "Crea limiti di spesa",
      icon: Target,
      color: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
      action: () => console.log("Set budget clicked")
    }
  ];

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          Azioni Rapide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            className="w-full justify-start h-auto p-4 hover:shadow-md transition-all duration-200 group border-border/50 hover:border-primary/30 hover:bg-muted/20 dark:hover:bg-muted/10"
            onClick={action.action}
          >
            <div className={`p-2 rounded-lg ${action.color} mr-3 group-hover:scale-110 transition-all duration-200 shadow-sm`}>
              <action.icon className="h-4 w-4 text-white" />
            </div>
            <div className="text-left flex-1">
              <div className="font-medium text-foreground transition-colors">
                {action.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {action.description}
              </div>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-200">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          </Button>
        ))}
        
        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Receipt className="h-4 w-4" />
            <span>Funzioni future</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2 text-muted-foreground border-border/50 cursor-not-allowed opacity-60"
            disabled
          >
            <div className="flex items-center gap-2">
              📄 Scansione Scontrini
              <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                Presto
              </span>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
