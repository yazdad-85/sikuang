
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase, PengaturanAplikasi } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateLong, formatMonthYear } from '@/lib/utils/date';
import { toast } from 'sonner';
import { FileDown, FileSpreadsheet, TrendingUp, TrendingDown, Wallet, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { getDateRangeFilter, validateDateRange } from '@/lib/dateFilter';

interface NeracaData {
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoKas: number;
  pemasukankategori: Array<{ nama_kategori: string; total: number }>;
  pengeluaranKategori: Array<{ nama_kategori: string; total: number }>;
}

export default function NeracaKeuanganPage() {
  const [neracaData, setNeracaData] = useState<NeracaData>({
    totalPemasukan: 0,
    totalPengeluaran: 0,
    saldoKas: 0,
    pemasukankategori: [],
    pengeluaranKategori: [],
  });
  const [pengaturan, setPengaturan] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [tahunAnggaran, setTahunAnggaran] = useState<any[]>([]);
  const [selectedTahun, setSelectedTahun] = useState<string>('');
  const [selectedBulan, setSelectedBulan] = useState<string>((new Date().getMonth() + 1).toString());
  const [filters, setFilters] = useState({
    bulan: new Date().getMonth() + 1,
    tahun: new Date().getFullYear(),
    tanggal_mulai: '',
    tanggal_akhir: '',
  });
  const [dateRangeValid, setDateRangeValid] = useState(true);

  useEffect(() => {
    if (filters.tanggal_mulai && filters.tanggal_akhir) {
      setDateRangeValid(validateDateRange(filters.tanggal_mulai, filters.tanggal_akhir));
    } else {
      setDateRangeValid(true);
    }
  }, [filters.tanggal_mulai, filters.tanggal_akhir]);

  // Fetch tahun anggaran on component mount
  useEffect(() => {
    const fetchTahunAnggaran = async () => {
      try {
        const { data, error } = await supabase
          .from('tahun_anggaran')
          .select('*')
          .order('nama_tahun_anggaran', { ascending: false });

        if (error) throw error;

        setTahunAnggaran(data || []);
        if (data && data.length > 0) {
          const activeYear = data.find(item => item.is_aktif) || data[0];
          setSelectedTahun(activeYear.id);
          
          // Extract year from nama_tahun_anggaran (e.g., "TA 2024/2025" -> 2024)
          const yearMatch = activeYear.nama_tahun_anggaran.match(/\d{4}/);
          if (yearMatch) {
            setFilters(prev => ({
              ...prev,
              tahun: parseInt(yearMatch[0], 10)
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching tahun anggaran:', error);
        toast.error('Gagal memuat data tahun anggaran');
      }
    };

    fetchTahunAnggaran();
  }, []);

  // Fetch data when filters or selectedTahun changes
  useEffect(() => {
    if (dateRangeValid && selectedTahun) {
      fetchData();
    }
  }, [filters, dateRangeValid, selectedTahun]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch pengaturan
      const { data: pengaturanData, error: pengaturanError } = await supabase
        .from('pengaturan_aplikasi')
        .select('*');

      if (pengaturanError) throw pengaturanError;

      const pengaturanMap: Record<string, string> = {};
      pengaturanData?.forEach((item) => {
        pengaturanMap[item.kunci_pengaturan] = item.nilai_pengaturan;
      });
      setPengaturan(pengaturanMap);

      // Build date filter using utility
      const { startDate, endDate } = getDateRangeFilter(
        filters.tahun,
        filters.bulan,
        filters.tanggal_mulai || null,
        filters.tanggal_akhir || null
      );

      // Fetch total pemasukan dan pengeluaran
      const { data: totalData, error: totalError } = await supabase
        .from('transaksi')
        .select('tipe_transaksi, jumlah_transaksi')
        .or(`tipe_transaksi.eq.pemasukan,tipe_transaksi.eq.pengeluaran`)
        .gte('tanggal_transaksi', startDate)
        .lte('tanggal_transaksi', endDate);

      if (totalError) throw totalError;

      const totalPemasukan = totalData
        ?.filter(t => t.tipe_transaksi === 'pemasukan')
        .reduce((sum, t) => sum + Number(t.jumlah_transaksi), 0) || 0;

      const totalPengeluaran = totalData
        ?.filter(t => t.tipe_transaksi === 'pengeluaran')
        .reduce((sum, t) => sum + Number(t.jumlah_transaksi), 0) || 0;

      // Fetch pemasukan per kategori
      const { data: pemasukanData, error: pemasukanError } = await supabase
        .from('transaksi')
        .select(`
          jumlah_transaksi,
          rencana_kegiatan:rencana_kegiatan_id(
            kategori:kategori_id(nama_kategori)
          )
        `)
        .eq('tipe_transaksi', 'pemasukan')
        .gte('tanggal_transaksi', startDate)
        .lte('tanggal_transaksi', endDate);

      if (pemasukanError) throw pemasukanError;

      // Fetch pengeluaran per kategori
      const { data: pengeluaranData, error: pengeluaranError } = await supabase
        .from('transaksi')
        .select(`
          jumlah_transaksi,
          rencana_kegiatan:rencana_kegiatan_id(
            kategori:kategori_id(nama_kategori)
          )
        `)
        .eq('tipe_transaksi', 'pengeluaran')
        .gte('tanggal_transaksi', startDate)
        .lte('tanggal_transaksi', endDate);

      if (pengeluaranError) throw pengeluaranError;

      // Group by kategori
      const pemasukanKategori: Record<string, number> = {};
      pemasukanData?.forEach((item) => {
        const kategori = item.rencana_kegiatan?.[0]?.kategori?.[0]?.nama_kategori || 'Lainnya';
        pemasukanKategori[kategori] = (pemasukanKategori[kategori] || 0) + Number(item.jumlah_transaksi);
      });

      const pengeluaranKategori: Record<string, number> = {};
      pengeluaranData?.forEach((item) => {
        const kategori = item.rencana_kegiatan?.[0]?.kategori?.[0]?.nama_kategori || 'Lainnya';
        pengeluaranKategori[kategori] = (pengeluaranKategori[kategori] || 0) + Number(item.jumlah_transaksi);
      });

      setNeracaData({
        totalPemasukan,
        totalPengeluaran,
        saldoKas: totalPemasukan - totalPengeluaran,
        pemasukankategori: Object.entries(pemasukanKategori).map(([nama_kategori, total]) => ({ nama_kategori, total })),
        pengeluaranKategori: Object.entries(pengeluaranKategori).map(([nama_kategori, total]) => ({ nama_kategori, total })),
      });
    } catch (error) {
      toast.error('Gagal memuat data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodText = () => {
    if (filters.tanggal_mulai && filters.tanggal_akhir) {
      return `${new Date(filters.tanggal_mulai).toLocaleDateString('id-ID')} - ${new Date(filters.tanggal_akhir).toLocaleDateString('id-ID')}`;
    }
    const selectedTahunData = tahunAnggaran.find(t => t.id === selectedTahun);
    const tahunText = selectedTahunData?.nama_tahun_anggaran || filters.tahun.toString();
    const bulanText = new Date(2000, parseInt(selectedBulan) - 1).toLocaleString('id-ID', { month: 'long' });
    return `${bulanText} ${tahunText}`;
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      
      // Ensure we have the latest data
      await fetchData();
      
      // Check if we have data to export
      if (!neracaData || (!neracaData.totalPemasukan && !neracaData.totalPengeluaran)) {
        toast.warning('Tidak ada data untuk diekspor');
        return;
      }
      
      // Prepare data for Excel
      const data = [
        ['NERACA KEUANGAN'],
        [`Periode: ${getPeriodText()}`],
        [], // empty row
        ['ASET'],
        ['Kas dan Setara Kas', '', formatCurrency(neracaData.saldoKas || 0)],
        ['TOTAL ASET', '', formatCurrency(neracaData.saldoKas || 0)],
        [], // empty row
        ['PENDAPATAN']
      ];

      // Add income categories
      if (neracaData.pemasukankategori && neracaData.pemasukankategori.length > 0) {
        neracaData.pemasukankategori.forEach(item => {
          data.push([item.nama_kategori, formatCurrency(item.total || 0), '']);
        });
      } else {
        data.push(['Tidak ada data pemasukan', '', '']);
      }
      
      data.push(['TOTAL PENDAPATAN', formatCurrency(neracaData.totalPemasukan || 0), '']);
      data.push([], ['PENGELUARAN']);
      
      // Add expense categories
      if (neracaData.pengeluaranKategori && neracaData.pengeluaranKategori.length > 0) {
        neracaData.pengeluaranKategori.forEach(item => {
          data.push([item.nama_kategori, formatCurrency(item.total || 0), '']);
        });
      } else {
        data.push(['Tidak ada data pengeluaran', '', '']);
      }
      
      data.push(['TOTAL PENGELUARAN', formatCurrency(neracaData.totalPengeluaran || 0), '']);
      data.push([], ['SALDO BERSIH', '', formatCurrency(neracaData.saldoKas || 0)]);

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // Set column widths
      const colWidths = [
        { wch: 30 }, // Kategori
        { wch: 20 }, // Jumlah
        { wch: 20 }, // Total
      ];
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Neraca Keuangan');
      
      // Generate Excel file
      const fileName = `neraca-keuangan-${getPeriodText().replace(/\s/g, '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('File Excel berhasil diunduh');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Gagal mengekspor ke Excel');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      // Ensure we have the latest data
      await fetchData();
      
      // Check if we have data to export
      if (!neracaData || (!neracaData.totalPemasukan && !neracaData.totalPengeluaran)) {
        toast.warning('Tidak ada data untuk diekspor');
        return;
      }
      
      const pdf = new jsPDF();
      
      // Header
      pdf.setFontSize(16);
      pdf.text('NERACA KEUANGAN', 105, 20, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text(`Periode: ${getPeriodText()}`, 105, 30, { align: 'center' });
      
      // Date and location
      const today = new Date();
      const cityName = pengaturan.nama_kota || 'Jakarta';
      const dateText = `${cityName}, ${formatDateLong(today)}`;
      pdf.text(dateText, 200, 45, { align: 'right' });
      
      let yPos = 60;
      
      // ASET
      pdf.setFontSize(14);
      pdf.text('ASET', 15, yPos);
      yPos += 10;
      
      pdf.setFontSize(12);
      pdf.text('Kas dan Setara Kas:', 20, yPos);
      pdf.text(formatCurrency(neracaData.saldoKas || 0), 150, yPos, { align: 'right' });
      yPos += 10;
      
      pdf.text('TOTAL ASET:', 20, yPos);
      pdf.text(formatCurrency(neracaData.saldoKas || 0), 150, yPos, { align: 'right' });
      yPos += 20;
      
      // PENDAPATAN
      pdf.setFontSize(14);
      pdf.text('PENDAPATAN', 15, yPos);
      yPos += 10;
      
      // Add income categories
      if (neracaData.pemasukankategori && neracaData.pemasukankategori.length > 0) {
        pdf.setFontSize(12);
        neracaData.pemasukankategori.forEach((item) => {
          pdf.text(`- ${item.nama_kategori}`, 20, yPos);
          pdf.text(formatCurrency(item.total || 0), 150, yPos, { align: 'right' });
          yPos += 8;
        });
      } else {
        pdf.setFontSize(12);
        pdf.text('Tidak ada data pemasukan', 20, yPos);
        yPos += 8;
      }
      
      // Add total income
      pdf.setFont('helvetica', 'bold');
      pdf.text('TOTAL PENDAPATAN', 20, yPos);
      pdf.text(formatCurrency(neracaData.totalPemasukan || 0), 150, yPos, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      yPos += 15;
      
      // PENGELUARAN
      pdf.setFontSize(14);
      pdf.text('PENGELUARAN', 15, yPos);
      yPos += 10;
      
      // Add expense categories
      if (neracaData.pengeluaranKategori && neracaData.pengeluaranKategori.length > 0) {
        pdf.setFontSize(12);
        neracaData.pengeluaranKategori.forEach((item) => {
          pdf.text(`- ${item.nama_kategori}`, 20, yPos);
          pdf.text(formatCurrency(item.total || 0), 150, yPos, { align: 'right' });
          yPos += 8;
        });
      } else {
        pdf.setFontSize(12);
        pdf.text('Tidak ada data pengeluaran', 20, yPos);
        yPos += 8;
      }
      
      // Add total expenses
      pdf.setFont('helvetica', 'bold');
      pdf.text('TOTAL PENGELUARAN', 20, yPos);
      pdf.text(formatCurrency(neracaData.totalPengeluaran || 0), 150, yPos, { align: 'right' });
      yPos += 15;
      
      // SALDO BERSIH
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SALDO BERSIH', 15, yPos);
      pdf.text(formatCurrency(neracaData.saldoKas || 0), 150, yPos, { align: 'right' });
      yPos += 20;
      
      // Add signature section if there's enough space
      if (yPos < 250) {
        const signatureY = Math.max(250, yPos + 20);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Mengetahui,', 40, signatureY);
        pdf.text(pengaturan.nama_pimpinan || 'Pimpinan', 40, signatureY + 20);
        
        pdf.text('Bendahara', 160, signatureY);
        pdf.text(pengaturan.nama_bendahara || 'Bendahara', 160, signatureY + 20);
      }
      
      // Add page numbers
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.text(`Halaman ${i} dari ${pageCount}`, 105, 287, { align: 'center' });
      }
      
      // Save the PDF
      const fileName = `neraca-keuangan-${getPeriodText().replace(/\s/g, '-')}.pdf`;
      pdf.save(fileName);
      
      toast.success('File PDF berhasil diunduh');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Gagal mengekspor ke PDF');
    } finally {
      setExporting(false);
    }
  };

  // Handle bulan change
  const handleBulanChange = (value: string) => {
    setSelectedBulan(value);
    setFilters(prev => ({
      ...prev,
      bulan: parseInt(value, 10)
    }));
  };

  // Handle tahun anggaran change
  const handleTahunAnggaranChange = (value: string) => {
    setSelectedTahun(value);
    const tahunData = tahunAnggaran.find(t => t.id === value);
    if (tahunData) {
      const yearMatch = tahunData.nama_tahun_anggaran.match(/\d{4}/);
      if (yearMatch) {
        setFilters(prev => ({
          ...prev,
          tahun: parseInt(yearMatch[0], 10)
        }));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Neraca Keuangan</h1>
            <p className="text-muted-foreground">Laporan posisi keuangan organisasi</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="space-y-1">
              <Label htmlFor="tahun-anggaran">Tahun Anggaran</Label>
              <Select value={selectedTahun} onValueChange={handleTahunAnggaranChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Pilih Tahun Anggaran" />
                </SelectTrigger>
                <SelectContent>
                  {tahunAnggaran.map((tahun) => (
                    <SelectItem key={tahun.id} value={tahun.id}>
                      {tahun.nama_tahun_anggaran}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="bulan">Bulan</Label>
              <Select value={selectedBulan} onValueChange={handleBulanChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = new Date(0, i).toLocaleString('id-ID', { month: 'long' });
                    return (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {month}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Periode: {getPeriodText()}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={exportToPDF} 
              disabled={exporting || loading}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {exporting ? 'Mengekspor...' : 'PDF'}
            </Button>
            <Button 
              variant="outline" 
              onClick={exportToExcel} 
              disabled={exporting || loading}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Keuangan</CardTitle>
          <CardDescription>Periode: {getPeriodText()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Total Pemasukan</h3>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(neracaData.totalPemasukan)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Total Pengeluaran</h3>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(neracaData.totalPengeluaran)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Saldo Kas</h3>
                <Wallet className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(neracaData.saldoKas)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pemasukan per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {neracaData.pemasukankategori.map((item) => (
                  <TableRow key={item.nama_kategori}>
                    <TableCell>{item.nama_kategori}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium">
                  <TableCell>Total Pemasukan</TableCell>
                  <TableCell className="text-right">{formatCurrency(neracaData.totalPemasukan)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pengeluaran per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {neracaData.pengeluaranKategori.map((item) => (
                  <TableRow key={item.nama_kategori}>
                    <TableCell>{item.nama_kategori}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium">
                  <TableCell>Total Pengeluaran</TableCell>
                  <TableCell className="text-right">{formatCurrency(neracaData.totalPengeluaran)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
