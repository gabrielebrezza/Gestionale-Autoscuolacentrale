const mongoose = require('mongoose');


const ScadenziarioSchema = new mongoose.Schema({
    nomeECognome: {
        type: String,
        required: false
    },
    cf: {
        type: String,
        required: true,
        uppercase: true,
        dropDups: true,
        unique: true
    },
    residenza: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: false
    },
    totalEmailSentCount: {
        type: Number,
        required: false,
        default: 0
    },
    nPatente: {
        type: String,
        required: true
    },
    expPatente: {
        type: Date,
        required: false
    },
    note: {
        type: String,
        required: false
    },
    isEmailUnsubscribed: {
        type: Boolean,
        required: false,
        default: false
    },
    promotionalCode: {
        type: String,
        required: false,
        unique: true
    }
});
const Scadenziario = new mongoose.model('Scadenziario', ScadenziarioSchema);

module.exports = Scadenziario; 