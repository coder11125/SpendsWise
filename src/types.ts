export interface Expense {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  familyMember?: string;
  note?: string;
  currency: string;
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
