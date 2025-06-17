import { supabase, testDatabaseConnection } from '@/lib/supabase';

export async function testConnection() {
  console.log('Testing Supabase connection...');
  
  // Test basic connection
  const connectionTest = await testDatabaseConnection();
  console.log('Connection test result:', connectionTest);

  console.log('Starting database connection test...');

  // Test tahun_anggaran query
  const { data: tahunData, error: tahunError } = await supabase
    .from('tahun_anggaran')
    .select('*')
    .order('nama_tahun_anggaran', { ascending: false });
  console.log('Tahun anggaran test:', {
    success: !tahunError,
    count: tahunData?.length || 0,
    data: tahunData,
    error: tahunError
  });

  // Test kategori query
  const { data: kategoriData, error: kategoriError } = await supabase
    .from('kategori')
    .select('*');
  console.log('Kategori test:', {
    success: !kategoriError,
    count: kategoriData?.length || 0,
    data: kategoriData,
    error: kategoriError
  });

  // Test rencana_kegiatan query with relations
  const { data: rencanaData, error: rencanaError } = await supabase
    .from('rencana_kegiatan')
    .select(`
      *,
      tahun_anggaran:tahun_anggaran_id(nama_tahun_anggaran),
      kategori:kategori_id(nama_kategori, tipe)
    `);
  console.log('Rencana kegiatan test:', {
    success: !rencanaError,
    count: rencanaData?.length || 0,
    data: rencanaData,
    error: rencanaError
  });

  // Test transaksi query with relations
  const { data: transaksiData, error: transaksiError } = await supabase
    .from('transaksi')
    .select(`
      *,
      rencana_kegiatan:rencana_kegiatan_id(
        nama_kegiatan,
        tahun_anggaran:tahun_anggaran_id(nama_tahun_anggaran),
        kategori:kategori_id(nama_kategori, tipe)
      )
    `);
  console.log('Transaksi test:', {
    success: !transaksiError,
    count: transaksiData?.length || 0,
    data: transaksiData,
    error: transaksiError
  });

  console.log('Database connection test completed.');

  return {
    connection: connectionTest,
    tahunAnggaran: { data: tahunData, error: tahunError },
    kategori: { data: kategoriData, error: kategoriError },
    rencanaKegiatan: { data: rencanaData, error: rencanaError },
    transaksi: { data: transaksiData, error: transaksiError }
  };
}
