const mongoose = require('mongoose');


const CodeSchema = new mongoose.Schema({
    cFiscale: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    importo: {
        type: Number,
        required: true
    }
});
const Codes = new mongoose.model('Codes', CodeSchema);

module.exports = Codes; 