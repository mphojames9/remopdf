import mongoose from 'mongoose';

// One document per payment attempt. It is created as "pending" when the person opens checkout and only becomes
// "success" after the server has asked Paystack about it (or Paystack's signed webhook says so). The browser
// saying "I paid" is never trusted on its own.
const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Our own reference, sent to Paystack when the transaction is created. The unique index also makes a
    // webhook and a manual check for the same payment land on the same document.
    reference: { type: String, required: true, unique: true, maxlength: 100 },
    accessCode: { type: String, maxlength: 100 },
    // Smallest currency unit (cents for ZAR/USD, kobo for NGN, ...), exactly as Paystack uses it. Fixed on the
    // server when checkout opens; a payment of any other amount is never accepted.
    amount: { type: Number, required: true },
    currency: { type: String, required: true, uppercase: true, maxlength: 3 },
    // How many days of access this payment buys (0 = no end date). Stored here so changing the price or the
    // length later never changes what earlier payments bought.
    accessDays: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    paidAt: { type: Date },
    // null = access never ends
    expiresAt: { type: Date, default: null },
    channel: { type: String, maxlength: 30 },
    // Billing details the person typed in the payment dialog (for receipts). Card and bank details are never
    // stored here: they are typed into Paystack's own window and never reach this server.
    billingName: { type: String, default: '', maxlength: 100 },
    billingPhone: { type: String, default: '', maxlength: 20 },
  },
  { timestamps: true }
);

// "Does this person have a payment that is still valid?" is the hot query.
paymentSchema.index({ user: 1, status: 1, expiresAt: 1 });

paymentSchema.set('toJSON', {
  transform: (doc, ret) => ({
    id: ret._id.toString(),
    reference: ret.reference,
    amount: ret.amount,
    currency: ret.currency,
    status: ret.status,
    paidAt: ret.paidAt,
    expiresAt: ret.expiresAt,
    createdAt: ret.createdAt,
  }),
});

export default mongoose.model('Payment', paymentSchema);
