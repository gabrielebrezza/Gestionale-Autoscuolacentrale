const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const https = require('https');
const axios = require('axios');
const exceljs = require('exceljs');

const router = express.Router();
router.use(bodyParser.json({ limit: '900mb' }));
router.use(bodyParser.urlencoded({ limit: '900mb', extended: true }));
//databases
const admins = require('../DB/Admin');
const rinnovi = require('../DB/Rinnovi');
const SyncDate = require('../DB/SyncDate');
const storicoFattureGenerali = require('../DB/StoricoFattureGenerali');
const Credentials = require('../DB/Credentials');
const Scadenziario = require('../DB/Scadenziario');
const Duplicati = require('../DB/Duplicati');
const programmaScadenziario = require('../DB/programmaScadenziario');
const infoScadenziario = require('../DB/infoScadenziario');
//functions
const sendEmail = require('../utils/emailsUtils.js');
const { authenticateJWT } = require('../utils/authUtils.js');
const {searchUserPortale, searchExpirationPortale} = require('../utils/portaleAutomobilistaUtils.js');
const { trovaProvincia } = require('../utils/genericUtils.js');

router.get('/admin/rinnovi', authenticateJWT, async (req, res) =>{
    const users = await rinnovi.find({});
    res.render('admin/rinnovi/usersPage', {users})
});

router.get('/admin/rinnovi/addUser', authenticateJWT, async (req, res) =>{
    res.render('admin/rinnovi/addUser')
});
router.post('/rinnovi/addUser', authenticateJWT, async (req, res) => {
    const {nome, cognome, cf, email, tel, note, nPatente, protocollo} = req.body;
    let spedizione, visita, contatti;
    try {
        const [via, nCivico, cap, comune, provincia] = req.body.indirizzo.split(',');
        spedizione = {
            via: via.toLowerCase().replace(/\s+/g, " ").trim(),
            nCivico: nCivico.toLowerCase().replace(/\s+/g, "").trim(),
            cap: cap.trim(),
            comune: comune.toLowerCase().replace(/\s+/g, " ").trim(),
            provincia: provincia.trim()
        }
        const [data, ora] = req.body.visita.split('T');
        visita = {
            data: data,
            ora: ora
        }
        contatti = {
            email: email,
            tel: tel
        }
    } catch (error) {
        return res.status(500).json({error: 'Errore nel recupero dell\'indirizzo'});
    }
    const saveUser = new rinnovi({
        "nome": nome.trim(),
        "cognome": cognome.trim(),
        "cf": cf.trim(),
        "contatti": contatti,
        "spedizione": spedizione,
        "visita": visita,
        "nPatente": nPatente.trim(),
        "protocollo": protocollo.trim(),
        "creationDate": new Date(),
        "note": note
    });
        saveUser.save()
        .then(() => {
            console.log(`Nuovo utente rinnovi salvato: ${nome} ${cognome}`);
            return res.status(200).json({ message: 'Dati salvati con successo!', id: saveUser._id });
        })
        .catch((error) => {
            console.error(`Errore durante il salvataggio del nuovo utente rinnovi: ${error}`);
            return res.status(500).json({error: 'Errore durante il salvataggio dell\'utente'});
        });
});
router.post('/rinnovi/deleteUsers', authenticateJWT, async (req, res)=> {
    const {action} = req.body;
    const ids = (Object.keys(req.body)
        .filter(key => key.startsWith('user')))
        .map(key => req.body[key]);
    try {
        if(action == 'archive'){
            for (const id of ids) {
                await rinnovi.findOneAndUpdate({"_id": id}, {"archiviato": true});
                console.log(`utente rinnovi ${id} archiviato`);
            }
        }else if(action == 'unarchive'){
            for (const id of ids) {
                await rinnovi.findOneAndUpdate({"_id": id}, {"archiviato": false});
                console.log(`utente rinnovi ${id} disarchiviato`);
            }
        }else{
            for (const id of ids) {
                await rinnovi.deleteOne({"_id": id});
                console.log(`utente rinnovi ${id} eliminato definitivamente`);
            }
        }
        return res.redirect('/admin/rinnovi');
    } catch (error) {
        console.error(`errore durante l'eliminazione degli utenti rinnovi: ${error}`);
        return res.render('errorPage', {error: `errore durante l'eliminazione degli alievi`});
    }
});
router.get('/admin/rinnovi/pagamenti', async (req, res) => {
    const pagamenti = await rinnovi.findOne({"_id": req.query.id}, {"fatture": 1}); 
    if(!pagamenti.fatture.data) return res.render('errorPage', {error: "Questo utente non ha effetuato ancora un pagamento"});
    res.render('admin/rinnovi/payments/storicoPagamenti',{pagamento: pagamenti.fatture})
});








