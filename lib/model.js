const mongoose = require('mongoose');

const DirectorTransaction = mongoose.model('DirectorTransaction', {
  company_symbol: String,
  company_name: String,
  director_name: String,
  relationship: String,
  type_of_asset: String,
  document_receive_date: Date,
  transaction_date: Date,
  amount: Number,
  price: Number,
  transaction_type: String,
  note: String,
});

module.exports = DirectorTransaction
