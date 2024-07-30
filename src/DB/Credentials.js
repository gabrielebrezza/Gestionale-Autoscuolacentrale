const mongoose = require('mongoose');


const credentialSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    pin: {
        type: String,
        required: true
    },
});
const Credentials = new mongoose.model('Credentials', credentialSchema);

module.exports = Credentials; 