router.post('/uploadUserImage', async (req, res) => {
    const data = req.body.image;
    const id = req.body.id;
    const location = req.body.location;
    try{
        const base64Data = data.replace(/^data:image\/jpeg;base64,/, "").replace(/\s/g, '');
        const filePath = path.join('privateImages', location , `${id}.jpeg`);
        fs.writeFile(filePath, base64Data, 'base64', (err) => {
            if (err) {
                console.error(`Errore nel salvataggio dell'immagine ${location} ${err}`);
                return res.status(500).json({ message: `Errore nel salvataggio dell'immagine ${location}` });
            }
            res.status(200).json({ message: 'immagine salvata con successo' });
        });
    }catch(err){
        console.error(`si è verificato un errore ${err}`);
    }
});

router.delete('/deleteUserImage', authenticateJWT, async (req, res) => {
    const { id, location } = req.body;
    const filePath = path.join('privateImages', location , `${id}.jpeg`);
    try {
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
        res.status(200).json({ message: 'Immagine eliminata con successo' });
    } catch (err) {
        console.error(`Errore durante l'eliminazione dell'immagine:`, err);
        res.status(500).send(`Errore durante l'eliminazione dell'immagine`);
    }
});

router.get('/admin/rinnovi/userPage', authenticateJWT, async (req, res)=> {
    const id = req.query.id;
    const user = await rinnovi.findOne({"_id": id});
    res.render('admin/rinnovi/userPage', {user});
});


router.post('/rinnovi/updateUser', authenticateJWT, async (req, res)=> {
    const id = req.body.id;
    const dati = req.body;
    const [dataVisita, oraVisita] = dati.visita.split('T');
    const userData= {
        nome: dati.nome,
        cognome: dati.cognome,
        cf: dati.cf,
        contatti: {
            email: dati.email,
            tel: dati.tel,
        },
        spedizione: {
            via: dati.viaResidenza,
            nCivico: dati.civicoResidenza,
            cap: dati.capResidenza,
            comune: dati.comuneResidenza,
            provincia: dati.provinciaResidenza,
        },
        visita: {
            data: dataVisita,
            ora: oraVisita
        },
        protocollo: dati.nProtocollo,
        nPatente: dati.nPatente,
        note: dati.note
    };
    await rinnovi.findOneAndUpdate({"_id": id}, userData);
    res.redirect(`/admin/rinnovi/userPage?id=${id}`);
});
router.post('/admin/rinnovi/downloadFattura', authenticateJWT, async (req, res)=> {
    try {
        console.log(req.body.numero)
        const fattura = await storicoFattureGenerali.findOne({"tipo": 'rinnovo', "numero": req.body.numero});
        if (fattura) {
            const filePath = path.join(__dirname, '../../fatture', 'elettroniche', fattura.nomeFile);
            if (fs.existsSync(filePath)) {
                res.set('Content-Type', 'application/xml');
                res.set('Content-Disposition', `attachment; filename="${fattura.nomeFile}"`);
        
                const fileStream = fs.createReadStream(filePath);
                fileStream.pipe(res);
            } else {
                console.warn(`Il file ${fattura.nomeFile} non esiste nella cartella fatture.`);
                res.status(404).send('File not found');
            }
        } else {
            console.warn(`Nessuna fattura trovata per il numero ${req.body.numero}.`);
            res.status(404).send('Fattura non trovata');
        }
    } catch (error) {
        console.error('Si è verificato un errore durante il download della fattura rinnovi:', error);
    res.render('errorPage', {error: 'Si è verificato un errore durante il download della fattura'});
    }
});

