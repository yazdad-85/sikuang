import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    if (!request.body) {
      return NextResponse.json({ error: 'No request body' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 });
    }

    console.log('Received file:', file.name, 'Size:', file.size);

    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);

    const originalName = file.name;
    const ext = path.extname(originalName);

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `${timestamp}-${randomString}${ext}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'bukti-transaksi');
    const filepath = path.join(uploadDir, filename);

    console.log('Creating directory:', uploadDir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    console.log('Writing file to:', filepath);
    fs.writeFileSync(filepath, buffer);

    const fileUrl = `/uploads/bukti-transaksi/${filename}`;
    console.log('File saved, returning URL:', fileUrl);

    return NextResponse.json({ 
      success: true,
      url: fileUrl,
      filename: filename,
      originalName: originalName,
      size: file.size 
    });
  } catch (error) {
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    
    return NextResponse.json({ 
      error: 'Error uploading file',
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500 
    });
  }
}
