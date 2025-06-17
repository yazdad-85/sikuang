/*
  # Schema Awal SIKUANG - Sistem Keuangan

  1. Tabel Baru
    - `tahun_anggaran` - Master data tahun anggaran
      - `id` (uuid, primary key)
      - `nama_tahun_anggaran` (text)
      - `tanggal_mulai` (date)
      - `tanggal_berakhir` (date)
      - `is_aktif` (boolean)
      - `created_at`, `updated_at` (timestamptz)
    
    - `kategori` - Master data kategori transaksi
      - `id` (uuid, primary key)
      - `nama_kategori` (text)
      - `deskripsi` (text, optional)
      - `tipe` (enum: 'pemasukan', 'pengeluaran')
      - `created_at`, `updated_at` (timestamptz)
    
    - `rencana_kegiatan` - Rencana kegiatan tahunan
      - `id` (uuid, primary key)
      - `tahun_anggaran_id` (uuid, foreign key)
      - `kategori_id` (uuid, foreign key)
      - `nama_kegiatan` (text)
      - `deskripsi_kegiatan` (text, optional)
      - `tanggal_rencana` (date)
      - `jumlah_rencana` (numeric)
      - `created_at`, `updated_at` (timestamptz)
    
    - `transaksi` - Transaksi kas masuk dan keluar
      - `id` (uuid, primary key)
      - `rencana_kegiatan_id` (uuid, foreign key, optional)
      - `tanggal_transaksi` (date)
      - `deskripsi_transaksi` (text)
      - `jumlah_transaksi` (numeric)
      - `tipe_transaksi` (enum: 'pemasukan', 'pengeluaran')
      - `bukti_transaksi_url` (text, optional)
      - `created_at`, `updated_at` (timestamptz)
    
    - `pengaturan_aplikasi` - Pengaturan aplikasi
      - `id` (uuid, primary key)
      - `kunci_pengaturan` (text, unique)
      - `nilai_pengaturan` (text)
      - `created_at`, `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create ENUM types
CREATE TYPE tipe_kategori AS ENUM ('pemasukan', 'pengeluaran');
CREATE TYPE tipe_transaksi AS ENUM ('pemasukan', 'pengeluaran');

-- Create tahun_anggaran table
CREATE TABLE IF NOT EXISTS tahun_anggaran (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_tahun_anggaran text NOT NULL,
  tanggal_mulai date NOT NULL,
  tanggal_berakhir date NOT NULL,
  is_aktif boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create kategori table
CREATE TABLE IF NOT EXISTS kategori (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_kategori text NOT NULL,
  deskripsi text,
  tipe tipe_kategori NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create rencana_kegiatan table
CREATE TABLE IF NOT EXISTS rencana_kegiatan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tahun_anggaran_id uuid REFERENCES tahun_anggaran(id) ON DELETE CASCADE,
  kategori_id uuid REFERENCES kategori(id) ON DELETE CASCADE,
  nama_kegiatan text NOT NULL,
  deskripsi_kegiatan text,
  tanggal_rencana date NOT NULL,
  jumlah_rencana numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transaksi table
CREATE TABLE IF NOT EXISTS transaksi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rencana_kegiatan_id uuid REFERENCES rencana_kegiatan(id) ON DELETE SET NULL,
  tanggal_transaksi date NOT NULL,
  deskripsi_transaksi text NOT NULL,
  jumlah_transaksi numeric(15,2) NOT NULL,
  tipe_transaksi tipe_transaksi NOT NULL,
  bukti_transaksi_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pengaturan_aplikasi table
CREATE TABLE IF NOT EXISTS pengaturan_aplikasi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kunci_pengaturan text UNIQUE NOT NULL,
  nilai_pengaturan text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tahun_anggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE rencana_kegiatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengaturan_aplikasi ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Pengguna dapat melihat tahun anggaran"
  ON tahun_anggaran FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pengguna dapat mengelola tahun anggaran"
  ON tahun_anggaran FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Pengguna dapat melihat kategori"
  ON kategori FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pengguna dapat mengelola kategori"
  ON kategori FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Pengguna dapat melihat rencana kegiatan"
  ON rencana_kegiatan FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pengguna dapat mengelola rencana kegiatan"
  ON rencana_kegiatan FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Pengguna dapat melihat transaksi"
  ON transaksi FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pengguna dapat mengelola transaksi"
  ON transaksi FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Pengguna dapat melihat pengaturan aplikasi"
  ON pengaturan_aplikasi FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pengguna dapat mengelola pengaturan aplikasi"
  ON pengaturan_aplikasi FOR ALL
  TO authenticated
  USING (true);

-- Insert default settings
INSERT INTO pengaturan_aplikasi (kunci_pengaturan, nilai_pengaturan) VALUES
('nama_kota', 'Jakarta'),
('nama_bendahara', 'Nama Bendahara'),
('nama_pimpinan', 'Nama Pimpinan')
ON CONFLICT (kunci_pengaturan) DO NOTHING;

-- Insert default categories
INSERT INTO kategori (nama_kategori, deskripsi, tipe) VALUES
('Pendapatan Hibah', 'Hibah dari pemerintah atau lembaga donor', 'pemasukan'),
('Pendapatan Usaha', 'Pendapatan dari kegiatan usaha', 'pemasukan'),
('Belanja Operasional', 'Biaya operasional harian', 'pengeluaran'),
('Belanja Program', 'Biaya untuk program dan kegiatan', 'pengeluaran')
ON CONFLICT DO NOTHING;