const fetchBookings = async () => {
    if(process.env.SERVER_URL == 'http://localhost') return;
    const GRAPHQL_URL = process.env.GRAPHQL_URL_RINNOVO;
    const AUTH_EMAIL = process.env.AUTH_EMAIL_RINNOVO;
    const AUTH_PASSWORD = process.env.AUTH_PASSWORD_RINNOVO;
    const authenticate = async () => {
        try {
            const authQuery = `
            mutation {
                authenticateUserWithPassword(email: "${AUTH_EMAIL}", password: "${AUTH_PASSWORD}") {
                    ... on UserAuthenticationWithPasswordSuccess {
                        sessionToken
                    }
                    ... on UserAuthenticationWithPasswordFailure {
                        message
                    }
                }
            }`;

            const authData = JSON.stringify({ query: authQuery });

            const authOptions = {
                hostname: new URL(GRAPHQL_URL).hostname,
                path: new URL(GRAPHQL_URL).pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(authData),
                },
            };
            
            return new Promise((resolve, reject) => {
                const req = https.request(authOptions, (res) => {
                    let body = '';

                    res.on('data', (chunk) => {
                        body += chunk;
                    });

                    res.on('end', () => {
                        const response = JSON.parse(body);
                        if (response.data.authenticateUserWithPassword.sessionToken) {
                            resolve(response.data.authenticateUserWithPassword.sessionToken);
                        } else {
                            reject('Authentication failed: ' + response.data.authenticateUserWithPassword.message);
                        }
                    });
                });

                req.on('error', (e) => {
                    reject(e);
                });

                req.write(authData);
                req.end();
            });
        } catch (error) {
            console.error(`si è verificato un errore nell'autenticazione dell'API ${error}`)
        }
    };
    try {
        
        const AUTH_TOKEN = await authenticate();
        if(AUTH_TOKEN.includes('html')) return console.log('Ricevuta risposta errata da rinnovo patenti');
        const currentDateTime = new Date(Date.now() - 10 * 60 * 60 * 1000);
        const lastSync = await SyncDate.findOne()
        await SyncDate.updateOne({"data": currentDateTime.toISOString()})
        
        const query = `
        query MarconiBookings {
            bookings(
                where: {
                    visitInfo: { study: { name: { equals: "Rinnovopatenti Marconi" } } }
                    payment: { payed: { equals: true } }
                    createdAt: { gt: "${lastSync.data}" }
                }
                orderBy: { id: desc }
            ) {
                id
                code
                totalCost
                startDate
                endDate
                createdAt
                updatedAt
                enabled
                payment {
                    id
                    payed
                }
                client {
                    name
                    surname
                    fiscalCode
                    email
                    phone
                    shippingAddress
                    shippingAddressCap
                    shippingAddressNumber
                    shippingAddressPlace
                    licenseNumber
                }
            }
        }`;

        const data = JSON.stringify({ query }); 

        const url = new URL(GRAPHQL_URL);
        const options = {
          hostname: url.hostname,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
            'Authorization': `Bearer ${AUTH_TOKEN}`,
          },
        };

        const req = https.request(options,  (res) => {
          let body = '';

          res.on('data', (chunk) => {
              body += chunk;
          });

          res.on('end', async () => {
              const responseData = JSON.parse(body);
              if (!responseData.data.bookings || Object.keys(responseData.data.bookings).length == 0) return;
              const bookings = responseData.data.bookings;
              for(const utente of bookings){
                const userExist = await rinnovi.findOne({"cf": utente.client.fiscalCode.trim()});
                if(!utente.enabled || userExist) continue;

                const spedizione = {
                    via: utente.client.shippingAddress.toLowerCase().replace(/\s/g, " ").trim(),
                    nCivico: utente.client.shippingAddressNumber.toLowerCase().replace(/\s/g, "").trim(),
                    cap: utente.client.shippingAddressCap.trim(),
                    comune: utente.client.shippingAddressPlace.toLowerCase().replace(/\s/g, " ").trim(),
                    provincia: await trovaProvincia(utente.client.shippingAddressCap.trim())
                }
                const realDate = new Date(utente.startDate);
                realDate.setHours(realDate.getHours() + 1);
                const [data, ora] = realDate.toISOString().slice(0, -8).split('T');
                const visita = {
                  data: data,
                  ora: ora
                }
                const contatti = {
                  email: utente.client.email,
                  tel: utente.client.phone
                }
                const saveUser = new rinnovi({
                  "nome": utente.client.name.trim(),
                  "cognome": utente.client.surname.trim(),
                  "cf": utente.client.fiscalCode.trim(),
                  "contatti": contatti,
                  "spedizione": spedizione,
                  "visita": visita,
                  "nPatente": utente.client.licenseNumber.trim(),
                  "protocollo": null,
                  "creationDate": new Date(),
                  "note": null
                });
                await saveUser.save()
                .then(() => {
                    console.log(`Nuovo utente rinnovi salvato: ${saveUser.nome} ${saveUser.cognome}`);
                })
                .catch((error) => {
                    return console.error(`Errore durante il salvataggio del nuovo utente rinnovi: ${error}`);
                });
              } 
          });
        });

        req.on('error', (error) => {
            console.error('Errore:', error);
        });

        req.write(data);
        req.end();
    } catch (error) {
        console.error(`Errore durante il recupero dei dati dall'API: ${error}`);
    }
};
setInterval(fetchBookings, 600000);

