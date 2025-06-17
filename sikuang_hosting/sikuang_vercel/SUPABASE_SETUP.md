# 📋 Panduan Setup Supabase untuk SIKUANG

## 🎯 Yang Perlu Anda Lakukan di Supabase Dashboard

### 1. **Buka Supabase Dashboard**
- Kunjungi: https://eyjivvijimklgngrmcws.supabase.co
- Login dengan akun Supabase Anda

### 2. **Jalankan Migrasi Database**
Buka **SQL Editor** di dashboard Supabase dan jalankan script berikut secara berurutan:

#### **Script 1: Setup Database Schema**
```sql
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
  tanggal_selesai date NOT NULL,
  jumlah_rencana numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT check_tanggal_selesai_after_mulai CHECK (tanggal_selesai >= tanggal_rencana)
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
```

#### **Script 2: Setup Row Level Security (RLS)**
```sql
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
```

#### **Script 3: Insert Data Default**
```sql
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
```

### 3. **Setup Authentication**
Di dashboard Supabase:

1. **Buka Authentication > Settings**
2. **Disable Email Confirmation:**
   - Scroll ke "Email Confirmation"
   - Uncheck "Enable email confirmations"
   - Save changes

3. **Setup Email Templates (Opsional):**
   - Buka Authentication > Email Templates
   - Customize sesuai kebutuhan

### 4. **Setup Storage (Untuk Upload Bukti Transaksi)**
1. **Buka Storage**
2. **Create New Bucket:**
   - Name: `documents`
   - Public: `true`
3. **Setup Policies:**
   ```sql
   -- Allow authenticated users to upload files
   CREATE POLICY "Authenticated users can upload files"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'documents');

   -- Allow authenticated users to view files
   CREATE POLICY "Authenticated users can view files"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'documents');

   -- Allow authenticated users to delete their files
   CREATE POLICY "Authenticated users can delete files"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (bucket_id = 'documents');
   ```

### 5. **Verifikasi Setup**
Setelah menjalankan semua script, verifikasi bahwa:

✅ **Tables Created:**
- tahun_anggaran
- kategori  
- rencana_kegiatan
- transaksi
- pengaturan_aplikasi

✅ **RLS Enabled:** Semua tabel memiliki RLS aktif

✅ **Policies Created:** Setiap tabel memiliki policies untuk authenticated users

✅ **Default Data:** Data default sudah ter-insert

## 🚀 **Langkah Selanjutnya**

1. **Login ke Aplikasi:**
   - Email: `admin@sikuang.com`
   - Password: `admin123`
   - (Akun akan dibuat otomatis saat pertama login)

2. **Test Fitur:**
   - Buat tahun anggaran baru
   - Tambah kategori
   - Buat rencana kegiatan dengan periode pelaksanaan
   - Input transaksi
   - Generate laporan

## 🔧 **Troubleshooting**

### **Jika Ada Error "relation does not exist":**
- Pastikan semua script SQL sudah dijalankan
- Check di Table Editor apakah semua tabel sudah terbuat

### **Jika Login Gagal:**
- Pastikan email confirmation sudah di-disable
- Coba buat akun manual di Authentication > Users

### **Jika Upload File Gagal:**
- Pastikan bucket `documents` sudah dibuat
- Check storage policies sudah di-setup

## 📞 **Butuh Bantuan?**
Jika mengalami kesulitan, silakan tanyakan dan saya akan membantu troubleshooting!