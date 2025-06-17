'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Banknote, Eye, EyeOff, Info } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [appName, setAppName] = useState('SIKUANG'); // Default value for app name

  // Fetch app name on component mount
  useEffect(() => {
    const fetchAppName = async () => {
      try {
        const { data, error } = await supabase
          .from('pengaturan_aplikasi')
          .select('nilai_pengaturan')
          .eq('kunci_pengaturan', 'nama_aplikasi')
          .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows, which is fine for default

        if (data) {
          setAppName(data.nilai_pengaturan || 'SIKUANG');
        }
      } catch (error) {
        console.error('Error fetching app name:', error);
      }
    };
    fetchAppName();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Try to login with provided credentials
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // If login fails, check if it's the default credentials
        if (email === 'admin@sikuang.com' && password === 'admin123') {
          // Try to create the default account if it doesn't exist
          const { error: signUpError } = await supabase.auth.signUp({
            email: 'admin@sikuang.com',
            password: 'admin123',
            options: {
              emailRedirectTo: undefined, // Disable email confirmation
            }
          });

          if (signUpError) {
            if (signUpError.message.includes('rate limit') || signUpError.message.includes('32 seconds')) {
              toast.error('Terlalu banyak percobaan. Silakan tunggu 32 detik dan coba lagi.');
            } else if (signUpError.message.includes('already registered')) {
              toast.error('Email atau kata sandi salah. Silakan periksa kembali.');
            } else {
              toast.error('Gagal membuat akun: ' + signUpError.message);
            }
          } else {
            toast.success('Akun default berhasil dibuat! Silakan login kembali dalam beberapa detik.');
            // Clear form
            setEmail('');
            setPassword('');
          }
        } else {
          // For other credentials, show generic error
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Email atau kata sandi salah');
          } else {
            toast.error('Login gagal: ' + error.message);
          }
        }
      } else {
        toast.success('Login berhasil!');
        router.push('/dashboard');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat login');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center">
            <Banknote className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">{appName}</CardTitle>
            <CardDescription>Sistem Keuangan</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-center text-sm">
              <strong>Selamat Datang Di Aplikasi Sistem Keuangan ({appName})</strong><br />
              Silahkan masukkan Username dan Password.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Masukkan email Anda"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan kata sandi Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-emerald-500 hover:bg-emerald-600" 
              disabled={loading}
            >
              {loading ? 'Sedang masuk...' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}