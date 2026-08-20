import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { Product, ProductCategory, getItemProductCategory } from "@/lib/data";
import {
  inventoryApi,
  InventoryDashboardData,
  PendingReleaseJob,
  InventoryTransactionItem,
  StockCountRecord,
} from "@/lib/api/inventory";
import { InventoryDashboardTab } from "@/components/inventory/InventoryDashboardTab";
import { InventoryCatalogTab } from "@/components/inventory/InventoryCatalogTab";
import { InventoryReleasesTab } from "@/components/inventory/InventoryReleasesTab";
import { InventoryHistoryTab } from "@/components/inventory/InventoryHistoryTab";
import { InventoryAuditsTab } from "@/components/inventory/InventoryAuditsTab";
import { InventoryReturnsTab } from "@/components/inventory/InventoryReturnsTab";
import { AddProductDialog } from "@/components/inventory/AddProductDialog";
import { QuickReceiveModal } from "@/components/inventory/QuickReceiveModal";
import { QRCodeModal } from "@/components/QRCodeModal";
import { DashboardHeaderBanner } from "@/components/dashboards/widgets/DashboardHeaderBanner";
import {
  LayoutDashboard,
  Layers,
  Truck,
  History as HistoryIcon,
  ClipboardCheck,
  Package,
  Plus,
  RefreshCw,
  PackagePlus,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { productsDB } from "@/lib/db-service";
import {
  getLocalInventoryTransactions,
  recordLocalInventoryTransaction,
  mergeInventoryTransactions,
} from "@/lib/inventory-history-store";

export default function InventoryPage() {
  const { products, setProducts, addProduct, updateProduct, deleteProduct, refreshStoreData, fieldWorks } = useStore();
  const { currentUser, hasAccess } = useAuth();

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Remote data states
  const [dashboardData, setDashboardData] = useState<InventoryDashboardData | null>(null);
  const [pendingReleases, setPendingReleases] = useState<PendingReleaseJob[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransactionItem[]>([]);
  const [audits, setAudits] = useState<StockCountRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [quickReceiveOpen, setQuickReceiveOpen] = useState(false);
  const [selectedProductForReceive, setSelectedProductForReceive] = useState<Product | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedProductForQR, setSelectedProductForQR] = useState<Product | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // Fetch all backend inventory data
  const loadInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      const [dash, rels, txs, auds] = await Promise.allSettled([
        inventoryApi.getDashboard(),
        inventoryApi.getReleases(),
        inventoryApi.getTransactions(),
        inventoryApi.getAudits(),
      ]);

      const localTxs = getLocalInventoryTransactions();

      if (dash.status === "fulfilled") setDashboardData(dash.value);
      if (rels.status === "fulfilled") setPendingReleases(rels.value);
      if (txs.status === "fulfilled" && Array.isArray(txs.value)) {
        setTransactions(mergeInventoryTransactions(txs.value, localTxs));
      } else {
        setTransactions(localTxs);
      }
      if (auds.status === "fulfilled") setAudits(auds.value);

      await refreshStoreData();
    } catch (err) {
      console.error("Failed to load inventory data:", err);
    } finally {
      setLoading(false);
    }
  }, [refreshStoreData]);

  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  const pendingReturns = useMemo(() => {
    return (fieldWorks || []).filter((fw: any) => fw.status === "completed_ttl");
  }, [fieldWorks]);

  // Computed dashboard data (uses server data or calculates live from local store when offline)
  const effectiveDashboardData: InventoryDashboardData = useMemo(() => {
    if (dashboardData && dashboardData.totalProducts > 0) return dashboardData;

    let totalStockValue = 0;
    let lowStockCount = 0;
    const categoryCounts: Record<string, { count: number; qty: number; value: number }> = {
      PUMP: { count: 0, qty: 0, value: 0 },
      PUMP_EQUIPMENT: { count: 0, qty: 0, value: 0 },
      COMPANY_TOOL: { count: 0, qty: 0, value: 0 },
      WORK_TOOL: { count: 0, qty: 0, value: 0 },
    };

    products.forEach((p) => {
      const qty = Number(p.quantity) || 0;
      const cost = Number(p.costPrice) || Number(p.sellPrice) || 0;
      const val = qty * cost;
      totalStockValue += val;

      const cat = getItemProductCategory(p);
      if (!categoryCounts[cat]) {
        categoryCounts[cat] = { count: 0, qty: 0, value: 0 };
      }
      categoryCounts[cat].count += 1;
      categoryCounts[cat].qty += qty;
      categoryCounts[cat].value += val;

      const minLevel = Number(p.minStockLevel) || 5;
      if (qty < minLevel) lowStockCount += 1;
    });

    return {
      totalProducts: products.length,
      totalStockValue,
      lowStockCount,
      pendingReleasesCount: pendingReleases.length,
      categoryCounts,
      recentTransactions: transactions,
      lowStockItems: products
        .filter((p) => (Number(p.quantity) || 0) < (Number(p.minStockLevel) || 5))
        .slice(0, 8)
        .map((p) => ({
          id: p.id,
          code: p.code ? String(p.code) : undefined,
          name: p.name,
          category: getItemProductCategory(p),
          quantity: Number(p.quantity) || 0,
          minStockLevel: Number(p.minStockLevel) || 5,
          unit: p.unit || "Piece",
        })),
    };
  }, [dashboardData, products, pendingReleases, transactions]);

  // Handlers with dual-layer (local store + backend API) reliability
  const handleSaveNewProduct = async (productData: Partial<Product> & { productCategory: ProductCategory }) => {
    const newProd: Product = {
      id: productData.id || `PRD-${Date.now()}`,
      name: productData.name || "Unnamed Product",
      code: productData.code || String(Date.now()).slice(-6),
      category: productData.category || productData.productCategory,
      productCategory: productData.productCategory || "WORK_TOOL",
      quantity: Number(productData.quantity) || 0,
      minStockLevel: Number(productData.minStockLevel) || 5,
      costPrice: Number(productData.costPrice) || 0,
      sellPrice: Number(productData.sellPrice) || 0,
      unit: productData.unit || "Piece",
      shelfLocation: productData.shelfLocation || "",
      model: productData.model || "",
      brand: productData.brand || "",
    };

    // 1. Immediately update client store state
    addProduct(newProd);

    // 2. Record initial registration in transaction ledger
    if (Number(newProd.quantity) > 0) {
      const tx = recordLocalInventoryTransaction({
        productId: newProd.id,
        productCode: newProd.code ? String(newProd.code) : undefined,
        productName: newProd.name,
        category: newProd.productCategory,
        transactionType: "RECEIVE",
        quantity: Number(newProd.quantity),
        unit: newProd.unit,
        unitPrice: newProd.costPrice,
        reference: "INITIAL_REGISTRATION",
        performedBy: currentUser?.displayName || "Storekeeper",
        notes: "Initial inventory catalog entry",
      });
      setTransactions((prev) => [tx, ...prev.filter((t) => t.id !== tx.id)]);
    }

    // 3. Sync with backend API
    try {
      await inventoryApi.createProduct(productData);
    } catch (apiErr) {
      console.warn("Backend API offline, product saved locally:", apiErr);
    }

    await loadInventoryData();
  };

  const handleSaveEditProduct = async (productData: Partial<Product> & { productCategory: ProductCategory }) => {
    if (!productData.id) return;

    // 1. Immediately update client store state
    updateProduct(productData as Product);

    // 2. Sync with backend API
    try {
      await inventoryApi.updateProduct(productData.id, productData);
    } catch (apiErr) {
      console.warn("Backend API offline, product updated locally:", apiErr);
    }

    await loadInventoryData();
  };

  const handleQuickReceive = async (payload: {
    productId: string;
    quantity: number;
    costPrice?: number;
    reference?: string;
    notes?: string;
  }) => {
    // 1. Immediately update client store quantity
    const targetProd = products.find((p) => p.id === payload.productId);
    if (targetProd) {
      updateProduct({
        ...targetProd,
        quantity: (Number(targetProd.quantity) || 0) + Number(payload.quantity),
        ...(payload.costPrice ? { costPrice: payload.costPrice } : {}),
      });
    }

    // 2. Record transaction in local ledger immediately
    const tx = recordLocalInventoryTransaction({
      productId: targetProd?.id || payload.productId,
      productCode: targetProd?.code ? String(targetProd.code) : undefined,
      productName: targetProd?.name || "Inventory Product",
      category: getItemProductCategory(targetProd),
      transactionType: "RECEIVE",
      quantity: Number(payload.quantity),
      unit: targetProd?.unit || "Piece",
      unitPrice: Number(payload.costPrice) || Number(targetProd?.costPrice) || 0,
      reference: payload.reference || "PO-QUICK-RECEIVE",
      performedBy: currentUser?.displayName || "Storekeeper",
      notes: payload.notes || "Inbound warehouse stock received",
    });
    setTransactions((prev) => [tx, ...prev.filter((t) => t.id !== tx.id)]);

    // 3. Sync with backend API
    try {
      await inventoryApi.receiveStock(payload);
    } catch (apiErr) {
      console.warn("Backend API offline, receipt updated locally:", apiErr);
    }

    await loadInventoryData();
  };

  const handleOpenReceiveModal = (prod?: Product) => {
    const target = prod || products[0] || null;
    setSelectedProductForReceive(target);
    setQuickReceiveOpen(true);
  };

  const handleOpenQRModal = (prod: Product) => {
    setSelectedProductForQR(prod);
    setQrModalOpen(true);
  };

  const handleConfirmRelease = async (
    jobId: string,
    payload: {
      items: {
        productId?: string;
        productCode?: string;
        name: string;
        category: ProductCategory;
        quantity: number;
        unit?: string;
        serialNumber?: string;
        source: "FROM_STOCK" | "BOUGHT";
      }[];
      companyTools?: string[];
      notes?: string;
    }
  ) => {
    // 1. Decrement from local store for any FROM_STOCK items
    payload.items.forEach((it) => {
      if (it.source === "FROM_STOCK" && it.productId) {
        const p = products.find((prod) => prod.id === it.productId);
        if (p) {
          const currentQty = Number(p.quantity) || 0;
          updateProduct({
            ...p,
            quantity: Math.max(0, currentQty - Number(it.quantity || 1)),
          });
        }
      }

      // Record transaction
      const tx = recordLocalInventoryTransaction({
        productId: it.productId,
        productCode: it.productCode,
        productName: it.name,
        category: it.category,
        transactionType: it.source === "BOUGHT" ? "BOUGHT" : "ISSUE",
        quantity: Number(it.quantity || 1),
        unit: it.unit || "Piece",
        unitPrice: 0,
        serialNumber: it.serialNumber,
        fieldWorkJobId: jobId,
        reference: `JOB-${String(jobId).slice(-8)}`,
        performedBy: currentUser?.displayName || "Storekeeper",
        notes: payload.notes || `Dispatched to Field Crew (Job: ${jobId})`,
      });
      setTransactions((prev) => [tx, ...prev.filter((t) => t.id !== tx.id)]);
    });

    try {
      await inventoryApi.confirmRelease(jobId, payload);
    } catch (apiErr) {
      console.warn("Backend release offline, local stock decremented:", apiErr);
    }

    await loadInventoryData();
  };

  const handleCreateAudit = async (category?: ProductCategory, countedBy?: string, notes?: string) => {
    try {
      await inventoryApi.createAudit({
        category,
        countedBy: countedBy || currentUser?.displayName || "Storekeeper",
        notes,
      });
    } catch (apiErr) {
      console.warn("Backend createAudit offline:", apiErr);
    }
    await loadInventoryData();
  };

  const handleSubmitAudit = async (
    auditId: string,
    items: { id: string; productId: string; countedQty: number; notes?: string }[],
    notes?: string
  ) => {
    // Reconcile local store quantities
    items.forEach((it) => {
      const p = products.find((prod) => prod.id === it.productId);
      if (p) {
        const sysQty = Number(p.quantity || 0);
        const diff = Number(it.countedQty) - sysQty;
        updateProduct({
          ...p,
          quantity: Number(it.countedQty) || 0,
        });

        if (diff !== 0) {
          const tx = recordLocalInventoryTransaction({
            productId: it.productId,
            productCode: p.code ? String(p.code) : undefined,
            productName: p.name || "Audit Item",
            category: getItemProductCategory(p),
            transactionType: "ADJUSTMENT",
            quantity: diff,
            unit: p.unit || "Piece",
            unitPrice: p.costPrice || 0,
            reference: `AUDIT-${String(auditId).slice(-8)}`,
            performedBy: currentUser?.displayName || "Storekeeper",
            notes: it.notes || `Physical stock count adjustment (${diff > 0 ? "+" : ""}${diff})`,
          });
          setTransactions((prev) => [tx, ...prev.filter((t) => t.id !== tx.id)]);
        }
      }
    });

    try {
      await inventoryApi.submitAudit(auditId, {
        items,
        approvedBy: currentUser?.displayName || "Management",
        notes,
      });
    } catch (apiErr) {
      console.warn("Backend submitAudit offline:", apiErr);
    }
    await loadInventoryData();
  };

  const handleSyncMasterCatalog = async () => {
    try {
      // Call backend to seed MySQL database in a single request
      const response = await inventoryApi.seedCatalog();
      if (response && response.success === false) {
        throw new Error(response.message || "Backend seeding failed");
      }

      toast.success(
        `Successfully imported master catalog (Pumps, Equipment, Tools, and Consumables) to the database!`
      );

      await loadInventoryData();
    } catch (err: any) {
      console.error("Master catalog import error:", err);
      toast.error(err.message || "Failed to import master catalog");
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (confirm(`Are you sure you want to delete "${prod.name}" from the catalog?`)) {
      try {
        deleteProduct(prod.id);
        try {
          await inventoryApi.deleteProduct(prod.id);
        } catch (apiErr) {
          console.warn("Backend delete offline:", apiErr);
        }
        toast.success(`Deleted ${prod.name}`);
        await loadInventoryData();
      } catch (err: any) {
        console.error("Delete failed", err);
        toast.error("Failed to delete product");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Standardized Royal Gradient Header Banner matching Dashboard */}
      <DashboardHeaderBanner
        roleBadge="Storekeeper & Warehouse Desk"
        title="Warehouse & Inventory Workspace"
        description="Master Stock Catalog, Physical Serial Allocation, Equipment Handover Releases, and Cycle Count Audits."
        gradientClass="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-900"
        actions={[
          {
            label: "Add Product",
            onClick: () => setAddProductOpen(true),
            icon: Plus,
            className: "bg-white text-blue-900 hover:bg-blue-50 font-bold shadow-md text-xs h-9",
          },
          {
            label: "Quick Receive",
            onClick: () => handleOpenReceiveModal(),
            icon: PackagePlus,
            className: "bg-indigo-900/60 hover:bg-indigo-900 text-white font-bold border border-white/20 text-xs h-9",
          },
          {
            label: "Refresh",
            onClick: loadInventoryData,
            icon: RefreshCw,
            className: "bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 text-xs h-9",
          },
        ]}
      />

      {/* 2. 6-Tab Storekeeper Workspace Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/70 p-1.5 rounded-2xl border border-border/60 grid grid-cols-2 sm:grid-cols-6 w-full">
          {/* Tab 1: Dashboard */}
          <TabsTrigger
            value="dashboard"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md flex items-center justify-center gap-2 py-2.5 transition-all"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>

          {/* Tab 2: Catalog */}
          <TabsTrigger
            value="catalog"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md flex items-center justify-center gap-2 py-2.5 transition-all"
          >
            <Layers className="h-4 w-4" />
            Catalog
          </TabsTrigger>

          {/* Tab 3: Releases */}
          <TabsTrigger
            value="releases"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md flex items-center justify-center gap-2 py-2.5 transition-all relative"
          >
            <Truck className="h-4 w-4" />
            Releases
            {pendingReleases.length > 0 && (
              <Badge className="bg-emerald-500 text-white text-[9px] h-4 px-1.5 rounded-full ml-1 font-bold">
                {pendingReleases.length}
              </Badge>
            )}
          </TabsTrigger>

          {/* Tab 4: History */}
          <TabsTrigger
            value="history"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md flex items-center justify-center gap-2 py-2.5 transition-all"
          >
            <HistoryIcon className="h-4 w-4" />
            History
          </TabsTrigger>

          {/* Tab 5: Audits */}
          <TabsTrigger
            value="audits"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md flex items-center justify-center gap-2 py-2.5 transition-all"
          >
            <ClipboardCheck className="h-4 w-4" />
            Audits
          </TabsTrigger>

          {/* Tab 6: Returns */}
          <TabsTrigger
            value="returns"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md flex items-center justify-center gap-2 py-2.5 transition-all relative"
          >
            <RotateCcw className="h-4 w-4" />
            Returns
            {pendingReturns.length > 0 && (
              <Badge className="bg-purple-600 text-white text-[9px] h-4 px-1.5 rounded-full ml-1 font-bold">
                {pendingReturns.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1 Content: Dashboard */}
        <TabsContent value="dashboard" className="space-y-6 mt-0">
          <InventoryDashboardTab
            data={effectiveDashboardData}
            onNavigateTab={setActiveTab}
            onReceiveClick={() => handleOpenReceiveModal()}
            onAddProductClick={() => setAddProductOpen(true)}
          />
        </TabsContent>

        {/* Tab 2 Content: Catalog */}
        <TabsContent value="catalog" className="space-y-6 mt-0">
          <InventoryCatalogTab
            products={products}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onAddProduct={() => setAddProductOpen(true)}
            onSyncMasterCatalog={handleSyncMasterCatalog}
            onReceiveStock={(p) => handleOpenReceiveModal(p)}
            onPrintQR={(p) => handleOpenQRModal(p)}
            onEditProduct={(p) => {
              setProductToEdit(p);
              setAddProductOpen(true);
            }}
            onDeleteProduct={handleDeleteProduct}
          />
        </TabsContent>

        {/* Tab 3 Content: Releases */}
        <TabsContent value="releases" className="space-y-6 mt-0">
          <InventoryReleasesTab
            jobs={pendingReleases}
            onConfirmRelease={handleConfirmRelease}
            onRefresh={loadInventoryData}
          />
        </TabsContent>

        {/* Tab 4 Content: History */}
        <TabsContent value="history" className="space-y-6 mt-0">
          <InventoryHistoryTab transactions={transactions} />
        </TabsContent>

        {/* Tab 5 Content: Audits */}
        <TabsContent value="audits" className="space-y-6 mt-0">
          <InventoryAuditsTab
            audits={audits}
            onCreateAudit={handleCreateAudit}
            onSubmitAudit={handleSubmitAudit}
            currentUserName={currentUser?.displayName || "Storekeeper"}
          />
        </TabsContent>

        {/* Tab 6 Content: Returns */}
        <TabsContent value="returns" className="space-y-6 mt-0">
          <InventoryReturnsTab
            jobs={pendingReturns}
            onRefresh={loadInventoryData}
          />
        </TabsContent>
      </Tabs>

      {/* Add / Edit Product Modal */}
      <AddProductDialog
        open={addProductOpen}
        onOpenChange={(open) => {
          setAddProductOpen(open);
          if (!open) setProductToEdit(null);
        }}
        product={productToEdit}
        onSave={productToEdit ? handleSaveEditProduct : handleSaveNewProduct}
      />

      {/* Quick Receive Stock Modal */}
      <QuickReceiveModal
        open={quickReceiveOpen}
        onOpenChange={setQuickReceiveOpen}
        product={selectedProductForReceive}
        onReceive={handleQuickReceive}
      />

      {/* Standard QR Code Modal */}
      <QRCodeModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        item={selectedProductForQR}
      />
    </div>
  );
}
