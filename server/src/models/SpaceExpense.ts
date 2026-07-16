import { Schema, Types, InferSchemaType, Connection, Model } from "mongoose";

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

const spaceExpenseSchema = new Schema(
  {
    authorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, enum: ["income", "expense"] },
    amount: { type: Number, required: true, min: 0, max: 1e12 },
    category: { type: String, required: true, trim: true, maxlength: 64 },
    currency: { type: String, default: "USD", trim: true, maxlength: 8 },
    note: { type: String, default: "", trim: true, maxlength: 500 },
    date: { type: Date, required: true, default: () => new Date() },
    recurrence: { type: recurrenceSchema, default: null },
  },
  { timestamps: true }
);

export type SpaceExpense = InferSchemaType<typeof spaceExpenseSchema> & { _id: Types.ObjectId };

export function compileSpaceExpenseModel(connection: Connection): Model<SpaceExpense> {
  return (connection.models.Expense as Model<SpaceExpense>) ?? connection.model<SpaceExpense>("Expense", spaceExpenseSchema);
}
