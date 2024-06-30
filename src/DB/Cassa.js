const mongoose = require('mongoose');

const CassaSchema = new mongoose.Schema({
    causa: {
        type: String,
        required: true
    },
    data:{
        type: String,
        required: true
    },
    importo: {
        type: Number,
        required: true
    }
});
const Cassa = new mongoose.model('Cassa', CassaSchema);

module.exports = Cassa; 