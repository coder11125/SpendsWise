import { Schema, model, InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // C4: Incrementing this field invalidates all existing JWTs for this user.
    // Bump on password change so stolen tokens cannot be reused after a reset.
    tokenVersion: { type: Number, default: 0, required: true },
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);
