// api/pendaftar.js — CRUD pendaftar + dashboard + upload
const { supabase, generateID, setCors, getSetting } = require('./_db');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { action, ...p } = req.body || {};
  try {
    if (action === 'daftar')        return res.json(await daftar(p));
    if (action === 'getAll')        return res.json(await getAll(p));
    if (action === 'getOne')        return res.json(await getOne(p));
    if (action === 'updateStatus')  return res.json(await updateStatus(p));
    if (action === 'uploadLogo') return res.json(await uploadLogo(p));
    if (action === 'hapus')         return res.json(await hapus(p));
    if (action === 'dashboard')     return res.json(await dashboard());
    if (action === 'getPublicInfo') return res.json(await getPublicInfo());
    if (action === 'uploadFile')    return res.json(await uploadFile(p));
    if (action === 'deleteFile')    return res.json(await deleteFile(p));
    if (action === 'getFileLengkap') return res.json(await getFileLengkap(p));
    return res.status(400).json({ success: false, message: 'Action tidak dikenal' });
  } catch(e) { return res.status(500).json({ success: false, message: e.message }); }
};

// ── DAFTAR (dari form publik) ─────────────────────────────
async function daftar({ nama_lengkap, tempat_lahir, tanggal_lahir, nisn, nama_ibu, no_hp, no_hp_ortu, nama_desa }) {
  if (!nama_lengkap || !no_hp) return { success: false, message: 'Nama lengkap dan nomor HP wajib diisi' };

  // Cek NISN duplikat jika ada
  if (nisn && nisn.trim()) {
    const { data: existing } = await supabase.from('spmb_pendaftar')
      .select('id').eq('nisn', nisn.trim()).maybeSingle();
    if (existing) return { success: false, message: 'NISN sudah terdaftar sebelumnya' };
  }

  const id = generateID('PD');
  const { error } = await supabase.from('spmb_pendaftar').insert({
    id,
    nama_lengkap: nama_lengkap.trim(),
    tempat_lahir: tempat_lahir||'',
    tanggal_lahir: tanggal_lahir||null,
    nisn: nisn ? nisn.trim() : '',
    nama_ibu: nama_ibu||'',
    no_hp: no_hp.trim(),
    no_hp_ortu: no_hp_ortu||'',
    nama_desa: nama_desa||'',
    status: 'Baru'
  });
  if (error) return { success: false, message: 'Gagal mendaftar: ' + error.message };
  return { success: true, message: 'Pendaftaran berhasil!', id };
}
async function uploadLogo({ base64, tipe, ext }) {
  const path = `logo/sekolah_${Date.now()}.${ext}`;
  const buffer = Buffer.from(base64, 'base64');
  const { error } = await supabase.storage
    .from('spmb-files').upload(path, buffer, { contentType: tipe, upsert: true });
  if (error) return { success: false, message: error.message };
  const { data } = supabase.storage.from('spmb-files').getPublicUrl(path);
  return { success: true, url: data.publicUrl };
}
// ── UPLOAD FILE ───────────────────────────────────────────
async function uploadFile({ id_pendaftar, id_persyaratan, nama_persyaratan, nama_file, base64, tipe, ukuran }) {
  if (!id_pendaftar || !base64) return { success: false, message: 'Data tidak lengkap' };

  // Upload ke Supabase Storage
  const ext = tipe === 'application/pdf' ? 'pdf' : (tipe === 'image/png' ? 'png' : 'jpg');
  const path = `${id_pendaftar}/${id_persyaratan}_${Date.now()}.${ext}`;
  const buffer = Buffer.from(base64, 'base64');

  const { error: uploadErr } = await supabase.storage
    .from('spmb-files').upload(path, buffer, { contentType: tipe, upsert: true });
  if (uploadErr) return { success: false, message: 'Gagal upload: ' + uploadErr.message };

  const { data: urlData } = supabase.storage.from('spmb-files').getPublicUrl(path);
  const url = urlData.publicUrl;

  // Hapus file lama untuk persyaratan yang sama jika ada
  await supabase.from('spmb_file').delete()
    .eq('id_pendaftar', id_pendaftar).eq('id_persyaratan', id_persyaratan);

  const id = generateID('FL');
  const { error } = await supabase.from('spmb_file').insert({
    id, id_pendaftar, id_persyaratan, nama_persyaratan,
    nama_file, url, ukuran: ukuran||0, tipe
  });
  if (error) return { success: false, message: 'Gagal simpan record file: ' + error.message };
  return { success: true, message: 'File berhasil diunggah', url };
}

// ── DELETE FILE ───────────────────────────────────────────
async function deleteFile({ id }) {
  const { data: f } = await supabase.from('spmb_file').select('url').eq('id', id).single();
  if (f?.url) {
    const path = f.url.split('/spmb-files/')[1];
    if (path) await supabase.storage.from('spmb-files').remove([path]);
  }
  await supabase.from('spmb_file').delete().eq('id', id);
  return { success: true, message: 'File berhasil dihapus' };
}

