const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");

/* ===================== CONFIG MULTER ===================== */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = Date.now() + ext;
    cb(null, filename);
  }
});

const upload = multer({ storage });

/* ===================== INDEX GOODS ===================== */
router.get("/", async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 7;
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT g.*, u.nama_unit AS unit_name
       FROM goods g
       LEFT JOIN units u ON g.unit_id = u.id
       WHERE g.name ILIKE $1 OR g.barcode ILIKE $1
       ORDER BY g.id DESC
       LIMIT $2 OFFSET $3`,
      [`%${search}%`, limit, offset]
    );

    const count = await db.query(
      `SELECT COUNT(*) FROM goods
       WHERE name ILIKE $1 OR barcode ILIKE $1`,
      [`%${search}%`]
    );

    const totalPages = Math.ceil(count.rows[0].count / limit);

    res.render("goods/index", {
      goods: result.rows,
      search,
      currentPage: page,
      totalPages
    });

  } catch (err) {
    console.error(err);
    res.send("Error load goods");
  }
});

/* ===================== FORM ADD ===================== */
router.get("/add", async (req, res) => {
  try {
    const units = await db.query("SELECT * FROM units ORDER BY nama_unit ASC");
    res.render("goods/add", { units: units.rows });
  } catch (err) {
    console.error(err);
    res.send("Error load form add goods");
  }
});

/* ===================== SAVE GOODS ===================== */
router.post("/add", upload.single("photo"), async (req, res) => {
  try {

    const barcode = req.body.barcode || null;
    const name = req.body.name;
    const stock = req.body.stock ? parseInt(req.body.stock) : 0;
    const purchase_price = req.body.purchase_price ? parseInt(req.body.purchase_price) : 0;
    const selling_price = req.body.selling_price ? parseInt(req.body.selling_price) : 0;
    const unit_id = req.body.unit_id ? parseInt(req.body.unit_id) : null;
    const category = req.body.category || null;
    const photo = req.file ? req.file.filename : null;

    if (!name) return res.send("Nama barang wajib diisi");

    await db.query(
      `INSERT INTO goods 
      (barcode, name, stock, purchase_price, selling_price, unit_id, category, photo)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [barcode, name, stock, purchase_price, selling_price, unit_id, category, photo]
    );

    res.redirect("/goods");

  } catch (err) {
    console.error(err);
    res.send(err.message);
  }
});

/* ===================== FORM EDIT ===================== */
router.get("/edit/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const goods = await db.query(
      "SELECT * FROM goods WHERE id=$1",
      [id]
    );

    const units = await db.query(
      "SELECT * FROM units ORDER BY nama_unit ASC"
    );

    res.render("goods/edit", {
      goods: goods.rows[0],
      units: units.rows
    });

  } catch (err) {
    console.error(err);
    res.send("Error load edit form");
  }
});

/* ===================== UPDATE GOODS + FOTO ===================== */
router.post("/edit/:id", upload.single("photo"), async (req, res) => {
  try {
    const id = req.params.id;

    const barcode = req.body.barcode || null;
    const name = req.body.name;
    const stock = req.body.stock ? parseInt(req.body.stock) : 0;
    const purchase_price = req.body.purchase_price ? parseInt(req.body.purchase_price) : 0;
    const selling_price = req.body.selling_price ? parseInt(req.body.selling_price) : 0;
    const unit_id = req.body.unit_id ? parseInt(req.body.unit_id) : null;

    const photo = req.file ? req.file.filename : null;

    if (photo) {
      await db.query(
        `UPDATE goods SET
          barcode=$1,
          name=$2,
          stock=$3,
          purchase_price=$4,
          selling_price=$5,
          unit_id=$6,
          photo=$7
        WHERE id=$8`,
        [barcode, name, stock, purchase_price, selling_price, unit_id, photo, id]
      );
    } else {
      await db.query(
        `UPDATE goods SET
          barcode=$1,
          name=$2,
          stock=$3,
          purchase_price=$4,
          selling_price=$5,
          unit_id=$6
        WHERE id=$7`,
        [barcode, name, stock, purchase_price, selling_price, unit_id, id]
      );
    }

    res.redirect("/goods");

  } catch (err) {
    console.error(err);
    res.send(err.message);
  }
});

/* ===================== DELETE ===================== */
router.get("/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;

    await db.query(
      "DELETE FROM goods WHERE id=$1",
      [id]
    );

    res.redirect("/goods");

  } catch (err) {
    console.error(err);
    res.send("Error delete data");
  }
});

module.exports = router;