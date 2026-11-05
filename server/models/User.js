import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    // The unique index is what really stops two accounts sharing one email, even if two requests arrive together.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    // True once the person has opened the link in the verification email. New accounts are only created after
    // that, so it is true for everyone who registers now; accounts made before this field existed read as false.
    emailVerified: { type: Boolean, default: false },
    // The mobile number the person typed at sign-up, saved as +27XXXXXXXXX. It is NOT verified (no SMS is sent),
    // so it must never be used to prove who someone is. Optional, and not part of toJSON below.
    phone: { type: String, trim: true, maxlength: 20 },
    // Only the bcrypt hash is stored, and it is left out of queries unless asked for with .select('+passwordHash').
    passwordHash: { type: String, required: true, select: false },
    lastLoginAt: { type: Date },
    // The person's saved resume (everything the builder keeps), stored as one JSON string. A string cannot
    // carry keys like "$set" or "a.b" into MongoDB, and it is left out of queries unless asked for with
    // .select('+resumeJson'), so /api/auth/me and the login responses never carry it.
    resumeJson: { type: String, select: false },
    resumeUpdatedAt: { type: Date },
  },
  { timestamps: true }
);

// What the API sends back about an account. The hash never leaves the server.
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