// ── GET ALL (admin) ───────────────────────────────────────
async function getAll({ status, search }) {
  let q = supabase.from('spmb_pendaftar').select('*').order('created_at', { ascending: false });
  if (status && status !== 'Semua') q = q.eq('status', status);
  if (search) q = q.ilike('nama_lengkap', `%${search}%`);
  const { data, error } = await q;
  if (error) return { success: false, message: error.message };
  return { success: true, data: data || [] };
}

// ── GET ONE dengan files ──────────────────────────────────
async function getOne({ id }) {
  const { data: p } = await supabase.from('spmb_pendaftar').select('*').eq('id', id).single();
  if (!p) return { success: false, message: 'Data tidak ditemukan' };
  const { data: files } = await supabase.from('spmb_file').select('*').eq('id_pendaftar', id);
  return { success: true, data: p, files: files || [] };
}

// ── GET FILE LENGKAP (untuk admin: siapa yang belum upload apa) ──
async function getFileLengkap({ id_pendaftar }) {
  const { data: persyaratan } = await supabase.from('spmb_persyaratan')
    .select('*').eq('aktif', true).order('urutan');
  const { data: files } = await supabase.from('spmb_file')
    .select('*').eq('id_pendaftar', id_pendaftar);

  const fileMap = {};
  (files||[]).forEach(f => { fileMap[f.id_persyaratan] = f; });

  const result = (persyaratan||[]).map(p => ({
    ...p,
    file: fileMap[p.id] || null,
    sudahUpload: !!fileMap[p.id]
  }));

  return { success: true, data: result };
}

// ── UPDATE STATUS ─────────────────────────────────────────
async function updateStatus({ id, status, catatan }) {
  const { error } = await supabase.from('spmb_pendaftar')
    .update({ status, catatan: catatan||'', updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { success: false, message: error.message };
  return { success: true, message: 'Status berhasil diperbarui' };
}

// ── HAPUS ─────────────────────────────────────────────────
async function hapus({ id }) {
  // Hapus file dari storage
  const { data: files } = await supabase.from('spmb_file').select('url').eq('id_pendaftar', id);
  for (const f of (files||[])) {
    const path = f.url?.split('/spmb-files/')[1];
    if (path) await supabase.storage.from('spmb-files').remove([path]);
  }
  await supabase.from('spmb_file').delete().eq('id_pendaftar', id);
  const { error } = await supabase.from('spmb_pendaftar').delete().eq('id', id);
  if (error) return { success: false, message: error.message };
  return { success: true, message: 'Data pendaftar berhasil dihapus' };
}

// ── DASHBOARD ─────────────────────────────────────────────
async function dashboard() {
  const [
    { count: total },
    { count: baru },
    { count: diverifikasi },
    { count: diterima },
    { count: ditolak },
    { data: byDesa },
    { data: recent }
  ] = await Promise.all([
    supabase.from('spmb_pendaftar').select('*', { count: 'exact', head: true }),
    supabase.from('spmb_pendaftar').select('*', { count: 'exact', head: true }).eq('status','Baru'),
    supabase.from('spmb_pendaftar').select('*', { count: 'exact', head: true }).eq('status','Diverifikasi'),
    supabase.from('spmb_pendaftar').select('*', { count: 'exact', head: true }).eq('status','Diterima'),
    supabase.from('spmb_pendaftar').select('*', { count: 'exact', head: true }).eq('status','Ditolak'),
    supabase.from('spmb_pendaftar').select('nama_desa'),
    supabase.from('spmb_pendaftar').select('id,nama_lengkap,nama_desa,status,created_at').order('created_at',{ascending:false}).limit(10)
  ]);

  // Hitung per desa
  const desaMap = {};
  (byDesa||[]).forEach(r => {
    const d = r.nama_desa || 'Tidak Diisi';
    desaMap[d] = (desaMap[d]||0) + 1;
  });
  const perDesa = Object.entries(desaMap)
    .map(([desa, jumlah]) => ({ desa, jumlah }))
    .sort((a,b) => b.jumlah - a.jumlah);

  return {
    success: true,
    data: {
      total: total||0, baru: baru||0,
      diverifikasi: diverifikasi||0, diterima: diterima||0, ditolak: ditolak||0,
      perDesa, recent: recent||[]
    }
  };
}

// ── PUBLIC INFO (untuk halaman daftar) ───────────────────
async function getPublicInfo() {
  const { data: settings } = await supabase.from('spmb_setting').select('*');
  const s = {};
  (settings||[]).forEach(r => { s[r.kunci] = r.nilai; });
  const { data: persyaratan } = await supabase.from('spmb_persyaratan')
    .select('*').eq('aktif', true).order('urutan');
  return {
    success: true,
    setting: s,
    persyaratan: persyaratan||[]
  };
}
