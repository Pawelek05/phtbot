const mongoose = require('mongoose');

const userWarnSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    warnCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

userWarnSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.models.UserWarn || mongoose.model('UserWarn', userWarnSchema);