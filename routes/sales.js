const express = require('express');
const router = express.Router();
const db = require('../db');


// ====================== INDEX + SEARCH + PAGINATION ===================
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  try {

    // HITUNG TOTAL DATA
    const countResult = await db.query(
      `SELECT COUNT(*) 
       FROM sales
       WHERE invoice_number ILIKE $1`,
      [`%${search}%`]
    );

    const totalRows = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRows / limit);

    // AMBIL DATA
    const result = await db.query(
      `SELECT *
       FROM sales
       WHERE invoice_number ILIKE $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [`%${search}%`, limit, offset]
    );

    res.render('sales/index', {
      sales: result.rows,
      page,
      totalPages,
      search
    });

  } catch (err) {
    console.error(err);
    res.send("Database Error");
  }
});


// =========================== FORM ADD ============================
router.get('/add', async (req, res) => {
  try {
    const goodsResult = await db.query('SELECT * FROM goods ORDER BY name ASC');
    res.render('sales/add', { goods: goodsResult.rows });
  } catch (err) {
    console.error(err);
    res.send("Database Error");
  }
});


// ========================== SAVE SALE ============================
router.post('/add', async (req, res) => {
  const { invoice_number, product_id, quantity } = req.body;

  try {

    // AMBIL HARGA PRODUK
    const priceResult = await db.query(
      'SELECT selling_price FROM goods WHERE id = $1',
      [product_id]
    );

    if (priceResult.rows.length === 0) {
      return res.send("Product not found");
    }

    const price = parseFloat(priceResult.rows[0].price);
    const total = price * parseInt(quantity);

    // INSERT SALES
    await db.query(
      `INSERT INTO sales (invoice_number, total)
       VALUES ($1, $2)`,
      [invoice_number, total]
    );

    res.redirect('/sales');

  } catch (err) {
    console.error(err);
    res.send("Database Error");
  }
});

// ================= EDIT ====================
router.get('/edit/:id', async (req, res) => {
  try {

    const saleResult = await db.query(
      'SELECT * FROM sales WHERE id = $1',
      [req.params.id]
    );

    if (saleResult.rows.length === 0) {
      return res.send("Sale not found");
    }

    res.render('sales/edit', {
      sale: saleResult.rows[0],
      goods: []
    });

  } catch (err) {
    console.error(err);
    res.send("Database Error");
  }
});

/* ===================== DELETE ========================== */
router.get('/delete/:id', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM sales WHERE id = $1',
      [req.params.id]
    );
    res.redirect('/sales');
  } catch (err) {
    console.error(err);
    res.send("Database Error");
  }
});


module.exports = router;