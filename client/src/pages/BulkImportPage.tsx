import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Eye,
  Info,
  RotateCcw,
  BookOpen,
  Users,
  Database,
  Layers,
  ChevronRight,
  X,
  FileCheck,
} from 'lucide-react';
import {
  validateCsvImport,
  confirmImportJob,
  fetchImportJobs,
  fetchImportSummary,
  retryImportJob,
  getTemplateDownloadUrl,
  getErrorReportDownloadUrl,
} from '../services/api';
import {
  ImportType,
  ConflictPolicy,
  ImportJob,
  ImportSummary,
  ImportValidationData,
  Pagination,
} from '../types';
import { Drawer } from '../components/ui/Drawer';
import { PaginationControls } from '../components/ui/PaginationControls';

export const BulkImportPage: React.FC = () => {
  // Stepper state (1: Select, 2: Upload, 3: Preview & Validate, 4: Confirm & Process, 5: Review Results)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [importType, setImportType] = useState<ImportType>('BOOKS');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Validation & Processing state
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationData, setValidationData] = useState<ImportValidationData | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Confirmation & Execution state
  const [conflictPolicy, setConflictPolicy] = useState<ConflictPolicy>('SKIP_DUPLICATES');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingResult, setProcessingResult] = useState<any | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Import History & Summary state
  const [historyJobs, setHistoryJobs] = useState<ImportJob[]>([]);
  const [historySummary, setHistorySummary] = useState<ImportSummary | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  // Inspection Drawer
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Load history summary
  const loadSummary = useCallback(async () => {
    try {
      const res = await fetchImportSummary();
      if (res.success && res.data) {
        setHistorySummary(res.data);
      }
    } catch (err: unknown) {
      console.error('Failed to load import summary:', err);
    }
  }, []);

  // Load past jobs
  const loadHistoryJobs = useCallback(
    async (pageToLoad = 1) => {
      setIsLoadingHistory(true);
      try {
        const res = await fetchImportJobs({
          page: pageToLoad,
          limit: pagination.limit,
          search: search.trim() || undefined,
          type: typeFilter !== 'ALL' ? typeFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        });

        if (res.success) {
          setHistoryJobs(res.data || []);
          const meta = (res as any).pagination;
          if (meta) {
            setPagination({
              page: meta.page || pageToLoad,
              limit: meta.limit || 10,
              total: meta.total || (res.data ? res.data.length : 0),
              totalPages: meta.totalPages || 1,
            });
          }
        }
      } catch (err: unknown) {
        console.error('Failed to load import history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [pagination.limit, search, typeFilter, statusFilter]
  );

  useEffect(() => {
    loadSummary();
    loadHistoryJobs(1);
  }, [loadSummary, loadHistoryJobs]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.match(/\.(csv|txt)$/i)) {
        setSelectedFile(file);
        setValidationError(null);
      } else {
        setValidationError('Only CSV format (.csv) files are supported for bulk upload.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setValidationError(null);
    }
  };

  // Step 2 -> 3: Upload & Pre-Validate
  const handleUploadAndValidate = async () => {
    if (!selectedFile) {
      setValidationError('Please select a CSV file to validate.');
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const res = await validateCsvImport({
        importType,
        file: selectedFile,
      });

      if (res.success) {
        setValidationData(res.data);
        setCurrentStep(3); // Advance to preview
      } else {
        setValidationError(res.error.message || 'CSV pre-validation failed.');
      }
    } catch (err: any) {
      setValidationError(err?.message || 'Network error during CSV upload.');
    } finally {
      setIsValidating(false);
    }
  };

  // Step 4 -> 5: Confirm & Execute Batch Processing
  const handleConfirmImport = async () => {
    if (!validationData) return;

    setIsProcessing(true);
    setProcessingError(null);

    try {
      const res = await confirmImportJob(validationData.jobId, conflictPolicy);
      if (res.success) {
        setProcessingResult(res.data);
        setCurrentStep(5); // Advance to review
        setSuccessToast(`Batch import processed: ${res.data.successfulRows} records written.`);
        loadSummary();
        loadHistoryJobs(1);
      } else {
        setProcessingError(res.error.message || 'Batch execution failed.');
      }
    } catch (err: any) {
      setProcessingError(err?.message || 'Error occurred during batch insertion.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset workflow
  const handleStartNewImport = () => {
    setCurrentStep(1);
    setSelectedFile(null);
    setValidationData(null);
    setProcessingResult(null);
    setValidationError(null);
    setProcessingError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Retry partially failed job
  const handleRetryJob = async (jobId: string) => {
    setIsRetrying(true);
    try {
      const res = await retryImportJob(jobId);
      if (res.success) {
        setSuccessToast(`Retry executed: ${res.data.successfulRows} failed records recovered.`);
        loadSummary();
        loadHistoryJobs(pagination.page);
        setIsDrawerOpen(false);
      } else {
        alert(res.error.message || 'Failed to retry job.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error executing retry.');
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            Completed
          </span>
        );
      case 'COMPLETED_WITH_ERRORS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
            Partial Success
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" />
            Failed
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin text-teal-600" />
            Processing
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Ready to Import
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-brand-navy">Bulk CSV Import &amp; Batch Processing</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-brand-teal border border-teal-200">
              <Database className="w-3 h-3 mr-1" />
              Big Data Engine
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Batch-process hundreds of academic books and registered members with automated schema validation and conflict resolution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={getTemplateDownloadUrl(importType === 'BOOKS' ? 'books' : 'members')}
            className="inline-flex items-center px-3 py-2 border border-slate-300 text-xs font-semibold rounded-md text-slate-700 bg-white hover:bg-slate-50 shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Download {importType === 'BOOKS' ? 'Books' : 'Members'} Template
          </a>
        </div>
      </div>

      {/* Toast Alert */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between text-sm text-emerald-800 animate-fadeIn">
          <div className="flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
            {successToast}
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Aggregate Telemetry Summary Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Import Jobs</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{historySummary?.totalJobs ?? 0}</p>
          <span className="text-xs text-slate-500">Persisted batch executions</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Records Ingested</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{historySummary?.totalImportedRows ?? 0}</p>
          <span className="text-xs text-emerald-600">Successfully written to database</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Batch Processing Chunk</span>
            <Database className="w-4 h-4 text-brand-teal" />
          </div>
          <p className="mt-2 text-2xl font-bold text-brand-navy">{historySummary?.batchSize ?? 50} / chunk</p>
          <span className="text-xs text-slate-500">Atomic concurrency limit</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Max Row Capacity</span>
            <FileSpreadsheet className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {historySummary?.maxRowsLimit?.toLocaleString() ?? '5,000'} rows
          </p>
          <span className="text-xs text-slate-500">Per uploaded CSV file</span>
        </div>
      </div>

      {/* Main Import Wizard Container */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {/* Stepper Navigation Bar */}
        <div className="border-b border-slate-200 bg-slate-50/75 px-6 py-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 max-w-3xl">
            <div
              className={`flex items-center gap-1.5 ${
                currentStep >= 1 ? 'text-brand-navy font-semibold' : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep >= 1 ? 'bg-brand-navy text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                1
              </span>
              <span>Category</span>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

            <div
              className={`flex items-center gap-1.5 ${
                currentStep >= 2 ? 'text-brand-navy font-semibold' : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep >= 2 ? 'bg-brand-navy text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                2
              </span>
              <span>Upload CSV</span>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

            <div
              className={`flex items-center gap-1.5 ${
                currentStep >= 3 ? 'text-brand-navy font-semibold' : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep >= 3 ? 'bg-brand-navy text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                3
              </span>
              <span>Preview &amp; Validate</span>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

            <div
              className={`flex items-center gap-1.5 ${
                currentStep >= 4 ? 'text-brand-navy font-semibold' : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep >= 4 ? 'bg-brand-navy text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                4
              </span>
              <span>Batch Ingest</span>
            </div>
          </div>
        </div>

        {/* Wizard Steps Content */}
        <div className="p-6">
          {/* STEP 1: SELECT CATEGORY */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Step 1 — Choose Import Category</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Select the entity type you are importing. The CSV parser will validate all columns against the active
                  library data dictionary.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Books Option */}
                <div
                  onClick={() => setImportType('BOOKS')}
                  className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                    importType === 'BOOKS'
                      ? 'border-brand-navy bg-slate-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-lg ${
                        importType === 'BOOKS' ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Book Inventory Catalog</h4>
                      <p className="text-xs text-slate-500">Import academic books, ISBNs, authors, and physical quantities</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 text-xs space-y-1 text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-700">Required:</span> title, isbn, authors, totalcopies
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Optional:</span> category, publisher, publicationyear, shelflocation
                    </div>
                  </div>
                </div>

                {/* Members Option */}
                <div
                  onClick={() => setImportType('MEMBERS')}
                  className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                    importType === 'MEMBERS'
                      ? 'border-brand-navy bg-slate-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-lg ${
                        importType === 'MEMBERS' ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Library Members Directory</h4>
                      <p className="text-xs text-slate-500">Import student and faculty cards, USN/IDs, and quota limits</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 text-xs space-y-1 text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-700">Required:</span> memberid, fullname, email, department
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Optional:</span> contactnumber, membertype, maxborrowlimit
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-navy hover:bg-slate-800 rounded-md shadow-xs transition"
                >
                  Continue to Upload &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: UPLOAD CSV */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Step 2 — Upload {importType === 'BOOKS' ? 'Books' : 'Members'} CSV File
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload your UTF-8 encoded CSV. The file will be parsed and pre-validated on the server before writing
                    any records to the database.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Change Category
                </button>
              </div>

              {/* Drag and Drop Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-brand-navy bg-slate-50'
                    : selectedFile
                    ? 'border-teal-500 bg-teal-50/20'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,text/csv,text/plain"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <FileCheck className="w-10 h-10 mx-auto text-teal-600" />
                    <p className="text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB &bull; CSV Document</p>
                    <p className="text-xs text-teal-700 font-medium">Click or drag another file to replace</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <UploadCloud className="w-10 h-10 mx-auto text-slate-400" />
                    <p className="text-sm font-semibold text-slate-800">Drag and drop your CSV file here, or browse</p>
                    <p className="text-xs text-slate-500">Supports standard UTF-8 CSV files up to 10 MB</p>
                  </div>
                )}
              </div>

              {validationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 shrink-0 text-rose-600" />
                  {validationError}
                </div>
              )}

              {/* Helpful Format Guide Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2 text-slate-600">
                <div className="flex items-center text-slate-800 font-semibold gap-1.5">
                  <Info className="w-4 h-4 text-brand-teal" />
                  <span>CSV File Structure Guidelines</span>
                </div>
                <p>
                  Header row must match expected column names. Values containing commas or quotation marks must be enclosed
                  in double quotes. Empty lines and trailing spaces are automatically normalized.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={getTemplateDownloadUrl(importType === 'BOOKS' ? 'books' : 'members')}
                    className="text-brand-teal hover:underline font-medium inline-flex items-center"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download reference CSV template with valid sample data
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  disabled={!selectedFile || isValidating}
                  onClick={handleUploadAndValidate}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-navy hover:bg-slate-800 rounded-md shadow-xs transition disabled:opacity-50 flex items-center"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isValidating ? 'animate-spin' : ''}`} />
                  {isValidating ? 'Analyzing & Pre-Validating...' : 'Pre-Validate File'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & VALIDATION RESULTS */}
          {currentStep === 3 && validationData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Step 3 — Review Pre-Validation Results</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Job ID: <span className="font-mono text-slate-700">{validationData.jobId}</span> &bull; File:{' '}
                    <span className="font-medium text-slate-700">{validationData.fileName}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartNewImport}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Upload Different File
                </button>
              </div>

              {/* Validation Metric Badges */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="text-xs text-slate-500 block uppercase">Total Rows</span>
                  <span className="text-lg font-bold text-slate-900">{validationData.totalRows}</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                  <span className="text-xs text-emerald-600 block uppercase">Valid Records</span>
                  <span className="text-lg font-bold text-emerald-800">{validationData.validRowsCount}</span>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md">
                  <span className="text-xs text-rose-600 block uppercase">Rejected Errors</span>
                  <span className="text-lg font-bold text-rose-800">{validationData.invalidRowsCount}</span>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <span className="text-xs text-amber-700 block uppercase">Duplicate Conflicts</span>
                  <span className="text-lg font-bold text-amber-800">{validationData.potentialDuplicates}</span>
                </div>
              </div>

              {/* Row Errors Warnings (if any) */}
              {validationData.errors.length > 0 && (
                <div className="border border-rose-200 rounded-md bg-rose-50/50 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Validation Issues Detected ({validationData.errors.length} errors)</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
                    {validationData.errors.map((err, idx) => (
                      <div key={idx} className="text-xs text-rose-900 flex items-start gap-2 bg-white/70 p-2 rounded border border-rose-100">
                        <span className="font-mono font-semibold px-1.5 py-0.5 bg-rose-100 rounded text-[11px] shrink-0">
                          Row {err.rowNumber}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-800">[{err.field}]: </span>
                          <span>{err.message}</span>
                          {err.rawValue && (
                            <span className="text-slate-500 italic ml-1"> (Input: &quot;{err.rawValue}&quot;)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  First 10 Data Rows Preview
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        {validationData.previewRows.length > 0 &&
                          Object.keys(validationData.previewRows[0]).map((key) => (
                            <th key={key} className="px-3 py-2 uppercase tracking-wider">
                              {key}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {validationData.previewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-mono text-slate-400">{idx + 1}</td>
                          {Object.values(row).map((val: any, cIdx) => (
                            <td key={cIdx} className="px-3 py-2 text-slate-800 truncate max-w-xs">
                              {String(val || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Conflict Policy Selector */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Conflict Resolution Policy
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label
                    onClick={() => setConflictPolicy('SKIP_DUPLICATES')}
                    className={`p-3 rounded border cursor-pointer text-xs space-y-1 transition ${
                      conflictPolicy === 'SKIP_DUPLICATES'
                        ? 'border-brand-navy bg-white shadow-xs font-semibold'
                        : 'border-slate-200 bg-white/50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-slate-900">
                      <input
                        type="radio"
                        checked={conflictPolicy === 'SKIP_DUPLICATES'}
                        onChange={() => setConflictPolicy('SKIP_DUPLICATES')}
                      />
                      <span>Skip Duplicates (Recommended)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-4 font-normal">
                      Ignores existing ISBNs or IDs. Imports new unique records without risk.
                    </p>
                  </label>

                  <label
                    onClick={() => setConflictPolicy('REJECT_CONFLICTS')}
                    className={`p-3 rounded border cursor-pointer text-xs space-y-1 transition ${
                      conflictPolicy === 'REJECT_CONFLICTS'
                        ? 'border-brand-navy bg-white shadow-xs font-semibold'
                        : 'border-slate-200 bg-white/50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-slate-900">
                      <input
                        type="radio"
                        checked={conflictPolicy === 'REJECT_CONFLICTS'}
                        onChange={() => setConflictPolicy('REJECT_CONFLICTS')}
                      />
                      <span>Reject Conflicts</span>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-4 font-normal">
                      Marks any duplicate rows as errors and logs them to the error report.
                    </p>
                  </label>

                  <label
                    onClick={() => setConflictPolicy('UPDATE_EXISTING')}
                    className={`p-3 rounded border cursor-pointer text-xs space-y-1 transition ${
                      conflictPolicy === 'UPDATE_EXISTING'
                        ? 'border-brand-navy bg-white shadow-xs font-semibold'
                        : 'border-slate-200 bg-white/50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-slate-900">
                      <input
                        type="radio"
                        checked={conflictPolicy === 'UPDATE_EXISTING'}
                        onChange={() => setConflictPolicy('UPDATE_EXISTING')}
                      />
                      <span>Update Metadata</span>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-4 font-normal">
                      Safely updates metadata of matching records while guarding active loans.
                    </p>
                  </label>
                </div>
              </div>

              {processingError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 shrink-0 text-rose-600" />
                  {processingError}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  &larr; Re-Upload File
                </button>
                <button
                  type="button"
                  disabled={validationData.validRowsCount === 0 || isProcessing}
                  onClick={handleConfirmImport}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-navy hover:bg-slate-800 rounded-md shadow-xs transition disabled:opacity-50 flex items-center"
                >
                  <Database className={`w-3.5 h-3.5 mr-1.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  {isProcessing
                    ? 'Executing Atomic Batches...'
                    : `Confirm & Ingest ${validationData.validRowsCount} Valid Records`}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW RESULTS */}
          {currentStep === 5 && processingResult && (
            <div className="space-y-6 text-center py-6">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">Batch Ingestion Completed</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Job <span className="font-mono text-slate-700">{processingResult.jobId}</span> has executed across
                  database chunks.
                </p>
              </div>

              {/* Ingestion Metric Badges */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="text-xs text-slate-500 block uppercase">Total Processed</span>
                  <span className="text-lg font-bold text-slate-900">{processingResult.processedRows}</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                  <span className="text-xs text-emerald-600 block uppercase">Successfully Written</span>
                  <span className="text-lg font-bold text-emerald-800">{processingResult.successfulRows}</span>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <span className="text-xs text-amber-700 block uppercase">Skipped Duplicates</span>
                  <span className="text-lg font-bold text-amber-800">{processingResult.skippedRows}</span>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md">
                  <span className="text-xs text-rose-600 block uppercase">Failed Rows</span>
                  <span className="text-lg font-bold text-rose-800">{processingResult.failedRows}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                {processingResult.failedRows > 0 && (
                  <a
                    href={getErrorReportDownloadUrl(processingResult.jobId)}
                    className="inline-flex items-center px-3.5 py-2 border border-rose-300 text-xs font-semibold rounded-md text-rose-700 bg-white hover:bg-rose-50 shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                    Download Sanitized Error CSV
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleStartNewImport}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-navy hover:bg-slate-800 rounded-md shadow-xs transition"
                >
                  Start Another Import
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Persisted Import History & Audit Section */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Import Execution History</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review completed batch processing runs, conflict logs, and error audit reports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadHistoryJobs(pagination.page)}
              className="inline-flex items-center px-3 py-1.5 border border-slate-300 text-xs font-medium rounded text-slate-700 bg-white hover:bg-slate-50 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Job ID or file name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-navy"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-navy"
            >
              <option value="ALL">All Categories</option>
              <option value="BOOKS">Books Only</option>
              <option value="MEMBERS">Members Only</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-navy"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="COMPLETED_WITH_ERRORS">Partial Success</option>
              <option value="FAILED">Failed</option>
              <option value="PROCESSING">Processing</option>
            </select>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          {isLoadingHistory ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-teal mb-2" />
              <p className="text-xs text-slate-500">Loading import history...</p>
            </div>
          ) : historyJobs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No Import History Found</p>
              <p className="text-xs text-slate-400 mt-1">Upload a CSV file above to execute your first batch import.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Job ID &amp; Type</th>
                  <th className="px-4 py-3">File Name</th>
                  <th className="px-4 py-3">Submitted By</th>
                  <th className="px-4 py-3">Ingested / Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {historyJobs.map((job) => (
                  <tr key={job._id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-mono font-semibold text-slate-900">{job.jobId}</div>
                      <span className="text-[10px] text-slate-500 uppercase font-medium">{job.importType}</span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 truncate max-w-xs">{job.fileName}</div>
                      <span className="text-[10px] text-slate-400">{(job.fileSize / 1024).toFixed(1)} KB</span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{job.submittedBy}</td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {job.successfulRows} / {job.totalRows}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {job.skippedRows > 0 && `${job.skippedRows} skipped `}
                        {job.failedRows > 0 && `• ${job.failedRows} failed`}
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(job.status)}</td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      <div>
                        {new Date(job.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(job.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setSelectedJob(job);
                          setIsDrawerOpen(true);
                        }}
                        className="inline-flex items-center px-2 py-1 border border-slate-200 text-xs font-medium rounded text-slate-700 bg-white hover:bg-slate-50"
                      >
                        <Eye className="w-3 h-3 mr-1 text-slate-500" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <PaginationControls
            pagination={pagination}
            onPageChange={(page) => {
              setPagination((prev) => ({ ...prev, page }));
              loadHistoryJobs(page);
            }}
          />
        </div>
      </div>

      {/* Inspection Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Import Job Audit Details"
      >
        {selectedJob && (
          <div className="space-y-6 text-sm">
            {/* Header Status */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase">Status</span>
                {getStatusBadge(selectedJob.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase">Job Identifier</span>
                <span className="font-mono text-xs font-semibold text-slate-900">{selectedJob.jobId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase">Category</span>
                <span className="font-semibold text-brand-navy">{selectedJob.importType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase">Conflict Policy</span>
                <span className="font-mono text-xs text-slate-700">{selectedJob.conflictPolicy}</span>
              </div>
            </div>

            {/* Ingestion Statistics */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Processing Telemetry</h4>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-slate-400 block">Total Records:</span>
                  <span className="font-bold text-slate-900">{selectedJob.totalRows}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Successfully Ingested:</span>
                  <span className="font-bold text-emerald-700">{selectedJob.successfulRows}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Skipped Duplicates:</span>
                  <span className="font-bold text-amber-700">{selectedJob.skippedRows}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Failed Records:</span>
                  <span className="font-bold text-rose-700">{selectedJob.failedRows}</span>
                </div>
              </div>
            </div>

            {/* Row Errors Breakdown (if any) */}
            {selectedJob.rowErrors && selectedJob.rowErrors.length > 0 ? (
              <div className="border border-rose-200 rounded-lg p-4 bg-rose-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
                    Errors Log ({selectedJob.rowErrors.length} entries)
                  </h4>
                  <a
                    href={getErrorReportDownloadUrl(selectedJob.jobId)}
                    className="text-xs text-rose-700 hover:underline font-medium inline-flex items-center"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export CSV
                  </a>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {selectedJob.rowErrors.map((err, idx) => (
                    <div key={idx} className="p-2 bg-white rounded border border-rose-100 text-xs text-rose-900">
                      <div className="font-semibold text-slate-800">
                        Row {err.rowNumber} &bull; [{err.field}] &bull; {err.code}
                      </div>
                      <div className="text-rose-700 mt-0.5">{err.message}</div>
                    </div>
                  ))}
                </div>

                {/* Retry action if job is in error */}
                {(selectedJob.status === 'COMPLETED_WITH_ERRORS' || selectedJob.status === 'FAILED') && (
                  <div className="pt-2 border-t border-rose-200">
                    <button
                      type="button"
                      disabled={isRetrying}
                      onClick={() => handleRetryJob(selectedJob.jobId)}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded shadow-xs transition flex items-center justify-center disabled:opacity-50"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isRetrying ? 'animate-spin' : ''}`} />
                      {isRetrying ? 'Retrying Failed Records...' : 'Retry Failed Records Only'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
                This import job completed with zero recorded errors.
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
