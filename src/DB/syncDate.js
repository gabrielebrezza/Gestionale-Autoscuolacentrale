const mongoose = require('mongoose');

const DateSchema = new mongoose.Schema({
    data:{
        type: String,
        required: true
    }
});
const SyncDate = new mongoose.model('SyncDate', DateSchema);

module.exports = SyncDate; 