import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

// Initial seed data
const initialDb = {
  user_master: [
    {
      id: 1,
      username: 'admin',
      password_hash: 'admin123',
      display_name: 'Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
      created_at: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 2,
      username: 'user',
      password_hash: 'user123',
      display_name: 'Standard User',
      role: 'USER',
      status: 'ACTIVE',
      created_at: '2024-01-02T00:00:00.000Z'
    }
  ],
  party_master: [
    {
      id: 1,
      party_name: 'Tata Steel Ltd',
      contact: '+91 9876543210',
      gst: '27AAACT2727Q1ZB',
      status: 'ACTIVE',
      created_at: '2024-01-10T00:00:00.000Z'
    },
    {
      id: 2,
      party_name: 'JSW Steel & Energy Ltd',
      contact: '+91 9822012345',
      gst: '24AAACJ1234F1Z1',
      status: 'ACTIVE',
      created_at: '2024-01-11T00:00:00.000Z'
    },
    {
      id: 3,
      party_name: 'Adani Logistics Hub',
      contact: '+91 9845098765',
      gst: '07AACCA0000A1Z5',
      status: 'ACTIVE',
      created_at: '2024-01-12T00:00:00.000Z'
    }
  ],
  place_master: [
    { id: 1, place_name: 'Mumbai', state_code: 'MH', created_at: '2024-01-01T00:00:00.000Z' },
    { id: 2, place_name: 'Delhi NCR', state_code: 'DL', created_at: '2024-01-01T00:00:00.000Z' },
    { id: 3, place_name: 'Kolkata', state_code: 'WB', created_at: '2024-01-01T00:00:00.000Z' },
    { id: 4, place_name: 'Chennai', state_code: 'TN', created_at: '2024-01-01T00:00:00.000Z' },
    { id: 5, place_name: 'Ahmedabad', state_code: 'GJ', created_at: '2024-01-01T00:00:00.000Z' },
    { id: 6, place_name: 'Jamshedpur', state_code: 'JH', created_at: '2024-01-01T00:00:00.000Z' }
  ],
  broker_master: [
    {
      id: 1,
      broker_name: 'Gupta Roadlines',
      primary_acc_no: '918273645012',
      ifsc: 'HDFC0001234',
      secondary_acc_no: '918273645099',
      secondary_ifsc: 'HDFC0001234',
      contact_no: '+91 9911223344',
      status: 'ACTIVE',
      created_at: '2024-01-15T00:00:00.000Z'
    },
    {
      id: 2,
      broker_name: 'Sharma Freight Carriers',
      primary_acc_no: '887766554433',
      ifsc: 'SBIN0005678',
      secondary_acc_no: '',
      secondary_ifsc: '',
      contact_no: '+91 9922334455',
      status: 'ACTIVE',
      created_at: '2024-01-16T00:00:00.000Z'
    }
  ],
  card_master: [
    { id: 1, card_display: 'BPCL Fleet Card #4012', created_at: '2024-01-01T00:00:00.000Z' },
    { id: 2, card_display: 'HPCL DriveTrack Plus #8821', created_at: '2024-01-01T00:00:00.000Z' },
    { id: 3, card_display: 'IOCL XTRAPOWER #9934', created_at: '2024-01-01T00:00:00.000Z' }
  ],
  so_master: [
    {
      id: 1,
      so_number: 'SFMPL/080/001',
      party_id: 1,
      from_id: 6,
      to_id: 2,
      mt: 25.5,
      rate_given: 3200,
      given_labour_type: 'Inclusive',
      rate_received: 2900,
      rec_labour_type: 'Inclusive',
      loading_charge: 0,
      effective_given: 3200,
      effective_rec: 2900,
      margin_per_mt: 300,
      total_margin: 7650,
      converted: 'YES',
      status: 'ACTIVE',
      remarks: 'Priority dispatch for JSW',
      allocated: true,
      documentation_status: true,
      mf_status: true,
      unloading_status: false,
      profit_status: false,
      created_at: '2024-03-01T10:00:00.000Z',
      created_by: 'admin'
    }
  ],
  trip_dispatch_master: [
    {
      id: 1,
      so_id: 1,
      so_number: 'SFMPL/080/001',
      lorry_no: 'MH-04-GP-8821',
      consignor: 'Tata Steel Plant 1',
      consignee: 'JSW Project Site Delhi',
      destination: 'Delhi NCR',
      broker_id: 1,
      broker_acc: '918273645012',
      broker_ifsc: 'HDFC0001234',
      bal_acc: '918273645099',
      bal_ifsc: 'HDFC0001234',
      broker_contact: '+91 9911223344',
      driver_contact: '+91 9870011223',
      loading_date: '2024-03-03',
      gc_no: 'GC-88492',
      invoice_no: 'INV-2024-099',
      eway_bill_no: '182736450192',
      eway_expiry: '2024-03-10',
      destination_gc: 'Delhi',
      items: 'Steel Billets',
      pkgs: '12 Bundles',
      articles: 'Heavy Steel',
      final_mt: 25.5,
      dispatch_status: 'DISPATCHED',
      trip_status: 'RUNNING',
      created_by: 'admin',
      created_at: '2024-03-03T11:00:00.000Z'
    }
  ],
  mf_master: [
    {
      id: 1,
      mf_no: 'MF/24/001',
      so_id: 1,
      so_number: 'SFMPL/080/001',
      lorry_no: 'MH-04-GP-8821',
      loading_point: 'Jamshedpur Yard 2',
      loading_clerk: 'Rajesh K',
      pmt_rate: 2900,
      final_mt: 25.5,
      total_freight: 73950,
      other_expense: 0,
      l_m: 0,
      p_m: 0,
      freight_mf: 73950,
      advance: 40000,
      diesel: 20000,
      diesel_paid: 20000,
      diesel_payment_type: 'Card',
      diesel_ref: 'DT-4421',
      diesel_card: 'BPCL Fleet Card #4012',
      other: 0,
      balance: 13950,
      loading_labour: 500,
      fooding: 200,
      con: 100,
      unloading: 0,
      xerox: 50,
      detention: 0,
      extra_point: 0,
      other_chrg: 0,
      total_exp: 850,
      extra_labour: 0,
      total_cost: 74800,
      bill_pmt: 3200,
      bilti_freight: 81600,
      created_by: 'admin',
      created_at: '2024-03-03T12:00:00.000Z'
    }
  ],
  unloading_master: [],
  account_master: [
    {
      id: 1,
      mf_no: 'MF/24/001',
      so_id: 1,
      so_number: 'SFMPL/080/001',
      lorry_no: 'MH-04-GP-8821',
      loading_date: '2024-03-03',
      broker_id: 1,
      broker_name: 'Gupta Roadlines',
      adv_acc_no: '918273645012',
      adv_ifsc: 'HDFC0001234',
      bal_acc_no: '918273645099',
      bal_ifsc: 'HDFC0001234',
      advance_amount: 40000,
      balance_amount: 13950,
      adv_paid_amount: 40000,
      adv_txn_id: 'TXN7710293',
      bal_paid_amount: 0,
      bal_txn_id: '',
      adv_status: 'ADV_PAID',
      bal_status: 'PENDING',
      overall_status: 'BAL_PENDING',
      created_by: 'admin',
      created_at: '2024-03-03T13:00:00.000Z'
    }
  ],
  profit_master: []
};

