'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate, formatDateForInput, getTodayForInput, isValidDate } from '@/lib/utils/date';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Calendar, Target, Clock, AlertCircle, RefreshCw, Calculator, FileText } from 'lucide-react';
import { EkuivalenFields } from './components/EkuivalenFields';
import { RencanaFormData } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function RencanaKegiatanPage() {
  const [rencanaKegiatan, setRencanaKegiatan] = useState<any[]>([]);
  const [tahunAnggaran, setTahunAnggaran] = useState<any[]>([]);
  const [kategori, setKategori] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pengaturan, setPengaturan] = useState<Record<string, string>>({
    nama_kota: '',
    nama_bendahara: '',
    nama_pimpinan: '',
    nama_aplikasi: '',
  });

  const [formData, setFormData] = useState<RencanaFormData>({
    tahun_anggaran_id: '',
    kategori_id: '',
    nama_kegiatan: '',
    deskripsi_kegiatan: '',
    tanggal_rencana: getTodayForInput(),
    tanggal_selesai: getTodayForInput(),
    jumlah_rencana: '',
    ekuivalen_1: '',
    ekuivalen_1_satuan: 'paket',
    ekuivalen_2: '',
    ekuivalen_2_satuan: '',
    ekuivalen_3: '',
    ekuivalen_3_satuan: '',
    harga_satuan: '',
  });

  useEffect(() => {
    fetchData();
    fetchPengaturan();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch rencana kegiatan with relations
      const { data: rencanaData, error: rencanaError } = await supabase
        .from('rencana_kegiatan')
        .select(`
          *,
          tahun_anggaran_id,
          tahun_anggaran:tahun_anggaran_id(nama_tahun_anggaran),
          kategori:kategori_id(nama_kategori, tipe)
        `)
        .order('tanggal_rencana', { ascending: false });

      if (rencanaError) throw rencanaError;

      // Fetch tahun anggaran
      const { data: tahunData, error: tahunError } = await supabase
        .from('tahun_anggaran')
        .select('*')
        .order('tanggal_mulai', { ascending: false });

      if (tahunError) throw tahunError;

      // Fetch kategori
      const { data: kategoriData, error: kategoriError } = await supabase
        .from('kategori')
        .select('*')
        .order('nama_kategori', { ascending: true });

      if (kategoriError) throw kategoriError;

      setRencanaKegiatan(rencanaData || []);
      setTahunAnggaran(tahunData || []);
      setKategori(kategoriData || []);
    } catch (error: any) {
      console.error('Error in fetchData:', error);
      setError(error.message);
      toast.error('Gagal memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPengaturan = async () => {
    try {
      const { data: pengaturanData, error: pengaturanError } = await supabase
        .from('pengaturan_aplikasi')
        .select('*');
      if (pengaturanError) throw pengaturanError;
      const pengaturanMap: Record<string, string> = {};
      pengaturanData?.forEach((item) => {
        pengaturanMap[item.kunci_pengaturan] = item.nilai_pengaturan;
      });
      setPengaturan({
        nama_kota: pengaturanMap.nama_kota || '',
        nama_bendahara: pengaturanMap.nama_bendahara || '',
        nama_pimpinan: pengaturanMap.nama_pimpinan || '',
        nama_aplikasi: pengaturanMap.nama_aplikasi || '',
      });
    } catch (error) {
      // optional: toast error
    }
  };

  const handleExportPDF = async () => {
    if (rencanaKegiatan.length === 0) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }

    const tahunAnggaranId = rencanaKegiatan[0]?.tahun_anggaran_id;
    console.log('tahunAnggaranId untuk export:', tahunAnggaranId, typeof tahunAnggaranId);
    if (!tahunAnggaranId || typeof tahunAnggaranId !== 'string') {
      toast.error('ID tahun anggaran tidak valid');
      return;
    }

    setExporting(true);
    try {
      // Fetch data JSON dari API
      const url = `/api/rencana-kegiatan/export-pdf?tahunAnggaranId=${tahunAnggaranId}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengexport PDF');
      }
      const { tahunAnggaran, rencanaKegiatan: data } = await response.json();

      // Generate PDF di browser
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFontSize(16);
      doc.text('LAPORAN RENCANA KEGIATAN', 148.5, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Tahun Anggaran: ${tahunAnggaran.nama_tahun_anggaran}`, 148.5, 30, { align: 'center' });

      if (data && data.length > 0) {
        const tableData = data.map((item: any, index: number) => [
          index + 1,
          item.nama_kegiatan,
          (item.kategori && (item.kategori.nama_kategori || item.kategori)) ? (item.kategori.nama_kategori || item.kategori) : '-',
          tahunAnggaran.nama_tahun_anggaran,
          formatDate(item.tanggal_rencana),
          formatDate(item.tanggal_selesai),
          formatEkuivalen(item),
          formatCurrency(item.jumlah_rencana)
        ]);
        autoTable(doc, {
          startY: 50,
          head: [['No', 'Nama Kegiatan', 'Kategori', 'Tahun Anggaran', 'Tanggal Mulai', 'Tanggal Selesai', 'Rincian', 'Total (Rp)']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 10 },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 50 },
            2: { cellWidth: 35 },
            3: { cellWidth: 35 },
            4: { cellWidth: 30 },
            5: { cellWidth: 30 },
            6: { cellWidth: 40 },
            7: { cellWidth: 30 }
          }
        });
        // Ringkasan
        const totalRencana = data.reduce((sum: number, item: any) => sum + (item.jumlah_rencana || 0), 0);
        const totalPemasukan = data.filter((item: any) => item.kategori?.tipe === 'pemasukan').reduce((sum: number, item: any) => sum + (item.jumlah_rencana || 0), 0);
        const totalPengeluaran = data.filter((item: any) => item.kategori?.tipe === 'pengeluaran').reduce((sum: number, item: any) => sum + (item.jumlah_rencana || 0), 0);
        let finalY = (doc as any).lastAutoTable?.finalY || 90;
        finalY += 40;
        const kota = pengaturan.nama_kota || '-';
        const tanggalCetak = new Date();
        const urlCetak = window.location.origin + window.location.pathname;
        const namaPimpinan = pengaturan.nama_pimpinan || '-';
        const namaBendahara = pengaturan.nama_bendahara || '-';

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const rightX = pageWidth - margin;
        // Footer: kota, tanggal lengkap di atas tanda tangan (rata kanan di atas bendahara)
        doc.setFontSize(12);
        doc.text(`${kota}, ${formatTanggalLengkap(tanggalCetak)}`, rightX, finalY, { align: 'right' });
        // Kolom tanda tangan
        doc.setFontSize(12);
        doc.text('Pimpinan', margin, finalY + 20);
        doc.text('Bendahara', rightX, finalY + 20, { align: 'right' });
        // Nama dalam tanda kurung
        doc.setFontSize(12);
        doc.text(`(${namaPimpinan})`, margin, finalY + 45);
        doc.text(`(${namaBendahara})`, rightX, finalY + 45, { align: 'right' });
        // Footer paling bawah: dicetak dari ... sampai dengan tanggal jam
        doc.setFontSize(10);
        const footerText = `Dicetak dari: ${urlCetak} sampai dengan ${formatTanggalJam(tanggalCetak)}`;
        doc.text(footerText, pageWidth / 2, 200, { align: 'center' });
      } else {
        doc.setFontSize(12);
        doc.text('Tidak ada data rencana kegiatan untuk periode yang dipilih.', 105, 80, { align: 'center' });
      }
      // Download PDF
      doc.save(`laporan-rencana-kegiatan-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF berhasil diexport');
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      toast.error('Gagal mengexport PDF: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.tahun_anggaran_id || !formData.kategori_id) {
      toast.error('Tahun anggaran dan kategori harus dipilih');
      return;
    }

    if (!formData.nama_kegiatan.trim()) {
      toast.error('Nama kegiatan harus diisi');
      return;
    }

    if (!formData.tanggal_rencana || !formData.tanggal_selesai) {
      toast.error('Tanggal mulai dan selesai harus diisi');
      return;
    }

    if (!formData.ekuivalen_1 || !formData.harga_satuan) {
      toast.error('Jumlah unit dan harga satuan harus diisi');
      return;
    }

    // Validate dates
    if (!isValidDate(formData.tanggal_rencana) || !isValidDate(formData.tanggal_selesai)) {
      toast.error('Format tanggal tidak valid');
      return;
    }

    if (new Date(formData.tanggal_selesai) < new Date(formData.tanggal_rencana)) {
      toast.error('Tanggal selesai harus sama atau setelah tanggal mulai');
      return;
    }

    setSaving(true);

    try {
      const submitData = {
        tahun_anggaran_id: formData.tahun_anggaran_id,
        kategori_id: formData.kategori_id,
        nama_kegiatan: formData.nama_kegiatan.trim(),
        deskripsi_kegiatan: formData.deskripsi_kegiatan.trim() || null,
        tanggal_rencana: formData.tanggal_rencana,
        tanggal_selesai: formData.tanggal_selesai,
        ekuivalen_1: parseFloat(formData.ekuivalen_1),
        ekuivalen_1_satuan: formData.ekuivalen_1_satuan,
        ekuivalen_2: formData.ekuivalen_2 ? parseFloat(formData.ekuivalen_2) : null,
        ekuivalen_2_satuan: formData.ekuivalen_2_satuan || null,
        ekuivalen_3: formData.ekuivalen_3 ? parseFloat(formData.ekuivalen_3) : null,
        ekuivalen_3_satuan: formData.ekuivalen_3_satuan || null,
        harga_satuan: parseFloat(formData.harga_satuan),
      };

      if (editingItem) {
        const { error } = await supabase
          .from('rencana_kegiatan')
          .update({
            ...submitData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Rencana kegiatan berhasil diperbarui');
      } else {
        const { error } = await supabase
          .from('rencana_kegiatan')
          .insert([submitData]);

        if (error) throw error;
        toast.success('Rencana kegiatan berhasil ditambahkan');
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving rencana kegiatan:', error);
      toast.error('Gagal menyimpan: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      tahun_anggaran_id: item.tahun_anggaran_id,
      kategori_id: item.kategori_id,
      nama_kegiatan: item.nama_kegiatan,
      deskripsi_kegiatan: item.deskripsi_kegiatan || '',
      tanggal_rencana: formatDateForInput(item.tanggal_rencana),
      tanggal_selesai: formatDateForInput(item.tanggal_selesai),
      jumlah_rencana: item.jumlah_rencana.toString(),
      ekuivalen_1: item.ekuivalen_1?.toString() || '',
      ekuivalen_1_satuan: item.ekuivalen_1_satuan || 'paket',
      ekuivalen_2: item.ekuivalen_2?.toString() || '',
      ekuivalen_2_satuan: item.ekuivalen_2_satuan || '',
      ekuivalen_3: item.ekuivalen_3?.toString() || '',
      ekuivalen_3_satuan: item.ekuivalen_3_satuan || '',
      harga_satuan: item.harga_satuan?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus rencana kegiatan ini?')) return;

    try {
      const { error } = await supabase
        .from('rencana_kegiatan')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Rencana kegiatan berhasil dihapus');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error('Gagal menghapus: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      tahun_anggaran_id: '',
      kategori_id: '',
      nama_kegiatan: '',
      deskripsi_kegiatan: '',
      tanggal_rencana: getTodayForInput(),
      tanggal_selesai: getTodayForInput(),
      jumlah_rencana: '',
      ekuivalen_1: '',
      ekuivalen_1_satuan: 'paket',
      ekuivalen_2: '',
      ekuivalen_2_satuan: '',
      ekuivalen_3: '',
      ekuivalen_3_satuan: '',
      harga_satuan: '',
    });
    setEditingItem(null);
  };

  const calculateDuration = (startDate: string, endDate: string): string => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays === 0 ? '1 hari' : `${diffDays + 1} hari`;
    } catch {
      return '-';
    }
  };

  const formatEkuivalen = (item: any): string => {
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
  };

  // Helper untuk format tanggal panjang
  function formatTanggalLengkap(date: Date) {
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  function formatTanggalJam(date: Date) {
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) + ', ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Rencana Kegiatan</h1>
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

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rencana Kegiatan</h1>
          <p className="text-muted-foreground">
            Kelola rencana kegiatan dan anggaran
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportPDF} 
            disabled={exporting || rencanaKegiatan.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            {exporting ? 'Mengexport...' : 'Export PDF'}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Rencana
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit Rencana Kegiatan' : 'Tambah Rencana Kegiatan'}
                </DialogTitle>
                <DialogDescription>
                  Isi form di bawah untuk {editingItem ? 'mengubah' : 'menambahkan'} rencana kegiatan.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tahun Anggaran *</Label>
                    <Select 
                      value={formData.tahun_anggaran_id} 
                      onValueChange={(value) => setFormData({ ...formData, tahun_anggaran_id: value })}
                    >
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
                    <Label>Kategori *</Label>
                    <Select 
                      value={formData.kategori_id} 
                      onValueChange={(value) => setFormData({ ...formData, kategori_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {kategori.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.nama_kategori}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nama Kegiatan *</Label>
                  <Input
                    value={formData.nama_kegiatan}
                    onChange={(e) => setFormData({ ...formData, nama_kegiatan: e.target.value })}
                    placeholder="Masukkan nama kegiatan"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={formData.deskripsi_kegiatan}
                    onChange={(e) => setFormData({ ...formData, deskripsi_kegiatan: e.target.value })}
                    placeholder="Masukkan deskripsi kegiatan (opsional)"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tanggal Mulai *</Label>
                    <Input
                      type="date"
                      value={formData.tanggal_rencana}
                      onChange={(e) => setFormData({ ...formData, tanggal_rencana: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal Selesai *</Label>
                    <Input
                      type="date"
                      value={formData.tanggal_selesai}
                      onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                      min={formData.tanggal_rencana}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Rincian Biaya *</Label>
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <EkuivalenFields
                    ekuivalen1={formData.ekuivalen_1}
                    ekuivalen1Satuan={formData.ekuivalen_1_satuan}
                    ekuivalen2={formData.ekuivalen_2}
                    ekuivalen2Satuan={formData.ekuivalen_2_satuan}
                    ekuivalen3={formData.ekuivalen_3}
                    ekuivalen3Satuan={formData.ekuivalen_3_satuan}
                    hargaSatuan={formData.harga_satuan}
                    onChange={(values) => setFormData({ ...formData, ...values })}
                  />
                </div>

                {formData.jumlah_rencana && (
                  <Alert>
                    <Calculator className="h-4 w-4" />
                    <AlertDescription>
                      Total Rencana: {formatCurrency(parseFloat(formData.jumlah_rencana))}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Menyimpan...' : (editingItem ? 'Perbarui' : 'Simpan')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Rencana Kegiatan</CardTitle>
          <CardDescription>
            Rencana kegiatan yang telah dibuat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Kegiatan</TableHead>
                <TableHead className="hidden md:table-cell">Tahun & Kategori</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Rincian</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rencanaKegiatan.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Belum ada data rencana kegiatan
                  </TableCell>
                </TableRow>
              ) : (
                rencanaKegiatan.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.nama_kegiatan}</div>
                        {item.deskripsi_kegiatan && (
                          <div className="text-sm text-muted-foreground">
                            {item.deskripsi_kegiatan}
                          </div>
                        )}
                        <div className="md:hidden space-y-1">
                          <Badge variant="outline" className="mr-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {item.tahun_anggaran?.nama_tahun_anggaran}
                          </Badge>
                          <Badge variant={item.kategori?.tipe === 'pemasukan' ? 'default' : 'destructive'}>
                            <Target className="h-3 w-3 mr-1" />
                            {item.kategori?.nama_kategori}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1">
                        <Badge variant="outline" className="block w-fit">
                          <Calendar className="h-3 w-3 mr-1" />
                          {item.tahun_anggaran?.nama_tahun_anggaran}
                        </Badge>
                        <Badge 
                          variant={item.kategori?.tipe === 'pemasukan' ? 'default' : 'destructive'}
                          className="block w-fit"
                        >
                          <Target className="h-3 w-3 mr-1" />
                          {item.kategori?.nama_kategori}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{formatDate(item.tanggal_rencana)}</div>
                        <div className="text-sm text-muted-foreground">
                          s/d {formatDate(item.tanggal_selesai)}
                        </div>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {calculateDuration(item.tanggal_rencana, item.tanggal_selesai)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatEkuivalen(item)}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.jumlah_rencana)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
