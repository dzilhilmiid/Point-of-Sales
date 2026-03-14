const express = require("express");
const router = express.Router();
const db = require("../db");

/* ================= READ + SEARCH + SORT + PAGINATION ================= */
router.get("/", async (req, res) => {
  try {

    let search = req.query.search || "";
    let sort = req.query.sort || "supplier_id";
    let order = req.query.order || "ASC";
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const offset = (page - 1) * limit;

    const keyword = `%${search}%`;

    /* ===== SORT SECURITY ===== */
    const allowedSort = ["supplier_id", "name", "phone", "address"];
    if (!allowedSort.includes(sort)) sort = "supplier_id";

    order = order === "DESC" ? "DESC" : "ASC";

    /* ===== COUNT DATA ===== */
    const countQuery = `
      SELECT COUNT(*) 
      FROM suppliers
      WHERE name ILIKE $1
      OR address ILIKE $2
      OR phone ILIKE $3
    `;

    const countResult = await db.query(countQuery, [keyword, keyword, keyword]);

    const totalData = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalData / limit);

    /* ===== GET DATA ===== */
    const dataQuery = `
      SELECT *
      FROM suppliers
      WHERE name ILIKE $1
      OR address ILIKE $2
      OR phone ILIKE $3
      ORDER BY ${sort} ${order}
      LIMIT $4 OFFSET $5
    `;

    const results = await db.query(dataQuery, [
      keyword,
      keyword,
      keyword,
      limit,
      offset
    ]);

    res.render("suppliers/index", {
      suppliers: results.rows,
      search,
      sort,
      order,
      page,
      totalPages,
      limit
    });

  } catch (err) {

    console.error(err);
    res.send("Error ambil data suppliers");

  }
});

/* ================= ADD SUPPLIER ================= */
router.get("/add", (req, res) => {
  res.render("suppliers/add");
});


router.post("/", async (req, res) => {
  try {

    const { name, address, phone } = req.body;

    await db.query(
      `INSERT INTO suppliers (name, address, phone)
       VALUES ($1,$2,$3)`,
      [name, address, phone]
    );

    res.redirect("/suppliers");

  } catch (err) {

    console.error(err);
    res.send("Error tambah supplier");

  }
});

/* ================= EDIT SUPPLIER ================= */
router.get("/edit/:id", async (req, res) => {
  try {

    const id = req.params.id;

    const result = await db.query(
      `SELECT *
       FROM suppliers
       WHERE supplier_id=$1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.send("Supplier tidak ditemukan");
    }

    res.render("suppliers/edit", {
      supplier: result.rows[0]
    });

  } catch (err) {

    console.error(err);
    res.send("Error ambil data supplier");

  }
});

/* ================= UPDATE SUPPLIER ================= */
router.post("/update/:id", async (req, res) => {
  try {

    const id = req.params.id;
    const { name, address, phone } = req.body;

    await db.query(
      `UPDATE suppliers
       SET name=$1,
           address=$2,
           phone=$3
       WHERE supplier_id=$4`,
      [name, address, phone, id]
    );

    res.redirect("/suppliers");

  } catch (err) {

    console.error(err);
    res.send("Error update supplier");

  }
});

/* ================= DELETE SUPPLIER ================= */
router.get("/delete/:id", async (req, res) => {
  try {

    const id = req.params.id;

    await db.query(
      `DELETE FROM suppliers
       WHERE supplier_id=$1`,
      [id]
    );

    res.redirect("/suppliers");

  } catch (err) {

    console.error(err);
    res.send("Error delete supplier");

  }
});

module.exports = router;