const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// koneksi ke PostgreSQL
const db = new Pool({
  user: 'postgres',      // ganti sesuai configmu
  host: 'localhost',
  database: 'posdb',     // ganti sesuai DBmu
  password: 'hilmi12',  // ganti sesuai DBmu
  port: 5432
});

async function addUser(email, name, password, role) {
  try {
    const hashed = await bcrypt.hash(password, 10); // hash password
    await db.query(
      "INSERT INTO users (email, name, password, role, created_at) VALUES ($1,$2,$3,$4,NOW())",
      [email, name, hashed, role]
    );
    console.log(`User berhasil dibuat: ${email}`);
  } catch (err) {
    console.error("Gagal menambahkan user:", err);
  }
}

// Tambahkan user testing
addUser("staff@gmail.com", "staff", "12345", "staff");
