'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';
import { AlertCircle, Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';

// Extend jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
    autoTable: (options: any) => jsPDF;
  }
}

// Type extension for jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
    finalY?: number;
  }
}

// Type definitions for jspdf-autotable
type AutoTableOptions = {
  head?: any[][];
  body?: any[][];
  startY?: number;
  styles?: any;
  headStyles?: any;
  bodyStyles?: any;
  alternateRowStyles?: any;
  columnStyles?: any;
  margin?: any;
  didDrawPage?: (data: any) => void;
};

interface TahunAnggaran {
  id: string;
  nama_tahun_anggaran: string;
  is_aktif?: boolean;
}

interface Transaksi {
  id: string;
  tanggal_transaksi: string;
  deskripsi: string;
  tipe_transaksi: 'pemasukan' | 'pengeluaran';
  jumlah_transaksi: number;
  rencana_kegiatan?: {
    nama_kegiatan: string;
  };
  ekuivalen?: Array<{
    jumlah: number;
    satuan: string;
    harga_satuan: number;
  }>;
  ekuivalen_1?: number;
  ekuivalen_1_satuan?: string;
  ekuivalen_2?: number;
  ekuivalen_2_satuan?: string;
  ekuivalen_3?: number;
  ekuivalen_3_satuan?: string;
  harga_satuan?: string;
  keterangan?: string;
  deskripsi_transaksi?: string;
  saldo?: number;
}

interface BukuKasData {
  No: number;
  Tanggal: string;
  Deskripsi: string;
  'Rencana Kegiatan': string;
  Pemasukan: number;
  Pengeluaran: number;
  Saldo: number;
}

// Define a more flexible type for table rows
type TableRow = {
  no: string | number;
  tanggal: string;
  deskripsi: string;
  realisasiKegiatan: string;
  ekuivalen: string;
  pemasukan: number;
  pengeluaran: number;
  saldo: number;
  [key: string]: string | number | undefined; // Allow dynamic property access
};

interface Column {
  header: string;
  dataKey: keyof TableRow;
  width: number;
  formatter?: (value: number) => string;
  align?: 'left' | 'center' | 'right';
}

// Define component props interface
type BukuKasUmumPageProps = {
  // Add any props here if needed
};

