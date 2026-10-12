const mongoose = require('mongoose');

const buildSchema = new mongoose.Schema({
  buildId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  character: { type: mongoose.Schema.Types.Mixed, required: true },
  supportCards: {
    type: [mongoose.Schema.Types.Mixed],
    required: true,
    validate: cards => cards.length === 6
  }
}, { timestamps: true });

module.exports = mongoose.model('Build', buildSchema);