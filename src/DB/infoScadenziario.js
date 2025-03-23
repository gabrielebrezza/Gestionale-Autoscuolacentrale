const mongoose = require('mongoose');

const infoScadenziarioSchema = new mongoose.Schema({
    totalUsersSearched: {
        type: Number,
        default: 0
    },
    totalErrors: {
        type: Number,
        default: 0
    }
});
const infoScadenziario = new mongoose.model('infoScadenziario', infoScadenziarioSchema);

module.exports = infoScadenziario; 