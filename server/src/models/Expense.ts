import { Schema, model, Types, InferSchemaType } from "mongoose";

const expenseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, enum: ["income", "expense"] },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    currency: { type: String, default: "USD", trim: true },
    familyMember: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
    date: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true }
);

export type Expense = InferSchemaType<typeof expenseSchema> & { _id: Types.ObjectId };
export const ExpenseModel = model("Expense", expenseSchema);
