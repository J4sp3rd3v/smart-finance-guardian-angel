
import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Coffee, Car, Home, ShoppingBag, Utensils } from 'lucide-react';

const TransactionList = () => {
  const transactions = [
    {
      id: 1,
      type: 'expense',
      amount: 24.50,
      description: 'Coffee Shop',
      category: 'Food & Dining',
      date: '2024-01-15',
      icon: Coffee,
      color: 'text-amber-600 bg-amber-100'
    },
    {
      id: 2,
      type: 'income',
      amount: 2500.00,
      description: 'Salary Deposit',
      category: 'Income',
      date: '2024-01-15',
      icon: ArrowUpRight,
      color: 'text-green-600 bg-green-100'
    },
    {
      id: 3,
      type: 'expense',
      amount: 89.99,
      description: 'Grocery Shopping',
      category: 'Groceries',
      date: '2024-01-14',
      icon: ShoppingBag,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      id: 4,
      type: 'expense',
      amount: 45.00,
      description: 'Gas Station',
      category: 'Transportation',
      date: '2024-01-14',
      icon: Car,
      color: 'text-purple-600 bg-purple-100'
    },
    {
      id: 5,
      type: 'expense',
      amount: 120.00,
      description: 'Internet Bill',
      category: 'Utilities',
      date: '2024-01-13',
      icon: Home,
      color: 'text-orange-600 bg-orange-100'
    },
    {
      id: 6,
      type: 'expense',
      amount: 32.75,
      description: 'Restaurant',
      category: 'Food & Dining',
      date: '2024-01-13',
      icon: Utensils,
      color: 'text-red-600 bg-red-100'
    }
  ];

  const formatAmount = (amount: number, type: string) => {
    const formatted = amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
    return type === 'income' ? `+${formatted}` : `-${formatted}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-1">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
        >
          {/* Icon */}
          <div className={`p-2 rounded-lg ${transaction.color} group-hover:scale-110 transition-transform`}>
            <transaction.icon className="h-4 w-4" />
          </div>

          {/* Transaction Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-900 truncate">
                {transaction.description}
              </p>
              <p className={`font-semibold ${
                transaction.type === 'income' 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {formatAmount(transaction.amount, transaction.type)}
              </p>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-slate-500">
                {transaction.category}
              </p>
              <p className="text-xs text-slate-400">
                {formatDate(transaction.date)}
              </p>
            </div>
          </div>

          {/* Transaction Type Indicator */}
          <div className={`p-1 rounded-full ${
            transaction.type === 'income' 
              ? 'text-green-600' 
              : 'text-red-600'
          }`}>
            {transaction.type === 'income' ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownLeft className="h-3 w-3" />
            )}
          </div>
        </div>
      ))}
      
      {/* View All Button */}
      <div className="p-4 border-t border-slate-100">
        <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2 hover:bg-blue-50 rounded-lg transition-colors">
          View All Transactions
        </button>
      </div>
    </div>
  );
};

export default TransactionList;
