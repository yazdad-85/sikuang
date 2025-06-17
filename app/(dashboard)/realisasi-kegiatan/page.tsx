'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase, Transaksi, RencanaKegiatan } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate, formatDateForInput, getTodayForInput } from '@/lib/utils/date';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import { EkuivalenFields } from '@/app/(dashboard)/rencana-kegiatan/components/EkuivalenFields';

export default function RealisasiKegiatanPage() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [rencanaKegiatan, setRencanaKegiatan] = useState<RencanaKegiatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Transaksi | null>(null);
  const [formData, setFormData] = useState({
    rencana_kegiatan_id: '',
    tanggal_transaksi: '',
    deskripsi_transaksi: '',
    jumlah_transaksi: '',
    tipe_transaksi: '' as 'pemasukan' | 'pengeluaran' | '',
    bukti_transaksi_url: '',
    ekuivalen_1: '',
    ekuivalen_1_satuan: 'paket',
    ekuivalen_2: '',
    ekuivalen_2_satuan: '',
    ekuivalen_3: '',
    ekuivalen_3_satuan: '',
    harga_satuan: '',
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: transaksiData, error: transaksiError } = await supabase
        .from('transaksi')
        .select(`
          *,
          rencana_kegiatan:rencana_kegiatan_id(
            nama_kegiatan,
            tahun_anggaran:tahun_anggaran_id(nama_tahun_anggaran),
            kategori:kategori_id(nama_kategori, tipe)
          )
        `)
        .order('tanggal_transaksi', { ascending: false });

      if (transaksiError) throw transaksiError;

      const { data: rencanaData, error: rencanaError } = await supabase
        .from('rencana_kegiatan')
        .select(`
          *,
          tahun_anggaran:tahun_anggaran_id(nama_tahun_anggaran),
          kategori:kategori_id(nama_kategori, tipe)
        `)
        .order('tanggal_rencana', { ascending: false });

      if (rencanaError) throw rencanaError;

      setTransaksi(transaksiData || []);
      setRencanaKegiatan(rencanaData || []);
    } catch (error) {
      toast.error('Gagal memuat data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return null;

    setUploadingFile(true);
    try {
      // Create object URL for the file
      const objectUrl = URL.createObjectURL(file);
      
      // Store file info in localStorage
      const fileInfo = {
        name: file.name,
        type: file.type,
        size: file.size,
        url: objectUrl,
        uploadedAt: new Date().toISOString()
      };
      
      const storageKey = `uploaded_file_${Date.now()}`;
      localStorage.setItem(storageKey, JSON.stringify(fileInfo));
      
      return objectUrl;
    } catch (error) {
      toast.error('Gagal menyimpan file');
      console.error('Error saving file:', error);
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tipe_transaksi) {
      toast.error('Tipe transaksi harus dipilih');
      return;
    }

    if (!formData.ekuivalen_1 || !formData.harga_satuan) {
      toast.error('Jumlah unit dan harga satuan harus diisi');
      return;
    }

    try {
      const submitData = {
        rencana_kegiatan_id: formData.rencana_kegiatan_id || null,
        tanggal_transaksi: formData.tanggal_transaksi,
        deskripsi_transaksi: formData.deskripsi_transaksi.trim(),
        tipe_transaksi: formData.tipe_transaksi,
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
          .from('transaksi')
          .update({
            ...submitData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Transaksi berhasil diperbarui');
      } else {
        const { error } = await supabase
          .from('transaksi')
          .insert([submitData]);

        if (error) throw error;
        toast.success('Transaksi berhasil ditambahkan');
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Gagal menyimpan transaksi');
      console.error('Error saving transaksi:', error);
    }
  };

  const handleEdit = (item: Transaksi) => {
    setEditingItem(item);
    setFormData({
      rencana_kegiatan_id: item.rencana_kegiatan_id || '',
      tanggal_transaksi: formatDateForInput(item.tanggal_transaksi),
      deskripsi_transaksi: item.deskripsi_transaksi,
      jumlah_transaksi: item.jumlah_transaksi.toString(),
      tipe_transaksi: item.tipe_transaksi,
      bukti_transaksi_url: item.bukti_transaksi_url || '',
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
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;

    try {
      const { error } = await supabase
        .from('transaksi')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Transaksi berhasil dihapus');
      fetchData();
    } catch (error) {
      toast.error('Gagal menghapus transaksi');
      console.error('Error deleting transaksi:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      rencana_kegiatan_id: '',
      tanggal_transaksi: getTodayForInput(),
      deskripsi_transaksi: '',
      jumlah_transaksi: '',
      tipe_transaksi: '',
      bukti_transaksi_url: '',
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

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleRencanaKegiatanChange = (value: string) => {
    if (value === 'none') {
      setFormData({ ...formData, rencana_kegiatan_id: '' });
    } else {
      setFormData({ ...formData, rencana_kegiatan_id: value });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Realisasi Kegiatan</h1>
          <p className="text-muted-foreground">
            Kelola transaksi kas masuk dan keluar
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Transaksi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Transaksi' : 'Tambah Transaksi'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipe_transaksi">Tipe Transaksi</Label>
                  <Select value={formData.tipe_transaksi || undefined} onValueChange={(value) => setFormData({ ...formData, tipe_transaksi: value as 'pemasukan' | 'pengeluaran' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tipe transaksi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pemasukan">Pemasukan</SelectItem>
                      <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rencana_kegiatan_id">Rencana Kegiatan (Opsional)</Label>
                  <Select 
                    value={formData.rencana_kegiatan_id ? formData.rencana_kegiatan_id : 'none'} 
                    onValueChange={handleRencanaKegiatanChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih rencana kegiatan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tidak terkait rencana</SelectItem>
                      {rencanaKegiatan.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nama_kegiatan} - {item.tahun_anggaran?.nama_tahun_anggaran}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deskripsi_transaksi">Deskripsi Transaksi</Label>
                <Input
                  id="deskripsi_transaksi"
                  placeholder="Contoh: Pembayaran listrik bulan Januari"
                  value={formData.deskripsi_transaksi}
                  onChange={(e) => setFormData({ ...formData, deskripsi_transaksi: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tanggal_transaksi">Tanggal Transaksi</Label>
                  <Input
                    id="tanggal_transaksi"
                    type="date"
                    value={formData.tanggal_transaksi}
                    onChange={(e) => setFormData({ ...formData, tanggal_transaksi: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rincian Biaya *</Label>
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
              <div className="space-y-2">
                <Label htmlFor="bukti_transaksi">Bukti Transaksi (Opsional)</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleFileUpload(file);
                        if (url) {
                          setFormData({ ...formData, bukti_transaksi_url: url });
                        }
                      }
                    }}
                    disabled={uploadingFile}
                  />
                  {uploadingFile && (
                    <div className="text-sm text-muted-foreground">Mengunggah...</div>
                  )}
                </div>
                {formData.bukti_transaksi_url && (
                  <div className="text-sm text-green-600">
                    ✓ File berhasil diunggah
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Batal
                </Button>
                <Button type="submit" disabled={uploadingFile}>
                  {editingItem ? 'Perbarui' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Transaksi</CardTitle>
          <CardDescription>
            Transaksi kas masuk dan keluar yang telah dicatat
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Rencana Kegiatan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Rincian</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Bukti</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaksi.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Belum ada data transaksi
                    </TableCell>
                  </TableRow>
                ) : (
                  transaksi.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.deskripsi_transaksi}</div>
                      </TableCell>
                      <TableCell>
                        {item.rencana_kegiatan ? (
                          <div className="text-sm">
                            <div className="font-medium">{item.rencana_kegiatan.nama_kegiatan}</div>
                            <div className="text-muted-foreground">
                              {item.rencana_kegiatan.tahun_anggaran?.nama_tahun_anggaran}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(item.tanggal_transaksi)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.tipe_transaksi === 'pemasukan' ? 'default' : 'destructive'}
                          className="flex items-center w-fit"
                        >
                          {item.tipe_transaksi === 'pemasukan' ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {item.tipe_transaksi === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatEkuivalen(item)}</div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className={item.tipe_transaksi === 'pemasukan' ? 'text-green-600' : 'text-red-600'}>
                          {item.tipe_transaksi === 'pemasukan' ? '+' : '-'}{formatCurrency(item.jumlah_transaksi)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.bukti_transaksi_url ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(item.bukti_transaksi_url!, '_blank')}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Lihat
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-700"
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
