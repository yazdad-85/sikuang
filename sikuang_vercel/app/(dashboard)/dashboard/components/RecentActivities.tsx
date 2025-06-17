'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/currency';
import { formatTimeAgo } from '@/lib/utils/date';
import { supabase } from '@/lib/supabase';

type Activity = {
  id: string;
  type: 'transaksi' | 'rencana';
  title: string;
  amount?: number;
  timestamp: string;
  tipe?: 'pemasukan' | 'pengeluaran';
};

interface TransaksiResponse {
  id: string;
  deskripsi_transaksi: string;
  jumlah_transaksi: number;
  tipe_transaksi: 'pemasukan' | 'pengeluaran';
  created_at: string;
  rencana_kegiatan: {
    nama_kegiatan: string;
  } | null;
}

interface RencanaResponse {
  id: string;
  nama_kegiatan: string;
  created_at: string;
}

export function RecentActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const channelsRef = useRef<{ transaksi?: any; rencana?: any }>({});

  const fetchActivities = async () => {
    try {
      // Fetch recent transactions
      const { data: transaksiData, error: transaksiError } = await supabase
        .from('transaksi')
        .select(`
          id,
          deskripsi_transaksi,
          jumlah_transaksi,
          tipe_transaksi,
          created_at,
          rencana_kegiatan:rencana_kegiatan_id(
            nama_kegiatan
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (transaksiError) throw transaksiError;

      // Fetch recent rencana kegiatan
      const { data: rencanaData, error: rencanaError } = await supabase
        .from('rencana_kegiatan')
        .select(`
          id,
          nama_kegiatan,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (rencanaError) throw rencanaError;

      // Combine and sort activities
      const combinedActivities: Activity[] = [
        ...(transaksiData || []).map((t: any): Activity => ({
          id: t.id,
          type: 'transaksi',
          title: t.deskripsi_transaksi,
          amount: Number(t.jumlah_transaksi),
          timestamp: t.created_at,
          tipe: t.tipe_transaksi,
        })),
        ...(rencanaData || []).map((r: any): Activity => ({
          id: r.id,
          type: 'rencana',
          title: r.nama_kegiatan,
          timestamp: r.created_at,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, 5);

      setActivities(combinedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Clean up any existing subscriptions
    return () => {
      if (channelsRef.current.transaksi) {
        supabase.removeChannel(channelsRef.current.transaksi);
      }
      if (channelsRef.current.rencana) {
        supabase.removeChannel(channelsRef.current.rencana);
      }
    };
  }, []);

  // Set up subscriptions in a separate effect
  useEffect(() => {
    // Set up real-time subscriptions
    const transaksiChannel = supabase
      .channel('recent_transaksi_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transaksi' },
        () => fetchActivities()
      )
      .subscribe();

    const rencanaChannel = supabase
      .channel('recent_rencana_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'rencana_kegiatan' },
        () => fetchActivities()
      )
      .subscribe();

    // Store channel references
    channelsRef.current = {
      transaksi: transaksiChannel,
      rencana: rencanaChannel
    };

    // Cleanup function
    return () => {
      supabase.removeChannel(transaksiChannel);
      supabase.removeChannel(rencanaChannel);
    };
  }, []); // Empty dependency array since we want to set up subscriptions only once

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Aktivitas Terbaru</CardTitle>
        <CardDescription>
          Transaksi dan kegiatan terbaru dalam sistem
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <div className="h-14 bg-gray-100 rounded-md animate-pulse" />
            <div className="h-14 bg-gray-100 rounded-md animate-pulse" />
            <div className="h-14 bg-gray-100 rounded-md animate-pulse" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Belum ada aktivitas
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={`${activity.type}-${activity.id}`}
                className="flex items-start space-x-4"
              >
                <div className={`
                  w-2 h-2 mt-2 rounded-full
                  ${activity.type === 'transaksi' 
                    ? activity.tipe === 'pemasukan'
                      ? 'bg-green-500'
                      : 'bg-red-500'
                    : 'bg-blue-500'
                  }
                `} />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">
                    {activity.type === 'transaksi' 
                      ? activity.tipe === 'pemasukan'
                        ? 'Transaksi pemasukan'
                        : 'Transaksi pengeluaran'
                      : 'Rencana kegiatan baru'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatTimeAgo(activity.timestamp)}
                  </p>
                </div>
                {activity.amount && (
                  <div className={`
                    text-sm font-medium
                    ${activity.tipe === 'pemasukan' ? 'text-green-600' : 'text-red-600'}
                  `}>
                    {activity.tipe === 'pemasukan' ? '+' : '-'}
                    {formatCurrency(activity.amount)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
