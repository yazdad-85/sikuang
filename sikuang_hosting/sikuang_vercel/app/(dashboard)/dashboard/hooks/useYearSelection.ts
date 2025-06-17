import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export function useYearSelection() {
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const channelRef = useRef<any>(null);

  const fetchAvailableYears = useCallback(async () => {
    try {
      console.log('Fetching available years...');
      
      const { data: tahunAnggaranData, error } = await supabase
        .from('tahun_anggaran')
        .select('nama_tahun_anggaran, is_aktif')
        .order('nama_tahun_anggaran', { ascending: false });

      if (error) {
        console.error('Error fetching tahun anggaran:', error);
        throw error;
      }

      console.log('Tahun anggaran data:', tahunAnggaranData);

      if (tahunAnggaranData && tahunAnggaranData.length > 0) {
        const years = tahunAnggaranData.map(item => item.nama_tahun_anggaran);
        console.log('Available years:', years);
        setAvailableYears(years);
        
        // Set active year or first year as default
        if (!selectedYear) {
          const activeYear = tahunAnggaranData.find(item => item.is_aktif)?.nama_tahun_anggaran;
          const defaultYear = activeYear || years[0];
          console.log('Setting initial year to:', defaultYear);
          setSelectedYear(defaultYear);
        }
      } else {
        console.log('No tahun anggaran data found');
      }
    } catch (error) {
      console.error('Error in fetchAvailableYears:', error);
    }
  }, [selectedYear]);

  useEffect(() => {
    console.log('useYearSelection effect running...');
    fetchAvailableYears();

    // Clean up any existing subscription
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchAvailableYears]);

  return {
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    availableYears,
    fetchAvailableYears,
  };
}

export function useDataSubscription(
  selectedYear: string,
  selectedMonth: string,
  onDataChange: () => void,
  onYearsChange: () => void,
) {
  const channelsRef = useRef<{ transaksi?: any; rencana?: any; tahunAnggaran?: any }>({});

  useEffect(() => {
    if (!selectedYear) {
      console.log('No year selected, skipping subscriptions');
      return;
    }

    console.log('Setting up subscriptions for year:', selectedYear, 'month:', selectedMonth);

    // Clean up any existing subscriptions
    if (channelsRef.current.transaksi) {
      supabase.removeChannel(channelsRef.current.transaksi);
    }
    if (channelsRef.current.rencana) {
      supabase.removeChannel(channelsRef.current.rencana);
    }
    if (channelsRef.current.tahunAnggaran) {
      supabase.removeChannel(channelsRef.current.tahunAnggaran);
    }

    // Set up real-time subscriptions with unique channel names
    const transaksiChannel = supabase
      .channel(`dashboard_transaksi_${selectedYear}_${selectedMonth}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'transaksi',
          filter: selectedMonth && selectedMonth !== 'all'
            ? `tanggal_transaksi.gte.${selectedYear}-${selectedMonth.padStart(2, '0')}-01,tanggal_transaksi.lte.${selectedYear}-${selectedMonth.padStart(2, '0')}-31`
            : `tanggal_transaksi.gte.${selectedYear}-01-01,tanggal_transaksi.lte.${selectedYear}-12-31`
        }, 
        () => onDataChange()
      )
      .subscribe();

    const rencanaChannel = supabase
      .channel(`dashboard_rencana_${selectedYear}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'rencana_kegiatan',
          filter: `tahun_anggaran.nama_tahun_anggaran.eq.${selectedYear}`
        }, 
        () => onDataChange()
      )
      .subscribe();

    const tahunAnggaranChannel = supabase
      .channel('dashboard_tahun_anggaran')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tahun_anggaran'
        },
        () => onYearsChange()
      )
      .subscribe();

    // Store channel references
    channelsRef.current = {
      transaksi: transaksiChannel,
      rencana: rencanaChannel,
      tahunAnggaran: tahunAnggaranChannel
    };

    // Cleanup function
    return () => {
      supabase.removeChannel(transaksiChannel);
      supabase.removeChannel(rencanaChannel);
      supabase.removeChannel(tahunAnggaranChannel);
    };
  }, [selectedYear, selectedMonth, onDataChange, onYearsChange]);
}