export default function BukuKasUmumPage({}: BukuKasUmumPageProps) {
  // This is a React component that returns JSX, not a TableRow
  const [tahunAnggaran, setTahunAnggaran] = useState<TahunAnggaran[]>([]);
  const [selectedTahun, setSelectedTahun] = useState<string>('');
  const [selectedBulan, setSelectedBulan] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [transaksiWithSaldo, setTransaksiWithSaldo] = useState<(Transaksi & { saldo: number })[]>([]);
  
  // Add new state variables for Pimpinan, Bendahara names, and City name
  const [pimpinanName, setPimpinanName] = useState<string>('');
  const [bendaharaName, setBendaharaName] = useState<string>('');
  const [cityName, setCityName] = useState<string>('Jakarta'); // Default city
  
  // Helper function to safely format currency
  const safeFormatCurrency = (value: number | undefined): string => {
    return value !== undefined ? formatCurrency(value) : '-';
  };
  
  // Helper function to format Ekuivalen details (copied and adapted from realisasi-kegiatan/page.tsx)
  const formatEkuivalen = (item: Transaksi): string => {
    const parts = [];
    if (item.ekuivalen_1) {
      parts.push(`${item.ekuivalen_1} ${item.ekuivalen_1_satuan || ''}`);
    }
    if (item.ekuivalen_2) {
      parts.push(`${item.ekuivalen_2} ${item.ekuivalen_2_satuan || ''}`);
    }
    if (item.ekuivalen_3) {
      parts.push(`${item.ekuivalen_3} ${item.ekuivalen_3_satuan || ''}`);
    }
    if (item.harga_satuan) {
      parts.push(`@ ${formatCurrency(parseFloat(item.harga_satuan))}`);
    }
    return parts.join(' × ');
  };

  // Ensure we have a valid return type for the component
  type ComponentReturnType = React.ReactElement;

  const bulan = [
    { value: 'all', label: 'Semua Bulan' },
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  useEffect(() => {
    fetchTahunAnggaran();
    fetchPengaturan(); // Fetch pengaturan data on component mount
  }, []);

  useEffect(() => {
    if (selectedTahun) {
      fetchTransaksi();
    }
  }, [selectedTahun, selectedBulan]);

  const fetchTahunAnggaran = async () => {
    try {
      const { data, error } = await supabase
        .from('tahun_anggaran')
        .select('*')
        .order('nama_tahun_anggaran', { ascending: false });

      if (error) throw error;

      setTahunAnggaran(data || []);
      if (data && data.length > 0) {
        const activeYear = data.find(item => item.is_aktif);
        setSelectedTahun(activeYear?.id || data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching tahun anggaran:', error);
      setError(error.message);
    }
  };

  // New function to fetch settings data (Pimpinan and Bendahara names)
  const fetchPengaturan = async () => {
    try {
      const { data, error } = await supabase
        .from('pengaturan_aplikasi')
        .select('kunci_pengaturan, nilai_pengaturan'); // Select key and value columns

      if (error) throw error;

      if (data) {
        // Process the data to set individual state variables
        data.forEach((item: any) => {
          if (item.kunci_pengaturan === 'nama_pimpinan') {
            setPimpinanName(item.nilai_pengaturan || '');
          } else if (item.kunci_pengaturan === 'nama_bendahara') {
            setBendaharaName(item.nilai_pengaturan || '');
          } else if (item.kunci_pengaturan === 'nama_kota') {
            setCityName(item.nilai_pengaturan || 'Jakarta'); // Set city name
          }
        });
      }
    } catch (error: any) {
      console.error('Error fetching pengaturan:', error);
      toast.error('Gagal memuat data pengaturan: ' + error.message);
    }
  };

  const fetchTransaksi = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get the selected year data
      const tahunObj = tahunAnggaran.find(t => t.id === selectedTahun);
      if (!tahunObj) {
        throw new Error('Tahun anggaran tidak ditemukan');
      }

      // Extract year from tahun_anggaran (e.g., 'TA 2024' -> '2024')
      const yearMatch = tahunObj.nama_tahun_anggaran.match(/\d{4}/);
      if (!yearMatch) {
        throw new Error('Format tahun anggaran tidak valid');
      }
      const yearStr = yearMatch[0];

      // Build the date range for the selected year
      const startDate = `${yearStr}-01-01`;
      const endDate = `${yearStr}-12-31`;

      // Fetch all transactions for the selected year
      const { data, error } = await supabase
        .from('transaksi')
        .select(`
          *,
          rencana_kegiatan:rencana_kegiatan_id(
            nama_kegiatan,
            tahun_anggaran:tahun_anggaran_id(nama_tahun_anggaran)
          )
        `)
        .gte('tanggal_transaksi', startDate)
        .lte('tanggal_transaksi', endDate)
        .order('tanggal_transaksi', { ascending: true });

      if (error) throw error;

      // Filter by month if needed
      let filteredData = data || [];
      if (selectedBulan !== 'all') {
        filteredData = filteredData.filter(transaksi => {
          const transaksiDate = new Date(transaksi.tanggal_transaksi);
          return transaksiDate.getMonth() + 1 === parseInt(selectedBulan);
        });
      }

      // Calculate running balance
      let saldo = 0;
      const transactionsWithBalance = filteredData.map(transaksi => {
        const amount = typeof transaksi.jumlah_transaksi === 'string' 
          ? parseFloat(transaksi.jumlah_transaksi) 
          : transaksi.jumlah_transaksi;
        
        if (transaksi.tipe_transaksi === 'pemasukan') {
          saldo += amount;
        } else {
          saldo -= amount;
        }
        
        return {
          ...transaksi,
          saldo: saldo
        };
      });

      setTransaksi(filteredData);
      setTransaksiWithSaldo(transactionsWithBalance);
    } catch (error: any) {
      console.error('Error fetching transaksi:', error);
      setError(error.message);
      toast.error('Gagal memuat data transaksi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateExcel = () => {
    try {
      if (!transaksi.length) {
        toast.error('Tidak ada data untuk diekspor');
        return;
      }

      const selectedTahunData = tahunAnggaran.find(t => t.id === selectedTahun);
      if (!selectedTahunData) {
        toast.error('Data tahun anggaran tidak ditemukan');
        return;
      }

      const tahun = tahunAnggaran.find(t => t.id === selectedTahun)?.nama_tahun_anggaran || '';
      const bulanLabel = selectedBulan === 'all' 
        ? 'Semua Bulan' 
        : bulan.find(b => b.value === selectedBulan)?.label;

      let saldo = 0;
      const data: BukuKasData[] = transaksi.map((item, index) => {
        const pemasukan = item.tipe_transaksi === 'pemasukan' ? Number(item.jumlah_transaksi) : 0;
        const pengeluaran = item.tipe_transaksi === 'pengeluaran' ? Number(item.jumlah_transaksi) : 0;
        saldo += pemasukan - pengeluaran;

        return {
          No: index + 1,
          Tanggal: formatDate(item.tanggal_transaksi),
          Deskripsi: item.deskripsi_transaksi || '-',
          'Rencana Kegiatan': item.rencana_kegiatan?.nama_kegiatan || '-',
          Pemasukan: pemasukan,
          Pengeluaran: pengeluaran,
          Saldo: saldo
        };
      });

      const totalPemasukan = transaksi.reduce((sum, item) => 
        sum + (item.tipe_transaksi === 'pemasukan' ? Number(item.jumlah_transaksi) : 0), 0
      );

      const totalPengeluaran = transaksi.reduce((sum, item) => 
        sum + (item.tipe_transaksi === 'pengeluaran' ? Number(item.jumlah_transaksi) : 0), 0
      );

      data.push({
        No: 0,
        Tanggal: '',
        Deskripsi: 'TOTAL PEMASUKAN',
        'Rencana Kegiatan': '',
        Pemasukan: totalPemasukan,
        Pengeluaran: 0,
        Saldo: saldo
      });

      data.push({
        No: 0,
        Tanggal: '',
        Deskripsi: 'TOTAL PENGELUARAN',
        'Rencana Kegiatan': '',
        Pemasukan: 0,
        Pengeluaran: totalPengeluaran,
        Saldo: saldo
      });

      data.push({
        No: 0,
        Tanggal: '',
        Deskripsi: 'SALDO AKHIR',
        'Rencana Kegiatan': '',
        Pemasukan: 0,
        Pengeluaran: 0,
        Saldo: saldo
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      XLSX.utils.sheet_add_aoa(ws, [
        [`BUKU KAS UMUM`],
        [`Tahun Anggaran: ${tahun}`],
        [`Periode: ${bulanLabel}`],
        ['']
      ], { origin: 'A1' });

      const colWidths = [
        { wch: 5 },  // No
        { wch: 12 }, // Tanggal
        { wch: 40 }, // Deskripsi
        { wch: 30 }, // Rencana Kegiatan
        { wch: 15 }, // Pemasukan
        { wch: 15 }, // Pengeluaran
        { wch: 15 }, // Saldo
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Buku Kas Umum');

      const fileName = `Buku_Kas_Umum_${tahun}_${bulanLabel}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success('File Excel berhasil dibuat');
    } catch (error: any) {
      console.error('Error generating Excel:', error);
      toast.error('Gagal membuat file Excel: ' + error.message);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedTahun) {
      toast.error('Pilih tahun anggaran terlebih dahulu');
      return;
    }

    setLoading(true);

    const generatePdfPromise = new Promise<string>(async (resolve, reject) => {
      try {
        // Get the selected year data
        const selectedTahunData = tahunAnggaran.find(t => t.id === selectedTahun);
        if (!selectedTahunData) {
          throw new Error('Data tahun anggaran tidak ditemukan');
        }

        // Use the already filtered and calculated data
        const dataToExport = [...transaksiWithSaldo];

        // Check if we have data to export
        if (!dataToExport || dataToExport.length === 0) {
          throw new Error('Tidak ada data transaksi untuk diekspor ke PDF');
        }

        // Sort the data by date
        const sortedTransaksi = [...dataToExport].sort((a, b) => 
          new Date(a.tanggal_transaksi).getTime() - new Date(b.tanggal_transaksi).getTime()
        );

        // Calculate latest saldo
        const latestSaldo = sortedTransaksi.length > 0 
          ? sortedTransaksi[sortedTransaksi.length - 1].saldo 
          : 0;

        // Create PDF
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        }) as any;

        // Set document metadata
        doc.setProperties({
          title: `Buku Kas Umum - ${selectedTahunData.nama_tahun_anggaran}`,
          subject: 'Laporan Keuangan',
          author: 'Sistem Keuangan',
          creator: 'Sistem Keuangan'
        });

        // Add title and header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('BUKU KAS UMUM', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Tahun Anggaran: ${selectedTahunData.nama_tahun_anggaran}`, 14, 22);
        
        if (selectedBulan !== 'all') {
          const bulanNama = bulan.find(b => b.value === selectedBulan)?.label || '';
          doc.text(`Bulan: ${bulanNama}`, 14, 27);
        }

        // Prepare table data
        const tableData = sortedTransaksi.map((t: any, index: number) => {
          const tanggal = new Date(t.tanggal_transaksi);
          const formattedDate = `${String(tanggal.getDate()).padStart(2, '0')}/${String(tanggal.getMonth() + 1).padStart(2, '0')}/${tanggal.getFullYear()}`;
          
          const amount = typeof t.jumlah_transaksi === 'string' 
            ? parseFloat(t.jumlah_transaksi) 
            : t.jumlah_transaksi;
          
          return [
            (index + 1).toString(),
            formattedDate,
            t.deskripsi || t.deskripsi_transaksi || '-',
            t.rencana_kegiatan?.nama_kegiatan || '-',
            formatEkuivalen(t),
            t.tipe_transaksi === 'pemasukan' ? formatCurrency(amount) : '0',
            t.tipe_transaksi === 'pengeluaran' ? formatCurrency(amount) : '0',
            formatCurrency(t.saldo || 0)
          ];
        });

        // Calculate totals
        const totalPemasukan = sortedTransaksi
          .filter((t: any) => t.tipe_transaksi === 'pemasukan')
          .reduce((sum: number, t: any) => {
            const amount = typeof t.jumlah_transaksi === 'string' 
              ? parseFloat(t.jumlah_transaksi) 
              : t.jumlah_transaksi;
            return sum + (amount || 0);
          }, 0);

        const totalPengeluaran = sortedTransaksi
          .filter((t: any) => t.tipe_transaksi === 'pengeluaran')
          .reduce((sum: number, t: any) => {
            const amount = typeof t.jumlah_transaksi === 'string' 
              ? parseFloat(t.jumlah_transaksi) 
              : t.jumlah_transaksi;
            return sum + (amount || 0);
          }, 0);

        // Add totals row
        tableData.push([
          '', '', 'TOTAL', '', '', 
          formatCurrency(totalPemasukan), 
          formatCurrency(totalPengeluaran),
          formatCurrency(latestSaldo)
        ]);

        // Generate table using autoTable
        autoTable(doc, {
          head: [['No', 'Tanggal', 'Uraian', 'Rencana Kegiatan', 'Ekuivalen', 'Penerimaan', 'Pengeluaran', 'Saldo']],
          body: tableData,
          startY: 35,
          styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: 3,
            lineColor: [0, 0, 0],
            lineWidth: 0.1
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 50 },
            3: { cellWidth: 35 },
            4: { cellWidth: 35 },
            5: { cellWidth: 25, halign: 'right' },
            6: { cellWidth: 25, halign: 'right' },
            7: { cellWidth: 25, halign: 'right' }
          },
          margin: { left: (doc.internal.pageSize.getWidth() - (10 + 20 + 50 + 35 + 35 + 25 + 25 + 25)) / 2 },
          // Style the totals row
          didParseCell: (data: any) => {
            if (data.row.index === tableData.length - 1) {
              data.cell.styles.fillColor = [220, 220, 220];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.halign = 'right';
            }
          },
          // Add footer and signature blocks
          didDrawPage: (data: any) => {
            // Footer: URL, Date, Time
            const url = window.location.href;
            const now = new Date();
            const printDateTime = now.toLocaleString('id-ID', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            });

            doc.setFontSize(8);
            doc.text(`Dicetak dari: ${url} | ${printDateTime}`, 14, doc.internal.pageSize.height - 10);

            // Page number
            const totalPages = doc.internal.pages.length -1; // -1 because it's 1-indexed and first page is usually a stub
            const currentPage = data.pageNumber;
            doc.text(`Halaman ${currentPage}/${totalPages}`, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 10, { align: 'right' });

            // Signature blocks on the last page
            if (currentPage === totalPages) {
              const startY = doc.internal.pageSize.height - 60; // Adjust as needed

              // Calculate city and end-of-month date dynamically within this scope
              const currentDate = new Date();
              const currentYear = currentDate.getFullYear();
              const currentMonth = selectedBulan === 'all' ? currentDate.getMonth() : parseInt(selectedBulan) - 1;
              const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
              const formattedEndDate = `${lastDayOfMonth} ${new Date(currentYear, currentMonth, lastDayOfMonth).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`;
              // Use the fetched cityName instead of a hardcoded one
              const displayCity = cityName; 

              // Position city and date above Bendahara
              doc.setFontSize(10);
              doc.text(displayCity + ', ' + formattedEndDate, doc.internal.pageSize.width - 60, startY - 5); // Adjust Y-coordinate to be above Bendahara
              doc.setFontSize(8); // Reset font size for other text if needed

              // Pimpinan (Leader)
              doc.text('Mengetahui,', 40, startY);
              doc.text('Pimpinan', 40, startY + 5);
              doc.text('(' + (pimpinanName || '____________________') + ')', 40, startY + 30); // Use pimpinanName with string concatenation

              // Bendahara (Treasurer)
              doc.text('Bendahara', doc.internal.pageSize.width - 60, startY);
              doc.text('(' + (bendaharaName || '____________________') + ')', doc.internal.pageSize.width - 60, startY + 30); // Use bendaharaName with string concatenation
            }
          }
        });

        // Save the PDF
        const bulanText = selectedBulan === 'all'
          ? 'semua-bulan'
          : new Date(0, parseInt(selectedBulan) - 1).toLocaleString('id-ID', { month: 'long' });
        const filename = 'buku-kas-umum-' + selectedTahunData.nama_tahun_anggaran.replace(/\s+/g, '-') + '-' + bulanText + '.pdf'; // String concatenation for filename
        
        doc.save(filename);
        resolve('File PDF berhasil dibuat'); // Resolve the promise on success
      } catch (error: any) {
        reject(new Error(error?.message || 'Terjadi kesalahan')); // Reject with an Error object
      } finally {
        setLoading(false); // Ensure loading state is reset
      }
    });

    toast.promise(generatePdfPromise, {
      loading: 'Menyiapkan PDF...', 
      success: (message: string) => message, // Use the resolved message
      error: (error) => 'Gagal membuat file PDF: ' + (error?.message || 'Terjadi kesalahan'),
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Buku Kas Umum</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Buku Kas Umum</h1>
          <p className="text-muted-foreground">
            Laporan transaksi kas masuk dan keluar
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={generateExcel} className="w-full sm:w-auto">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={handleExportPDF} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
          <CardDescription>
            Pilih periode laporan yang ingin ditampilkan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Tahun Anggaran</Label>
              <Select value={selectedTahun} onValueChange={setSelectedTahun}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tahun anggaran" />
                </SelectTrigger>
                <SelectContent>
                  {tahunAnggaran.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nama_tahun_anggaran}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bulan</Label>
              <Select value={selectedBulan} onValueChange={setSelectedBulan}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bulan" />
                </SelectTrigger>
                <SelectContent>
                  {bulan.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label>&nbsp;</Label>
              <Button 
                variant="outline" 
                onClick={fetchTransaksi}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Muat Ulang Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Data Transaksi</CardTitle>
            <CardDescription>
              Menampilkan {transaksi.length} transaksi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">No</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Tanggal</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Deskripsi</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Rencana Kegiatan</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Ekuivalen</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Pemasukan</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Pengeluaran</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {transaksi.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-gray-200 px-4 py-8 text-center text-muted-foreground">
                        Tidak ada data transaksi
                      </td>
                    </tr>
                  ) : (
                    <>
                      {transaksi.map((item, index) => {
                        const pemasukan = item.tipe_transaksi === 'pemasukan' ? Number(item.jumlah_transaksi) : 0;
                        const pengeluaran = item.tipe_transaksi === 'pengeluaran' ? Number(item.jumlah_transaksi) : 0;
                        const saldoSebelum = transaksi.slice(0, index).reduce((sum, prev) => {
                          const masuk = prev.tipe_transaksi === 'pemasukan' ? Number(prev.jumlah_transaksi) : 0;
                          const keluar = prev.tipe_transaksi === 'pengeluaran' ? Number(prev.jumlah_transaksi) : 0;
                          return sum + (masuk - keluar);
                        }, 0);
                        const saldo = saldoSebelum + (pemasukan - pengeluaran);

                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-4 py-2">{index + 1}</td>
                            <td className="border border-gray-200 px-4 py-2">
                              {formatDate(item.tanggal_transaksi)}
                            </td>
                            <td className="border border-gray-200 px-4 py-2">
                              {item.deskripsi_transaksi}
                            </td>
                            <td className="border border-gray-200 px-4 py-2">
                              {item.rencana_kegiatan?.nama_kegiatan || '-'}
                            </td>
                            <td className="border border-gray-200 px-4 py-2">
                              {formatEkuivalen(item)}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-right text-green-600">
                              {pemasukan > 0 ? formatCurrency(pemasukan) : '-'}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-right text-red-600">
                              {pengeluaran > 0 ? formatCurrency(pengeluaran) : '-'}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-right font-medium">
                              {formatCurrency(saldo)}
                            </td>
                          </tr>
                        );
                      })}

                      {transaksi.length > 0 && (
                        <>
                          <tr className="bg-gray-50 font-medium">
                            <td colSpan={4} className="border border-gray-200 px-4 py-2 text-right">
                              TOTAL PEMASUKAN
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-right text-green-600">
                              {formatCurrency(
                                transaksi.reduce((sum, item) => 
                                  sum + (item.tipe_transaksi === 'pemasukan' ? Number(item.jumlah_transaksi) : 0), 
                                0
                                )
                              )}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-right">-</td>
                            <td className="border border-gray-200 px-4 py-2 text-right">-</td>
                          </tr>
                          <tr className="bg-gray-50 font-medium">
                            <td colSpan={4} className="border border-gray-200 px-4 py-2 text-right">
                              TOTAL PENGELUARAN
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-right">-</td>
                            <td className="border border-gray-200 px-4 py-2 text-right text-red-600">
                              {formatCurrency(
                                transaksi.reduce((sum, item) => 
                                  sum + (item.tipe_transaksi === 'pengeluaran' ? Number(item.jumlah_transaksi) : 0),
                                0
                                )
                              )}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-right">-</td>
                          </tr>
                          <tr className="bg-gray-50 font-medium">
                            <td colSpan={4} className="border border-gray-200 px-4 py-2 text-right">
                              SALDO AKHIR
                            </td>
                            <td colSpan={2} className="border border-gray-200 px-4 py-2 text-right">-</td>
                            <td className="border border-gray-200 px-4 py-2 text-right">
                              {formatCurrency(
                                transaksi.reduce((sum, item) => {
                                  const masuk = item.tipe_transaksi === 'pemasukan' ? Number(item.jumlah_transaksi) : 0;
                                  const keluar = item.tipe_transaksi === 'pengeluaran' ? Number(item.jumlah_transaksi) : 0;
                                  return sum + (masuk - keluar);
                                }, 0)
                              )}
                            </td>
                          </tr>
                        </>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
