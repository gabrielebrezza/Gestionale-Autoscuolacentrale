const mongoose = require('mongoose');
const { NumberContextImpl } = require('twilio/lib/rest/pricing/v2/voice/number');
const connect = mongoose.connect(process.env.MONGODB_CONNECTION_URL);

connect.then(() =>{
    console.log('StoricoFatture Database connected successfully');
})
.catch(() =>{
    console.log('StoricoFatture Database cannot be connected ');
});

const StoricoFattureSchema = new mongoose.Schema({
    numero: {
        type: Number,
        required: true
    },
    importo: {
        type: Number,
        required: true
    },
    data: {
        type: String,
        required: true
    },
    nomeFile: {
        type: String,
        required: true
    }
});
const StoricoFatture = new mongoose.model('storicoFatture', StoricoFattureSchema);

module.exports = StoricoFatture;