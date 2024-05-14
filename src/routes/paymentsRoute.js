const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const paypal = require('paypal-rest-sdk');
const bodyParser = require('body-parser');

const utenti = require('../DB/User');

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
        const {cFiscale, patente} = paymentIntentSucceeded.metadata;
        await setPayment(cFiscale, patente);
    }
    res.json({success: true});
  })
  
  async function setPayment(cFiscale, patente) {
        try {
            const setPaid = await utenti.findOneAndUpdate(
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
            console.log(`l'utente con codice fiscale ${cFiscale} ha completato il pagamento con successo per la patente ${patente}`);
        } catch (error) {
            console.error('Errore durante il recupero dei dati dell\'utente:', error);
            return res.status(500).json({ message: 'Errore del server' });
        }
  }
  
  router.get('/successPayment/paypal', async (req, res) => {
  
      const payerId = req.query.PayerID;
      const paymentId = req.query.paymentId;
      if(!paymentId || !payerId){
        return res.status(500).json({errore: 'non hai effettuato il pagamento'});
      }
      const price = 600;
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
              const {cFiscale, patente} = JSON.parse(payment.transactions[0].custom);
              await setPayment(cFiscale, patente);
              return res.render('payments/paymentSuccess', {text: 'Grazie per esserti iscritto da noi!!'});
            }catch(error){
              return res.status(500).json({error: error.message});
            }
          }
    });
  });

  router.get('/successPayment/stripe', async (req, res) => res.render('payments/paymentSuccess', {text: 'Grazie per esserti iscritto da noi!!'}));
  router.get('/cancelPayment', async (req, res) => res.render('payments/cancelPayment', {text: 'Ci spiace che tu abbia deciso di non iscriverti da noi.'}));

module.exports = router;