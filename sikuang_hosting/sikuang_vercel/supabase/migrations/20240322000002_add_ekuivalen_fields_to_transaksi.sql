-- Add ekuivalen fields to transaksi table
ALTER TABLE transaksi
ADD COLUMN ekuivalen_1 numeric(10,2),
ADD COLUMN ekuivalen_1_satuan varchar(50),
ADD COLUMN ekuivalen_2 numeric(10,2),
ADD COLUMN ekuivalen_2_satuan varchar(50),
ADD COLUMN ekuivalen_3 numeric(10,2),
ADD COLUMN ekuivalen_3_satuan varchar(50),
ADD COLUMN harga_satuan numeric(10,2);

-- Update existing records to set ekuivalen_1 and harga_satuan based on jumlah_transaksi
UPDATE transaksi
SET 
  ekuivalen_1 = 1,
  ekuivalen_1_satuan = 'paket',
  harga_satuan = jumlah_transaksi
WHERE ekuivalen_1 IS NULL;

-- Add a trigger to automatically calculate jumlah_transaksi
CREATE OR REPLACE FUNCTION calculate_jumlah_transaksi()
RETURNS TRIGGER AS $$
BEGIN
  NEW.jumlah_transaksi = 
    COALESCE(NEW.ekuivalen_1, 1) * 
    COALESCE(NEW.ekuivalen_2, 1) * 
    COALESCE(NEW.ekuivalen_3, 1) * 
    COALESCE(NEW.harga_satuan, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_calculate_jumlah_transaksi
BEFORE INSERT OR UPDATE ON transaksi
FOR EACH ROW
EXECUTE FUNCTION calculate_jumlah_transaksi();

-- Add comments for documentation
COMMENT ON COLUMN transaksi.ekuivalen_1 IS 'Jumlah unit pertama (contoh: jumlah paket)';
COMMENT ON COLUMN transaksi.ekuivalen_1_satuan IS 'Satuan untuk unit pertama (contoh: paket, orang)';
COMMENT ON COLUMN transaksi.ekuivalen_2 IS 'Jumlah unit kedua (opsional, contoh: jumlah orang)';
COMMENT ON COLUMN transaksi.ekuivalen_2_satuan IS 'Satuan untuk unit kedua';
COMMENT ON COLUMN transaksi.ekuivalen_3 IS 'Jumlah unit ketiga (opsional)';
COMMENT ON COLUMN transaksi.ekuivalen_3_satuan IS 'Satuan untuk unit ketiga';
COMMENT ON COLUMN transaksi.harga_satuan IS 'Harga per satuan';