setTimeout(fetchBookings, 5000);

router.get('/admin/rinnovi/scadenziario', authenticateJWT, async (req, res) => {
    const { role } = await admins.findOne({"email": req.user.email});

    const page = 1;
    const limit = 20;
    const skip = (page - 1) * limit; 

    const totalUsers = await Scadenziario.countDocuments();
    const scadenziario = await Scadenziario.find().skip(skip).limit(limit);
    
    const info = await infoScadenziario.findOne();
    let ricercheProgrammate = await programmaScadenziario.find();
    ricercheProgrammate = ricercheProgrammate.map(user => user.cf);
    res.render('admin/rinnovi/scadenziario/usersPage', {
        scadenziario,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page,
        ricercheProgrammate,
        info,
        role
    });
});

router.get('/admin/rinnovi/scadenziario/data', authenticateJWT, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const scadenziario = await Scadenziario.find().skip(skip).limit(limit);
    const totalUsers = await Scadenziario.countDocuments();

    res.json({
        scadenziario,
        skip: skip,
        hasMore: skip + scadenziario.length < totalUsers
    });
});


router.post('/admin/rinnovi/scadenziario/deleteUsers', authenticateJWT, async (req, res)=> {
    const ids = (Object.keys(req.body)
        .filter(key => key.startsWith('user')))
        .map(key => req.body[key]);
    try {
        for (const id of ids) {
            await Scadenziario.deleteOne({"_id": id});
            console.log(`utente scadenziario ${id} eliminato definitivamente`);
        }
        return res.redirect('/admin/rinnovi/scadenziario');
    } catch (error) {
        console.error(`errore durante l'eliminazione degli utenti scadenziario: ${error}`);
        return res.render('errorPage', {error: `errore durante l'eliminazione degli alievi`});
    }
});

(async () => {
    const duplicati = await Scadenziario.aggregate([
        {
            $group: {
                _id: "$cf",
                ids: { $push: "$_id" },
                count: { $sum: 1 }
            }
        },
        { $match: { count: { $gt: 1 } } }
    ]);

    for (const doc of duplicati) {
        const [keep, ...remove] = doc.ids;
        await Scadenziario.deleteMany({ _id: { $in: remove } });
    }
})();

