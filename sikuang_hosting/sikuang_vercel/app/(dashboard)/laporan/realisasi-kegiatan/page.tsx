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
import { AlertCircle, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF with autotable types (if not already extended globally)
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: { finalY: number };
  }
}

interface TahunAnggaran {
  id: string;
  nama_tahun_anggaran: string;
  is_aktif?: boolean;
}

interface Kategori {
  id: string;
  nama_kategori: string;
  tipe: 'pemasukan' | 'pengeluaran';
}

interface RencanaKegiatan {
  id: string;
  nama_kegiatan: string;
  jumlah_rencana: number;
  tahun_anggaran_id: string;
  kategori_id: string;
  tahun_anggaran?: {
    nama_tahun_anggaran: string;
  };
  kategori?: Kategori;
  total_realisasi?: number; // Added for calculated sum
  persentase_realisasi?: number; // Added for calculated percentage
  sisa_anggaran?: number; // Added for calculated remaining budget
}

interface Transaksi {
  id: string;
  rencana_kegiatan_id: string | null;
  jumlah_transaksi: number;
  tipe_transaksi: 'pemasukan' | 'pengeluaran';
  tanggal_transaksi: string;
}

export default function RealisasiKegiatanPage() {
  const [tahunAnggaran, setTahunAnggaran] = useState<TahunAnggaran[]>([]);
  const [selectedTahun, setSelectedTahun] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rencanaKegiatanList, setRencanaKegiatanList] = useState<RencanaKegiatan[]>([]);
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);

  // State for Pimpinan, Bendahara names, and City
  const [pimpinanName, setPimpinanName] = useState<string>('');
  const [bendaharaName, setBendaharaName] = useState<string>('');
  const [cityName, setCityName] = useState<string>('Jakarta'); // Default city

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
      fetchDataRealisasi();
    }
  }, [selectedTahun]); // Only re-fetch when selectedTahun changes

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
      toast.error('Gagal memuat tahun anggaran: ' + error.message);
    }
  };

  // Function to fetch settings data (Pimpinan, Bendahara, City names)
  const fetchPengaturan = async () => {
    try {
      const { data, error } = await supabase
        .from('pengaturan_aplikasi')
        .select('kunci_pengaturan, nilai_pengaturan');

      if (error) throw error;

      if (data) {
        data.forEach((item: any) => {
          if (item.kunci_pengaturan === 'nama_pimpinan') {
            setPimpinanName(item.nilai_pengaturan || '');
          } else if (item.kunci_pengaturan === 'nama_bendahara') {
            setBendaharaName(item.nilai_pengaturan || '');
          } else if (item.kunci_pengaturan === 'nama_kota') {
            setCityName(item.nilai_pengaturan || 'Jakarta');
          }
        });
      }
    } catch (error: any) {
      console.error('Error fetching pengaturan:', error);
      toast.error('Gagal memuat data pengaturan: ' + error.message);
    }
  };

  const fetchDataRealisasi = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get the selected year data
      const tahunObj = tahunAnggaran.find(t => t.id === selectedTahun);
      if (!tahunObj) {
        throw new Error('Tahun anggaran tidak ditemukan');
      }

      const yearMatch = tahunObj.nama_tahun_anggaran.match(/\d{4}/);
      if (!yearMatch) {
        throw new Error('Format tahun anggaran tidak valid');
      }
      const yearStr = yearMatch[0];

      const startDate = `${yearStr}-01-01`;
      const endDate = `${yearStr}-12-31`;

      // Fetch all rencana_kegiatan for the selected year
      const { data: rencanaData, error: rencanaError } = await supabase
        .from('rencana_kegiatan')
        .select(`
          *,
          tahun_anggaran:tahun_anggaran_id(nama_tahun_anggaran),
          kategori:kategori_id(nama_kategori, tipe)
        `)
        .filter('tahun_anggaran_id', 'eq', selectedTahun)
        .order('tanggal_rencana', { ascending: true });

      if (rencanaError) throw rencanaError;
      
      // Fetch all relevant transactions for the year to calculate realization
      const { data: transaksiData, error: transaksiError } = await supabase
        .from('transaksi')
        .select('id, rencana_kegiatan_id, jumlah_transaksi, tipe_transaksi, tanggal_transaksi')
        .gte('tanggal_transaksi', startDate)
        .lte('tanggal_transaksi', endDate);

      if (transaksiError) throw transaksiError;

      // Calculate total realization for each rencana_kegiatan
      const calculatedRencanaKegiatan = (rencanaData || []).map(rencana => {
        const totalRealization = (transaksiData || [])
          .filter(t => 
            t.rencana_kegiatan_id === rencana.id && 
            t.tipe_transaksi === rencana.kategori?.tipe // Only count transactions of the same type as the plan's category
          )
          .reduce((sum, t) => sum + t.jumlah_transaksi, 0);

        const persentase = rencana.jumlah_rencana > 0 
          ? (totalRealization / rencana.jumlah_rencana) * 100 
          : 0;
        
        const sisa = rencana.jumlah_rencana - totalRealization;

        return {
          ...rencana,
          total_realisasi: totalRealization,
          persentase_realisasi: parseFloat(persentase.toFixed(2)), // Format to 2 decimal places
          sisa_anggaran: sisa,
        };
      });

      // Update database with calculated realisasi data
      for (const rencana of calculatedRencanaKegiatan) {
        const { error: updateError } = await supabase
          .from('rencana_kegiatan')
          .update({
            total_realisasi: rencana.total_realisasi,
            persentase_realisasi: rencana.persentase_realisasi,
            sisa_anggaran: rencana.sisa_anggaran,
            updated_at: new Date().toISOString(), // Update timestamp
          })
          .eq('id', rencana.id);

        if (updateError) {
          console.error(`Error updating rencana_kegiatan ${rencana.id}:`, updateError);
          toast.error(`Gagal memperbarui realisasi untuk kegiatan ${rencana.nama_kegiatan}: ${updateError.message}`);
        }
      }

      setRencanaKegiatanList(calculatedRencanaKegiatan);
      setTransaksiList(transaksiData || []); // Keep transaksi data if needed for other purposes, though not directly used for display in this table
    } catch (error: any) {
      console.error('Error fetching realisasi data:', error);
      setError(error.message);
      toast.error('Gagal memuat data realisasi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedTahun || rencanaKegiatanList.length === 0) {
      toast.error('Tidak ada data atau tahun anggaran yang dipilih untuk diekspor.');
      return;
    }

    setLoading(true);
    const generatePdfPromise = new Promise<string>(async (resolve, reject) => {
      try {
        const selectedTahunData = tahunAnggaran.find(t => t.id === selectedTahun);
        if (!selectedTahunData) {
          throw new Error('Data tahun anggaran tidak ditemukan.');
        }

        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        }) as jsPDF; // Type assertion

        // Set document metadata
        doc.setProperties({
          title: `Laporan Realisasi Kegiatan - ${selectedTahunData.nama_tahun_anggaran}`,
          subject: 'Laporan Keuangan',
          author: 'Sistem Keuangan',
          creator: 'Sistem Keuangan'
        });

        // Add title and header information
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('LAPORAN REALISASI KEGIATAN', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Tahun Anggaran: ${selectedTahunData.nama_tahun_anggaran}`, 14, 22);

        // Prepare table data
        const tableData = rencanaKegiatanList.map(item => [
          item.nama_kegiatan,
          `${item.kategori?.nama_kategori} (${item.kategori?.tipe})`,
          formatCurrency(item.jumlah_rencana),
          formatCurrency(item.total_realisasi || 0),
          `${item.persentase_realisasi}%`,
          formatCurrency(item.sisa_anggaran || 0),
        ]);

        // Calculate totals for the report table
        const totalDirencana = rencanaKegiatanList.reduce((sum, item) => sum + item.jumlah_rencana, 0);
        const totalTerealisasi = rencanaKegiatanList.reduce((sum, item) => sum + (item.total_realisasi || 0), 0);
        const totalSisa = rencanaKegiatanList.reduce((sum, item) => sum + (item.sisa_anggaran || 0), 0);

        // Add total row
        tableData.push([
          'TOTAL',
          '',
          formatCurrency(totalDirencana),
          formatCurrency(totalTerealisasi),
          '', // Percentage total not meaningful across different categories
          formatCurrency(totalSisa)
        ]);

        // Generate table using autoTable
        autoTable(doc, {
          head: [['Nama Kegiatan', 'Kategori', 'Direncana', 'Terealisasi', 'Persentase', 'Sisa Anggaran']],
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
            0: { cellWidth: 70 },
            1: { cellWidth: 35 },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 20, halign: 'right' },
            5: { cellWidth: 30, halign: 'right' }
          },
          margin: { left: (doc.internal.pageSize.getWidth() - (70 + 35 + 30 + 30 + 20 + 30)) / 2 }, // Center table
          didParseCell: (data: any) => {
            // Style the totals row
            if (data.row.index === tableData.length - 1) {
              data.cell.styles.fillColor = [220, 220, 220];
              data.cell.styles.fontStyle = 'bold';
            }
          },
          didDrawPage: (data: any) => {
            // Footer: URL, Date, Time
            const url = window.location.href;
            const now = new Date();
            const printDateTime = now.toLocaleString('id-ID', {
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
            });

            doc.setFontSize(8);
            doc.text(`Dicetak dari: ${url} | ${printDateTime}`, 14, doc.internal.pageSize.height - 10);

            // Page number
            const totalPages = doc.internal.pages.length -1; 
            const currentPage = data.pageNumber;
            doc.text(`Halaman ${currentPage}/${totalPages}`, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 10, { align: 'right' });

            // Signature blocks on the last page
            if (currentPage === totalPages) {
              const startY = doc.internal.pageSize.height - 60; // Adjust as needed

              // City and end-of-month date
              const currentDate = new Date();
              const currentYear = currentDate.getFullYear();
              // For realisasi report, we might want end of selected year, not current month
              // For simplicity, let's use end of current month of selected year data
              const lastDayOfMonth = new Date(currentYear, 12, 0).getDate(); // Last day of Dec of selected year
              const formattedEndDate = `${lastDayOfMonth} ${new Date(currentYear, 11, lastDayOfMonth).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`;
              
              doc.setFontSize(10);
              doc.text(cityName + ', ' + formattedEndDate, doc.internal.pageSize.width - 60, startY - 5); // Adjust Y-coordinate to be above Bendahara
              doc.setFontSize(8); 

              // Pimpinan (Leader)
              doc.text('Mengetahui,', 40, startY);
              doc.text('Pimpinan', 40, startY + 5);
              doc.text('(' + (pimpinanName || '____________________') + ')', 40, startY + 30);

              // Bendahara (Treasurer)
              doc.text('Bendahara', doc.internal.pageSize.width - 60, startY);
              doc.text('(' + (bendaharaName || '____________________') + ')', doc.internal.pageSize.width - 60, startY + 30);
            }
          }
        });
        doc.save(`Laporan Realisasi Kegiatan - ${selectedTahunData.nama_tahun_anggaran}.pdf`);
        resolve('File PDF berhasil dibuat');
      } catch (error: any) {
        reject(new Error(error?.message || 'Terjadi kesalahan'));
      } finally {
        setLoading(false);
      }
    });

    toast.promise(generatePdfPromise, {
      loading: 'Menyiapkan PDF...', 
      success: (message: string) => message, 
      error: (error) => 'Gagal membuat file PDF: ' + (error?.message || 'Terjadi kesalahan'),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Laporan Realisasi Kegiatan</h1>
          <p className="text-muted-foreground">
            Ringkasan persentase realisasi anggaran per kegiatan
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleExportPDF} className="w-full sm:w-auto" disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
          <CardDescription>
            Pilih tahun anggaran untuk melihat realisasi kegiatan
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
            {/* Bulan filter can be added here if needed in the future, currently not implemented */}
            <div className="space-y-2 lg:col-span-2">
              <Label>&nbsp;</Label>
              <Button 
                variant="outline" 
                onClick={fetchDataRealisasi}
                className="w-full"
                disabled={loading}
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
            <CardTitle>Data Realisasi Kegiatan</CardTitle>
            <CardDescription>
              Menampilkan {rencanaKegiatanList.length} rencana kegiatan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">Nama Kegiatan</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Kategori</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Direncana</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Terealisasi</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Persentase</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Sisa Anggaran</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="border border-gray-200 px-4 py-8 text-center text-muted-foreground">
                        Memuat data...
                      </td>
                    </tr>
                  ) : rencanaKegiatanList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border border-gray-200 px-4 py-8 text-center text-muted-foreground">
                        Tidak ada data realisasi kegiatan
                      </td>
                    </tr>
                  ) : (
                    <>
                      {rencanaKegiatanList.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2 font-medium">
                            {item.nama_kegiatan}
                            <div className="text-sm text-muted-foreground">
                              {item.tahun_anggaran?.nama_tahun_anggaran}
                            </div>
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            {item.kategori?.nama_kategori} ({item.kategori?.tipe})
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right">
                            {formatCurrency(item.jumlah_rencana)}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right">
                            {formatCurrency(item.total_realisasi || 0)}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right">
                            {item.persentase_realisasi}%
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right">
                            {formatCurrency(item.sisa_anggaran || 0)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-medium">
                        <td colSpan={2} className="border border-gray-200 px-4 py-2 text-right">
                          TOTAL
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {formatCurrency(rencanaKegiatanList.reduce((sum, item) => sum + item.jumlah_rencana, 0))}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {formatCurrency(rencanaKegiatanList.reduce((sum, item) => sum + (item.total_realisasi || 0), 0))}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-right">-</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {formatCurrency(rencanaKegiatanList.reduce((sum, item) => sum + (item.sisa_anggaran || 0), 0))}
                        </td>
                      </tr>
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