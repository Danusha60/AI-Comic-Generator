const mongoose = require("mongoose");

const comicSchema = new mongoose.Schema(
  {
    story: {
      type: String,
      required: true,
    },

    style: String,

    panels: Array,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Comic", comicSchema);