const express = require("express");
const router = express.Router();
const db = require("../db");

/* ===================== INDEX ===================== */
router.get("/", async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT * FROM units
       WHERE nama_unit ILIKE $1 OR note ILIKE $1
       ORDER BY id DESC
       LIMIT $2 OFFSET $3`,
      [`%${search}%`, limit, offset]
    );

    const count = await db.query(
      `SELECT COUNT(*) FROM units
       WHERE nama_unit ILIKE $1 OR note ILIKE $1`,
      [`%${search}%`]
    );

    const totalPages = Math.ceil(count.rows[0].count / limit);

    res.render("units/index", {
      units: result.rows,
      search,
      currentPage: page,
      totalPages
    });

  } catch (err) {
    console.error(err);
    res.send("Error loading units");
  }
});


/* ===================== ADD ===================== */
router.get("/add", (req, res) => {
  res.render("units/add");
});

router.post("/add", async (req, res) => {
  try {
    const { nama_unit, note } = req.body;

    if (!nama_unit) {
      return res.send("Nama unit wajib diisi");
    }

    await db.query(
      "INSERT INTO units (nama_unit, note) VALUES ($1,$2)",
      [nama_unit, note]
    );

    res.redirect("/units");

  } catch (err) {
    console.error(err);
    res.send("Gagal menambahkan unit");
  }
});


/* ===================== EDIT ===================== */
router.get("/edit/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await db.query(
      "SELECT * FROM units WHERE id=$1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.send("Unit tidak ditemukan");
    }

    res.render("units/edit", {
      unit: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.send("Error load data unit");
  }
});


/* ===================== UPDATE ===================== */
router.post("/edit/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { nama_unit, note } = req.body;

    await db.query(
      "UPDATE units SET nama_unit=$1, note=$2 WHERE id=$3",
      [nama_unit, note, id]
    );

    res.redirect("/units");

  } catch (err) {
    console.error(err);
    res.send("Gagal update unit");
  }
});


/* ===================== DELETE ===================== */
router.get("/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;

    await db.query(
      "DELETE FROM units WHERE id=$1",
      [id]
    );

    res.redirect("/units");

  } catch (err) {
    console.error(err);
    res.send("Gagal hapus unit");
  }
});


module.exports = router;