import { Schema, model, Types, InferSchemaType } from "mongoose";

const recurrenceSchema = new Schema(
  {
    frequency: {
      type: String,
      required: true,
      enum: ["daily", "weekly", "biweekly", "monthly", "yearly"],
    },
    nextDueDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const expenseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, enum: ["income", "expense"] },
    amount: { type: Number, required: true, min: 0, max: 1e12 },
    category: { type: String, required: true, trim: true, maxlength: 64 },
    currency: { type: String, default: "USD", trim: true, maxlength: 8 },
    familyMember: { type: String, default: "", trim: true, maxlength: 64 },
    note: { type: String, default: "", trim: true, maxlength: 500 },
    date: { type: Date, required: true, default: () => new Date() },
    recurrence: { type: recurrenceSchema, default: null },
  },
  { timestamps: true }
);

export type Expense = InferSchemaType<typeof expenseSchema> & { _id: Types.ObjectId };
export const ExpenseModel = model("Expense", expenseSchema);
