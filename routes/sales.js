const express = require("express");
const router = express.Router();
const db = require("../db");

/* ================= INDEX + SEARCH + PAGINATION ================= */
router.get("/", async (req, res) => {

  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;
  const search = req.query.search || "";

  try {

    const count = await db.query(
      `SELECT COUNT(*)
       FROM sales
       WHERE invoice_number ILIKE $1`,
      [`%${search}%`]
    );

    const totalRows = parseInt(count.rows[0].count);
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

/* ================= FORM ADD ================= */
router.get("/add", async (req, res) => {

  try {

    const goods = await db.query(
      `SELECT id,name,stock,selling_price
       FROM goods
       WHERE stock > 0
       ORDER BY name ASC`
    );

    res.render("sales/add", {
      goods: goods.rows
    });

  } catch (err) {

    console.error(err);
    res.send("Database Error");

  }

});

/* ================= SAVE SALE ================= */
router.post("/add", async (req, res) => {

  const { invoice_number, product_id, quantity } = req.body;

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

    if (qty <= 0) {
      throw new Error("Qty harus lebih dari 0");
    }

    if (product.stock < qty) {
      throw new Error("Stock tidak cukup");
    }

    const subtotal = price * qty;

    const salesInsert = await client.query(
      `INSERT INTO sales (invoice_number, total, created_at)
       VALUES ($1,$2,NOW())
       RETURNING id`,
      [invoice_number, subtotal]
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

/* ================= FORM EDIT ================= */
router.get("/edit/:id", async (req, res) => {

  try {

    const sale = await db.query(
      `SELECT *
       FROM sales
       WHERE id=$1`,
      [req.params.id]
    );

    const goods = await db.query(
      `SELECT * FROM goods ORDER BY name`
    );

    const detail = await db.query(
      `SELECT *
       FROM sales_detail
       WHERE sale_id=$1`,
      [req.params.id]
    );

    if (sale.rows.length === 0) {
      return res.send("Data tidak ditemukan");
    }

    res.render("sales/edit", {
      sale: sale.rows[0],
      detail: detail.rows[0],
      goods: goods.rows
    });

  } catch (err) {

    console.error(err);
    res.send("Database Error");

  }

});

/* ================= UPDATE SALE ================= */
router.post("/edit/:id", async (req, res) => {

  const { product_id, quantity } = req.body;
  const id = req.params.id;

  const client = await db.connect();

  try {

    await client.query("BEGIN");

    const oldDetail = await client.query(
      `SELECT goods_id, qty
       FROM sales_detail
       WHERE sale_id=$1`,
      [id]
    );

    const old = oldDetail.rows[0];

    await client.query(
      `UPDATE goods
       SET stock = stock + $1
       WHERE id=$2`,
      [old.qty, old.goods_id]
    );

    const productResult = await client.query(
      `SELECT selling_price, stock
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
    const subtotal = price * qty;

    await client.query(
      `UPDATE sales
       SET total=$1
       WHERE id=$2`,
      [subtotal, id]
    );

    await client.query(
      `UPDATE sales_detail
       SET goods_id=$1, price=$2, qty=$3, subtotal=$4
       WHERE sale_id=$5`,
      [product_id, price, qty, subtotal, id]
    );

    await client.query(
      `UPDATE goods
       SET stock = stock - $1
       WHERE id=$2`,
      [qty, product_id]
    );

    await client.query("COMMIT");

    res.redirect("/sales");

  } catch (err) {

    await client.query("ROLLBACK");
    console.error(err);
    res.send("Update gagal");

  } finally {

    client.release();

  }

});

/* ================= DELETE SALE ================= */
router.get("/delete/:id", async (req, res) => {

  const client = await db.connect();

  try {

    await client.query("BEGIN");

    const id = req.params.id;

    const items = await client.query(
      `SELECT goods_id, qty
       FROM sales_detail
       WHERE sale_id=$1`,
      [id]
    );

    for (let item of items.rows) {

      await client.query(
        `UPDATE goods
         SET stock = stock + $1
         WHERE id=$2`,
        [item.qty, item.goods_id]
      );

    }

    await client.query(
      `DELETE FROM sales_detail WHERE sale_id=$1`,
      [id]
    );

    await client.query(
      `DELETE FROM sales WHERE id=$1`,
      [id]
    );

    await client.query("COMMIT");

    res.redirect("/sales");

  } catch (err) {

    await client.query("ROLLBACK");
    console.error(err);
    res.send("Gagal hapus data");

  } finally {

    client.release();

  }

});

module.exports = router;