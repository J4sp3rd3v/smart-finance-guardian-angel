
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MinusCircle, Target, PieChart, Receipt, Smartphone } from 'lucide-react';

const QuickActions = () => {
  const actions = [
    {
      title: "Add Income",
      description: "Record new income",
      icon: PlusCircle,
      color: "bg-green-500 hover:bg-green-600",
      action: () => console.log("Add income clicked")
    },
    {
      title: "Add Expense",
      description: "Track new expense",
      icon: MinusCircle,
      color: "bg-red-500 hover:bg-red-600",
      action: () => console.log("Add expense clicked")
    },
    {
      title: "Set Budget",
      description: "Create spending limits",
      icon: Target,
      color: "bg-blue-500 hover:bg-blue-600",
      action: () => console.log("Set budget clicked")
    },
    {
      title: "View Reports",
      description: "Analyze spending patterns",
      icon: PieChart,
      color: "bg-purple-500 hover:bg-purple-600",
      action: () => console.log("View reports clicked")
    }
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-blue-600" />
          Quick Actions
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
              <div className="font-medium text-slate-900">{action.title}</div>
              <div className="text-xs text-slate-500">{action.description}</div>
            </div>
          </Button>
        ))}
        
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Receipt className="h-4 w-4" />
            <span>or scan a receipt</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2 text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            Scan Receipt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
