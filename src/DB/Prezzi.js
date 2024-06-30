const mongoose = require('mongoose');

const PrezziSchema = new mongoose.Schema({
    tipo:{
        type: String,
        required: true,
        unique: true
    },
    prezzoPrimaIscrizione: {
        type: Number,
        required: true
    },
    prezzoIscrizioniSuccessive: {
        type: Number, 
        required: true
    }
});
const prezzi = new mongoose.model('prezzi', PrezziSchema);

module.exports = prezzi;