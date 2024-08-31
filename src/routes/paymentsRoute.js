const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const paypal = require('paypal-rest-sdk');

//functions
const setPayment = require('../utils/paymentsUtils.js');
const router = express.Router();

router.post('/stripeHooks', express.raw({type: 'application/json'}), async (req, res) =>{
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
        const session = event.data.object;
        const price = session.amount_total/100;
        const {id, patente, email} = session.metadata;
        await setPayment(id, patente, price, email);
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
              const {id, patente, email} = JSON.parse(payment.transactions[0].custom);
              await setPayment(id, patente, price, email);
              return res.redirect(`/successPayment?id=${encodeURIComponent(id)}`);
            }catch(error){
              return res.status(500).json({error: error.message});
            }
          }
    });
  });




  router.get('/satispay-callback', async (req, res) => {


    console.log('arrivo dalla richiesta get')
    const paymentId = req.body.payment_id; 
    const status = req.body.status;
    const reason = req.body.reason;

    console.log( req.query.payment_id, req.query.status, req.query.reason)

    if(status == 'cancelled' || req.query.status == 'cancelled'){
      return;
    }
    console.log(`Ricevuto pagamento con ID: ${paymentId}`);
    console.log(`Stato del pagamento: ${status}`);
    // const {id, patente, email} = JSON.parse(payment.transactions[0].custom);
    // await setPayment(id, patente, price, email);
    res.status(200).send('Callback ricevuta con successo');
});

router.get('/satispay-callback', async (req, res) => {


  console.log('arrivo dalla richiesta get')
  const paymentId = req.body.payment_id; 
  const status = req.body.status;
  const reason = req.body.reason;

  console.log( req.query.payment_id, req.query.status, req.query.reason)

  if(status == 'cancelled' || req.query.status == 'cancelled'){
    return;
  }
  console.log(`Ricevuto pagamento con ID: ${paymentId}`);
  console.log(`Stato del pagamento: ${status}`);
  // const {id, patente, email} = JSON.parse(payment.transactions[0].custom);
  // await setPayment(id, patente, price, email);
  res.status(200).send('Callback ricevuta con successo');
});



  router.get('/successPayment', async (req, res) =>{ res.render('payments/paymentSuccess', {text: 'Grazie per esserti iscritto da noi!!', id: req.query.id})});
  router.get('/cancelPayment', async (req, res) => res.render('payments/cancelPayment', {text: 'Ci spiace che tu abbia deciso di non iscriverti da noi.'}));

module.exports = router;