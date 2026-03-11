const express = require("express");
const router = express.Router();
const db = require("../db");

/* ====================== INDEX + SEARCH + PAGINATION ====================== */
router.get("/", async (req, res) => {

  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;
  const search = req.query.search || "";

  try {

    const countResult = await db.query(
      `SELECT COUNT(*) 
       FROM sales
       WHERE invoice_number ILIKE $1`,
      [`%${search}%`]
    );

    const totalRows = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRows / limit);

    const result = await db.query(
      `SELECT *
       FROM sales
       WHERE invoice_number ILIKE $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [`%${search}%`, limit, offset]
    );

    res.render("sales/index", {
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


/* ====================== FORM ADD ====================== */
router.get("/add", async (req, res) => {

  try {

    const goodsResult = await db.query(
      "SELECT * FROM goods ORDER BY name ASC"
    );

    res.render("sales/add", {
      goods: goodsResult.rows
    });

  } catch (err) {

    console.error(err);
    res.send("Database Error");

  }

});


/* ====================== SAVE SALE ====================== */
router.post("/add", async (req, res) => {

  const { invoice_number, product_id, quantity } = req.body;

  const userId = req.session.user.id;

  const client = await db.connect();

  try {

    await client.query("BEGIN");

    const productResult = await client.query(
      `SELECT id, selling_price, stock
       FROM goods
       WHERE id=$1`,
      [product_id]
    );

    if (productResult.rows.length === 0) {
      throw new Error("Produk tidak ditemukan");
    }

    const product = productResult.rows[0];

    const price = parseInt(product.selling_price);
    const qty = parseInt(quantity);

    if (isNaN(price) || isNaN(qty)) {
      throw new Error("Price atau Qty tidak valid");
    }

    if (qty <= 0) {
      throw new Error("Qty harus lebih dari 0");
    }

    if (product.stock < qty) {
      throw new Error("Stock tidak cukup");
    }

    const subtotal = price * qty;

    const salesInsert = await client.query(
      `INSERT INTO sales (invoice_number, total, user_id, created_at)
       VALUES ($1,$2,$3,NOW())
       RETURNING id`,
      [invoice_number, subtotal, userId]
    );

    const saleId = salesInsert.rows[0].id;

    await client.query(
      `INSERT INTO sales_detail
       (sale_id, goods_id, price, qty, subtotal)
       VALUES ($1,$2,$3,$4,$5)`,
      [saleId, product_id, price, qty, subtotal]
    );

    await client.query(
      `UPDATE goods
       SET stock = stock - $1
       WHERE id = $2`,
      [qty, product_id]
    );

    await client.query("COMMIT");

    res.redirect("/sales");

  } catch (err) {

    await client.query("ROLLBACK");

    console.error(err);
    res.send("Transaksi gagal: " + err.message);

  } finally {

    client.release();

  }

});

/* ====================== EDIT ====================== */
router.get("/edit/:id", async (req, res) => {

  try {

    const result = await db.query(
      `SELECT *
       FROM sales
       WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.session.user.id]
    );

    if (result.rows.length === 0) {
      return res.send("Tidak punya akses");
    }

    res.render("sales/edit", {
      sale: result.rows[0]
    });

  } catch (err) {

    console.error(err);
    res.send("Database Error");

  }

});

/* ====================== DELETE ====================== */
router.get("/delete/:id", async (req, res) => {

  try {

    const check = await db.query(
      `SELECT *
       FROM sales
       WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.session.user.id]
    );

    if (check.rows.length === 0) {
      return res.send("Tidak punya akses");
    }

    await db.query(
      `DELETE FROM sales WHERE id=$1`,
      [req.params.id]
    );

    res.redirect("/sales");

  } catch (err) {

    console.error(err);
    res.send("Database Error");

  }

});

module.exports = router;