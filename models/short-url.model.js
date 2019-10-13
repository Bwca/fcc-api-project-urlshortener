const mongoose = require('mongoose');

const shortURLSchema = mongoose.Schema({
    shortId: { type: Number, index: true },
    url: { type: String, index: true }
});

module.exports = mongoose.model('ShortURL', shortURLSchema);
