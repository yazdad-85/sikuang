'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/currency';
import { TrendingUp, TrendingDown, Wallet, Target } from 'lucide-react';
import type { DashboardStats } from '../types';

interface StatCardsProps {
  stats: DashboardStats;
  loading: boolean;
}

export function StatCards({ stats, loading }: StatCardsProps) {
  const statCards = [
    {
      title: 'Total Pemasukan',
      value: stats.totalPemasukan,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Pengeluaran',
      value: stats.totalPengeluaran,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Saldo Kas',
      value: stats.saldo,
      icon: Wallet,
      color: stats.saldo >= 0 ? 'text-blue-600' : 'text-red-600',
      bgColor: stats.saldo >= 0 ? 'bg-blue-100' : 'bg-red-100',
    },
    {
      title: 'Total Rencana Pemasukan',
      value: stats.totalRencanaPemasukan,
      icon: Target,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Rencana Pengeluaran',
      value: stats.totalRencanaPengeluaran,
      icon: Target,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      {statCards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-xl lg:text-2xl font-bold ${card.color}`}>
              {loading ? '...' : formatCurrency(card.value)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