// Database persistence helpers
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error loading db.json, resetting to initialDb:', err);
  }
  saveDb(initialDb);
  return initialDb;
}

function saveDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing db.json:', err);
  }
}

let db = loadDb();

function getTable(name) {
  if (!db[name]) {
    db[name] = [];
    saveDb(db);
  }
  return db[name];
}

// PostgREST Query Filter & Evaluation helper
function evaluateFilter(row, col, filterStr) {
  if (filterStr.startsWith('eq.')) {
    const target = filterStr.slice(3);
    const val = row[col];
    if (target === 'true') return val === true;
    if (target === 'false') return val === false;
    if (target === 'null') return val === null || val === undefined;
    if (!isNaN(Number(target)) && typeof val === 'number') {
      return Number(val) === Number(target);
    }
    return String(val ?? '') === String(target);
  }
  if (filterStr.startsWith('neq.')) {
    const target = filterStr.slice(4);
    return String(row[col] ?? '') !== String(target);
  }
  if (filterStr === 'not.is.null') {
    return row[col] !== null && row[col] !== undefined && row[col] !== '';
  }
  if (filterStr === 'is.null') {
    return row[col] === null || row[col] === undefined || row[col] === '';
  }
  if (filterStr.startsWith('gt.')) {
    return Number(row[col]) > Number(filterStr.slice(3));
  }
  if (filterStr.startsWith('gte.')) {
    return Number(row[col]) >= Number(filterStr.slice(4));
  }
  if (filterStr.startsWith('lt.')) {
    return Number(row[col]) < Number(filterStr.slice(3));
  }
  if (filterStr.startsWith('lte.')) {
    return Number(row[col]) <= Number(filterStr.slice(4));
  }
  if (filterStr.startsWith('like.')) {
    const pattern = filterStr.slice(5).replace(/%/g, '.*');
    return new RegExp(`^${pattern}$`, 'i').test(String(row[col] ?? ''));
  }
  if (filterStr.startsWith('ilike.')) {
    const pattern = filterStr.slice(6).replace(/%/g, '.*');
    return new RegExp(`^${pattern}$`, 'i').test(String(row[col] ?? ''));
  }
  return true;
}

