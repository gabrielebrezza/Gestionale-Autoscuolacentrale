const mongoose = require('mongoose');
const { NumberContextImpl } = require('twilio/lib/rest/pricing/v2/voice/number');
const connect = mongoose.connect(process.env.MONGODB_CONNECTION_URL);

connect.then(() =>{
    console.log('Prezzi Database connected successfully');
})
.catch(() =>{
    console.log('Prezzi Database cannot be connected ');
});

const PrezziSchema = new mongoose.Schema({
    prezzo: {
        type: Number,
        required: true
    }
});
const prezzi = new mongoose.model('prezzi', PrezziSchema);

module.exports = prezzi;