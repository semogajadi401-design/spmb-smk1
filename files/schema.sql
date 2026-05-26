-- ============================================================
-- SPMB SMK - Schema Database Supabase
-- Jalankan di Supabase SQL Editor (satu kali saja)
-- ============================================================

-- ─── TABEL PENGATURAN SEKOLAH ──────────────────────────────
CREATE TABLE IF NOT EXISTS spmb_setting (
  kunci TEXT PRIMARY KEY,
  nilai TEXT,
  deskripsi TEXT
);

INSERT INTO spmb_setting (kunci, nilai, deskripsi) VALUES
  ('NAMA_SEKOLAH',    'SMK NEGERI 1',             'Nama Sekolah'),
  ('NPSN',            '',                           'NPSN Sekolah'),
  ('ALAMAT_SEKOLAH',  'Jl. Pendidikan No.1',        'Alamat Sekolah'),
  ('LOGO_URL',        '',                           'URL Logo Sekolah'),
  ('TAHUN_AJARAN',    '2025/2026',                  'Tahun Ajaran SPMB'),
  ('TAGLINE',         'Mendidik Generasi Unggul',   'Tagline Sekolah'),
  ('LINK_AKTIF',      'true',                       'Status link pendaftaran'),
  ('PESAN_TUTUP',     'Pendaftaran telah ditutup.', 'Pesan saat link ditutup'),
  ('KUOTA',           '100',                        'Kuota penerimaan siswa')
ON CONFLICT (kunci) DO NOTHING;

-- ─── TABEL ADMIN ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spmb_admin (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nama TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin default: username=admin, password=admin123
INSERT INTO spmb_admin (username, password, nama) VALUES
  ('admin', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'Administrator')
ON CONFLICT (username) DO NOTHING;

-- ─── TABEL PERSYARATAN UPLOAD ──────────────────────────────
CREATE TABLE IF NOT EXISTS spmb_persyaratan (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  deskripsi TEXT,
  wajib BOOLEAN DEFAULT false,
  tipe_file TEXT DEFAULT 'image/jpeg,image/png,application/pdf',
  urutan INTEGER DEFAULT 0,
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Persyaratan default
INSERT INTO spmb_persyaratan (id, nama, deskripsi, wajib, urutan) VALUES
  ('PSY001', 'Kartu Keluarga', 'Upload foto/scan Kartu Keluarga (JPEG/PNG/PDF)', false, 1),
  ('PSY002', 'Ijazah / Surat Keterangan Lulus', 'Upload foto/scan Ijazah atau SKL terakhir (JPEG/PNG/PDF)', false, 2)
ON CONFLICT (id) DO NOTHING;

-- ─── TABEL CALON SISWA ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS spmb_pendaftar (
  id TEXT PRIMARY KEY,
  nama_lengkap TEXT NOT NULL,
  tempat_lahir TEXT,
  tanggal_lahir DATE,
  nisn TEXT,
  nama_ibu TEXT,
  no_hp TEXT,
  no_hp_ortu TEXT,
  nama_desa TEXT,
  status TEXT DEFAULT 'Baru',    -- Baru, Diverifikasi, Diterima, Ditolak
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABEL FILE UPLOAD PENDAFTAR ───────────────────────────
CREATE TABLE IF NOT EXISTS spmb_file (
  id TEXT PRIMARY KEY,
  id_pendaftar TEXT REFERENCES spmb_pendaftar(id) ON DELETE CASCADE,
  id_persyaratan TEXT REFERENCES spmb_persyaratan(id),
  nama_persyaratan TEXT,
  nama_file TEXT,
  url TEXT,
  ukuran INTEGER,
  tipe TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEX ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_spmb_pendaftar_status ON spmb_pendaftar(status);
CREATE INDEX IF NOT EXISTS idx_spmb_pendaftar_desa   ON spmb_pendaftar(nama_desa);
CREATE INDEX IF NOT EXISTS idx_spmb_file_pendaftar   ON spmb_file(id_pendaftar);

-- ─── STORAGE BUCKET (jalankan di SQL editor Supabase) ──────
-- Buat bucket 'spmb-files' di Supabase Storage > New Bucket
-- Nama: spmb-files, Public: TRUE

-- ─── ROW LEVEL SECURITY (nonaktif, auth di API layer) ──────
ALTER TABLE spmb_setting      DISABLE ROW LEVEL SECURITY;
ALTER TABLE spmb_admin        DISABLE ROW LEVEL SECURITY;
ALTER TABLE spmb_persyaratan  DISABLE ROW LEVEL SECURITY;
ALTER TABLE spmb_pendaftar    DISABLE ROW LEVEL SECURITY;
ALTER TABLE spmb_file         DISABLE ROW LEVEL SECURITY;
