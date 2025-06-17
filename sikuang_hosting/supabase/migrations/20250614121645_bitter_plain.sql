/*
  # Add tanggal_selesai column to rencana_kegiatan

  1. Changes
    - Add `tanggal_selesai` column to `rencana_kegiatan` table
    - Update existing records with default values
    - Add constraint to ensure tanggal_selesai >= tanggal_rencana
    - Add proper comments for documentation

  2. Security
    - No changes to RLS policies needed
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
    AND table_name = 'rencana_kegiatan'
  ) THEN
    ALTER TABLE rencana_kegiatan 
    ADD CONSTRAINT check_tanggal_selesai_after_mulai 
    CHECK (tanggal_selesai >= tanggal_rencana);
  END IF;
END $$;

-- Add comments for better documentation
COMMENT ON COLUMN rencana_kegiatan.tanggal_rencana IS 'Tanggal mulai pelaksanaan kegiatan';
COMMENT ON COLUMN rencana_kegiatan.tanggal_selesai IS 'Tanggal selesai/berakhir pelaksanaan kegiatan';