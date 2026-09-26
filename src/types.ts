export type ThemeMode = 'dark' | 'light' | 'navy' | 'emerald';

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'USER';

export interface User {
  id: number;
  username: string;
  password?: string;
  display_name: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface Party {
  id: number;
  party_name: string;
  contact: string;
  gst: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface Place {
  id: number;
  place_name: string;
  state_code: string;
  created_at?: string;
}

export interface Broker {
  id: number;
  broker_name: string;
  primary_acc_no: string;
  ifsc: string;
  secondary_acc_no?: string;
  secondary_ifsc?: string;
  contact_no: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface Card {
  id: number;
  card_display: string;
  created_at?: string;
}

export interface SalesOrder {
  id: number;
  so_number: string;
  party_id: number;
  from_id: number;
  to_id: number;
  mt: number;
  rate_given: number;
  given_labour_type: 'Inclusive' | 'Extra';
  rate_received: number;
  rec_labour_type: 'Inclusive' | 'Extra';
  loading_charge: number;
  effective_given: number;
  effective_rec: number;
  margin_per_mt: number;
  total_margin: number;
  converted: 'YES' | 'NO';
  status: 'ACTIVE' | 'CANCELLED';
  remarks?: string;
  allocated: boolean;
  documentation_status: boolean;
  mf_status: boolean;
  unloading_status: boolean;
  profit_status: boolean;
  created_at: string;
  created_by: string;
}

export interface TripDispatch {
  id: number;
  so_id: number;
  so_number: string;
  lorry_no: string;
  allocation_date?: string;
  consignor: string;
  consignee: string;
  destination: string;
  broker_id: number | null;
  broker_acc?: string;
  broker_ifsc?: string;
  bal_acc?: string;
  bal_ifsc?: string;
  broker_contact: string;
  driver_contact: string;
  loading_date?: string;
  gc_no?: string;
  invoice_no?: string;
  eway_bill_no?: string;
  eway_expiry?: string;
  destination_gc?: string;
  items?: string;
  pkgs?: string;
  articles?: string;
  final_mt?: number;
  dispatch_status: 'PENDING' | 'DISPATCHED';
  trip_status: 'RUNNING' | 'COMPLETED';
  created_by: string;
  created_at: string;
}

export interface MoneyFreight {
  id: number;
  mf_no: string;
  so_id: number;
  so_number: string;
  lorry_no: string;
  loading_point: string;
  loading_clerk: string;
  pmt_rate: number;
  final_mt: number;
  total_freight: number;
  other_expense: number;
  l_m: number;
  p_m: number;
  lm_d: number;
  pm_d: number;
  freight_mf: number;
  advance: number;
  diesel: number;
  diesel_paid: number;
  diesel_payment_type: string;
  diesel_ref: string;
  diesel_card: string;
  other: number;
  balance: number;
  loading_labour: number;
  fooding: number;
  con: number;
  unloading: number;
  xerox: number;
  detention: number;
  extra_point: number;
  other_chrg: number;
  total_exp: number;
  extra_labour: number;
  total_cost: number;
  bill_pmt: number;
  bilti_freight: number;
  created_by: string;
  created_at: string;
}

export interface Unloading {
  id: number;
  so_id: number;
  so_number: string;
  mf_no: string;
  lorry_no: string;
  unloading_date: string;
  unloading_mt: number;
  shortage: number;
  deduction: number;
  created_by: string;
  created_at: string;
}

export interface Profit {
  id: number;
  so_id: number;
  so_number: string;
  mf_no: string;
  bilti_freight: number;
  extra_chrg: number;
  total_revenue: number;
  total_cost: number;
  deduction: number;
  gross_profit: number;
  gp_on_sale: number;
  gp_on_purchase: number;
  ack_date?: string;
  created_by: string;
  created_at: string;
}

export interface AccountRecord {
  id: number;
  mf_no: string;
  so_id: number | null;
  so_number: string;
  lorry_no: string;
  loading_date?: string;
  broker_id?: number | null;
  broker_name?: string;
  adv_acc_no?: string;
  adv_ifsc?: string;
  bal_acc_no?: string;
  bal_ifsc?: string;
  advance_amount: number;
  balance_amount: number;
  adv_paid_amount: number;
  adv_txn_id: string;
  bal_paid_amount: number;
  bal_txn_id: string;
  adv_status: 'PENDING' | 'ADV_PAID';
  bal_status: 'PENDING' | 'BAL_PAID';
  overall_status: 'PENDING' | 'BAL_PENDING' | 'COMPLETED';
  settlement_date?: string;
  created_by: string;
  created_at: string;
}
