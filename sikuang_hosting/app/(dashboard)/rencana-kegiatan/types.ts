export interface RencanaFormData {
  tahun_anggaran_id: string;
  kategori_id: string;
  nama_kegiatan: string;
  deskripsi_kegiatan: string;
  tanggal_rencana: string;
  tanggal_selesai: string;
  jumlah_rencana: string;
  ekuivalen_1: string;
  ekuivalen_1_satuan: string;
  ekuivalen_2: string;
  ekuivalen_2_satuan: string;
  ekuivalen_3: string;
  ekuivalen_3_satuan: string;
  harga_satuan: string;
}

export const SATUAN_OPTIONS = [
  { value: 'orang', label: 'Orang' },
  { value: 'pax', label: 'Pax' },
  { value: 'kegiatan', label: 'Kegiatan' },
  { value: 'paket', label: 'Paket' },
  { value: 'unit', label: 'Unit' },
  { value: 'bulan', label: 'Bulan' },
  { value: 'hari', label: 'Hari' },
  { value: 'custom', label: 'Lainnya' },
];
