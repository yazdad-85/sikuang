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

interface Transaksi {
  id: string;
  tanggal_transaksi: string;
  deskripsi_transaksi: string;
  tipe_transaksi: string;
  jumlah_transaksi: number;
  rencana_kegiatan: {
    nama_kegiatan: string;
  } | null;
}

export async function GET(req: NextRequest): Promise<Response> {
  console.log('🔍 GET /api/laporan/buku-kas-umum/export-pdf');
  
  try {
    const { searchParams } = new URL(req.url);
    const tahunAnggaranId = searchParams.get('tahunAnggaranId');
    const bulan = searchParams.get('bulan') || 'all';
    
    console.log('📌 Request parameters:', { tahunAnggaranId, bulan });
    
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
    
    if (!tahunAnggaranId) {
      return new NextResponse(JSON.stringify({ error: 'Tahun anggaran wajib diisi' }), { status: 400 });
    }

    // Debug: Log the tahunAnggaranId being queried
    console.log('🔍 Querying tahun_anggaran with ID:', tahunAnggaranId);
    
    // First, verify the ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tahunAnggaranId)) {
      console.error('❌ Invalid tahunAnggaranId format:', tahunAnggaranId);
      return new NextResponse(JSON.stringify({ 
        error: 'Format ID tahun anggaran tidak valid',
        tahunAnggaranId
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    let tahunData: TahunAnggaran | null = null;
    
    // First, try a direct query by ID
    console.log('🔍 Attempting to fetch tahun_anggaran by ID...');
    
    try {
      console.log('🔍 Fetching tahun_anggaran data...');
      
      // 1. First, try a simple query to check database connection
      console.log('🔍 Testing database connection...');
      const { count: totalYears, error: countError } = await supabase
        .from('tahun_anggaran')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('❌ Database connection test failed:', countError);
        throw new Error(`Tidak dapat terhubung ke database: ${countError.message}`);
      }
      
      console.log('✅ Database connection successful. Total years in database:', totalYears);
      
      // 2. Get all available years to check if our ID exists
      console.log('🔍 Fetching all available tahun_anggaran...');
      const { data: allYears, error: allYearsError } = await supabase
        .from('tahun_anggaran')
        .select('id, nama_tahun_anggaran, tanggal_mulai, tanggal_berakhir, is_aktif')
        .order('nama_tahun_anggaran', { ascending: false });
      
      if (allYearsError) {
        console.error('❌ Error fetching all tahun_anggaran:', allYearsError);
        throw new Error(`Gagal mengambil daftar tahun anggaran: ${allYearsError.message}`);
      }
      
      console.log('📋 All available tahun_anggaran:', allYears?.length ? allYears : 'None found');
      
      // 3. Check if the requested ID exists in the full list (case-sensitive comparison)
      const requestedYear = allYears?.find(y => y.id === tahunAnggaranId);
      
      if (!requestedYear) {
        console.error('❌ Requested year not found in database:', {
          requestedId: tahunAnggaranId,
          availableIds: allYears?.map(y => y.id)
        });
        throw new Error(`Tahun anggaran dengan ID ${tahunAnggaranId} tidak ditemukan.`);
      }
      
      // 4. If we found the year in the list, try to fetch it directly
      console.log(`🔍 Fetching specific tahun_anggaran with ID: ${tahunAnggaranId}`);
      const { data, error } = await supabase
        .from('tahun_anggaran')
        .select('*')
        .eq('id', tahunAnggaranId)
        .single();
      
      if (error) {
        console.error('❌ Error fetching specific tahun_anggaran:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        
        // If direct fetch fails but we found it in the list, use that data
        if (requestedYear) {
          console.log('⚠️ Using data from full list since direct fetch failed');
          tahunData = {
            id: requestedYear.id,
            nama_tahun_anggaran: requestedYear.nama_tahun_anggaran,
            tanggal_mulai: requestedYear.tanggal_mulai,
            tanggal_berakhir: requestedYear.tanggal_berakhir,
            is_aktif: requestedYear.is_aktif,
            created_at: '',
            updated_at: ''
          };
          console.log('✅ Using tahun_anggaran data from full list:', tahunData);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch year data directly' }),
            { 
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
        
        throw new Error(`Gagal mengambil detail tahun anggaran: ${error.message}`);
      }
      
      if (!data) {
        throw new Error(`Tahun anggaran dengan ID ${tahunAnggaranId} tidak ditemukan`);
      }
      
      // If we got here, we have the data
      tahunData = data as TahunAnggaran;
      console.log('✅ Tahun anggaran data:', {
        id: tahunData.id,
        nama: tahunData.nama_tahun_anggaran,
        tanggal_mulai: tahunData.tanggal_mulai,
        tanggal_berakhir: tahunData.tanggal_berakhir
      });
    } catch (error) {
      console.error('❌ Error in tahun_anggaran query:', error);
      return new NextResponse(JSON.stringify({ 
        error: 'Terjadi kesalahan saat memeriksa tahun anggaran',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'TAHUN_QUERY_ERROR'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      // 1. Get transactions data
      console.log('🔍 Fetching transactions data...');
      
      if (!tahunData) {
        throw new Error('Data tahun anggaran tidak ditemukan');
      }
      
      let query = supabase
        .from('transaksi')
        .select(`
          *,
          akun:akun_id(*),
          kategori:kategori_id(*),
          subkategori:subkategori_id(*),
          created_by_user:created_by(*),
          rencana_kegiatan:rencana_kegiatan_id(nama_kegiatan)
        `)
        .eq('tahun_anggaran_id', tahunAnggaranId)
        .order('tanggal_transaksi', { ascending: true });
      
      // Apply month filter if not 'all'
      if (bulan !== 'all') {
        const bulanNum = parseInt(bulan, 10);
        const startDate = new Date(tahunData.tanggal_mulai);
        startDate.setMonth(bulanNum - 1);
        
        const endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 1);
        
        query = query
          .gte('tanggal_transaksi', startDate.toISOString().split('T')[0])
          .lt('tanggal_transaksi', endDate.toISOString().split('T')[0]);
      }
      
      const { data: transaksiData, error: transaksiError } = await query;
      
      if (transaksiError) {
        console.error('❌ Error fetching transactions:', transaksiError);
        throw new Error(`Gagal mengambil data transaksi: ${transaksiError.message}`);
      }
      
      console.log(`✅ Fetched ${transaksiData?.length || 0} transactions`);
      
      // 2. Generate PDF
      console.log('📄 Generating PDF...');
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add title
      doc.setFontSize(16);
      doc.text('LAPORAN BUKU KAS UMUM', 105, 15, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Tahun Anggaran: ${tahunData.nama_tahun_anggaran}`, 105, 22, { align: 'center' });
      
      if (bulan !== 'all') {
        const bulanNama = new Date(2000, parseInt(bulan, 10) - 1, 1).toLocaleString('id-ID', { month: 'long' });
        doc.text(`Bulan: ${bulanNama}`, 105, 28, { align: 'center' });
      }
      
      // Add current date
      const today = new Date();
      const formattedDate = `${today.getDate()} ${new Date(2000, today.getMonth(), 1).toLocaleString('id-ID', { month: 'long' })} ${today.getFullYear()}`;
      doc.setFontSize(10);
      doc.text(`Dicetak pada: ${formattedDate}`, 15, 35);
      
      // Prepare table data
      const tableData = [];
      let saldo = 0;
      
      // Add table headers
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      
      // Set column widths
      const colWidths = [15, 25, 30, 70, 30, 30, 30];
      let x = 10;
      
      // Draw table headers
      const headers = ['No', 'Tanggal', 'Kode', 'Uraian', 'Penerimaan', 'Pengeluaran', 'Saldo'];
      headers.forEach((header, i) => {
        doc.rect(x, 45, colWidths[i], 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(header, x + 2, 51);
        x += colWidths[i];
      });
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      // Add table rows
      let y = 55;
      
      if (transaksiData && transaksiData.length > 0) {
        transaksiData.forEach((transaksi: any, index: number) => {
          const isPemasukan = transaksi.tipe === 'pemasukan';
          
          // Update saldo
          if (isPemasukan) {
            saldo += transaksi.jumlah || 0;
          } else {
            saldo -= transaksi.jumlah || 0;
          }
          
          // Check if we need a new page
          if (y > 180) {
            doc.addPage('a4', 'landscape');
            y = 30;
          }
          
          x = 10;
          
          // Draw cell borders and text
          doc.rect(x, y, colWidths[0], 10);
          doc.text((index + 1).toString(), x + 2, y + 7);
          x += colWidths[0];
          
          doc.rect(x, y, colWidths[1], 10);
          doc.text(new Date(transaksi.tanggal_transaksi).toLocaleDateString('id-ID'), x + 2, y + 7);
          x += colWidths[1];
          
          doc.rect(x, y, colWidths[2], 10);
          doc.text(transaksi.kode_transaksi || '-', x + 2, y + 7);
          x += colWidths[2];
          
          doc.rect(x, y, colWidths[3], 10);
          doc.text(transaksi.keterangan || '-', x + 2, y + 7);
          x += colWidths[3];
          
          doc.rect(x, y, colWidths[4], 10);
          doc.text(isPemasukan ? formatCurrency(transaksi.jumlah) : '', x + colWidths[4] - 4, y + 7, { align: 'right' });
          x += colWidths[4];
          
          doc.rect(x, y, colWidths[5], 10);
          doc.text(!isPemasukan ? formatCurrency(transaksi.jumlah) : '', x + colWidths[5] - 4, y + 7, { align: 'right' });
          x += colWidths[5];
          
          doc.rect(x, y, colWidths[6], 10);
          doc.text(formatCurrency(saldo), x + colWidths[6] - 4, y + 7, { align: 'right' });
          
          y += 10;
        });
        
        // Add totals row
        doc.setFont('helvetica', 'bold');
        doc.rect(10, y, 130, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text('TOTAL', 12, y + 7);
        
        // Calculate totals
        const totalPemasukan = transaksiData
          .filter((t: any) => t.tipe === 'pemasukan')
          .reduce((sum: number, t: any) => sum + (t.jumlah || 0), 0);
          
        const totalPengeluaran = transaksiData
          .filter((t: any) => t.tipe !== 'pemasukan')
          .reduce((sum: number, t: any) => sum + (t.jumlah || 0), 0);
        
        // Draw total cells
        x = 140;
        doc.rect(x, y, 30, 10, 'F');
        doc.text(formatCurrency(totalPemasukan), x + 26, y + 7, { align: 'right' });
        x += 30;
        
        doc.rect(x, y, 30, 10, 'F');
        doc.text(formatCurrency(totalPengeluaran), x + 26, y + 7, { align: 'right' });
        x += 30;
        
        doc.rect(x, y, 30, 10, 'F');
        doc.text(formatCurrency(saldo), x + 26, y + 7, { align: 'right' });
      } else {
        // No data message
        doc.setFont('helvetica', 'normal');
        doc.text('Tidak ada data transaksi', 15, 60);
      }
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      
      // Add page numbers
      const pageCount = doc.internal.pages.length;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(
          `Halaman ${i} dari ${pageCount}`,
          doc.internal.pageSize.width - 15,
          doc.internal.pageSize.height - 10,
          { align: 'right' }
        );
      }
      
      // Generate PDF buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      // Generate filename with current date
      const todayStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
      const bulanNama = bulan !== 'all' ? `_${new Date(2000, parseInt(bulan, 10) - 1, 1).toLocaleString('id-ID', { month: 'long' })}` : '';
      const filename = `Laporan_Buku_Kas_Umum_${tahunData.nama_tahun_anggaran.replace(/\s+/g, '_')}${bulanNama}_${todayStr}.pdf`;
      
      console.log('✅ PDF generated successfully');
      
      // Return the PDF
      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      });
      
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      return new NextResponse(JSON.stringify({ 
        error: 'Terjadi kesalahan saat membuat laporan PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'PDF_GENERATION_ERROR'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Export PDF error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Terjadi kesalahan saat mengekspor PDF',
        details: error instanceof Error ? error.message : String(error)
      }), 
      { status: 500 }
    );
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return '-';
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

function bulanName(bulan: string): string {
  const months = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return bulan === 'all' ? 'Semua Bulan' : (months[parseInt(bulan, 10)] || bulan);
}
