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
    // Which length of Premium this payment bought: "7d" | "14d" | "30d" (see lib/plans.js). Fixed on the server when
    // checkout opens, like the amount. "plus" | "pro" | "max" are the old plans: payments made under them are kept as
    // they are and now simply count as Premium for the days they paid for. Payments from before plans existed have none.
    plan: { type: String, enum: ['7d', '14d', '30d', 'plus', 'pro', 'max'] },
    // Smallest currency unit (cents for ZAR/USD, kobo for NGN, ...), exactly as Paystack uses it. Fixed on the
    // server when checkout opens; a payment of any other amount is never accepted.
    amount: { type: Number, required: true },
    currency: { type: String, required: true, uppercase: true, maxlength: 3 },
    // How many days of access this payment buys (7, 14 or 30; never more than 30). Stored here so changing the price
    // or the length later never changes what earlier payments bought.
    accessDays: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    paidAt: { type: Date },
    // paidAt + accessDays: when THIS payment's days run out if they start the day it was paid. Paying while Premium is
    // still running adds the new days after the current ones, so the real end of someone's access is worked out from
    // all their payments together (accessFromPayments in lib/plans.js), not read from this field alone.
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
    plan: ret.plan,
    amount: ret.amount,
    currency: ret.currency,
    status: ret.status,
    paidAt: ret.paidAt,
    expiresAt: ret.expiresAt,
    createdAt: ret.createdAt,
  }),
});

export default mongoose.model('Payment', paymentSchema);
