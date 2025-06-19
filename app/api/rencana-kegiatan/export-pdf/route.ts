import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const tahunAnggaranId = searchParams.get('tahunAnggaranId');
    const kategoriId = searchParams.get('kategoriId');
    const bulan = searchParams.get('bulan') || 'all';

    if (!tahunAnggaranId) {
      return new Response(
        JSON.stringify({ error: 'Tahun anggaran wajib diisi' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Ambil data tahun anggaran
    const { data: tahunDataList, error: tahunError } = await supabase
      .from('tahun_anggaran')
      .select('*')
      .eq('id', tahunAnggaranId)
      .order('nama_tahun_anggaran', { ascending: false });

    if (tahunError || !tahunDataList || tahunDataList.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Tahun anggaran tidak ditemukan' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const tahunData = tahunDataList[0];

    // Ambil data rencana kegiatan
    let query = supabase
      .from('rencana_kegiatan')
      .select(`
        *,
        tahun_anggaran:tahun_anggaran_id(nama_tahun_anggaran),
        kategori:kategori_id(nama_kategori, tipe)
      `)
      .eq('tahun_anggaran_id', tahunAnggaranId)
      .order('tanggal_rencana', { ascending: true });

    if (kategoriId && kategoriId !== 'all') {
      query = query.eq('kategori_id', kategoriId);
    }

    if (bulan !== 'all') {
      const bulanNum = parseInt(bulan, 10);
      const startDate = new Date(tahunData.tanggal_mulai);
      startDate.setMonth(bulanNum - 1);
      const endDate = new Date(startDate);
      endDate.setMonth(startDate.getMonth() + 1);
      query = query
        .gte('tanggal_rencana', startDate.toISOString().split('T')[0])
        .lt('tanggal_rencana', endDate.toISOString().split('T')[0]);
    }

    const { data: rencanaData, error: rencanaError } = await query;

    if (rencanaError) {
      return new Response(
        JSON.stringify({ error: 'Gagal mengambil data rencana kegiatan' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ tahunData, rencanaData }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan yang tidak terduga' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
