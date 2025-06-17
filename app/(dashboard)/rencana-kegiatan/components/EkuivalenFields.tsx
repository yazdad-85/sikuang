'use client';

import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SATUAN_OPTIONS } from '../types';

interface EkuivalenFieldsProps {
  ekuivalen1: string;
  ekuivalen1Satuan: string;
  ekuivalen2: string;
  ekuivalen2Satuan: string;
  ekuivalen3: string;
  ekuivalen3Satuan: string;
  hargaSatuan: string;
  onChange: (values: {
    ekuivalen_1?: string;
    ekuivalen_1_satuan?: string;
    ekuivalen_2?: string;
    ekuivalen_2_satuan?: string;
    ekuivalen_3?: string;
    ekuivalen_3_satuan?: string;
    harga_satuan?: string;
    jumlah_rencana?: string;
  }) => void;
}

export function EkuivalenFields({
  ekuivalen1,
  ekuivalen1Satuan,
  ekuivalen2,
  ekuivalen2Satuan,
  ekuivalen3,
  ekuivalen3Satuan,
  hargaSatuan,
  onChange,
}: EkuivalenFieldsProps) {
  // Calculate total whenever any ekuivalen value changes
  useEffect(() => {
    const calculateTotal = () => {
      const val1 = parseFloat(ekuivalen1) || 0;
      const val2 = parseFloat(ekuivalen2) || 1;
      const val3 = parseFloat(ekuivalen3) || 1;
      const harga = parseFloat(hargaSatuan) || 0;

      const total = val1 * val2 * val3 * harga;
      
      if (total > 0) {
        onChange({ jumlah_rencana: total.toString() });
      }
    };

    calculateTotal();
  }, [ekuivalen1, ekuivalen2, ekuivalen3, hargaSatuan, onChange]);

  const handleCustomSatuan = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'ekuivalen_1_satuan' | 'ekuivalen_2_satuan' | 'ekuivalen_3_satuan'
  ) => {
    onChange({ [field]: e.target.value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Ekuivalen 1 */}
        <div className="space-y-2">
          <Label>Jumlah {ekuivalen1Satuan || 'Unit'}</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={ekuivalen1}
              onChange={(e) => onChange({ ekuivalen_1: e.target.value })}
            />
            <Select 
              value={ekuivalen1Satuan} 
              onValueChange={(value) => onChange({ ekuivalen_1_satuan: value })}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Satuan" />
              </SelectTrigger>
              <SelectContent>
                {SATUAN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {ekuivalen1Satuan === 'custom' && (
            <Input
              placeholder="Masukkan satuan"
              value={ekuivalen1Satuan === 'custom' ? '' : ekuivalen1Satuan}
              onChange={(e) => handleCustomSatuan(e, 'ekuivalen_1_satuan')}
              className="mt-2"
            />
          )}
        </div>

        {/* Ekuivalen 2 */}
        <div className="space-y-2">
          <Label>Jumlah {ekuivalen2Satuan || 'Unit'} (Opsional)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={ekuivalen2}
              onChange={(e) => onChange({ ekuivalen_2: e.target.value })}
            />
            <Select 
              value={ekuivalen2Satuan} 
              onValueChange={(value) => onChange({ ekuivalen_2_satuan: value })}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Satuan" />
              </SelectTrigger>
              <SelectContent>
                {SATUAN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {ekuivalen2Satuan === 'custom' && (
            <Input
              placeholder="Masukkan satuan"
              value={ekuivalen2Satuan === 'custom' ? '' : ekuivalen2Satuan}
              onChange={(e) => handleCustomSatuan(e, 'ekuivalen_2_satuan')}
              className="mt-2"
            />
          )}
        </div>

        {/* Ekuivalen 3 */}
        <div className="space-y-2">
          <Label>Jumlah {ekuivalen3Satuan || 'Unit'} (Opsional)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={ekuivalen3}
              onChange={(e) => onChange({ ekuivalen_3: e.target.value })}
            />
            <Select 
              value={ekuivalen3Satuan} 
              onValueChange={(value) => onChange({ ekuivalen_3_satuan: value })}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Satuan" />
              </SelectTrigger>
              <SelectContent>
                {SATUAN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {ekuivalen3Satuan === 'custom' && (
            <Input
              placeholder="Masukkan satuan"
              value={ekuivalen3Satuan === 'custom' ? '' : ekuivalen3Satuan}
              onChange={(e) => handleCustomSatuan(e, 'ekuivalen_3_satuan')}
              className="mt-2"
            />
          )}
        </div>
      </div>

      {/* Harga Satuan */}
      <div className="space-y-2">
        <Label>Harga Satuan (Rp)</Label>
        <Input
          type="number"
          min="0"
          step="1000"
          placeholder="0"
          value={hargaSatuan}
          onChange={(e) => onChange({ harga_satuan: e.target.value })}
        />
      </div>
    </div>
  );
}
