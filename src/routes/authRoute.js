const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const router = express.Router();

const admins = require('../DB/Admin');

const { generateToken, authenticateJWT } = require('../utils/authUtils.js');
const sendEmail = require('../utils/emailsUtils.js');

router.get('/admin/signup', (req, res) => {
    res.render('admin/auth/signUp');
});
router.get('/admin/login', (req, res) => {
    res.render('admin/auth/logIn');
});
router.get('/admin/otpcode', async (req, res) =>{
    const email = req.query.email;
    res.render('admin/auth/otpCode', {email});
});
router.get('/waitingApprovation', async (req, res) =>{
    const email = req.query.email;
    const admin = await admins.findOne({ "email": email });
    if(admin.approved) return res.redirect('/admin'); 
    const {nome, cognome} = admin;
    res.render('admin/auth/waitingApprovation', {nome, cognome}); 
});
router.get('/admin/approveUsers', authenticateJWT, async (req, res) =>{
    const needApprovalAdmins = await admins.find({"approved": false})
    res.render('admin/auth/approveUsers', {needApprovalAdmins});
});

router.post('/admin/signup', async (req, res) => {
    const nome = req.body.nome.replace(/\s/g, "").toLowerCase();
    const cognome = req.body.cognome.replace(/\s/g, "").toLowerCase();
    const email = req.body.email.replace(/\s/g, "").toLowerCase();
    const password = req.body.password;
    const username = nome+' '+cognome;

    const existingAdmin = await admins.findOne({ email });
    if (existingAdmin) {
        return res.render('errorPage', { error: 'L\'utente con questo nome utente esiste già' });
    }

    const randomBuffer = crypto.randomBytes(16);
    const randomNumber = randomBuffer.readUIntBE(0, 3);
    let otpCode = randomNumber % 1000000;
    if(otpCode < 100000) otpCode += 100000;

    const saltRoundsOTP = await bcrypt.genSalt(Math.min(12, 234));
    const saltRoundsPSWD = await bcrypt.genSalt(Math.max(268, 11));
    const hashedOTP = await bcrypt.hash(String(otpCode), saltRoundsOTP);
    const hashedPSWD = await bcrypt.hash(password, saltRoundsPSWD);
    try {
        const newAdmin = new admins({
            email: email,
            nome: nome,
            cognome: cognome,
            password: hashedPSWD,
            otp: hashedOTP,
            approved: false,
        });

        await newAdmin.save();
    } catch (error) {
        console.log(`errore nella registrazione di ${username}`);
        return res.render('errorPage', { error: 'Si è verificato un errore nella registrazione' });
    }
    const subject = 'Registrazione Istruttore Autoscuola';
    const text = `Gentile ${nome} ${cognome}, questo è il codice per verificare l'account da istruttore: ${otpCode}`;
    try {
        const result = await sendEmail(email, subject, text);
        console.log(result)
    } catch (error) {
        console.error(error)
        return res.render('errorPage', { error: 'Errore nell\'invio dell\'email con codice OTP' });
    }
    res.redirect(`/admin/otpcode?email=${encodeURIComponent(email)}`);
});

router.post('/admin/verificaOTP', async (req, res) =>{
    const email = req.body.email;
    const insertedOTP = Object.values(req.body).slice(-6);
    let otpString = '';
    for (const key in insertedOTP) {
        otpString += insertedOTP[key];
    }
    const check = await admins.findOne({ "email": email });
    const isOTPMatched = await bcrypt.compare(otpString, check.otp);
    if(!isOTPMatched){
        return res.render('errorPage', { error:'Il codice OTP inserito è errato'});
    }else{
        await admins.findOneAndUpdate({ "email": email }, {$unset: {"otp": ""}});
        const token = await generateToken(email);
        res.cookie('token', token, { httpOnly: true, maxAge: 604800000 });
        res.redirect(`/admin`);
    }
});

router.post('/admin/login', async (req, res) => {
    const email = (req.body.email).replace(/\s/g, "").toLowerCase();
    const password = req.body.password;
    const admin = await admins.findOne({ "email": email });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
        return res.render('errorPage', { error: 'Credenziali errate' });
    }

    const randomBuffer = crypto.randomBytes(16);
    const randomNumber = randomBuffer.readUIntBE(0, 3);
    let otpCode = randomNumber % 1000000;
    if(otpCode < 100000) otpCode += 100000;

    const saltRoundsOTP = await bcrypt.genSalt(Math.min(12, 234));
    const hashedOTP = await bcrypt.hash(String(otpCode), saltRoundsOTP);
    console.log(`Codice di verifica per ${email}: ${otpCode}`);
    await admins.findOneAndUpdate({ "email": email }, {"otp": hashedOTP});

    const subject = 'Login Istruttore Autoscuola';
    const text = `Gentile ${admin.nome} ${admin.cognome}, questo è il codice per accedere: ${otpCode}`;
    try {
        const result = await sendEmail(email, subject, text);
        console.log(result)
    } catch (error) {
        console.error(error)
        return res.render('errorPage', { error: 'Errore nell\'invio dell\'email con codice OTP' });
    }
    res.redirect(`/admin/otpcode?email=${encodeURIComponent(email)}`);
});

router.post('/logout', authenticateJWT, async (req, res) => {
    console.log(`L'istruttore ${req.user.email} ha appena effettuato il logOut`);
    res.cookie('token', '', {maxAge: 1});
    res.redirect('/admin/login');
});

router.post('/approveAdmin', authenticateJWT, async (req, res) =>{
    const email = req.body.email;
    const admin = await admins.findOneAndUpdate({"email": email}, {approved: true});
    const subject = 'Approvazione Admin Autoscuola';
    const text = `Gentile ${admin.nome} ${admin.cognome}, la informiamo che il suo account è stato approvato come admin. Per accedere prema qui ${process.env.SERVER_URL}/admin`;
    try {
        const result = await sendEmail(email, subject, text);
        console.log(result)
    } catch (error) {
        console.error(error)
    }
    res.redirect('/admin/approveUsers')
});
router.post('/disapproveAdmin', authenticateJWT, async (req, res) =>{
    await admins.deleteOne({"email": req.body.email});
    res.redirect('/admin/approveUsers')
});

module.exports = router;