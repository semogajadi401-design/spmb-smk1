// api/auth.js
const { supabase, hashPassword, setCors } = require('./_db');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { action, ...p } = req.body || {};
  try {
    if (action === 'login')          return res.json(await login(p));
    if (action === 'changePassword') return res.json(await changePassword(p));
    return res.status(400).json({ success: false, message: 'Action tidak dikenal' });
  } catch(e) { return res.status(500).json({ success: false, message: e.message }); }
};

async function login({ username, password }) {
  if (!username || !password) 
    return { success: false, message: 'Username dan password wajib diisi' };
  
  const hashed = hashPassword(password);
  
  // Cek username dulu
  const { data: user, error } = await supabase
    .from('spmb_admin')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !user) 
    return { success: false, message: 'Username atau password salah' };

  // Cek password
  if (user.password !== hashed)
    return { success: false, message: 'Username atau password salah' };

  return { success: true, nama: user.nama, username: user.username };
}
async function changePassword({ username, oldPassword, newPassword }) {
  const { data } = await supabase.from('spmb_admin')
    .select('*').eq('username', username).eq('password', hashPassword(oldPassword)).single();
  if (!data) return { success: false, message: 'Password lama tidak sesuai' };
  await supabase.from('spmb_admin').update({ password: hashPassword(newPassword) }).eq('username', username);
  return { success: true, message: 'Password berhasil diubah' };
}
