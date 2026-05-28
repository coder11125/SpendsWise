import { Schema, model, InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    googleId: { type: String, sparse: true, unique: true },
    passwordHash: { type: String },
    familyMembers: {
      type: [{ type: String, trim: true, maxlength: 64 }],
      default: [],
    },
    // C4: Incrementing this field invalidates all existing JWTs for this user.
    // Bump on password change so stolen tokens cannot be reused after a reset.
    tokenVersion: { type: Number, default: 0, required: true },
    aiUsage: {
      type: {
        count: { type: Number, default: 0 },
        dailyCount: { type: Number, default: 0 },
        dailyDate: { type: String, default: "" },
        monthlyCount: { type: Number, default: 0 },
        monthlyDate: { type: String, default: "" },
      },
      default: { count: 0, dailyCount: 0, dailyDate: "", monthlyCount: 0, monthlyDate: "" },
    },
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);
