// api/_db.js — Shared Supabase client SPMB
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function hashPassword(p) {
  return crypto.createHash('sha256').update(p).digest('hex');
}

function generateID(prefix) {
  const now = new Date();
  const ts = now.getFullYear().toString().slice(-2)
    + String(now.getMonth()+1).padStart(2,'0')
    + String(now.getDate()).padStart(2,'0')
    + String(now.getHours()).padStart(2,'0')
    + String(now.getMinutes()).padStart(2,'0')
    + String(now.getSeconds()).padStart(2,'0');
  const rand = Math.floor(Math.random()*9000+1000);
  return `${prefix}${ts}${rand}`;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

async function getSetting() {
  const { data } = await supabase.from('spmb_setting').select('*');
  const r = {};
  (data||[]).forEach(row => { r[row.kunci] = row.nilai; });
  return r;
}

module.exports = { supabase, hashPassword, generateID, setCors, getSetting };
