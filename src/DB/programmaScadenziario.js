const mongoose = require('mongoose');

const programmaScadenziarioSchema = new mongoose.Schema({
    nomeECognome: {
        type: String,
        required: false
    },
    cf: {
        type: String,
        required: true,
        uppercase: true,
        unique: true,
        dropDups: true
    },
    email: {
        type: String,
        required: false
    },
    residenza: {
        type: String,
        required: false
    },
    try: {
        type: Number,
        required: true,
        default: 0
    }
});
const programmaScadenziario = new mongoose.model('programmaScadenziario', programmaScadenziarioSchema);

module.exports = programmaScadenziario; 