router.post('/admin/programmaScadenziario', authenticateJWT, async (req, res) => {
    try {
        let users = req.body.users.split(',');
        users = users.map(u => u.trim());
        const schedule = await programmaScadenziario.find();
        
        const receivedUsers = new Set(users);
        
        const scheduledUsers = new Set(schedule.map(p => p.cf));
        const filteredUsers = [...receivedUsers].filter(user => !scheduledUsers.has(user));
        
        for (const u of filteredUsers) {
            if(u && u.length == 16){
                const userExist = await Scadenziario.findOne({'cf': u.toUpperCase().trim() });
                if(userExist){
                    await programmaScadenziario.deleteOne({'cf': u.toUpperCase().trim() });
                    continue;
                } 
                const newUser = new programmaScadenziario({
                    cf: u.toUpperCase(),
                    retrieved: false
                });
                await newUser.save();
            }
        }
        
        await programmaScadenziario.deleteMany({ cf: { $nin: [...receivedUsers] } });
        res.redirect('/admin/rinnovi/scadenziario')
    } catch (error) {
        console.log(`An error occured while programming the retrive for license expiration date: ${error}`)
    }
});

const cron = require("node-cron");
cron.schedule("0 8-23 * * 1-6", async () => {
    console.log("🔄 Avvio ricerca scadenze patente degli utenti programmati");
    try {
        const schedule = await programmaScadenziario.find();
        let userProcessedCorrectly = [];
        for (const u of schedule) {
            try {
            const dati = await searchExpirationPortale(u.cf);
                const spedizione = {
                    via: `${dati.toponimo.toLowerCase().replace(/\s+/g, " ").trim()} ${dati.indirizzo.toLowerCase().replace(/\s/g, " ").trim()}`,
                    nCivico: dati.numeroCivico.toLowerCase().replace(/\s+/g, "").trim(),
                    cap: dati.cap.trim(),
                    comune: dati.comune.toLowerCase().replace(/\s+/g, " ").trim(),
                    provincia: await trovaProvincia(dati.cap.trim())
                };
                const saveUser = new Scadenziario({
                    "nome": dati.nome.trim().replace(/\s+/g, " ").toLowerCase(),
                    "cognome": dati.cognome.trim().replace(/\s+/g, " ").toLowerCase(),
                    "cf": u.cf.trim().replace(/\s+/g, "").toLowerCase(),
                    "spedizione": spedizione,
                    "nPatente": dati.numeroPatente.trim(),
                    "expPatente": dati.expPatente
                });
                
                await saveUser.save();
                userProcessedCorrectly.push(u.cf);
                await programmaScadenziario.deleteOne({"_id": u._id})
            } catch (error) {
                console.log(`error occured while processing ${u.id} for license expiration: ${error}`);
            }
        }
        const errors = schedule.length - userProcessedCorrectly.length;
        await infoScadenziario.updateOne({totalErrors: {$inc: errors }});
        // await programmaScadenziario.deleteMany({ cf: { $in: [...userProcessedCorrectly] } });
    } catch (error) {
        console.log(`error occured while processing scheduled users for license expiration: ${error}`);
    }
});

