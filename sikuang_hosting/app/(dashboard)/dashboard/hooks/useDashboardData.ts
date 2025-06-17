import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DashboardStats, RencanaKegiatan, Transaksi } from '../types';

export function useDashboardData(selectedYear: string, selectedMonth: string) {
  const [stats, setStats] = useState<DashboardStats>({
    totalPemasukan: 0,
    totalPengeluaran: 0,
    saldo: 0,
    totalRencanaPemasukan: 0,
    totalRencanaPengeluaran: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!selectedYear) return;
    
    try {
      setLoading(true);
      console.log('Fetching dashboard data for year:', selectedYear);
      
      // Get rencana kegiatan data with relations
      const { data: rencana, error: rencanaError } = await supabase
        .from('rencana_kegiatan')
        .select(`
          *,
          tahun_anggaran:tahun_anggaran_id(
            id,
            nama_tahun_anggaran
          ),
          kategori:kategori_id(
            id,
            nama_kategori,
            tipe
          )
        `)
        .eq('tahun_anggaran.nama_tahun_anggaran', selectedYear);

      if (rencanaError) {
        console.error('Rencana kegiatan error:', rencanaError);
        throw rencanaError;
      }

      console.log('Rencana kegiatan result:', rencana);

      // Get transaksi data with relations
      let transaksiQuery = supabase
        .from('transaksi')
        .select(`
          *,
          rencana_kegiatan:rencana_kegiatan_id(
            id,
            nama_kegiatan,
            tahun_anggaran:tahun_anggaran_id(
              id,
              nama_tahun_anggaran
            ),
            kategori:kategori_id(
              id,
              nama_kategori,
              tipe
            )
          )
        `);

      // Apply date filters for the selected year
      const yearNumber = selectedYear.split('/')[0].replace('TA ', '');
      if (selectedMonth && selectedMonth !== 'all') {
        const startDate = `${yearNumber}-${selectedMonth.padStart(2, '0')}-01`;
        const endDate = `${yearNumber}-${selectedMonth.padStart(2, '0')}-31`;
        transaksiQuery
          .gte('tanggal_transaksi', startDate)
          .lte('tanggal_transaksi', endDate);
      } else {
        const startDate = `${yearNumber}-01-01`;
        const endDate = `${yearNumber}-12-31`;
        transaksiQuery
          .gte('tanggal_transaksi', startDate)
          .lte('tanggal_transaksi', endDate);
      }

      const { data: transaksi, error: transaksiError } = await transaksiQuery;
      
      if (transaksiError) {
        console.error('Transaksi error:', transaksiError);
        throw transaksiError;
      }

      console.log('Transaksi result:', transaksi);

      // Calculate totals
      const totalRencanaPemasukan = (rencana || [])
        .filter((item: any) => item.kategori?.tipe === 'pemasukan')
        .reduce((sum: number, item: any) => sum + Number(item.jumlah_rencana), 0);
      
      const totalRencanaPengeluaran = (rencana || [])
        .filter((item: any) => item.kategori?.tipe === 'pengeluaran')
        .reduce((sum: number, item: any) => sum + Number(item.jumlah_rencana), 0);

      const totalPemasukan = (transaksi || [])
        .filter((item: any) => item.tipe_transaksi === 'pemasukan')
        .reduce((sum: number, item: any) => sum + Number(item.jumlah_transaksi), 0);
      
      const totalPengeluaran = (transaksi || [])
        .filter((item: any) => item.tipe_transaksi === 'pengeluaran')
        .reduce((sum: number, item: any) => sum + Number(item.jumlah_transaksi), 0);

      const newStats = {
        totalPemasukan,
        totalPengeluaran,
        saldo: totalPemasukan - totalPengeluaran,
        totalRencanaPemasukan,
        totalRencanaPengeluaran,
      };

      console.log('Calculated stats:', newStats);
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  return { stats, loading, fetchDashboardData };
}
