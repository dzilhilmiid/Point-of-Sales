const express = require('express')
const router = express.Router()
const pool = require('../db')
const bcrypt = require('bcrypt')

/* ===================== PROFILE ===================== */
router.get('/', async (req, res) => {

    const result = await pool.query(
        "SELECT id,name,email FROM users LIMIT 1"
    )

    res.render('profile/index', {
        user: result.rows[0]
    })

})

/* ===================== EDIT PROFILE ===================== */
router.get('/edit', async (req, res) => {

    const result = await pool.query(
        "SELECT id,name,email FROM users LIMIT 1"
    )

    res.render('profile/edit', {
        user: result.rows[0]
    })

})


router.post('/update', async (req, res) => {

    const { name, email } = req.body

    await pool.query(
        "UPDATE users SET name=$1,email=$2 WHERE id=1",
        [name,email]
    )

    res.redirect('/profile')
})


/* ===================== CHANGE PASSWORD ===================== */

router.get('/password', (req,res)=>{
    res.render('profile/password')
})

router.post('/password', async (req,res)=>{

    const {old_password,new_password,retype_password} = req.body

    const result = await pool.query(
        "SELECT password FROM users WHERE id=1"
    )

    const user = result.rows[0]

    const match = await bcrypt.compare(old_password,user.password)

    if(!match){
        return res.send("Old password salah")
    }

    if(new_password !== retype_password){
        return res.send("Password tidak sama")
    }

    const hashPassword = await bcrypt.hash(new_password,10)

    await pool.query(
        "UPDATE users SET password=$1 WHERE id=1",
        [hashPassword]
    )

    res.redirect('/profile')

})

module.exports = router