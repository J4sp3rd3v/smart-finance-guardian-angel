import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MinusCircle, Target, PieChart, Receipt, Smartphone } from 'lucide-react';

const QuickActions = () => {
  const actions = [
    {
      title: "Visualizza Report",
      description: "Analizza i tuoi pattern di spesa",
      icon: PieChart,
      color: "bg-purple-500 hover:bg-purple-600",
      action: () => console.log("View reports clicked")
    },
    {
      title: "Imposta Budget",
      description: "Crea limiti di spesa",
      icon: Target,
      color: "bg-blue-500 hover:bg-blue-600",
      action: () => console.log("Set budget clicked")
    }
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-blue-600" />
          Azioni Rapide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            className="w-full justify-start h-auto p-4 hover:shadow-md transition-all group"
            onClick={action.action}
          >
            <div className={`p-2 rounded-lg ${action.color} mr-3 group-hover:scale-110 transition-transform`}>
              <action.icon className="h-4 w-4 text-white" />
            </div>
            <div className="text-left">
              <div className="font-medium text-foreground">{action.title}</div>
              <div className="text-xs text-muted-foreground">{action.description}</div>
            </div>
          </Button>
        ))}
        
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Receipt className="h-4 w-4" />
            <span>Funzioni future</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2 text-blue-600 border-blue-200 hover:bg-blue-50"
            disabled
          >
            Scansione Scontrini
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
