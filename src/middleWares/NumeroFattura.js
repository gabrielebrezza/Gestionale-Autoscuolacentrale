const mongoose = require('mongoose');
const { NumberContextImpl } = require('twilio/lib/rest/pricing/v2/voice/number');
const connect = mongoose.connect(process.env.MONGODB_CONNECTION_URL);

connect.then(() =>{
    console.log('NumeroFattura Database connected successfully');
})
.catch(() =>{
    console.log('NumeroFattura Database cannot be connected ');
});

const NumeroFatturaSchema = new mongoose.Schema({
    numero: {
        type: Number,
        required: true
    }
});
const NumeroFattura = new mongoose.model('numeroFattura', NumeroFatturaSchema);

module.exports = NumeroFattura; 