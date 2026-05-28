export interface Recurrence {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  nextDueDate: string;
  endDate?: string | null;
  isActive: boolean;
}

export interface Expense {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  familyMember?: string;
  note?: string;
  currency: string;
  recurrence?: Recurrence | null;
}

export interface Profile {
  email: string;
  createdAt?: string;
  familyMembers: string[];
}

export interface CurrencyRates {
  [base: string]: {
    [target: string]: number;
  };
}

export interface Summary {
  income: number;
  expenses: number;
  balance: number;
}

export interface IncomeSummary {
  total: number;
  count: number;
  average: number;
}

export interface ExpenseSummary {
  total: number;
  count: number;
  average: number;
}

export interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
}

export interface TrendPoint {
  key: string;
  label: string;
  amount: number;
}

export interface TrendData {
  points: TrendPoint[];
  total: number;
  average: number;
  periodLabel: string;
  isEmpty?: boolean;
}
