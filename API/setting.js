// api/setting.js
const { supabase, setCors, getSetting } = require('./_db');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { action, ...p } = req.body || {};
  try {
    if (action === 'get')    return res.json(await get());
    if (action === 'update') return res.json(await update(p));
    return res.status(400).json({ success: false, message: 'Action tidak dikenal' });
  } catch(e) { return res.status(500).json({ success: false, message: e.message }); }
};

async function get() {
  return { success: true, data: await getSetting() };
}

async function update({ settings }) {
  const upserts = Object.entries(settings).map(([kunci, nilai]) => ({ kunci, nilai, deskripsi: '' }));
  const { error } = await supabase.from('spmb_setting').upsert(upserts, { onConflict: 'kunci' });
  if (error) return { success: false, message: error.message };
  return { success: true, message: 'Pengaturan berhasil disimpan' };
}
