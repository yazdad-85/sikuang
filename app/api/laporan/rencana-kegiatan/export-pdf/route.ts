import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Log environment variables (safely)
console.log('🔍 Environment:', {
  nodeEnv: process.env.NODE_ENV,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
});

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface TahunAnggaran {
  id: string;
  nama_tahun_anggaran: string;
  tanggal_mulai: string;
  tanggal_berakhir: string;
  is_aktif: boolean;
  created_at: string;
  updated_at: string;
}

interface RencanaKegiatan {
  id: string;
  nama_kegiatan: string;
  deskripsi_kegiatan: string | null;
  tanggal_rencana: string;
  tanggal_selesai: string;
  ekuivalen_1: number;
  ekuivalen_1_satuan: string;
  ekuivalen_2: number | null;
  ekuivalen_2_satuan: string | null;
  ekuivalen_3: number | null;
  ekuivalen_3_satuan: string | null;
  harga_satuan: number;
  jumlah_rencana: number;
  tahun_anggaran: {
    nama_tahun_anggaran: string;
  };
  kategori: {
    nama_kategori: string;
    tipe: string;
  };
}

export async function GET(req: NextRequest): Promise<Response> {
  console.log('🔍 GET /api/laporan/rencana-kegiatan/export-pdf');
  
  try {
    const { searchParams } = new URL(req.url);
    const tahunAnggaranId = searchParams.get('tahunAnggaranId');
    const kategoriId = searchParams.get('kategoriId');
    const bulan = searchParams.get('bulan') || 'all';
    
    console.log('📌 Request parameters:', { tahunAnggaranId, kategoriId, bulan });
    
    if (!tahunAnggaranId) {
      console.error('❌ Missing tahunAnggaranId');
      return new Response(
        JSON.stringify({ error: 'Tahun anggaran wajib diisi' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get tahun anggaran data
    console.log('🔍 Fetching tahun_anggaran data...');
    const { data: tahunData, error: tahunError } = await supabase
      .from('tahun_anggaran')
      .select('*')
      .eq('id', tahunAnggaranId)
      .single();
    
    if (tahunError) {
      console.error('❌ Error fetching tahun_anggaran:', tahunError);
      return new Response(JSON.stringify({ 
        error: 'Gagal mengambil data tahun anggaran',
        details: tahunError.message
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!tahunData) {
      return new Response(JSON.stringify({ 
        error: 'Tahun anggaran tidak ditemukan'
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Tahun anggaran data:', tahunData);

    // Get rencana kegiatan data
    console.log('🔍 Fetching rencana kegiatan data...');
    
    let query = supabase
      .from('rencana_kegiatan')
      .select(`
        *,
        tahun_anggaran:tahun_anggaran_id(nama_tahun_anggaran),
        kategori:kategori_id(nama_kategori, tipe)
      `)
      .eq('tahun_anggaran_id', tahunAnggaranId)
      .order('tanggal_rencana', { ascending: true });
    
    // Apply kategori filter if provided
    if (kategoriId && kategoriId !== 'all') {
      query = query.eq('kategori_id', kategoriId);
    }
    
    // Apply month filter if not 'all'
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
      console.error('❌ Error fetching rencana kegiatan:', rencanaError);
      return new Response(JSON.stringify({ 
        error: 'Gagal mengambil data rencana kegiatan',
        details: rencanaError.message
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`✅ Fetched ${rencanaData?.length || 0} rencana kegiatan`);
    
    // Generate PDF
    console.log('📄 Generating PDF...');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(16);
    doc.text('LAPORAN RENCANA KEGIATAN', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Tahun Anggaran: ${tahunData.nama_tahun_anggaran}`, 105, 30, { align: 'center' });
    
    if (bulan !== 'all') {
      const bulanNama = new Date(2000, parseInt(bulan, 10) - 1, 1).toLocaleString('id-ID', { month: 'long' });
      doc.text(`Bulan: ${bulanNama}`, 105, 37, { align: 'center' });
    }
    
    if (kategoriId && kategoriId !== 'all') {
      const kategori = rencanaData?.[0]?.kategori?.nama_kategori || 'Kategori Tertentu';
      doc.text(`Kategori: ${kategori}`, 105, 44, { align: 'center' });
    }
    
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 105, 51, { align: 'center' });
    
    // Add table
    if (rencanaData && rencanaData.length > 0) {
      const tableData = rencanaData.map((item, index) => [
        index + 1,
        item.nama_kegiatan,
        item.kategori?.nama_kategori || '-',
        formatDate(item.tanggal_rencana),
        formatDate(item.tanggal_selesai),
        formatEkuivalen(item),
        formatCurrency(item.jumlah_rencana)
      ]);
      
      doc.autoTable({
        startY: 60,
        head: [['No', 'Nama Kegiatan', 'Kategori', 'Tanggal Mulai', 'Tanggal Selesai', 'Rincian', 'Total (Rp)']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontSize: 10
        },
        styles: {
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 50 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 30 },
          6: { cellWidth: 25 }
        }
      });
      
      // Add summary
      const totalRencana = rencanaData.reduce((sum, item) => sum + (item.jumlah_rencana || 0), 0);
      const totalPemasukan = rencanaData
        .filter(item => item.kategori?.tipe === 'pemasukan')
        .reduce((sum, item) => sum + (item.jumlah_rencana || 0), 0);
      const totalPengeluaran = rencanaData
        .filter(item => item.kategori?.tipe === 'pengeluaran')
        .reduce((sum, item) => sum + (item.jumlah_rencana || 0), 0);
      
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      
      doc.setFontSize(12);
      doc.text('Ringkasan:', 20, finalY);
      doc.setFontSize(10);
      doc.text(`Total Rencana: ${formatCurrency(totalRencana)}`, 20, finalY + 8);
      doc.text(`Total Pemasukan: ${formatCurrency(totalPemasukan)}`, 20, finalY + 16);
      doc.text(`Total Pengeluaran: ${formatCurrency(totalPengeluaran)}`, 20, finalY + 24);
      doc.text(`Saldo: ${formatCurrency(totalPemasukan - totalPengeluaran)}`, 20, finalY + 32);
    } else {
      doc.setFontSize(12);
      doc.text('Tidak ada data rencana kegiatan untuk periode yang dipilih.', 105, 80, { align: 'center' });
    }
    
    // Return the PDF
    const pdfBuffer = doc.output('arraybuffer');
    
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="laporan-rencana-kegiatan-${tahunData.nama_tahun_anggaran}.pdf"`
      }
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Terjadi kesalahan yang tidak terduga',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatEkuivalen(item: RencanaKegiatan): string {
  const parts = [];
  
  if (item.ekuivalen_1) {
    parts.push(`${item.ekuivalen_1} ${item.ekuivalen_1_satuan}`);
  }
  
  if (item.ekuivalen_2) {
    parts.push(`${item.ekuivalen_2} ${item.ekuivalen_2_satuan}`);
  }
  
  if (item.ekuivalen_3) {
    parts.push(`${item.ekuivalen_3} ${item.ekuivalen_3_satuan}`);
  }
  
  if (item.harga_satuan) {
    parts.push(`@ ${formatCurrency(item.harga_satuan)}`);
  }
  
  return parts.join(' × ');
} 