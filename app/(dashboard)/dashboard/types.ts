export interface TahunAnggaran {
  id: string;
  nama_tahun_anggaran: string;
  tanggal_mulai: string;
  tanggal_berakhir: string;
  is_aktif: boolean;
}

export interface Kategori {
  id: string;
  nama_kategori: string;
  deskripsi?: string;
  tipe: 'pemasukan' | 'pengeluaran';
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
  rencana_kegiatan?: RencanaKegiatan;

  ekuivalen_1?: number | null;
  ekuivalen_1_satuan?: string | null;
  ekuivalen_2?: number | null;
  ekuivalen_2_satuan?: string | null;
  ekuivalen_3?: number | null;
  ekuivalen_3_satuan?: string | null;
  harga_satuan?: number | null;
}

export interface DashboardStats {
  totalPemasukan: number;
  totalPengeluaran: number;
  saldo: number;
  totalRencanaPemasukan: number;
  totalRencanaPengeluaran: number;
}

export const months = [
  { value: '1', label: 'Januari' },
  { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },
  { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },
  { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];
