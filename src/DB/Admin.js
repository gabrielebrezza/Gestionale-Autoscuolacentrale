const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    nome: {
        type: String,
        required: true
    },
    cognome: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: false
    },
    approved: {
        type: Boolean,
        required: true
    }
});
const admins = new mongoose.model('admins', AdminSchema);

module.exports = admins;