router.post('/admin/rinnovi/scadenziario/downloadExcel', authenticateJWT, async (req, res) =>{
    try {
        const users = await Scadenziario.find();
    
        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Scadenziario');
    
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
        const headerFont = { bold: true };
        const headers = ['Nome', 'Cognome', 'Codice Fiscale', 'Via', 'Civico',	'Cap',	'Comune', 'Provincia', 'Numero Patente', 'Scadenza'];
        const columns = [];

        headers.forEach(h => columns.push({ header: h, key: h, width: 20 }));
    
        worksheet.columns = columns;
    
        const headerRow = worksheet.getRow(1);
        headerRow.fill = headerFill;
        headerRow.font = headerFont;
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        for (const u of users) {
            const row = [
                u.nome,
                u.cognome,
                u.cf,
                u.spedizione.via,
                u.spedizione.nCivico,
                u.spedizione.cap,
                u.spedizione.comune,
                u.spedizione.provincia,
                u.nPatente,
                u.expPatente
            ]
            
            const rowNumber = worksheet.addRow(row).number;
            worksheet.getRow(rowNumber).height = 20;
    
            worksheet.getRow(rowNumber).eachCell((cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
        }
        res.setHeader('Content-Disposition', 'attachment; filename="scadenziario.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.log(`an error occured while downloading the excel file, ${error}`)
    }
});

router.post('/admin/rinnovi/ricerca/scadenzaPatente', authenticateJWT, async (req, res) => {
    const { cFiscale } = req.body;
    try {
        const dati = await searchExpirationPortale(cFiscale);
        const spedizione = {
            via: `${dati.toponimo.toLowerCase().replace(/\s+/g, " ").trim()} ${dati.indirizzo.toLowerCase().replace(/\s/g, " ").trim()}`,
            nCivico: dati.numeroCivico.toLowerCase().replace(/\s+/g, "").trim(),
            cap: dati.cap.trim(),
            comune: dati.comune.toLowerCase().replace(/\s+/g, " ").trim(),
            provincia: await trovaProvincia(dati.cap.trim())
        };
        const saveUser = new Scadenziario({
            "nome": dati.nome.trim().replace(/\s+/g, " ").toLowerCase(),
            "cognome": dati.cognome.trim().replace(/\s+/g, " ").toLowerCase(),
            "cf": cFiscale.trim().replace(/\s+/g, "").toLowerCase(),
            "spedizione": spedizione,
            "nPatente": dati.numeroPatente.trim(),
            "expPatente": dati.expPatente
        });

        await saveUser.save();
        res.redirect(`/admin/rinnovi/scadenziario`);
    } catch (error) {
        console.error('Errore durante la richiesta POST scadenziario:', error);
        res.render('errorPage', {error: 'Errore durante il collegamento al portale' });
    }
});

router.post('/admin/rinnovi/ricerca/portaleAutomobilista', authenticateJWT, async (req, res) => {
    const { cFiscale, cognome, nPatente } = req.body;
    try {
        const formData = await searchUserPortale(cFiscale, cognome, nPatente);
        const spedizione = {
            via: `${formData.toponimo.toLowerCase().replace(/\s+/g, " ").trim()} ${formData.indirizzo.toLowerCase().replace(/\s/g, " ").trim()}`,
            nCivico: formData.numeroCivico.toLowerCase().replace(/\s+/g, "").trim(),
            cap: formData.cap.trim(),
            comune: formData.comune.toLowerCase().replace(/\s+/g, " ").trim(),
            provincia: await trovaProvincia(formData.cap.trim())
        };
        const saveUser = new rinnovi({
            "nome": formData.nome.replace(/\s+/g, " ").trim().toLowerCase(),
            "cognome": formData.cognome.replace(/\s+/g, " ").trim().toLowerCase(),
            "cf": formData.codiceFiscale.replace(/\s+/g, "").toUpperCase(),
            "spedizione": spedizione,
            "nPatente": formData.numeroPatente.trim(),
            "creationDate": new Date()
        });

        await saveUser.save();
        const user = await rinnovi.findOne({"nPatente": formData.numeroPatente.trim()});
        console.log(`Nuovo utente rinnovi salvato: ${formData.nome.trim().toLowerCase()} ${formData.cognome.trim().toLowerCase()}`);
        res.redirect(`/admin/rinnovi/userPage?id=${encodeURIComponent(`${user._id}`)}`);
    } catch (error) {
        console.error('Errore durante la richiesta POST portale automobilista rinnovi:', error);
        res.render('errorPage', {error: 'Errore durante il collegamento al portale' });
    }
});

router.get('/admin/rinnovi/credenzialiPortale', authenticateJWT, async(req, res)=>{
    const credenziali = await Credentials.findOne();
    res.render('admin/rinnovi/credenziali', { user: credenziali.user, password: credenziali.password, pin: credenziali.pin});
});

router.post('/admin/rinnovi/updateCredentials', authenticateJWT, async (req, res)=>{
    const { username, password, pin} = req.body
    await Credentials.updateOne({"user": username, "password": password, "pin": pin});
    res.redirect('/admin/rinnovi/credenzialiPortale');
});







router.get('/admin/duplicati', authenticateJWT, async (req, res)=>{
    const users = await Duplicati.find();
    res.render('admin/duplicati/usersPage', {users});
});

router.post('/duplicati/deleteUsers', authenticateJWT, async (req, res)=> {
    const {action} = req.body;
    const ids = (Object.keys(req.body)
        .filter(key => key.startsWith('user')))
        .map(key => req.body[key]);
    try {
        if(action == 'archive'){
            for (const id of ids) {
                await Duplicati.findOneAndUpdate({"_id": id}, {"archiviato": true});
                console.log(`utente duplicati ${id} archiviato`);
            }
        }else if(action == 'unarchive'){
            for (const id of ids) {
                await Duplicati.findOneAndUpdate({"_id": id}, {"archiviato": false});
                console.log(`utente duplicati ${id} disarchiviato`);
            }
        }else{
            for (const id of ids) {
                await Duplicati.deleteOne({"_id": id});
                console.log(`utente duplicati ${id} eliminato definitivamente`);
            }
        }
        return res.redirect('/admin/duplicati');
    } catch (error) {
        console.error(`errore durante l'eliminazione degli utenti duplicati: ${error}`);
        return res.render('errorPage', {error: `errore durante l'eliminazione dell'utente`});
    }
});


router.get('/admin/duplicati/userPage', authenticateJWT, async (req, res)=>{
    const user = await Duplicati.findOne({"_id": req.query.id});
    res.render('admin/duplicati/userPage', {user});
});



router.post('/admin/duplicati/updateUser', authenticateJWT, async (req, res)=>{
    const dati = req.body;
    try {
        const cleanData = (data) => {
            for (let key in data) {
                if (typeof data[key] === 'string') {
                    data[key] = data[key].trim().toLowerCase();
                } else if (typeof data[key] === 'object' && data[key] !== null) {
                    cleanData(data[key]);
                }
            }
        };
        cleanData(dati);
        const user = await Duplicati.findOneAndUpdate({"_id": dati.id}, dati);
        res.redirect(`/admin/duplicati/userPage?id=${encodeURIComponent(`${dati.id}`)}`);
    } catch (error) {
        console.error(`Si è verificato un errore nell'aggiornamento dell'utente duplicati: ${error}`);
        res.render('errorPage', {error: 'errore nell\'aggiornamento utente'})
    }
    
});

router.get('/admin/duplicati/addUser', authenticateJWT, async (req, res)=>{
    res.render('admin/duplicati/addUser')
});


router.post('/admin/duplicati/saveUser', authenticateJWT, async (req, res)=>{
    const dati = req.body;
    const imageData = dati.imageData;
    try {
        const cleanData = (data) => {
            for (let key in data) {
                if (typeof data[key] === 'string') {
                    data[key] = data[key].trim().toLowerCase();
                } else if (typeof data[key] === 'object' && data[key] !== null) {
                    cleanData(data[key]);
                }
            }
        };
        cleanData(dati);
        const saveUser = new Duplicati(dati);
        await saveUser.save();
        const user = await Duplicati.findOne({"cf": dati.cf});
        const base64Data = imageData.replace(/^data:image\/jpeg;base64,/, "").replace(/\s/g, '');
        const filePath = path.join('privateImages', 'immaginiDuplicati', `${user._id}.jpeg`);
        fs.writeFile(filePath, base64Data, 'base64', (err) => {
            if (err) {
                console.error(`Errore nel salvataggio dell'immagine: ${err}`);
                return res.status(500).json({ message: 'Errore nel salvataggio dell\'immagine' });
            }
            res.redirect('/admin/duplicati/addUser');
        });
    } catch (error) {
        console.log('errore nel salvataggio utente duplicati: ', error);
        res.render('errorPage', {error: 'errore nel salvataggio utente'});
    }
});

module.exports = router;
