const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const paypal = require('paypal-rest-sdk');
const bodyParser = require('body-parser');

const utenti = require('../DB/User');

//functions
const sendEmail = require('../utils/emailsUtils.js');
const {compilaTt2112, compilaCertResidenza} = require('../utils/compileUtils');
const router = express.Router();

router.post('/stripeHooks', bodyParser.raw({type: 'application/json'}), async (req, res) =>{
    const payload = req.body;
    const sig = req.headers['stripe-signature'];
  
    let event;
    try {
        event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_SIGNING_SECRET);
    } catch (error) {
        console.log(error.message);
        return res.status(400).json({success: false});
    }
  
    if(event.type == 'checkout.session.completed') {
        const paymentIntentSucceeded = event.data.object;
        const price = paymentIntentSucceeded.amount_total/100;
        const {cFiscale, patente, email} = paymentIntentSucceeded.metadata;
        await setPayment(cFiscale, patente, price, email);
    }
    res.json({success: true});
  })
  
  async function setPayment(cFiscale, patente, price, email) {
    try {
        await utenti.findOneAndUpdate(
          {
            "cFiscale": cFiscale,
            "patente": {
              $elemMatch: {
                "tipo": patente,
                "pagato": false
              }
            }
          },
          {
            $set: {
              "patente.$.pagato": true
            }
          }
        );
        const today = new Date();
        const DD = String(today.getDate()).padStart(2, '0'); 
        const MM = String(today.getMonth() + 1).padStart(2, '0'); 
        const YYYY = today.getFullYear(); 
        const dataFatturazione = `${DD}/${MM}/${YYYY}`;
        await utenti.findOneAndUpdate(
            {"cFiscale": cFiscale},
            {
                $addToSet: {
                    "fatture": {"data": dataFatturazione, "importo": price, "emessa": false},
                }
            },
            {new: true}
        );
        try {
          await compilaTt2112(cFiscale);
        }catch (error) {
          console.error(error.message);
          res.status(500).send('Errore durante la compilazione del modulo tt2112');
        }
        try {
          await compilaCertResidenza(cFiscale);
        }catch (error) {
          console.error(error.message);
          res.status(500).send('Errore durante la compilazione del modulo autocertificazione di residenza');
        }
        const fileNames = [
          `certificati/tt2112/tt2112_${cFiscale}.pdf`,
          `certificati/residenza/autocertificazioneResidenza_${cFiscale}.pdf`
        ];
        try{
          const result = await sendEmail(email, 'Iscrizione effettuata con successo', `Grazie per esserti iscritto alla patente ${patente}. Ti chiediamo gentilmente in caso tu non l'avessi ancora fatto di inviarci la scansione della tua firma e della fototessera che apparirà sulla patente`, fileNames );
          console.log(result);
        }catch (error){
          console.error('Errore durante l\'invio dell\'email:', error);
        }
        console.log(`l'utente con codice fiscale ${cFiscale} ha completato il pagamento con successo per la patente ${patente}`);
    } catch (error) {
        console.error('Errore durante il recupero dei dati dell\'utente:', error);
        return res.status(500).json({ message: 'Errore del server' });
    }
}
  
  router.get('/successPayment/paypal', async (req, res) => {
  
      const payerId = req.query.PayerID;
      const paymentId = req.query.paymentId; 
      const price = req.query.price;
      if(!paymentId || !payerId){
        return res.render('errorPage' ,{error: 'non hai effettuato nessun pagamento'});
      }
      const execute_payment_json = {
          payer_id: payerId,
          transactions: [
              {
                  amount: {
                      currency: "EUR",
                      total: price
                  }
              }
          ]
      };
  
      paypal.payment.execute(paymentId, execute_payment_json, async (error, payment) => {
          if(error){
              console.error(error.response);
              throw error
          }else{
            try{
              const {cFiscale, patente, email} = JSON.parse(payment.transactions[0].custom);
              await setPayment(cFiscale, patente, price, email);
              return res.redirect(`/successPayment?cf=${encodeURIComponent(cFiscale)}`);
            }catch(error){
              return res.status(500).json({error: error.message});
            }
          }
    });
  });
  router.get('/successPayment', async (req, res) =>{ res.render('payments/paymentSuccess', {text: 'Grazie per esserti iscritto da noi!!', cf: req.query.cf})});
  router.get('/cancelPayment', async (req, res) => res.render('payments/cancelPayment', {text: 'Ci spiace che tu abbia deciso di non iscriverti da noi.'}));

module.exports = router;