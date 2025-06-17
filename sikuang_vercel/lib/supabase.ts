import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database tables
export interface TahunAnggaran {
  id: string;
  nama_tahun_anggaran: string;
  tanggal_mulai: string;
  tanggal_berakhir: string;
  is_aktif: boolean;
  created_at: string;
  updated_at: string;
}

export interface Kategori {
  id: string;
  nama_kategori: string;
  deskripsi?: string;
  tipe: 'pemasukan' | 'pengeluaran';
  created_at: string;
  updated_at: string;
}

export interface RencanaKegiatan {
  id: string;
  tahun_anggaran_id: string;
  kategori_id: string;
  nama_kegiatan: string;
  deskripsi_kegiatan?: string;
  tanggal_rencana: string;
  tanggal_selesai: string;
  jumlah_rencana: number;
  created_at: string;
  updated_at: string;
  tahun_anggaran?: TahunAnggaran;
  kategori?: Kategori;
}

export interface Transaksi {
  id: string;
  rencana_kegiatan_id?: string;
  tanggal_transaksi: string;
  deskripsi_transaksi: string;
  jumlah_transaksi: number;
  tipe_transaksi: 'pemasukan' | 'pengeluaran';
  bukti_transaksi_url?: string;
  created_at: string;
  updated_at: string;
  rencana_kegiatan?: RencanaKegiatan;
  ekuivalen_1?: number | null;
  ekuivalen_1_satuan?: string | null;
  ekuivalen_2?: number | null;
  ekuivalen_2_satuan?: string | null;
  ekuivalen_3?: number | null;
  ekuivalen_3_satuan?: string | null;
  harga_satuan?: number | null;
}

export interface PengaturanAplikasi {
  id: string;
  kunci_pengaturan: string;
  nilai_pengaturan: string;
  created_at: string;
  updated_at: string;
}

// Database connection test function
export const testDatabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('pengaturan_aplikasi')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Database connection test successful');
    return { success: true, data };
  } catch (error: any) {
    console.error('Database connection test error:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to check if user is authenticated
export const checkAuthStatus = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Auth check error:', error);
      return { authenticated: false, error: error.message };
    }
    
    return { 
      authenticated: !!session, 
      user: session?.user || null,
      session 
    };
  } catch (error: any) {
    console.error('Auth check error:', error);
    return { authenticated: false, error: error.message };
  }
};