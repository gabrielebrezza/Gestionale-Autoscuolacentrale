const mongoose = require('mongoose');


const StoricoFattureSchema = new mongoose.Schema({
    tipo: {
        type: String,
        required: true
    },
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
const storicoFattureGenerali = new mongoose.model('storicofattureGenerali', StoricoFattureSchema);

module.exports = storicoFattureGenerali;