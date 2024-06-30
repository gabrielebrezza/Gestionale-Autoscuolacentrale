const mongoose = require('mongoose');


const NumeroFatturaSchema = new mongoose.Schema({
    numeroIscrizioni: {
        type: Number,
        required: true
    },
    numeroGeneriche: {
        type: Number,
        required: true
    },
    numeroRinnovi: {
        type: Number,
        required: true
    }
});
const NumeroFattura = new mongoose.model('numeroFattura', NumeroFatturaSchema);

module.exports = NumeroFattura; 