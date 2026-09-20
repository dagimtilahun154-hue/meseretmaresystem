import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  FileCheck,
  FileSpreadsheet,
  Image as ImageIcon,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Clock,
  User as UserIcon,
  HardDrive,
  ShieldCheck,
  Search,
  Filter,
} from "lucide-react";
import { customersDB } from "@/lib/db-service";
import { toast } from "sonner";

export interface CustomerDocumentItem {
  id: string;
  customerId: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  notes?: string | null;
  uploadedById?: string | null;
  uploadedBy?: {
    id: string;
    displayName: string;
    username: string;
  } | null;
  createdAt: string;
}

interface CustomerDocumentsManagerProps {
  customerId: string;
  customerName?: string;
  documents?: CustomerDocumentItem[];
  onDocumentsChange?: () => void;
  canUpload?: boolean;
  canDelete?: boolean;
}

const CATEGORY_OPTIONS = [
  { value: "AGREEMENT", label: "Signed Agreement / Contract", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  { value: "PAYMENT_PROOF", label: "Bank Deposit / Payment Proof", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30" },
  { value: "ID_SCAN", label: "Customer ID / TIN / Legal Scan", color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30" },
  { value: "SITE_DOC", label: "Site Assessment / Technical Scan", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  { value: "WARRANTY", label: "Warranty Certificate / Service Card", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" },
  { value: "OTHER", label: "General Scanned Document", color: "bg-muted text-muted-foreground border-border" },
];

export function CustomerDocumentsManager({
  customerId,
  customerName = "Customer",
  documents = [],
  onDocumentsChange,
  canUpload = true,
  canDelete = true,
}: CustomerDocumentsManagerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("AGREEMENT");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = (
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? "https://meseretmaresystem.onrender.com/api/v1" : "http://localhost:4000/api/v1")
  ).replace("/api/v1", "");

  const getFullFileUrl = (url: string) => {
    if (!url) return "";
    return url.startsWith("/uploads/") ? `${API_BASE}${url}` : url;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    // 50MB limit check
    if (file.size > 50 * 1024 * 1024) {
      toast.error(`File "${file.name}" exceeds the maximum 50 MB single file limit.`);
      return;
    }
    setSelectedFile(file);
    if (!title.trim()) {
      // Auto-set title from clean file name
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setTitle(cleanName);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please choose a file to upload.");
      return;
    }
    if (!customerId) {
      toast.error("Customer ID is missing.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", title.trim() || selectedFile.name);
      formData.append("category", category);
      formData.append("notes", notes.trim());

      await customersDB.uploadDocument(customerId, formData);
      toast.success(`Successfully uploaded "${title.trim() || selectedFile.name}" to customer file.`);
      setSelectedFile(null);
      setTitle("");
      setNotes("");
      setCategory("AGREEMENT");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onDocumentsChange?.();
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error?.message || "Failed to upload document.";
      toast.error(errMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, docTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${docTitle}" from this customer record?`)) {
      return;
    }
    setDeletingId(docId);
    try {
      await customersDB.deleteDocument(customerId, docId);
      toast.success(`Document "${docTitle}" removed successfully.`);
      onDocumentsChange?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  const getFileIcon = (fileType: string = "", fileName: string = "") => {
    const lowerType = fileType.toLowerCase();
    const lowerName = fileName.toLowerCase();
    if (lowerType.includes("pdf") || lowerName.endsWith(".pdf")) {
      return <FileText className="h-5 w-5 text-rose-500" />;
    }
    if (lowerType.startsWith("image/") || /\.(png|jpg|jpeg|webp|bmp|tiff)$/i.test(lowerName)) {
      return <ImageIcon className="h-5 w-5 text-sky-500" />;
    }
    if (lowerType.includes("sheet") || lowerType.includes("excel") || /\.(xlsx|xls|csv)$/i.test(lowerName)) {
      return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
    }
    return <Paperclip className="h-5 w-5 text-slate-500" />;
  };

  const getCategoryBadge = (catKey: string) => {
    const option = CATEGORY_OPTIONS.find((c) => c.value === catKey) || CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];
    return (
      <Badge variant="outline" className={`text-[11px] px-2 py-0.5 font-medium border ${option.color}`}>
        {option.label}
      </Badge>
    );
  };

  // Filter documents
  const filteredDocs = (documents || []).filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.uploadedBy?.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategoryFilter === "ALL" || doc.category === selectedCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* 1. Upload Form Card */}
      {canUpload && (
        <Card className="border-border/80 shadow-md overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/60 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Upload Scanned Customer Document</CardTitle>
                  <CardDescription className="text-xs">
                    Manually attach signed contracts, agreements, bank deposit slips, or scanned identity files.
                  </CardDescription>
                </div>
              </div>

              {/* 50MB Limit Notice */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/25 rounded-full text-[11px] font-semibold text-amber-700 dark:text-amber-300 self-start sm:self-auto">
                <HardDrive className="h-3.5 w-3.5 text-amber-600" />
                <span>Max Single File Size: <strong>50 MB</strong></span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            <form onSubmit={handleUpload} className="space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-primary bg-primary/5 scale-[0.99]"
                    : selectedFile
                    ? "border-emerald-500/60 bg-emerald-500/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff,.bmp,.doc,.docx"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
                      <FileCheck className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)} • Click or drop another file to replace
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">
                      Click to choose file or drag and drop here
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      PDF, JPG, PNG, WEBP, TIFF, BMP, DOC, DOCX up to <strong>50 MB</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Document Metadata Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="docTitle" className="text-xs font-semibold">
                    Document Name / Title <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="docTitle"
                    placeholder="e.g. Signed Solar Irrigation Agreement 2026"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="docCategory" className="text-xs font-semibold">
                    Document Category <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="docCategory"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="docNotes" className="text-xs font-semibold">
                  Description / Remarks (Optional)
                </Label>
                <Textarea
                  id="docNotes"
                  placeholder="e.g. Scanned 3-page agreement signed on-site with advance 30% bank slip attached..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Files are saved securely in customer dossier with full download access.
                </p>
                <Button type="submit" size="sm" disabled={uploading || !selectedFile} className="gap-2 px-5">
                  {uploading ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Uploading Document...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload to Customer File
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 2. Document Registry / File Ledger Card */}
      <Card className="border-border/80 shadow-md">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Customer Documents & Attached Files
                <Badge variant="secondary" className="font-mono text-xs ml-1">
                  {documents.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                On-demand download for agreements, identity records, payment slips, and field scans.
              </CardDescription>
            </div>

            {/* Filter & Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs w-36 sm:w-48"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                aria-label="Filter documents by category"
                className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
              >
                <option value="ALL">All Categories</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredDocs.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-muted/60 mx-auto flex items-center justify-center text-muted-foreground">
                <FileText className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground">No scanned documents found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchQuery || selectedCategoryFilter !== "ALL"
                  ? "No documents matched your search/filter criteria."
                  : "No scanned agreements or customer files have been uploaded yet. Use the upload form above to add files."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredDocs.map((doc) => {
                const fullUrl = getFullFileUrl(doc.fileUrl);
                const isDeleting = deletingId === doc.id;

                return (
                  <div
                    key={doc.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    {/* File Meta Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-card border border-border/80 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        {getFileIcon(doc.fileType, doc.fileName)}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground break-all">
                            {doc.title}
                          </h4>
                          {getCategoryBadge(doc.category)}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="font-mono text-foreground/80">{doc.fileName}</span>
                          <span>•</span>
                          <span className="font-mono font-medium">{formatFileSize(doc.fileSize)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {new Date(doc.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          {doc.uploadedBy?.displayName && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <UserIcon className="h-3 w-3 text-muted-foreground" />
                                {doc.uploadedBy.displayName}
                              </span>
                            </>
                          )}
                        </div>

                        {doc.notes && (
                          <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/40 mt-1 max-w-2xl">
                            {doc.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions: Direct On-Demand Download & Delete */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <a
                        href={fullUrl}
                        download={doc.fileName || doc.title}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm border border-primary/20"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>

                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isDeleting}
                          onClick={() => handleDelete(doc.id, doc.title)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                          title="Delete document"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
