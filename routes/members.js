const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt"); // untuk hash password

/* ===================== INDEX ===================== */
router.get("/", async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 7;
  const offset = (page - 1) * limit;

  const result = await db.query(
    `SELECT * FROM members
     WHERE nama ILIKE $1 OR email ILIKE $1
     ORDER BY id DESC
     LIMIT $2 OFFSET $3`,
    [`%${search}%`, limit, offset]
  );

  const count = await db.query(
    `SELECT COUNT(*) FROM members
     WHERE nama ILIKE $1 OR email ILIKE $1`,
    [`%${search}%`]
  );

  const totalPages = Math.ceil(count.rows[0].count / limit);

  res.render("members/index", {
    members: result.rows,
    search,
    currentPage: page,
    totalPages
  });
});

/* ===================== ADD ===================== */
router.get("/add", (req, res) => {
  res.render("members/add");
});

router.post("/add", async (req, res) => {
  const { nama, email, password, role } = req.body;

  // hash password sebelum simpan
  const hashedPassword = await bcrypt.hash(password, 10);

  await db.query(
    "INSERT INTO members (nama, email, password, role) VALUES ($1,$2,$3,$4)",
    [nama, email, hashedPassword, role]
  );

  res.redirect("/members");
});

/* ===================== EDIT ===================== */
router.get("/edit/:id", async (req, res) => {
  const id = req.params.id;

  const result = await db.query(
    "SELECT * FROM members WHERE id=$1",
    [id]
  );

  res.render("members/edit", {
    member: result.rows[0]
  });
});

/* ===================== UPDATE ===================== */
router.post("/edit/:id", async (req, res) => {
  const id = req.params.id;
  const { nama, email, password, role } = req.body;

  if (password) {
    // hash password jika diisi
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "UPDATE members SET nama=$1, email=$2, password=$3, role=$4 WHERE id=$5",
      [nama, email, hashedPassword, role, id]
    );
  } else {
    // jika password kosong, jangan update password
    await db.query(
      "UPDATE members SET nama=$1, email=$2, role=$3 WHERE id=$4",
      [nama, email, role, id]
    );
  }

  res.redirect("/members");
});

/* ===================== DELETE ===================== */
router.get("/delete/:id", async (req, res) => {
  const id = req.params.id;

  await db.query("DELETE FROM members WHERE id=$1", [id]);

  res.redirect("/members");
});

/* ===================== EXPORT ===================== */
module.exports = router;