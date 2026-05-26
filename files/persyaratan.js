// api/persyaratan.js — Kelola persyaratan upload dokumen
const { supabase, generateID, setCors } = require('./_db');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { action, ...p } = req.body || {};
  try {
    if (action === 'getAll')  return res.json(await getAll());
    if (action === 'tambah')  return res.json(await tambah(p));
    if (action === 'edit')    return res.json(await edit(p));
    if (action === 'hapus')   return res.json(await hapus(p));
    return res.status(400).json({ success: false, message: 'Action tidak dikenal' });
  } catch(e) { return res.status(500).json({ success: false, message: e.message }); }
};

async function getAll() {
  const { data, error } = await supabase.from('spmb_persyaratan')
    .select('*').eq('aktif', true).order('urutan');
  if (error) return { success: false, message: error.message };
  return { success: true, data: data || [] };
}

async function tambah({ nama, deskripsi, wajib, urutan }) {
  const id = generateID('PSY');
  const { error } = await supabase.from('spmb_persyaratan').insert({
    id, nama, deskripsi: deskripsi||'', wajib: !!wajib,
    urutan: urutan||0, aktif: true
  });
  if (error) return { success: false, message: error.message };
  return { success: true, message: 'Persyaratan berhasil ditambahkan', id };
}

async function edit({ id, nama, deskripsi, wajib, urutan }) {
  const { error } = await supabase.from('spmb_persyaratan')
    .update({ nama, deskripsi: deskripsi||'', wajib: !!wajib, urutan: urutan||0 })
    .eq('id', id);
  if (error) return { success: false, message: error.message };
  return { success: true, message: 'Persyaratan berhasil diperbarui' };
}

async function hapus({ id }) {
  const { error } = await supabase.from('spmb_persyaratan')
    .update({ aktif: false }).eq('id', id);
  if (error) return { success: false, message: error.message };
  return { success: true, message: 'Persyaratan berhasil dihapus' };
}
