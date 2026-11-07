import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    // Can be empty: some Google accounts have a single name.
    lastName: { type: String, trim: true, maxlength: 60, default: '' },
    // The Gmail address of the Google account the person signs in with. The unique index is what really stops two
    // accounts sharing one email, even if two requests arrive together.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    // Google has confirmed the address, so this is true for everyone who signs in now. Accounts made before this
    // field existed read as false until their owner signs in again.
    emailVerified: { type: Boolean, default: false },
    // Older accounts may hold a mobile number typed at sign-up (+27XXXXXXXXX). It was never verified, so it must
    // never be used to prove who someone is. New accounts do not have one. Not part of toJSON below.
    phone: { type: String, trim: true, maxlength: 20 },
    lastLoginAt: { type: Date },
    // The person's resume from before multiple resumes existed, stored as one JSON string. routes/profile.js moves it
    // into the Resume collection the first time the account asks for its resumes. A string cannot carry keys like
    // "$set" or "a.b" into MongoDB, and it is left out of queries unless asked for with .select('+resumeJson').
    resumeJson: { type: String, select: false },
    resumeUpdatedAt: { type: Date },
  },
  { timestamps: true }
);

// What the API sends back about an account.
userSchema.set('toJSON', {
  transform: (doc, ret) => ({
    id: ret._id.toString(),
    firstName: ret.firstName,
    lastName: ret.lastName,
    email: ret.email,
    createdAt: ret.createdAt,
  }),
});

export default mongoose.model('User', userSchema);
