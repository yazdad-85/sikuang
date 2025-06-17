'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase, Kategori, testDatabaseConnection, checkAuthStatus } from '@/lib/supabase';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react';

export default function KategoriPage() {
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Kategori | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nama_kategori: '',
    deskripsi: '',
    tipe: '' as 'pemasukan' | 'pengeluaran' | '',
  });

  useEffect(() => {
    fetchKategori();
  }, []);

  const fetchKategori = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Starting to fetch kategori data...');

      // Test database connection first
      const connectionTest = await testDatabaseConnection();
      if (!connectionTest.success) {
        throw new Error(`Database connection failed: ${connectionTest.error}`);
      }

      // Check authentication
      const authStatus = await checkAuthStatus();
      if (!authStatus.authenticated) {
        throw new Error('User not authenticated. Please login again.');
      }

      console.log('Database connection and auth check successful');

      // Fetch actual data
      const { data, error } = await supabase
        .from('kategori')
        .select('*')
        .order('tipe', { ascending: true })
        .order('nama_kategori', { ascending: true });

      if (error) {
        console.error('Error fetching kategori:', error);
        throw new Error(`Failed to fetch data: ${error.message}`);
      }

      console.log('Kategori data loaded successfully:', data);
      setKategori(data || []);
    } catch (error: any) {
      console.error('Error in fetchKategori:', error);
      setError(error.message || 'An error occurred while loading data');
      toast.error('Failed to load kategori data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tipe) {
      toast.error('Tipe kategori harus dipilih');
      return;
    }

    setSaving(true);

    try {
      console.log('Submitting form data:', formData);

      // Check authentication before saving
      const authStatus = await checkAuthStatus();
      if (!authStatus.authenticated) {
        throw new Error('Session expired. Please login again.');
      }

      // Validate form data
      if (!formData.nama_kategori.trim()) {
        throw new Error('Nama kategori tidak boleh kosong');
      }

      const submitData = {
        nama_kategori: formData.nama_kategori.trim(),
        deskripsi: formData.deskripsi.trim() || null,
        tipe: formData.tipe,
      };

      if (editingItem) {
        console.log('Updating existing kategori:', editingItem.id);
        const { error } = await supabase
          .from('kategori')
          .update({
            ...submitData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        toast.success('Kategori berhasil diperbarui');
      } else {
        console.log('Creating new kategori...');
        const { error } = await supabase
          .from('kategori')
          .insert([submitData]);

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        toast.success('Kategori berhasil ditambahkan');
      }

      setDialogOpen(false);
      resetForm();
      fetchKategori();
    } catch (error: any) {
      console.error('Error saving kategori:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Gagal menyimpan kategori';
      if (error.message.includes('duplicate key')) {
        errorMessage = 'Kategori dengan nama tersebut sudah ada';
      } else if (error.message.includes('permission denied')) {
        errorMessage = 'Tidak memiliki izin untuk menyimpan data';
      } else if (error.message.includes('Session expired')) {
        errorMessage = 'Sesi telah berakhir. Silakan login kembali';
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: Kategori) => {
    console.log('Editing kategori:', item);
    setEditingItem(item);
    setFormData({
      nama_kategori: item.nama_kategori,
      deskripsi: item.deskripsi || '',
      tipe: item.tipe,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kategori ini?')) return;

    try {
      console.log('Deleting kategori:', id);

      // Check authentication before deleting
      const authStatus = await checkAuthStatus();
      if (!authStatus.authenticated) {
        throw new Error('Session expired. Please login again.');
      }

      const { error } = await supabase
        .from('kategori')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      
      toast.success('Kategori berhasil dihapus');
      fetchKategori();
    } catch (error: any) {
      console.error('Error deleting kategori:', error);
      
      let errorMessage = 'Gagal menghapus kategori';
      if (error.message.includes('foreign key')) {
        errorMessage = 'Kategori tidak dapat dihapus karena masih digunakan';
      } else if (error.message.includes('permission denied')) {
        errorMessage = 'Tidak memiliki izin untuk menghapus data';
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      nama_kategori: '',
      deskripsi: '',
      tipe: '',
    });
    setEditingItem(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Kategori</h1>
            <p className="text-muted-foreground">
              Kelola kategori pemasukan dan pengeluaran
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-4 lg:p-6">
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
      <div className="space-y-4 lg:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Kategori</h1>
            <p className="text-muted-foreground">
              Kelola kategori pemasukan dan pengeluaran
            </p>
          </div>
          <Button onClick={fetchKategori} variant="outline" className="w-full sm:w-auto">
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
                Pastikan Anda sudah terhubung ke Supabase dan sudah login dengan benar.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Kategori</h1>
          <p className="text-muted-foreground">
            Kelola kategori pemasukan dan pengeluaran
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Kategori
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Kategori' : 'Tambah Kategori'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nama_kategori">Nama Kategori</Label>
                <Input
                  id="nama_kategori"
                  placeholder="Contoh: Belanja Operasional"
                  value={formData.nama_kategori}
                  onChange={(e) => setFormData({ ...formData, nama_kategori: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipe">Tipe Kategori</Label>
                <Select value={formData.tipe || undefined} onValueChange={(value) => setFormData({ ...formData, tipe: value as 'pemasukan' | 'pengeluaran' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pemasukan">Pemasukan</SelectItem>
                    <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deskripsi">Deskripsi (Opsional)</Label>
                <Textarea
                  id="deskripsi"
                  placeholder="Deskripsi kategori..."
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <Button type="button" variant="outline" onClick={handleDialogClose} disabled={saving} className="w-full sm:w-auto">
                  Batal
                </Button>
                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  {saving ? 'Menyimpan...' : (editingItem ? 'Perbarui' : 'Simpan')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Kategori</CardTitle>
          <CardDescription>
            Kategori yang telah dibuat dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kategori</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="hidden sm:table-cell">Deskripsi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kategori.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Belum ada data kategori
                    </TableCell>
                  </TableRow>
                ) : (
                  kategori.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{item.nama_kategori}</div>
                          <div className="sm:hidden text-xs text-muted-foreground mt-1">
                            {item.deskripsi || '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.tipe === 'pemasukan' ? 'default' : 'destructive'}
                          className="flex items-center w-fit"
                        >
                          {item.tipe === 'pemasukan' ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {item.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="max-w-xs truncate" title={item.deskripsi || ''}>
                          {item.deskripsi || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}