'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Banknote,
  LayoutDashboard,
  Database,
  Calendar,
  Receipt,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  BookOpen,
  Calculator,
  Menu
} from 'lucide-react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SidebarProps {
  className?: string;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Master Data',
    icon: Database,
    children: [
      {
        name: 'Tahun Anggaran',
        href: '/master-data/tahun-anggaran',
        icon: Calendar,
      },
      {
        name: 'Kategori',
        href: '/master-data/kategori',
        icon: FolderOpen,
      },
    ],
  },
  {
    name: 'Rencana Kegiatan',
    href: '/rencana-kegiatan',
    icon: BookOpen,
  },
  {
    name: 'Realisasi Kegiatan',
    href: '/realisasi-kegiatan',
    icon: Receipt,
  },
  {
    name: 'Laporan',
    icon: FileText,
    children: [
      {
        name: 'Buku Kas Umum',
        href: '/laporan/buku-kas-umum',
        icon: BookOpen,
      },
      {
        name: 'Realisasi Kegiatan',
        href: '/laporan/realisasi-kegiatan',
        icon: Receipt,
      },
      {
        name: 'Neraca Keuangan',
        href: '/laporan/neraca-keuangan',
        icon: Calculator,
      },
    ],
  },
  {
    name: 'Pengaturan',
    href: '/pengaturan',
    icon: Settings,
  },
];

function SidebarContent({ onItemClick, appName, handleLogout }: { onItemClick?: () => void; appName: string; handleLogout: () => void }) {
  const pathname = usePathname();

  const [expandedItems, setExpandedItems] = useState<string[]>(['Master Data', 'Laporan']);

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    );
  };

  const handleItemClick = () => {
    if (onItemClick) {
      onItemClick();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 lg:p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Banknote className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{appName}</h1>
            <p className="text-xs text-muted-foreground">Sistem Keuangan</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 py-4">
          {navigation.map((item) => {
            if (item.children) {
              const isExpanded = expandedItems.includes(item.name);
              return (
                <div key={item.name} className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => toggleExpanded(item.name)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="ml-2">{item.name}</span>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 ml-auto transition-transform',
                        isExpanded && 'rotate-90'
                      )}
                    />
                  </Button>
                  {isExpanded && (
                    <div className="ml-4 space-y-1">
                      {item.children.map((child) => (
                        <Button
                          key={child.href}
                          variant="ghost"
                          asChild
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            pathname === child.href && 'bg-accent text-accent-foreground'
                          )}
                          onClick={handleItemClick}
                        >
                          <Link href={child.href}>
                            <child.icon className="h-4 w-4" />
                            <span className="ml-2">{child.name}</span>
                          </Link>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Button
                key={item.href}
                variant="ghost"
                asChild
                className={cn(
                  'w-full justify-start text-left font-normal',
                  pathname === item.href && 'bg-accent text-accent-foreground'
                )}
                onClick={handleItemClick}
              >
                <Link href={item.href!}>
                  <item.icon className="h-4 w-4" />
                  <span className="ml-2">{item.name}</span>
                </Link>
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      <Separator />

      {/* Logout */}
      <div className="p-3">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-left font-normal text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          <span className="ml-2">Keluar</span>
        </Button>
      </div>
    </div>
  );
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [appName, setAppName] = useState('SIKUANG');

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
        console.error('Error fetching app name for sidebar:', error);
      }
    };
    fetchAppName();
  }, []);

  const router = useRouter();
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Berhasil keluar');
      router.push('/auth/login');
    } catch (error) {
      toast.error('Gagal keluar');
    }
  };

  return (
    <>
      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="fixed top-4 left-4 z-50 lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <DialogHeader>
              <DialogTitle className="sr-only">Navigasi Utama</DialogTitle>
            </DialogHeader>
            <SidebarContent onItemClick={() => {}} appName={appName} handleLogout={handleLogout} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className={cn('hidden lg:flex border-r bg-background flex-col h-full', className)}>
        <div className="p-6 flex items-center justify-between">
          <div className={cn('flex items-center space-x-2', collapsed && 'justify-center')}>
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Banknote className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold">{appName}</h1>
                <p className="text-xs text-muted-foreground">Sistem Keuangan</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 p-0"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-2 py-4">
            {navigation.map((item) => {
              if (item.children) {
                const [expandedItems, setExpandedItems] = useState<string[]>(['Master Data', 'Laporan']);
                const isExpanded = expandedItems.includes(item.name);
                
                const toggleExpanded = (name: string) => {
                  setExpandedItems(prev =>
                    prev.includes(name)
                      ? prev.filter(item => item !== name)
                      : [...prev, name]
                  );
                };

                return (
                  <div key={item.name} className="space-y-1">
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        collapsed && 'justify-center'
                      )}
                      onClick={() => !collapsed && toggleExpanded(item.name)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <>
                          <span className="ml-2">{item.name}</span>
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 ml-auto transition-transform',
                              isExpanded && 'rotate-90'
                            )}
                          />
                        </>
                      )}
                    </Button>
                    {!collapsed && isExpanded && (
                      <div className="ml-4 space-y-1">
                        {item.children.map((child) => (
                          <Button
                            key={child.href}
                            variant="ghost"
                            asChild
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              usePathname() === child.href && 'bg-accent text-accent-foreground'
                            )}
                          >
                            <Link href={child.href}>
                              <child.icon className="h-4 w-4" />
                              <span className="ml-2">{child.name}</span>
                            </Link>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  asChild
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    usePathname() === item.href && 'bg-accent text-accent-foreground',
                    collapsed && 'justify-center'
                  )}
                >
                  <Link href={item.href!}>
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span className="ml-2">{item.name}</span>}
                  </Link>
                </Button>
              );
            })}
          </div>
        </ScrollArea>

        <Separator />

        {/* Removed redundant Logout button from here. It's now inside SidebarContent. */}
      </div>
    </>
  );
}