const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {

  try {

    const result = await db.query(`
      SELECT id, barcode, name, stock, min_stock
      FROM goods
      WHERE stock <= min_stock
      ORDER BY stock ASC
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Failed load alerts" });

  }

});

module.exports = router;