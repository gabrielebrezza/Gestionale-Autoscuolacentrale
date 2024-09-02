const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const paypal = require('paypal-rest-sdk');

const utenti = require('./../DB/User');

//functions
const {setPayment, checkPaymentStatus} = require('../utils/paymentsUtils.js');
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

router.get('/satispay/successPayment', async (req, res) =>{
  const {id} = req.query;
  const user = await utenti.findOne({"_id": id});
  try {
    const { status, metadata, amount_unit } = await checkPaymentStatus(user.paymentId);
    if(status.toLowerCase() !='accepted' || !status){
      return res.redirect('/cancelPayment');
    }
    if(!metadata || !amount_unit){
      return res.render('errorPage', {error: 'si è verificato un errore durante il pagamento'});
    }
    await setPayment(id, metadata.patente, amount_unit/100, metadata.email);
    return res.redirect(`/successPayment?id=${encodeURIComponent(id)}`);
} catch (error) {
    console.error('Error checking payment status:', error);
    return res.render('errorPage', {error: 'si è verificato un errore durante il pagamento'})
}
});


router.get('/successPayment', async (req, res) =>{ res.render('payments/paymentSuccess', {text: 'Grazie per esserti iscritto da noi!!', id: req.query.id})});
router.get('/cancelPayment', async (req, res) => res.render('payments/cancelPayment', {text: 'Ci spiace che tu abbia deciso di non iscriverti da noi.'}));

module.exports = router;