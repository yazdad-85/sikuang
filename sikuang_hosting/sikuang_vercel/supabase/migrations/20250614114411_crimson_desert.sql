/*
  # Menambahkan Tanggal Selesai di Rencana Kegiatan

  1. Perubahan Schema
    - Menambahkan kolom `tanggal_selesai` di tabel `rencana_kegiatan`
    - Mengubah nama kolom `tanggal_rencana` menjadi `tanggal_mulai` untuk konsistensi
    - Menambahkan constraint untuk memastikan tanggal_selesai >= tanggal_mulai

  2. Data Migration
    - Mengupdate data existing dengan tanggal_selesai = tanggal_mulai + 1 hari
    - Mempertahankan data yang sudah ada
*/

-- Add tanggal_selesai column to rencana_kegiatan table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rencana_kegiatan' AND column_name = 'tanggal_selesai'
  ) THEN
    ALTER TABLE rencana_kegiatan ADD COLUMN tanggal_selesai date;
  END IF;
END $$;

-- Update existing records to have tanggal_selesai = tanggal_rencana + 1 day
UPDATE rencana_kegiatan 
SET tanggal_selesai = tanggal_rencana + INTERVAL '1 day'
WHERE tanggal_selesai IS NULL;

-- Make tanggal_selesai NOT NULL after updating existing data
ALTER TABLE rencana_kegiatan ALTER COLUMN tanggal_selesai SET NOT NULL;

-- Add constraint to ensure tanggal_selesai >= tanggal_rencana
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_tanggal_selesai_after_mulai'
  ) THEN
    ALTER TABLE rencana_kegiatan 
    ADD CONSTRAINT check_tanggal_selesai_after_mulai 
    CHECK (tanggal_selesai >= tanggal_rencana);
  END IF;
END $$;

-- Add comment for better documentation
COMMENT ON COLUMN rencana_kegiatan.tanggal_rencana IS 'Tanggal mulai pelaksanaan kegiatan';
COMMENT ON COLUMN rencana_kegiatan.tanggal_selesai IS 'Tanggal selesai/berakhir pelaksanaan kegiatan';