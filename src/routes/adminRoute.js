const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

const admins = require('../DB/Admin');
const utenti = require('../DB/User');

router.get('/admin', async (req, res) =>{
    const users = await utenti.find({});
    res.render('admin/usersPage', {users})
});
router.get('/userPage', async (req, res) =>{
    const user = await utenti.findOne({"cFiscale": req.query.cf});
    if(!user){
        return res.render('errorPage',{error: 'utente non trovato'});
    }
    res.render('admin/userPage',{user});
});
module.exports = router;