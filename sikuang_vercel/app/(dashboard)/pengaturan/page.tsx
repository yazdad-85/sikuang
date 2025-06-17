'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase, PengaturanAplikasi } from '@/lib/supabase';
import { toast } from 'sonner';
import { Save, Settings, User, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

interface UserAccount {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
}

export default function PengaturanPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pengaturan, setPengaturan] = useState<Record<string, string>>({
    nama_kota: '',
    nama_bendahara: '',
    nama_pimpinan: '',
    nama_aplikasi: '',
  });

  // User management state
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Change password state
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // State for email change
  const [userEmail, setUserEmail] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [emailUpdateLoading, setEmailUpdateLoading] = useState(false);

  useEffect(() => {
    fetchData();
    const fetchCurrentUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        setNewEmail(user.email); // Initialize newEmail with current email
      }
    };
    fetchCurrentUserEmail();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch pengaturan
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

      // Fetch users (admin only)
      await fetchUsers();
    } catch (error) {
      toast.error('Gagal memuat pengaturan');
      console.error('Error fetching pengaturan:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      setUsers(
        (data.users || []).map((u) => ({
          id: u.id,
          email: u.email || '',
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
        }))
      );
    } catch (error) {
      console.error('Error fetching users:', error);
      // Don't show error toast as this might fail for non-admin users
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Update or insert each setting
      for (const [kunci, nilai] of Object.entries(pengaturan)) {
        const { error } = await supabase
          .from('pengaturan_aplikasi')
          .upsert({
            kunci_pengaturan: kunci,
            nilai_pengaturan: nilai,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'kunci_pengaturan'
          });

        if (error) throw error;
      }

      toast.success('Pengaturan berhasil disimpan');
    } catch (error) {
      toast.error('Gagal menyimpan pengaturan');
      console.error('Error saving pengaturan:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setPengaturan(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (userFormData.password !== userFormData.confirmPassword) {
      toast.error('Kata sandi tidak cocok');
      return;
    }

    if (userFormData.password.length < 6) {
      toast.error('Kata sandi minimal 6 karakter');
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: userFormData.email,
        password: userFormData.password,
      });

      if (error) throw error;

      toast.success('Pengguna berhasil ditambahkan');
      setDialogOpen(false);
      setUserFormData({ email: '', password: '', confirmPassword: '' });
      fetchUsers();
    } catch (error: any) {
      toast.error('Gagal menambahkan pengguna: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      toast.success('Pengguna berhasil dihapus');
      fetchUsers();
    } catch (error: any) {
      toast.error('Gagal menghapus pengguna: ' + error.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordFormData.newPassword !== passwordFormData.confirmNewPassword) {
      toast.error('Kata sandi baru tidak cocok');
      return;
    }

    if (passwordFormData.newPassword.length < 6) {
      toast.error('Kata sandi baru minimal 6 karakter');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordFormData.newPassword
      });

      if (error) throw error;

      toast.success('Kata sandi berhasil diubah');
      setChangePasswordOpen(false);
      setPasswordFormData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    } catch (error: any) {
      toast.error('Gagal mengubah kata sandi: ' + error.message);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailUpdateLoading(true);

    if (!newEmail || newEmail === userEmail) {
      toast.error('Silakan masukkan alamat email baru yang berbeda.');
      setEmailUpdateLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      toast.success('Perubahan email berhasil. Silakan cek email baru Anda untuk konfirmasi.');
      // Optionally, you might want to sign out the user or refresh session after email change
      // await supabase.auth.signOut();
      // router.push('/auth/login');
    } catch (error: any) {
      toast.error('Gagal mengubah email: ' + error.message);
      console.error('Error changing email:', error);
    } finally {
      setEmailUpdateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
          <p className="text-muted-foreground">
            Kelola pengaturan aplikasi
          </p>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground">
          Kelola pengaturan aplikasi dan manajemen pengguna
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Pengaturan Umum</TabsTrigger>
          <TabsTrigger value="users">Manajemen Pengguna</TabsTrigger>
          <TabsTrigger value="account">Akun Saya</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Pengaturan Umum
              </CardTitle>
              <CardDescription>
                Pengaturan yang akan digunakan dalam laporan dan dokumen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nama_aplikasi">Nama Aplikasi</Label>
                    <Input
                      id="nama_aplikasi"
                      placeholder="Contoh: SIKUANG"
                      value={pengaturan.nama_aplikasi}
                      onChange={(e) => handleInputChange('nama_aplikasi', e.target.value)}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Nama aplikasi yang akan ditampilkan di laporan
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nama_kota">Nama Kota</Label>
                    <Input
                      id="nama_kota"
                      placeholder="Contoh: Jakarta"
                      value={pengaturan.nama_kota}
                      onChange={(e) => handleInputChange('nama_kota', e.target.value)}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Nama kota yang akan ditampilkan di laporan
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nama_bendahara">Nama Bendahara</Label>
                    <Input
                      id="nama_bendahara"
                      placeholder="Contoh: John Doe"
                      value={pengaturan.nama_bendahara}
                      onChange={(e) => handleInputChange('nama_bendahara', e.target.value)}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Nama bendahara yang akan ditampilkan di laporan
                    </p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="nama_pimpinan">Nama Pimpinan</Label>
                    <Input
                      id="nama_pimpinan"
                      placeholder="Contoh: Jane Smith"
                      value={pengaturan.nama_pimpinan}
                      onChange={(e) => handleInputChange('nama_pimpinan', e.target.value)}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Nama pimpinan yang akan ditampilkan di laporan
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Manajemen Pengguna
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Pengguna
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tambah Pengguna Baru</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="user_email">Email</Label>
                        <Input
                          id="user_email"
                          type="email"
                          placeholder="email@example.com"
                          value={userFormData.email}
                          onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="user_password">Kata Sandi</Label>
                        <div className="relative">
                          <Input
                            id="user_password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Minimal 6 karakter"
                            value={userFormData.password}
                            onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="user_confirm_password">Konfirmasi Kata Sandi</Label>
                        <div className="relative">
                          <Input
                            id="user_confirm_password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Ulangi kata sandi"
                            value={userFormData.confirmPassword}
                            onChange={(e) => setUserFormData({ ...userFormData, confirmPassword: e.target.value })}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          Batal
                        </Button>
                        <Button type="submit">
                          Tambah Pengguna
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                Kelola pengguna yang dapat mengakses sistem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Tanggal Dibuat</TableHead>
                    <TableHead>Login Terakhir</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Belum ada data pengguna
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell>
                          {user.last_sign_in_at 
                            ? new Date(user.last_sign_in_at).toLocaleDateString('id-ID')
                            : 'Belum pernah login'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">Aktif</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Settings Tab */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ubah Kata Sandi</CardTitle>
              <CardDescription>Ubah kata sandi akun Anda.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Kata Sandi Saat Ini</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordFormData.currentPassword}
                      onChange={(e) => setPasswordFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Kata Sandi Baru</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordFormData.newPassword}
                      onChange={(e) => setPasswordFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Konfirmasi Kata Sandi Baru</Label>
                  <div className="relative">
                    <Input
                      id="confirm-new-password"
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      value={passwordFormData.confirmNewPassword}
                      onChange={(e) => setPasswordFormData(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    >
                      {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit">Ubah Kata Sandi</Button>
              </form>
            </CardContent>
          </Card>

          {/* Email Change Section */}
          <Card>
            <CardHeader>
              <CardTitle>Ubah Alamat Email</CardTitle>
              <CardDescription>Ubah alamat email yang digunakan untuk login.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangeEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-email">Email Saat Ini</Label>
                  <Input
                    id="current-email"
                    type="email"
                    value={userEmail}
                    disabled
                    className="opacity-75 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email Baru</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="Masukkan email baru Anda"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={emailUpdateLoading}>
                  {emailUpdateLoading ? 'Mengubah...' : 'Ubah Email'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}