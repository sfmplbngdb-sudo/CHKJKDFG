# SFMPL Transport Management System (TMS)

Enterprise-grade Freight, Logistics, and Fleet Management platform engineered for high-volume nationwide transport operations, real-time margin calculation, dispatch documentation, driver/broker settlements, and multi-year financial audits.

---

## 1. System Access & Authentication

The system is protected with role-based authentication and secure session management.

### Default System Accounts

| Role | User ID / Username | Password | Operational Power | Edit & Delete Power | User Management |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Super Admin** | `SFMPL` | `sfmpl@1991` | **Full Power** | **YES** (Can edit & delete any record) | **YES** (Can add, edit & delete users) |
| **Admin** | `admin` | `admin123` | **Full Power** (Identical to Superadmin) | **NO** (Leaving Edit & Delete) | **NO** (Superadmin only) |

### Role Hierarchy & Capabilities:
- **SUPERADMIN (`SFMPL`)**:
  - Full operational capability across all modules (Orders, Vehicle Allocation, GC Dispatch, Money Freight, Unloading, Profits, Bank Settlements, Reports).
  - Exclusive authority to **Edit** existing orders, trips, and money freight records.
  - Exclusive authority to **Delete** any operational or master records.
  - Exclusive authority to **Add New Users**, assign roles (`SUPERADMIN`, `ADMIN`, `USER`), and update passwords in the User Roles registry (`/users`).
- **ADMIN (`admin`)**:
  - Engineered specifically with **full operational power like Superadmin**:
    - Can create new Sales Orders & rate agreements.
    - Can allocate vehicles and drivers to orders.
    - Can generate GC (Goods Consignment) documentation and verify E-Way bills.
    - Can calculate and issue Money Freight (MF) ledgers (diesel cards, advances, loading charges).
    - Can record delivery weighments, shortages, and deductions.
    - Can calculate net margins, GP on sales %, and gross profits.
    - Can record advance bank payouts and balance settlement transactions (UTR reference IDs).
    - Can export operational data and print transport manifests.
  - **Leaving Edit & Delete Options**:
    - Restricted from modifying (editing) finalized transaction records.
    - Restricted from deleting operational records.
    - Restricted from modifying user credentials or adding new users.

---

## 2. Supabase 5-Year High-Volume Database Schema

The complete production-ready PostgreSQL and Supabase schema is located at:
- **Primary file**: `supabase/schema.sql`
- **Root alias**: `supabase_schema.sql`

### 5-Year Scalability Highlights:
1. **Declarative Range Partitioning by `created_at`**:
   - The operational tables (`sales_orders`, `trip_dispatches`, `money_freights`, `unloading_records`, `profits`, `account_records`, and `audit_logs`) are partitioned by chronological range.
   - Pre-provisioned partitions cover **2024, 2025, 2026, 2027, 2028, 2029, and 2030**, with a fallback `_default` partition for future-proof operations.
   - Benefits: Query pruning guarantees that 5-year chronological scans only access the relevant yearly partition, preventing table bloat and performance degradation.
2. **Dual Indexing Architecture (BRIN + B-Tree + GIN Trigram)**:
   - **BRIN (Block Range Index)** on `created_at`, `allocation_date`, `loading_date`, `unloading_date`, and `settlement_date`. Consumes less than 1% of the storage of traditional B-Trees while accelerating multi-year time-range scans by up to 50x.
   - **B-Tree Indexes** on unique identifiers: `so_number`, `mf_no`, `lorry_no`, `gc_no`, `party_id`, `broker_id`.
   - **GIN Trigram Indexes** (`pg_trgm`) on `party_name`, `destination`, `lorry_no`, and `broker_name` for instantaneous substring searches across millions of rows.
3. **5-Year Materialized KPI Rollup (`sfmpl.mv_monthly_executive_kpis`)**:
   - Provides sub-millisecond executive dashboard aggregations (Gross Revenue, Total Freight, Net Profit, Average Margins) without scanning raw tables.
4. **Row-Level Security (RLS)**:
   - Enforces role separation directly at the database engine level:
     - `SUPERADMIN`: Full `ALL` policy permissions.
     - `ADMIN`: `SELECT` and `INSERT` policies enabled across operational tables; `UPDATE` and `DELETE` queries are rejected by database security rules.
5. **Audit Logging (`sfmpl.audit_logs`)**:
   - Automatically tracks table mutations with before/after JSONB snapshots and operator attribution.

### Deploying the Schema to Supabase:
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project and navigate to the **SQL Editor**.
3. Copy the entire contents of `supabase/schema.sql` (or `supabase_schema.sql`).
4. Click **Run**. All partitions, indexes, types, materialized views, and default users (`SFMPL` and `admin`) will be provisioned instantly.

---

## 3. Fresh Production State (Demo Entries Cleared)

- All mock/demo transaction records (dummy sales orders, test trips, demo MF entries, and sample payouts) have been removed.
- The application starts with a pristine database ready for genuine logistics entries.
- To re-initialize the clean state at any time, click **Reset DB** in the top navigation bar.

---

## 4. Key Modules & Workflows

1. **Dashboard & Trend Analysis**:
   - Live fleet monitoring, active orders, and monthly projected profit curves.
2. **Sales Orders (SO)**:
   - Client rate agreements, loading charge accounting, and converted order registry.
3. **Vehicle Allocation (Stage 1)**:
   - Lorry and driver assignment, consignor/consignee routing.
4. **Dispatch Documentation & GC (Stage 2)**:
   - Goods Consignment generation, E-Way bill expiry tracking, and cargo verification.
5. **Money Freight (MF) Ledger (Stage 3)**:
   - Diesel card management (BPCL, HPCL, IOCL), loading labour, deductions (LM/PM), and driver balance math.
6. **Unloading & Shortage Registry (Stage 4)**:
   - Delivered weighment vs. billed MT, shortage deduction, and receiving receipts.
7. **Profit & Margin Audit (Stage 5)**:
   - Freight revenue vs. total vehicle cost audit, Gross Profit on Sale %, and GP on Purchase %.
8. **Payment Settlements & Bank Accounts (Stage 6)**:
   - Primary & secondary bank accounts (NEFT/RTGS), advance payouts, balance settlements, and UTR transaction tracking.
9. **Master Registries**:
   - Parties, places & terminals, brokers/transporters, fuel cards, and system users.
10. **Universal Excel / CSV Import**:
    - High-speed bulk ingestion with auto-column mapping and validation.
