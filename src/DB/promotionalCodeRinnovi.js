const mongoose = require('mongoose');


const promotionalCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: false,
        unique: true,
        dropDups: true
    },
    used: {
        type: Boolean,
        required: true,
        default: false
    },
    creationDate: {
        type: Date,
        required: true,
        default: null
    }
});
const promotionalCodes = new mongoose.model('promotionalCode', promotionalCodeSchema);

module.exports = promotionalCodes; 