const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const paypal = require('paypal-rest-sdk');
const bodyParser = require('body-parser');

const utenti = require('../DB/User');

//functions
const setPayment = require('../utils/paymentsUtils.js');
const router = express.Router();

router.post('/stripeHooks', bodyParser.raw({type: 'application/json'}), async (req, res) =>{
    console.log('sono stato chiamato');
    const payload = req.body;
    const sig = req.headers['stripe-signature'];
  
    let event;
    try {
        event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_SIGNING_SECRET);
        console.log('trovato');
      } catch (error) {
        console.log('errore cazzo');
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