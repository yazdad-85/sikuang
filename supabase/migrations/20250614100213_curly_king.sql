/*
  # Setup Database SIKUANG - Sistem Keuangan
  
  Jalankan script ini di Supabase SQL Editor untuk membuat semua tabel yang diperlukan.
  
  1. Tabel yang akan dibuat:
    - tahun_anggaran
    - kategori  
    - rencana_kegiatan
    - transaksi
    - pengaturan_aplikasi
    
  2. Security:
    - Enable RLS pada semua tabel
    - Buat policies untuk authenticated users
*/

-- Create ENUM types
DO $$ BEGIN
    CREATE TYPE tipe_kategori AS ENUM ('pemasukan', 'pengeluaran');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipe_transaksi AS ENUM ('pemasukan', 'pengeluaran');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Pengguna dapat melihat tahun anggaran" ON tahun_anggaran;
DROP POLICY IF EXISTS "Pengguna dapat mengelola tahun anggaran" ON tahun_anggaran;
DROP POLICY IF EXISTS "Pengguna dapat melihat kategori" ON kategori;
DROP POLICY IF EXISTS "Pengguna dapat mengelola kategori" ON kategori;
DROP POLICY IF EXISTS "Pengguna dapat melihat rencana kegiatan" ON rencana_kegiatan;
DROP POLICY IF EXISTS "Pengguna dapat mengelola rencana kegiatan" ON rencana_kegiatan;
DROP POLICY IF EXISTS "Pengguna dapat melihat transaksi" ON transaksi;
DROP POLICY IF EXISTS "Pengguna dapat mengelola transaksi" ON transaksi;
DROP POLICY IF EXISTS "Pengguna dapat melihat pengaturan aplikasi" ON pengaturan_aplikasi;
DROP POLICY IF EXISTS "Pengguna dapat mengelola pengaturan aplikasi" ON pengaturan_aplikasi;

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

-- Insert sample tahun anggaran
INSERT INTO tahun_anggaran (nama_tahun_anggaran, tanggal_mulai, tanggal_berakhir, is_aktif) VALUES
('TA 2024', '2024-01-01', '2024-12-31', true),
('TA 2025', '2025-01-01', '2025-12-31', false)
ON CONFLICT DO NOTHING;