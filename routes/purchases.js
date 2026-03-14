const express = require('express');
const router = express.Router();
const db = require('../db');

// ================= LIST + SEARCH + PAGINATION =================
router.get('/', async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const result = await db.query(`
      SELECT 
        p.id,
        p.invoice,
        p.total,
        p.date,
        s.name AS supplier
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
      WHERE s.name ILIKE $1
      ORDER BY p.id DESC
      LIMIT $2 OFFSET $3
    `, [`%${search}%`, limit, offset]);

    const count = await db.query(`
      SELECT COUNT(*) 
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
      WHERE s.name ILIKE $1
    `, [`%${search}%`]);

    res.render('purchases/index', {
      purchases: result.rows,
      totalPages: Math.ceil(parseInt(count.rows[0].count) / limit),
      page,
      search
    });

  } catch (err) {
    console.error(err);
    res.send("Error load purchases");
  }
});

// ================= FORM ADD PAGE =================
router.get("/add", async (req, res) => {

  try {

    const goodsResult = await db.query(`
      SELECT * FROM goods ORDER BY name
    `);

    const suppliersResult = await db.query(`
      SELECT * FROM suppliers ORDER BY name
    `);

    res.render("purchases/add", {
      goods: goodsResult.rows,
      suppliers: suppliersResult.rows
    });

  } catch (err) {
    console.error(err);
    res.send("Error load add purchase page");
  }

});

// ================= SAVE PURCHASE + ITEMS =================
router.post('/add', async (req, res) => {

  const client = await db.connect();

  try {

    await client.query('BEGIN');

    const supplier_id = parseInt(req.body.supplier_id);
    const total = parseInt(req.body.total);
    const items = req.body.items;

    if (!supplier_id || !items || Object.keys(items).length === 0) {
      return res.send("Supplier dan barang wajib diisi");
    }

    const invoice = "INV-" + Date.now();

    // 1 insert purchase header
    const purchase = await client.query(`
      INSERT INTO purchases(invoice, supplier_id, total, date)
      VALUES($1,$2,$3,NOW())
      RETURNING id
    `,[invoice, supplier_id, total]);

    const purchase_id = purchase.rows[0].id;

    // 2 insert items + update stock
    for (let key in items) {

      const item = items[key];

      const goods_id = parseInt(item.goods_id);
      const qty = parseInt(item.qty);
      const price = parseInt(item.price);

      if (!goods_id || !qty) continue;

      await client.query(`
        INSERT INTO purchase_items(purchase_id, goods_id, qty, price)
        VALUES($1,$2,$3,$4)
      `,[purchase_id, goods_id, qty, price]);

      // update stock
      const updateStock = await client.query(`
        UPDATE goods
        SET stock = stock + $1
        WHERE id = $2
        RETURNING stock
        `,[qty, goods_id]);
        
        console.log("Stock updated:", updateStock.rows);
      
      }

    await client.query('COMMIT');

    res.redirect('/purchases');

  } catch (err) {

    await client.query('ROLLBACK');

    console.error(err);

    res.send("Gagal simpan purchase");

  } finally {

    client.release();

  }

});

// ================= FORM EDIT =================
router.get('/edit/:id', async (req, res) => {

  try {

    const id = req.params.id;

    const purchase = await db.query(`
      SELECT * FROM purchases WHERE id=$1
    `,[id]);

    const suppliers = await db.query(`
      SELECT * FROM suppliers
    `);

    const goods = await db.query(`
      SELECT * FROM goods
    `);

    const items = await db.query(`
      SELECT pi.*, g.name
      FROM purchase_items pi
      LEFT JOIN goods g ON pi.goods_id = g.id
      WHERE pi.purchase_id=$1
    `,[id]);

    res.render('purchases/edit', {
      purchase: purchase.rows[0],
      suppliers: suppliers.rows,
      goods: goods.rows,
      items: items.rows
    });

  } catch (err) {

    console.error(err);

    res.send("Error edit page");

  }

});

// ================= UPDATE PURCHASE =================
router.post('/update/:id', async (req,res)=>{

  const client = await db.connect();

  try {

    await client.query('BEGIN');

    const id = req.params.id;
    const supplier_id = parseInt(req.body.supplier_id);
    const total = parseInt(req.body.total);
    const items = req.body.items;

    // ambil item lama
    const oldItems = await client.query(`
      SELECT goods_id, qty
      FROM purchase_items
      WHERE purchase_id=$1
    `,[id]);

    // rollback stock lama
    for (let item of oldItems.rows) {

      await client.query(`
        UPDATE goods
        SET stock = stock - $1
        WHERE id=$2
      `,[item.qty, item.goods_id]);

    }

    // update header
    await client.query(`
      UPDATE purchases
      SET supplier_id=$1, total=$2
      WHERE id=$3
    `,[supplier_id,total,id]);

    // hapus item lama
    await client.query(`
      DELETE FROM purchase_items
      WHERE purchase_id=$1
    `,[id]);

    // insert item baru
    for (let key in items) {

      const item = items[key];

      const goods_id = parseInt(item.goods_id);
      const qty = parseInt(item.qty);
      const price = parseInt(item.price);

      if (!goods_id || !qty ) continue;

      await client.query(`
        INSERT INTO purchase_items(purchase_id, goods_id, qty, price)
        VALUES($1,$2,$3,$4)
      `,[id, goods_id, qty, price]);

      // update stock baru
      await client.query(`
        UPDATE goods
        SET stock = stock + $1
        WHERE id=$2
      `,[qty, goods_id]);

    }

    await client.query('COMMIT');

    res.redirect('/purchases');

  } catch (err) {

    await client.query('ROLLBACK');

    console.error(err);

    res.send("Gagal update");

  } finally {

    client.release();

  }

});

// ================= DELETE PURCHASE =================
router.get('/delete/:id', async (req,res)=>{

  const client = await db.connect();

  try {

    await client.query('BEGIN');

    const id = req.params.id;

    // ambil item
    const items = await client.query(`
      SELECT goods_id, qty
      FROM purchase_items
      WHERE purchase_id=$1
    `,[id]);

    // rollback stock
    for (let item of items.rows){

      await client.query(`
        UPDATE goods
        SET stock = stock - $1
        WHERE id=$2
      `,[item.qty, item.goods_id]);

    }

    // hapus items
    await client.query(`
      DELETE FROM purchase_items
      WHERE purchase_id=$1
    `,[id]);

    // hapus header
    await client.query(`
      DELETE FROM purchases
      WHERE id=$1
    `,[id]);

    await client.query('COMMIT');

    res.redirect('/purchases');

  } catch (err) {

    await client.query('ROLLBACK');

    console.error(err);

    res.send("Gagal hapus data");

  } finally {

    client.release();

  }

});

module.exports = router;