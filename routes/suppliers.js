const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt"); 

/* =============== READ + SEARCH + SORT + PAGINATION ===================== */
router.get('/', async (req, res) => {
  try {
    let search = req.query.search || '';
    let sort = req.query.sort || 'supplier_id';
    let order = req.query.order || 'ASC';
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let offset = (page - 1) * limit;

    let keyword = `%${search}%`;

    // COUNT DATA
    const countQuery = `
      SELECT COUNT(*) 
      FROM suppliers
      WHERE name ILIKE $1
      OR address ILIKE $2
      OR phone ILIKE $3
    `;

    const countResult = await db.query(countQuery, [keyword, keyword, keyword]);
    const totalData = countResult.rows[0].count;
    const totalPages = Math.ceil(totalData / limit);

    // GET DATA
    const dataQuery = `
      SELECT * FROM suppliers
      WHERE name ILIKE $1
      OR address ILIKE $2
      OR phone ILIKE $3
      ORDER BY ${sort} ${order}
      LIMIT $4 OFFSET $5
    `;

    const results = await db.query(dataQuery, [keyword, keyword, keyword, limit, offset]);

    res.render('suppliers', {
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


/* ============================ ADD SUPPLIER =========================*/
router.get('/add', (req, res) => {
  res.render('suppliers/add');
});

router.post('/', async (req, res) => {
  try {
    const { name, address, phone } = req.body;

    const sql = `
      INSERT INTO suppliers (name, address, phone)
      VALUES ($1, $2, $3)
    `;

    await db.query(sql, [name, address, phone]);
    res.redirect('/suppliers');

  } catch (err) {
    console.error(err);
    res.send("Error tambah supplier");
  }
});


/* ================ EDIT SUPPLIERS ================ */
router.get('/edit/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const result = await db.query(
      "SELECT * FROM suppliers WHERE supplier_id = $1",
      [id]
    );

    res.render('suppliers/edit', { supplier: result.rows[0] });

  } catch (err) {
    console.error(err);
    res.send("Error ambil data supplier");
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, address, phone } = req.body;

    const sql = `
      UPDATE suppliers
      SET name=$1, address=$2, phone=$3
      WHERE supplier_id=$4
    `;

    await db.query(sql, [name, address, phone, id]);
    res.redirect('/suppliers');

  } catch (err) {
    console.error(err);
    res.send("Error update supplier");
  }
});


// ==============================
// DELETE SUPPLIER
// ==============================
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    await db.query(
      "DELETE FROM suppliers WHERE supplier_id=$1",
      [id]
    );

    res.redirect('/suppliers');

  } catch (err) {
    console.error(err);
    res.send("Error delete supplier");
  }
});

module.exports = router;