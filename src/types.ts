import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  permissions: string[];
  avatar?: string;
}

export interface Transaction {
  id: number;
  type: 'petty_cash' | 'expense' | 'revenue';
  code: string;
  amount: number;
  date: string;
  description: string;
  status: 'pending' | 'closed' | 'extended' | 'extension_pending';
  user_id: number;
  user_name?: string;
  parent_id?: number;
  category_id?: number;
  attachment_url?: string;
  expiry_date?: string;
  remaining_balance?: number;
}

export interface Stats {
  revenue: number;
  expense: number;
  pettyCash: number;
  balance: number;
  netProfit: number;
}
