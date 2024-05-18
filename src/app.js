require('dotenv').config();

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const paypal = require('paypal-rest-sdk');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const utenti = require('./DB/User');




const app = express();

//routes
const paymentsRoute = require('./routes/paymentsRoute');
const adminRoute = require('./routes/adminRoute');
const sendEmail = require('./utils/emailsUtils');

app.use(paymentsRoute, adminRoute);


app.use(cookieParser());

app.use(express.json());

app.use(express.urlencoded({extended: false}));

app.set('view engine', 'ejs');

app.set('views', 'views');

app.use(express.static('public'));

paypal.configure({
  mode: "sandbox",
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET
});

app.get('/', async (req, res) =>{
    res.render('getData');
});

app.post('/payment', async (req, res) =>{
  const provinciaNascita = req.body.provinciaNascita.replace(/\s/g, "");
  const mese = req.body.mese.replace(/\s/g, "");
  const sesso = req.body.sesso.replace(/\s/g, "");
  const cFiscale = req.body.cFiscale.replace(/\s/g, "");
  const nCivico = req.body.nCivico.replace(/\s/g, "");
  const cap = req.body.cap.replace(/\s/g, "");
  const provinciaResidenza = req.body.provinciaResidenza.replace(/\s/g, "");
  const email = req.body.email.replace(/\s/g, "");
  const tel = req.body.tel.replace(/\s/g, "");
  const documento = req.body.documento.replace(/\s/g, "");
  const nDocumento = req.body.nDocumento.replace(/\s/g, "");
  const tipoPatente = req.body.tipoPatente.replace(/\s/g, "");

  const nome = req.body.nome.trim();
  const cognome = req.body.cognome.trim();
  const luogoNascita = req.body.luogoNascita.trim();
  const via = req.body.via.trim();
  const comune = req.body.comune.trim(); 
  const giorno = req.body.giorno < 10 ? `0${req.body.giorno}`: req.body.giorno;
  const {anno, paymentMethod} = req.body;
  const oggi = new Date();
  const giornoReg = String(oggi.getDate()).padStart(2, '0');
  const meseReg = String(oggi.getMonth() + 1).padStart(2, '0'); // +1 perché i mesi partono da 0
  const annoReg = oggi.getFullYear();

  const dataRegistrazione = `${giornoReg}/${meseReg}/${annoReg}`;

  const existingUser = await utenti.findOne({"cFiscale": cFiscale});
  if(existingUser){
    const existingPatente = await utenti.findOne({
      "cFiscale": cFiscale,
      "patente": { 
        "$elemMatch": { 
          "tipo": tipoPatente, 
          "pagato": true 
        } 
      }
    });

    if(existingPatente){
      return res.status(500).json({errore: 'Possiedi già questa patente'});
    }
  }

  const existingPatenteDaPagare = await utenti.findOne({
    "cFiscale": cFiscale,
    "patente": { 
      "$elemMatch": { 
        "tipo": tipoPatente, 
        "pagato": false 
      } 
    }
  });
  if(!existingUser){
    const saveUser = new utenti({
      "cFiscale": cFiscale,
      "nome": nome,
      "cognome": cognome,
      "nascita.comune": luogoNascita,
      "nascita.provincia": provinciaNascita,
      "nascita.data": `${giorno}/${mese}/${anno}`,
      "sesso": sesso,
      "residenza.via": via,
      "residenza.nCivico": nCivico,
      "residenza.cap": cap,
      "residenza.comune": comune,
      "residenza.provincia": provinciaResidenza,
      "contatti.email": email,
      "contatti.tel": tel,
      "documento": documento,
      "nDocumento": nDocumento,
      "patente": [{
        tipo: tipoPatente,
        pagato: false
      }],
      "teoria":[
        {
          data: null,
          esito: null
        }
      ],
      "dataRegistrazione": dataRegistrazione
    });
    saveUser.save()
    .then(() => {
        console.log(`Nuovo utente salvato: ${nome} ${cognome}`);
    })
    .catch((errore) => {
        console.error("Errore durante il salvataggio del nuovo utente:", errore);
    });
  }else if(!existingPatenteDaPagare){
    try{
      const updateUser = await utenti.findOneAndUpdate(
        {
          "cFiscale": cFiscale,
          "nome": nome,
          "cognome": cognome,
          "nascita.comune": luogoNascita,
          "nascita.provincia": provinciaNascita,
          "nascita.data": `${giorno}/${mese}/${anno}`,
          "sesso": sesso
        },
        {
          $set: {
            "residenza.via": via,
            "residenza.nCivico": nCivico,
            "residenza.cap": cap,
            "residenza.comune": comune,
            "residenza.provincia": provinciaResidenza,
            "contatti.email": email,
            "contatti.tel": tel,
            "documento": documento,
            "nDocumento": nDocumento,
            "teoria":[
              {
                data: null,
                esito: null
              }
            ],
            "dataRegistrazione": dataRegistrazione
          },
          $addToSet: {
            "patente": {
              tipo: tipoPatente,
              pagato: false
            }
          }
        },
        { 
          upsert: true, 
          returnOriginal: false 
        }
      );
    }catch(error){
      console.log('si è verificato un errore');
      return res.status(500).send('Si è verificato un errore');
    }
  }
  

  if(paymentMethod == 'stripe'){
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: 'payment',
        line_items: [
          {
           price_data:{
              currency: 'eur',
              product_data:{
                name: `Iscrizione Scuola Guida per la patente ${tipoPatente}`
              },
              unit_amount: 10000
            },
            quantity: 1
          }
        ],
        success_url: `${process.env.SERVER_URL}/successPayment/stripe`,
        cancel_url: `${process.env.SERVER_URL}/cancelPayment`,
        metadata: {
          cFiscale: cFiscale,
          patente: tipoPatente,
          email: email
        }
      });
      res.redirect(session.url);
    } catch (error) {
      console.log('si è verificato un errore con il pagamento con stripe, errore: ', error);
      res.status(500).json({error: error.message});
    }
  }else if(paymentMethod == 'payPal'){
    try {
      const create_payment_json = {
          intent: "sale",
          payer: {
              payment_method: "paypal"
          },
          redirect_urls: {
              return_url: `${process.env.SERVER_URL}/successPayment/paypal`,
              cancel_url: `${process.env.SERVER_URL}/cancelPayment`,
          },
          transactions: [
              {
                  item_list: {
                      items: [
                          {
                              name: `Iscrizione Scuola Guida per la patente ${tipoPatente}`,
                              sku: 1,
                              price: 600,
                              currency: "EUR",
                              quantity: 1
                          }
                      ]
                  },
                  amount: {
                      currency: "EUR",
                      total: 600
                  },
                  custom: JSON.stringify({cFiscale: cFiscale, patente: tipoPatente, email: email}),
                  description: `Iscrizione a Scuola Guida per la patente di tipo ${tipoPatente}`
              }
          ]
      }; 
      paypal.payment.create(create_payment_json, (error, payment) => {
          if (error) {
              throw error;
          } else {
              for (let i = 0; i < payment.links.length; i++) {
                  if (payment.links[i].rel === "approval_url") {
                      res.redirect(payment.links[i].href);
                  }
              }
          }
      });
    } catch (error) {
      console.log('si è verificato un errore con il pagamento con stripe, errore: ', error);
      res.status(500).json({error: error.message});
    }
  }
});









const PORT = process.env.PORT || 8080;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));