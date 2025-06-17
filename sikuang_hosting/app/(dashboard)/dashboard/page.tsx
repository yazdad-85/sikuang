'use client';

import { useEffect } from 'react';
import { StatCards } from './components/StatCards';
import { RecentActivities } from './components/RecentActivities';
import { SummaryCard } from './components/SummaryCard';
import { useDashboardData } from './hooks/useDashboardData';
import { useYearSelection, useDataSubscription } from './hooks/useYearSelection';
import { testConnection } from './test-connection';
import { months } from './types';

export default function DashboardPage() {
  const {
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    availableYears,
    fetchAvailableYears,
  } = useYearSelection();

  const { stats, loading, fetchDashboardData } = useDashboardData(selectedYear, selectedMonth);

  // Test database connection on mount
  useEffect(() => {
    async function runConnectionTest() {
      const result = await testConnection();
      console.log('Database connection test results:', result);
    }
    runConnectionTest();
  }, []);

  // Initial data fetch when year/month changes
  useEffect(() => {
    console.log('Dashboard effect - fetching data for:', { selectedYear, selectedMonth });
    if (selectedYear) {
      fetchDashboardData();
    }
  }, [selectedYear, selectedMonth, fetchDashboardData]);

  // Set up real-time subscriptions
  useDataSubscription(
    selectedYear,
    selectedMonth,
    fetchDashboardData,
    fetchAvailableYears
  );

  console.log('Dashboard render:', {
    selectedYear,
    selectedMonth,
    availableYears,
    stats,
    loading
  });

  if (!selectedYear && availableYears.length === 0) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Belum ada tahun anggaran yang tersedia
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Ringkasan keuangan dan informasi penting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                TA {year}
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
          >
            <option value="all">Semua Bulan</option>
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <StatCards stats={stats} loading={loading} />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <RecentActivities />
        <SummaryCard
          stats={stats}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          availableYears={availableYears}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
        />
      </div>
    </div>
  );
}
