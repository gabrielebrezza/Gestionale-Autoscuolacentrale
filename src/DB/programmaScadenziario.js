const mongoose = require('mongoose');

const programmaScadenziarioSchema = new mongoose.Schema({
    cf: {
        type: String,
        required: true
    },
    retrieved: {
        type: Boolean,
        required: true
    }
});
const programmaScadenziario = new mongoose.model('programmaScadenziario', programmaScadenziarioSchema);

module.exports = programmaScadenziario; 