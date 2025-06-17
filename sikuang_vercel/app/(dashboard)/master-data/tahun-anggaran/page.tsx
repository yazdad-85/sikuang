'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase, TahunAnggaran } from '@/lib/supabase';
import { formatDate, formatDateForInput } from '@/lib/utils/date';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, AlertCircle, RefreshCw } from 'lucide-react';

export default function TahunAnggaranPage() {
  const [tahunAnggaran, setTahunAnggaran] = useState<TahunAnggaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TahunAnggaran | null>(null);
  const [formData, setFormData] = useState({
    nama_tahun_anggaran: '',
    tanggal_mulai: '',
    tanggal_berakhir: '',
    is_aktif: false,
  });

  useEffect(() => {
    fetchTahunAnggaran();
  }, []);

  const fetchTahunAnggaran = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Starting to fetch tahun anggaran data...');

      // Test database connection with a simple query
      const { data: testData, error: testError } = await supabase
        .from('tahun_anggaran')
        .select('id')
        .limit(1);

      if (testError) {
        console.error('Database connection test failed:', testError);
        throw new Error(`Koneksi database gagal: ${testError.message}`);
      }

      console.log('Database connection test successful');

      // Fetch actual data
      const { data, error } = await supabase
        .from('tahun_anggaran')
        .select('*')
        .order('tanggal_mulai', { ascending: false });

      if (error) {
        console.error('Error fetching tahun anggaran:', error);
        throw new Error(`Gagal memuat data: ${error.message}`);
      }

      console.log('Tahun anggaran data loaded successfully:', data);
      setTahunAnggaran(data || []);
    } catch (error: any) {
      console.error('Error in fetchTahunAnggaran:', error);
      setError(error.message || 'Terjadi kesalahan saat memuat data');
      toast.error('Gagal memuat data tahun anggaran: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('Submitting form data:', formData);

      // If setting as active, deactivate others
      if (formData.is_aktif) {
        console.log('Deactivating other tahun anggaran...');
        const { error: deactivateError } = await supabase
          .from('tahun_anggaran')
          .update({ is_aktif: false })
          .neq('id', editingItem?.id || '');

        if (deactivateError) {
          console.error('Error deactivating other years:', deactivateError);
          throw deactivateError;
        }
      }

      if (editingItem) {
        console.log('Updating existing tahun anggaran:', editingItem.id);
        const { error } = await supabase
          .from('tahun_anggaran')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Tahun anggaran berhasil diperbarui');
      } else {
        console.log('Creating new tahun anggaran...');
        const { error } = await supabase
          .from('tahun_anggaran')
          .insert([formData]);

        if (error) throw error;
        toast.success('Tahun anggaran berhasil ditambahkan');
      }

      setDialogOpen(false);
      resetForm();
      fetchTahunAnggaran();
    } catch (error: any) {
      console.error('Error saving tahun anggaran:', error);
      toast.error('Gagal menyimpan tahun anggaran: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEdit = (item: TahunAnggaran) => {
    console.log('Editing tahun anggaran:', item);
    setEditingItem(item);
    setFormData({
      nama_tahun_anggaran: item.nama_tahun_anggaran,
      tanggal_mulai: formatDateForInput(item.tanggal_mulai),
      tanggal_berakhir: formatDateForInput(item.tanggal_berakhir),
      is_aktif: item.is_aktif,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tahun anggaran ini?')) return;

    try {
      console.log('Deleting tahun anggaran:', id);
      const { error } = await supabase
        .from('tahun_anggaran')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Tahun anggaran berhasil dihapus');
      fetchTahunAnggaran();
    } catch (error: any) {
      console.error('Error deleting tahun anggaran:', error);
      toast.error('Gagal menghapus tahun anggaran: ' + (error.message || 'Unknown error'));
    }
  };

  const resetForm = () => {
    setFormData({
      nama_tahun_anggaran: '',
      tanggal_mulai: '',
      tanggal_berakhir: '',
      is_aktif: false,
    });
    setEditingItem(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tahun Anggaran</h1>
            <p className="text-muted-foreground">
              Kelola periode tahun anggaran untuk perencanaan keuangan
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tahun Anggaran</h1>
            <p className="text-muted-foreground">
              Kelola periode tahun anggaran untuk perencanaan keuangan
            </p>
          </div>
          <Button onClick={fetchTahunAnggaran} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Error:</strong> {error}</p>
              <p className="text-sm">
                Pastikan Anda sudah terhubung ke Supabase dan database sudah dikonfigurasi dengan benar.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tahun Anggaran</h1>
          <p className="text-muted-foreground">
            Kelola periode tahun anggaran untuk perencanaan keuangan
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Tahun Anggaran
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Tahun Anggaran' : 'Tambah Tahun Anggaran'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nama_tahun_anggaran">Nama Tahun Anggaran</Label>
                <Input
                  id="nama_tahun_anggaran"
                  placeholder="Contoh: TA 2024"
                  value={formData.nama_tahun_anggaran}
                  onChange={(e) => setFormData({ ...formData, nama_tahun_anggaran: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tanggal_mulai">Tanggal Mulai</Label>
                  <Input
                    id="tanggal_mulai"
                    type="date"
                    value={formData.tanggal_mulai}
                    onChange={(e) => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tanggal_berakhir">Tanggal Berakhir</Label>
                  <Input
                    id="tanggal_berakhir"
                    type="date"
                    value={formData.tanggal_berakhir}
                    onChange={(e) => setFormData({ ...formData, tanggal_berakhir: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_aktif"
                  checked={formData.is_aktif}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_aktif: checked })}
                />
                <Label htmlFor="is_aktif">Tahun Anggaran Aktif</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Batal
                </Button>
                <Button type="submit">
                  {editingItem ? 'Perbarui' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Tahun Anggaran</CardTitle>
          <CardDescription>
            Tahun anggaran yang telah dibuat dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Tahun Anggaran</TableHead>
                <TableHead>Tanggal Mulai</TableHead>
                <TableHead>Tanggal Berakhir</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tahunAnggaran.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Belum ada data tahun anggaran
                  </TableCell>
                </TableRow>
              ) : (
                tahunAnggaran.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nama_tahun_anggaran}</TableCell>
                    <TableCell>{formatDate(item.tanggal_mulai)}</TableCell>
                    <TableCell>{formatDate(item.tanggal_berakhir)}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_aktif ? 'default' : 'secondary'}>
                        {item.is_aktif ? 'Aktif' : 'Tidak Aktif'}
                      </Badge>
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
        </CardContent>
      </Card>
    </div>
  );
}