function applyQuery(rows, query) {
  let result = [...rows];

  // 1. Filtering
  for (const [key, value] of Object.entries(query)) {
    if (['order', 'limit', 'offset', 'select'].includes(key)) continue;
    result = result.filter(r => evaluateFilter(r, key, String(value)));
  }

  const totalCount = result.length;

  // 2. Ordering
  if (query.order) {
    const [col, dir = 'asc'] = query.order.split('.');
    const isDesc = dir.toLowerCase() === 'desc';
    result.sort((a, b) => {
      let valA = a[col];
      let valB = b[col];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return isDesc ? 1 : -1;
      if (valB === undefined || valB === null) return isDesc ? -1 : 1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return isDesc ? valB - valA : valA - valB;
      }
      return isDesc
        ? String(valB).localeCompare(String(valA))
        : String(valA).localeCompare(String(valB));
    });
  }

  // 3. Pagination
  const offset = query.offset ? parseInt(query.offset, 10) : 0;
  const limit = query.limit ? parseInt(query.limit, 10) : undefined;
  if (offset > 0) {
    result = result.slice(offset);
  }
  if (limit !== undefined && limit >= 0) {
    result = result.slice(0, limit);
  }

  // 4. Projection
  if (query.select && query.select !== '*') {
    const cols = query.select.split(',').map(c => c.trim());
    result = result.map(r => {
      const proj = {};
      for (const col of cols) {
        if (col in r) proj[col] = r[col];
      }
      return proj;
    });
  }

  return { data: result, total: totalCount };
}

// ── Supabase PostgREST Mock API ──────────────────────────────

// HEAD /rest/v1/:table
app.head('/rest/v1/:table', (req, res) => {
  const table = getTable(req.params.table);
  const { total } = applyQuery(table, req.query);
  res.setHeader('Content-Range', total === 0 ? '*/0' : `0-${total - 1}/${total}`);
  res.setHeader('Range-Unit', 'items');
  res.status(200).end();
});

// GET /rest/v1/:table
app.get('/rest/v1/:table', (req, res) => {
  const table = getTable(req.params.table);
  const { data, total } = applyQuery(table, req.query);
  const prefer = req.headers['prefer'] || '';
  if (prefer.includes('count=exact')) {
    res.setHeader('Content-Range', total === 0 ? '*/0' : `0-${total - 1}/${total}`);
    res.setHeader('Range-Unit', 'items');
  }
  res.json(data);
});

// POST /rest/v1/:table
app.post('/rest/v1/:table', (req, res) => {
  const table = getTable(req.params.table);
  const body = req.body;
  const items = Array.isArray(body) ? body : [body];
  const inserted = [];

  for (const item of items) {
    const newItem = { ...item };
    if (!newItem.id) {
      const maxId = table.reduce((max, r) => (r.id && r.id > max ? r.id : max), 0);
      newItem.id = maxId + 1;
    }
    if (!newItem.created_at) {
      newItem.created_at = new Date().toISOString();
    }
    table.push(newItem);
    inserted.push(newItem);
  }

  saveDb(db);
  res.status(201).json(inserted);
});

// PATCH /rest/v1/:table
app.patch('/rest/v1/:table', (req, res) => {
  const table = getTable(req.params.table);
  const updates = req.body;
  const query = req.query;
  const updated = [];

  for (let i = 0; i < table.length; i++) {
    const row = table[i];
    let match = true;
    for (const [key, value] of Object.entries(query)) {
      if (['order', 'limit', 'offset', 'select'].includes(key)) continue;
      if (!evaluateFilter(row, key, String(value))) {
        match = false;
        break;
      }
    }
    if (match) {
      table[i] = { ...row, ...updates };
      updated.push(table[i]);
    }
  }

  saveDb(db);
  res.status(200).json(updated);
});

// DELETE /rest/v1/:table
app.delete('/rest/v1/:table', (req, res) => {
  const table = getTable(req.params.table);
  const query = req.query;
  const remaining = [];

  for (const row of table) {
    let match = true;
    for (const [key, value] of Object.entries(query)) {
      if (['order', 'limit', 'offset', 'select'].includes(key)) continue;
      if (!evaluateFilter(row, key, String(value))) {
        match = false;
        break;
      }
    }
    if (!match) {
      remaining.push(row);
    }
  }

  db[req.params.table] = remaining;
  saveDb(db);
  res.status(204).end();
});

// Static assets & SPA fallback
app.use(express.static(__dirname));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/rest/')) return next();
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SFMPL TMS v4 running at http://0.0.0.0:${PORT}`);
});
