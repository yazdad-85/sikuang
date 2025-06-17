'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils/currency';
import type { DashboardStats } from '../types';
import { months } from '../types';

interface SummaryCardProps {
  stats: DashboardStats;
  selectedYear: string;
  selectedMonth: string;
  availableYears: string[];
  onYearChange: (year: string) => void;
  onMonthChange: (month: string) => void;
}

export function SummaryCard({
  stats,
  selectedYear,
  selectedMonth,
  availableYears,
  onYearChange,
  onMonthChange,
}: SummaryCardProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle>
              Ringkasan {selectedMonth && selectedMonth !== 'all' 
                ? months.find(m => m.value === selectedMonth)?.label 
                : 'Tahun'} {selectedYear}
            </CardTitle>
            <CardDescription>
              Perbandingan rencana vs realisasi
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedYear} onValueChange={onYearChange}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={onMonthChange}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Semua Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span>Realisasi Pemasukan</span>
              <span className="font-medium">{formatCurrency(stats.totalPemasukan)}</span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ 
                  width: stats.totalRencanaPemasukan > 0 
                    ? `${Math.min((stats.totalPemasukan / stats.totalRencanaPemasukan) * 100, 100)}%` 
                    : '0%'
                }}
              ></div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Target: {formatCurrency(stats.totalRencanaPemasukan)}
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between text-sm">
              <span>Realisasi Pengeluaran</span>
              <span className="font-medium">{formatCurrency(stats.totalPengeluaran)}</span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full" 
                style={{ 
                  width: stats.totalRencanaPengeluaran > 0 
                    ? `${Math.min((stats.totalPengeluaran / stats.totalRencanaPengeluaran) * 100, 100)}%` 
                    : '0%'
                }}
              ></div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Target: {formatCurrency(stats.totalRencanaPengeluaran)}
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Sisa Saldo</span>
              <span className={`font-bold ${stats.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.saldo)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
