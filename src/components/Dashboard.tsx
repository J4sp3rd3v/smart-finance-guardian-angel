
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Wallet, PlusCircle, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FinancialChart from './FinancialChart';
import TransactionList from './TransactionList';
import QuickActions from './QuickActions';

const Dashboard = () => {
  const stats = [
    {
      title: "Total Balance",
      amount: "$12,345.67",
      change: "+12.5%",
      trend: "up",
      icon: Wallet,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "Monthly Income",
      amount: "$4,250.00",
      change: "+8.2%",
      trend: "up",
      icon: TrendingUp,
      gradient: "from-green-500 to-emerald-500"
    },
    {
      title: "Monthly Expenses",
      amount: "$2,890.43",
      change: "-3.1%",
      trend: "down",
      icon: TrendingDown,
      gradient: "from-orange-500 to-red-500"
    },
    {
      title: "Savings Rate",
      amount: "32%",
      change: "+5.2%",
      trend: "up",
      icon: PlusCircle,
      gradient: "from-purple-500 to-pink-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              Welcome back, John! 👋
            </h1>
            <p className="text-slate-600 mt-1">
              Here's your financial overview for today
            </p>
          </div>
          <div className="flex gap-3">
            <Button size="sm" variant="outline" className="hover:scale-105 transition-transform">
              <MinusCircle className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 hover:scale-105 transition-all">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Income
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {stat.amount}
                    </p>
                    <p className={`text-sm flex items-center mt-1 ${
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {stat.change}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient} group-hover:scale-110 transition-transform`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  Financial Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FinancialChart />
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <QuickActions />
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TransactionList />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
