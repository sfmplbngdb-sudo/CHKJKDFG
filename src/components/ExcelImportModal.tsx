import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileCheck
} from 'lucide-react';
import { ThemeStyles } from '../utils/theme';
import { useTMSStore } from '../store/useTMSStore';

export type ImportModuleType = 'sales-orders' | 'trips' | 'parties' | 'places' | 'brokers';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeStyles: ThemeStyles;
  store: ReturnType<typeof useTMSStore>;
  defaultModule?: ImportModuleType;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  themeStyles,
  store,
  defaultModule = 'sales-orders'
}) => {
  const [selectedModule, setSelectedModule] = useState<ImportModuleType>(defaultModule);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Sample templates generator
  const downloadSampleTemplate = () => {
    let sampleRows: any[] = [];
    let templateName = 'Template.xlsx';

    if (selectedModule === 'sales-orders') {
      templateName = 'SFMPL_Sales_Orders_Template.xlsx';
      sampleRows = [
        {
          Party_ID: 1,
          From_ID: 6,
          To_ID: 2,
          Metric_Ton: 32.5,
          Party_Rate: 3400,
          Party_Labour: 'Inclusive',
          Lorry_Rate: 3050,
          Lorry_Labour: 'Inclusive',
          Loading_Charge: 0,
          Convert_To_SO: 'YES',
          Remarks: 'Structural Steel TMT'
        },
        {
          Party_ID: 2,
          From_ID: 5,
          To_ID: 1,
          Metric_Ton: 24.0,
          Party_Rate: 2800,
          Party_Labour: 'Extra',
          Lorry_Rate: 2500,
          Lorry_Labour: 'Inclusive',
          Loading_Charge: 120,
          Convert_To_SO: 'YES',
          Remarks: 'Steel pipes'
        }
      ];
    } else if (selectedModule === 'trips') {
      templateName = 'SFMPL_Vehicle_Allocation_Template.xlsx';
      sampleRows = [
        {
          SO_ID: 1,
          Lorry_No: 'MH-04-AB-1234',
          Driver_Contact: '+91 98200 11223',
          Broker_ID: 1,
          Consignor: 'Tata Steel Jamshedpur',
          Consignee: 'Delhi Warehouse 4',
          Destination: 'Delhi NCR'
        },
        {
          SO_ID: 2,
          Lorry_No: 'GJ-01-CD-5678',
          Driver_Contact: '+91 98200 44556',
          Broker_ID: 2,
          Consignor: 'JSW Ahmedabad',
          Consignee: 'Bhiwandi Depot',
          Destination: 'Mumbai'
        }
      ];
    } else if (selectedModule === 'parties') {
      templateName = 'SFMPL_Parties_Template.xlsx';
      sampleRows = [
        {
          Party_Name: 'ArcelorMittal Nippon Steel',
          Contact: '+91 98111 22334',
          GST_Number: '24AAACA1234A1Z5',
          Status: 'ACTIVE'
        },
        {
          Party_Name: 'Vedanta Aluminium Ltd',
          Contact: '+91 98222 33445',
          GST_Number: '21AAACV5678B1Z2',
          Status: 'ACTIVE'
        }
      ];
    } else if (selectedModule === 'places') {
      templateName = 'SFMPL_Places_Template.xlsx';
      sampleRows = [
        { Place_Name: 'Pune Chakan', State_Code: 'MH' },
        { Place_Name: 'Bhubaneswar', State_Code: 'OR' },
        { Place_Name: 'Hyderabad', State_Code: 'TS' }
      ];
    } else if (selectedModule === 'brokers') {
      templateName = 'SFMPL_Brokers_Template.xlsx';
      sampleRows = [
        {
          Broker_Name: 'National Freight Logistics',
          Contact_Number: '+91 99111 55667',
          Primary_Account_No: '998877665544',
          Primary_IFSC: 'HDFC0000123',
          Secondary_Account_No: '998877665599',
          Secondary_IFSC: 'HDFC0000123'
        }
      ];
    }

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, templateName);
  };

  // Handle file upload & parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setSuccessMsg('');
    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawJson || rawJson.length === 0) {
          setErrorMsg('The selected spreadsheet contains no data rows.');
          setParsedData([]);
          setIsProcessing(false);
          return;
        }

        setParsedData(rawJson);
        setIsProcessing(false);
      } catch (err: any) {
        setErrorMsg(`Failed to parse file: ${err.message || 'Invalid format'}`);
        setParsedData([]);
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Process and import into store
  const handleImport = () => {
    if (!parsedData || parsedData.length === 0) return;

    try {
      if (selectedModule === 'sales-orders') {
        const transformed = parsedData.map(r => ({
          party_id: Number(r.Party_ID || r.party_id || 1),
          from_id: Number(r.From_ID || r.from_id || 1),
          to_id: Number(r.To_ID || r.to_id || 2),
          mt: Number(r.Metric_Ton || r.MT || r.mt || 25),
          rate_given: Number(r.Party_Rate || r.rate_given || 3000),
          given_labour_type: (r.Party_Labour || r.given_labour_type || 'Inclusive') as any,
          rate_received: Number(r.Lorry_Rate || r.rate_received || 2800),
          rec_labour_type: (r.Lorry_Labour || r.rec_labour_type || 'Inclusive') as any,
          loading_charge: Number(r.Loading_Charge || r.loading_charge || 0),
          converted: (r.Convert_To_SO || r.converted || 'YES') as any,
          status: 'ACTIVE' as const,
          remarks: r.Remarks || r.remarks || ''
        }));
        store.bulkImportSalesOrders(transformed);
      } else if (selectedModule === 'trips') {
        const transformed = parsedData.map(r => ({
          so_id: Number(r.SO_ID || r.so_id || 1),
          lorry_no: (r.Lorry_No || r.lorry_no || '').toString().toUpperCase(),
          driver_contact: (r.Driver_Contact || r.driver_contact || '').toString(),
          broker_id: r.Broker_ID || r.broker_id ? Number(r.Broker_ID || r.broker_id) : null,
          consignor: r.Consignor || r.consignor || '',
          consignee: r.Consignee || r.consignee || '',
          destination: r.Destination || r.destination || '',
          dispatch_status: 'PENDING' as const,
          trip_status: 'RUNNING' as const
        }));
        store.bulkImportTrips(transformed);
      } else if (selectedModule === 'parties') {
        const transformed = parsedData.map(r => ({
          party_name: r.Party_Name || r.party_name || 'Party Name',
          contact: (r.Contact || r.contact || '').toString(),
          gst: (r.GST_Number || r.gst || '').toString().toUpperCase(),
          status: 'ACTIVE' as const
        }));
        store.bulkImportParties(transformed);
      } else if (selectedModule === 'places') {
        const transformed = parsedData.map(r => ({
          place_name: r.Place_Name || r.place_name || '',
          state_code: (r.State_Code || r.state_code || 'IN').toString().toUpperCase()
        }));
        store.bulkImportPlaces(transformed);
      } else if (selectedModule === 'brokers') {
        const transformed = parsedData.map(r => ({
          broker_name: r.Broker_Name || r.broker_name || '',
          contact_no: (r.Contact_Number || r.contact_no || '').toString(),
          primary_acc_no: (r.Primary_Account_No || r.primary_acc_no || '').toString(),
          ifsc: (r.Primary_IFSC || r.ifsc || '').toString().toUpperCase(),
          secondary_acc_no: (r.Secondary_Account_No || r.secondary_acc_no || '').toString(),
          secondary_ifsc: (r.Secondary_IFSC || r.secondary_ifsc || '').toString().toUpperCase(),
          status: 'ACTIVE' as const
        }));
        store.bulkImportBrokers(transformed);
      }

      setSuccessMsg(`Successfully imported ${parsedData.length} records into ${selectedModule.replace('-', ' ')}!`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(`Import failed: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl ${themeStyles.cardBg} ${themeStyles.cardBorder} my-8`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-400" />
            <h3 className={`text-base font-bold ${themeStyles.textPrimary}`}>
              Import Transport Data from Excel / CSV
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Module Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Data Target Module *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'sales-orders', label: 'Sales Orders' },
                { id: 'trips', label: 'Vehicle Allocations' },
                { id: 'parties', label: 'Parties / Clients' },
                { id: 'places', label: 'Places / Cities' },
                { id: 'brokers', label: 'Transporters / Brokers' }
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedModule(item.id as any);
                    setParsedData([]);
                    setFileName('');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`px-2.5 py-2 text-xs font-medium rounded-lg border transition-all text-center ${
                    selectedModule === item.id
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Download Template Banner */}
          <div className="p-3.5 rounded-xl border border-white/10 bg-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-semibold text-slate-200">Need the correct column format?</div>
              <div className="text-slate-400 text-[11px] mt-0.5">
                Download a pre-formatted template with sample rows and column headers.
              </div>
            </div>
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs font-semibold shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          {/* File Upload Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/15 hover:border-blue-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-black/10 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <FileSpreadsheet className="h-10 w-10 mx-auto text-slate-400 group-hover:text-blue-400 transition-colors mb-2" />
            <div className="text-xs font-semibold text-slate-200">
              {fileName ? fileName : 'Click to select or drag & drop Excel / CSV file'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Supports .xlsx, .xls, and .csv files
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Data Preview */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  Preview: {parsedData.length} records ready to import
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">Format Validated ✓</span>
              </div>

              <div className="max-h-48 overflow-auto rounded-lg border border-white/10 bg-black/30">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 bg-white/5">
                      {Object.keys(parsedData[0] || {}).slice(0, 6).map(k => (
                        <th key={k} className="p-2 font-mono">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {parsedData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/5 text-slate-300">
                        {Object.values(row).slice(0, 6).map((val: any, cIdx) => (
                          <td key={cIdx} className="p-2 font-mono truncate max-w-[120px]">
                            {String(val ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={parsedData.length === 0 || isProcessing}
              onClick={handleImport}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none shadow-xs transition-colors"
            >
              <FileCheck className="h-4 w-4" />
              <span>Confirm & Import ({parsedData.length} Records)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
