#!/usr/bin/env node
(async () => {
  const { Pool } = require('pg');
  const fs = require('fs').promises;
  const path = require('path');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.DATABASE_URL });
  async function query(sql, params) {
    const client = await pool.connect();
    try { return await client.query(sql, params); } finally { client.release(); }
  }

  async function saveDataUrl(dataUrl, prefix = 'img') {
    try {
      const m = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/);
      if (!m) return null;
      const mime = m[1];
      const ext = m[2] || 'png';
      const base64 = m[3];
      const buf = Buffer.from(base64, 'base64');
      const uploadsDir = path.join(process.cwd(), 'uploads', prefix);
      await fs.mkdir(uploadsDir, { recursive: true });
      const filename = prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2,8) + '.' + ext;
      const filePath = path.join(uploadsDir, filename);
      await fs.writeFile(filePath, buf);
      const fullUrl = (process.env.IMAGES_URL || 'http://localhost:8081') + '/uploads/' + prefix + '/' + filename;
      return fullUrl;
    } catch (err) { console.error('saveDataUrl error', err); return null; }
  }

  try {
    console.log('Conectando a la base de datos...');
    // Users
    const users = await query("SELECT id, documento_foto FROM users WHERE documento_foto LIKE 'data:image%'");
    console.log('Usuarios encontrados:', users.rows.length);
    for (const u of users.rows) {
      try {
        const newUrl = await saveDataUrl(u.documento_foto, 'doc');
        if (newUrl) {
          await query('UPDATE users SET documento_foto=$1, document_migrated=TRUE WHERE id=$2', [newUrl, u.id]);
          console.log('Usuario', u.id, 'migrado ->', newUrl);
        }
      } catch (e) { console.error('Error usuario', u.id, e); }
    }

    // Loan applications
    const loans = await query("SELECT id, documento_foto FROM loan_applications WHERE documento_foto LIKE 'data:image%'");
    console.log('Solicitudes encontradas:', loans.rows.length);
    for (const l of loans.rows) {
      try {
        const newUrl = await saveDataUrl(l.documento_foto, 'doc');
        if (newUrl) {
          await query('UPDATE loan_applications SET documento_foto=$1 WHERE id=$2', [newUrl, l.id]);
          console.log('Solicitud', l.id, 'migrada ->', newUrl);
        }
      } catch (e) { console.error('Error loan', l.id, e); }
    }

    // Payments
    const payments = await query("SELECT id, receipt_url FROM payments WHERE receipt_url LIKE 'data:image%'");
    console.log('Pagos encontrados:', payments.rows.length);
    for (const p of payments.rows) {
      try {
        const newUrl = await saveDataUrl(p.receipt_url, 'receipts');
        if (newUrl) {
          await query('UPDATE payments SET receipt_url=$1 WHERE id=$2', [newUrl, p.id]);
          console.log('Pago', p.id, 'migrado ->', newUrl);
        }
      } catch (e) { console.error('Error pago', p.id, e); }
    }

    console.log('Migración finalizada');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error migración', err);
    await pool.end();
    process.exit(1);
  }
})();
