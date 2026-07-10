import React, { createContext, useContext, useState, ReactNode } from "react";
import { Product, Sale } from "@/lib/data";
import { FieldWork, ReturnForm } from "@/lib/fieldwork-data";

type ProductWithCode = Product & {
  code?: string | number;
};

export type FinanceEntity = "FZ" | "MM";
type SaleSaveResult = "saved" | "queued" | false;

interface StoreContextType {
  products: ProductWithCode[];
  setProducts: React.Dispatch<React.SetStateAction<ProductWithCode[]>>;
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  addSale: (sale: Sale) => Promise<SaleSaveResult>;
  updateProduct: (product: ProductWithCode) => void;
  addProduct: (product: ProductWithCode) => void;
  deleteProduct: (id: string) => void;
  fieldWorks: FieldWork[];
  setFieldWorks: React.Dispatch<React.SetStateAction<FieldWork[]>>;
  addFieldWork: (fw: FieldWork) => Promise<void>;
  updateFieldWork: (id: string, fw: FieldWork) => Promise<void>;
  deleteFieldWork: (id: string) => Promise<void>;
  addReturnForm: (fieldWorkId: string, form: ReturnForm) => Promise<void>;
  financePayments: FinancePayment[];
  addFinancePayment: (payment: FinancePayment) => void;
  financeEntity: FinanceEntity;
  setFinanceEntity: React.Dispatch<React.SetStateAction<FinanceEntity>>;
  refreshStoreData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();

const getNumericCode = (value: unknown) => {
  const str = String(value ?? "").trim();
  const num = Number(str);
  return Number.isNaN(num) ? null : num;
};

const getNextCode = (products: ProductWithCode[]) => {
  const codes = products
    .map((p) => getNumericCode(p.code))
    .filter((n): n is number => n !== null);

  if (codes.length === 0) return 1;
  return Math.max(...codes) + 1;
};

const FINANCE_ENTITY_KEY = "financeEntity";

const getSavedFinanceEntity = (): FinanceEntity => {
  try {
    return localStorage.getItem(FINANCE_ENTITY_KEY) === "MM" ? "MM" : "FZ";
  } catch {
    return "FZ";
  }
};

import { useEffect } from "react";
import { DBFieldWork, productsDB, salesDB, fieldWorkDB } from "@/lib/db-service";
import { financeStore, normalizePayment, Payment as FinancePayment } from "@/lib/finance-hub-store";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export function StoreProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<ProductWithCode[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [fieldWorks, setFieldWorks] = useState<FieldWork[]>([]);
  const [financePayments, setFinancePayments] = useState<FinancePayment[]>([]);
  const [financeEntity, setFinanceEntity] = useState<FinanceEntity>(() => getSavedFinanceEntity());

  useEffect(() => {
    localStorage.setItem(FINANCE_ENTITY_KEY, financeEntity);
  }, [financeEntity]);

  const mapDbProducts = (dbProds: any[]): ProductWithCode[] =>
    dbProds.map((p) => ({
      ...p,
      quantity: Number(p.quantity || 0),
      costPrice: Number(p.cost_price || p.costPrice || 0),
      sellPrice: Number(p.sell_price || p.sellPrice || 0),
      measurementUnit: p.measurement_unit || p.measurementUnit || "Piece",
    }));

  const mapDbSales = (dbSales: any[]): Sale[] =>
    dbSales.map((dbs) => {
      const rawItems = Array.isArray(dbs.items)
        ? dbs.items
        : typeof dbs.items === "string"
          ? JSON.parse(dbs.items)
          : [];
      const saleItems = rawItems.map((it: any) => ({
        productId: it.productId || it.product_id || "",
        productName: it.productName || it.product_name || "",
        quantity: Number(it.quantity || 0),
        price: Number(it.price || it.unit_price || 0),
        cost: Number(it.cost || 0),
      }));
      const total = Number(dbs.total || 0);
      const subtotal = Number(dbs.subtotal || 0);
      const tax = Number(dbs.tax || 0);
      const totalCost = saleItems.length
        ? saleItems.reduce((s, item) => s + item.cost * item.quantity, 0)
        : subtotal;

      return {
        id: dbs.id,
        date: dbs.date,
        customer: {
          id: dbs.customer_id || dbs.customerId || dbs.customer_name || "C-GUEST",
          name: dbs.customer_name || "Guest Customer",
          phone: "",
          location: "",
        },
        items: saleItems,
        totalSell: total,
        totalCost,
        profit: total - totalCost,
        vatIncluded: tax > 0,
        vatAmount: tax,
        netAmount: total - tax,
        paymentMethod: (dbs.payment_method as any) || "Cash",
        bankName: dbs.bank_name,
      };
    });

  const mapDbFieldWorks = (dbField: any[]): FieldWork[] =>
    dbField.map((dbf) => {
      const payload = typeof dbf.payload === "string"
        ? JSON.parse(dbf.payload)
        : dbf.payload;
      if (payload && payload.workers) {
        return { ...payload, id: dbf.id };
      }
      return {
        id: dbf.id,
        startDate: dbf.scheduled_date || "",
        endDate: dbf.completed_date || "",
        location: dbf.location || "",
        status: dbf.status as any,
        pumpModel: dbf.title,
        notes: dbf.notes || "",
        workers: [],
        equipment: [],
        returnForms: [],
      };
    });

  const refreshProductsSalesPayments = async () => {
    const [dbProds, dbSales, dbPayments] = await Promise.all([
      productsDB.getAll(),
      salesDB.getAll(),
      financeStore.loadPayments(),
    ]);
    setProducts(mapDbProducts(dbProds));
    setSales(mapDbSales(dbSales));
    setFinancePayments(Array.isArray(dbPayments) ? dbPayments.map(normalizePayment) : []);
  };

  const refreshStoreData = async () => {
    const [dbProds, dbSales, dbField, dbPayments] = await Promise.all([
      productsDB.getAll(),
      salesDB.getAll(),
      fieldWorkDB.getAll(),
      financeStore.loadPayments(),
    ]);

    setProducts(mapDbProducts(dbProds));
    setSales(mapDbSales(dbSales));
    setFieldWorks(mapDbFieldWorks(dbField));
    setFinancePayments(Array.isArray(dbPayments) ? dbPayments.map(normalizePayment) : []);
  };

  // Load data from Database
  useEffect(() => {
    if (!currentUser) return;
    const loadData = async () => {
      try {
        const [dbProds, dbSales, dbField, dbPayments] = await Promise.all([
          productsDB.getAll(),
          salesDB.getAll(),
          fieldWorkDB.getAll(),
          financeStore.loadPayments(),
        ]);
        
        setProducts(mapDbProducts(dbProds));
        setSales(mapDbSales(dbSales));
        setFieldWorks(mapDbFieldWorks(dbField));
        setFinancePayments(Array.isArray(dbPayments) ? dbPayments.map(normalizePayment) : []);
      } catch (e) {
        console.error("Failed to load store data:", e);
      }
    };
    loadData();
  }, [currentUser]);

  const addSale = async (sale: Sale): Promise<SaleSaveResult> => {
    for (const item of sale.items) {
      const p = products.find(prod => prod.id === item.productId || normalize(prod.name) === normalize(item.productName));
      if (!p || (p.quantity || 0) < item.quantity) {
        toast.error(`Insufficient stock for ${item.productName}. Only ${p?.quantity || 0} left.`);
        return false;
      }
    }

    const dbSaleData: any = {
      id: sale.id,
      date: sale.date,
      customer_id: sale.customer.id,
      customer_name: sale.customer.name,
      payment_method: sale.paymentMethod,
      bank_name: sale.bankName,
      subtotal: sale.netAmount,
      discount: 0,
      tax: sale.vatAmount,
      total: sale.totalSell,
      items: sale.items,
    };

    let result: { success: boolean; queued?: boolean };
    try {
      result = await salesDB.add(dbSaleData);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not complete sale. Inventory and finance were not changed.");
      return false;
    }
    if (!result.success) {
      toast.error("Could not complete sale. Inventory and finance were not changed.");
      return false;
    }

    if (result.queued) {
      return "queued";
    }

    await refreshProductsSalesPayments();
    return "saved";
  };

  const updateProduct = async (product: ProductWithCode) => {
    const dbProductData: any = {
      ...product,
      cost_price: product.costPrice || 0,
      sell_price: product.sellPrice || 0,
      measurement_unit: product.measurementUnit || product.unit || "Piece"
    };

    const success = await productsDB.update(dbProductData);
    if (success) {
      // Fetch fresh data from DB to ensure sync
      const dbProds = await productsDB.getAll();
      if (dbProds.length > 0) {
        const mappedProducts: ProductWithCode[] = dbProds.map(p => ({
          ...p,
          quantity: Number(p.quantity || 0),
          costPrice: Number(p.cost_price || p.costPrice || 0),
          sellPrice: Number(p.sell_price || p.sellPrice || 0),
          measurementUnit: p.measurement_unit || p.measurementUnit || "Piece"
        }));
        setProducts(mappedProducts);
      } else {
        // Fallback to updating local state if fetch fails but update was success
        setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
      }
    }
  };

  const addProduct = async (product: ProductWithCode) => {
    const hasValidCode =
      product.code !== undefined &&
      product.code !== null &&
      String(product.code).trim() !== "" &&
      !Number.isNaN(Number(product.code));

    const finalCode = hasValidCode ? Number(product.code) : getNextCode(products);

    const newProduct: ProductWithCode = {
      ...product,
      id: product.id || `P${Date.now()}`,
      code: finalCode,
    };

    const dbProductData: any = {
      ...newProduct,
      cost_price: newProduct.costPrice || 0,
      sell_price: newProduct.sellPrice || 0,
      measurement_unit: newProduct.measurementUnit || "Piece"
    };

    const success = await productsDB.add(dbProductData);
    if (success) {
      setProducts((prev) => [...prev, newProduct]);
    }
  };

  const deleteProduct = async (id: string) => {
    const success = await productsDB.delete(id);
    if (success) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const addReturnForm = async (fieldWorkId: string, form: ReturnForm) => {
    const currentFw = fieldWorks.find(f => f.id === fieldWorkId);
    if (currentFw) {
      const updatedEquipment = currentFw.equipment.map((eq) => {
        const returned = form.returnedMaterials.find(
          (m) => normalize(m.name) === normalize(eq.name)
        );

        if (!returned) return eq;

        const returnedQty = Number(returned.quantity || 0);
        const updatedReturned = Number(eq.quantityReturned || 0) + returnedQty;

        return {
          ...eq,
          quantityReturned: updatedReturned,
          quantityUsed: Math.max(0, Number(eq.quantityTaken || 0) - updatedReturned),
        };
      });

      const updatedFw = {
        ...currentFw,
        equipment: updatedEquipment,
        returnForms: [...(currentFw.returnForms || []), form],
      };

      const getInclusiveDays = (start: string, end: string) => {
        if (!start || !end) return 1;
        const s = new Date(start);
        const e = new Date(end);
        const diffTime = Math.abs(e.getTime() - s.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
      };
      const days = getInclusiveDays(updatedFw.startDate, updatedFw.endDate);
      const totalPerDiem = updatedFw.workers.reduce((s, w) => s + (Number(w.perDiem) || 0) * days, 0);
      const fuelCost = (Number(updatedFw.fuelAmount) || 0) * (Number(updatedFw.fuelPrice) || 0);
      const totalCost = totalPerDiem + fuelCost;

      const dbJob: DBFieldWork & { payload?: any } = {
        id: updatedFw.id,
        title: updatedFw.pumpModel || "",
        description: updatedFw.notes || "",
        customer_name: "",
        location: updatedFw.location || "",
        assigned_to: updatedFw.workers.map(w => w.name).join(", "),
        status: updatedFw.status || "in-progress",
        priority: "medium",
        scheduled_date: updatedFw.startDate,
        completed_date: updatedFw.endDate,
        cost: totalCost,
        notes: updatedFw.notes || "",
        payload: updatedFw
      };

      try {
        await fieldWorkDB.update(fieldWorkId, dbJob);
        await refreshStoreData();
      } catch (e) {
        console.error("Failed to update fieldwork after adding return form", e);
        toast.error("Failed to save return form");
      }
    }
  };

  const addFieldWork = async (fw: FieldWork) => {
    const getInclusiveDays = (start: string, end: string) => {
      if (!start || !end) return 1;
      const s = new Date(start);
      const e = new Date(end);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    };
    const days = getInclusiveDays(fw.startDate, fw.endDate);
    const totalPerDiem = fw.workers.reduce((s, w) => s + (Number(w.perDiem) || 0) * days, 0);
    const fuelCost = (Number(fw.fuelAmount) || 0) * (Number(fw.fuelPrice) || 0);
    const totalCost = totalPerDiem + fuelCost;

    const dbJob: DBFieldWork & { payload?: any } = {
      id: fw.id,
      title: fw.pumpModel || "",
      description: fw.notes || "",
      customer_name: "",
      location: fw.location || "",
      assigned_to: fw.workers.map(w => w.name).join(", "),
      status: fw.status || "in-progress",
      priority: "medium",
      scheduled_date: fw.startDate,
      completed_date: fw.endDate,
      cost: totalCost,
      notes: fw.notes || "",
      payload: fw
    };

    try {
      await fieldWorkDB.add(dbJob);
      await refreshStoreData();
    } catch (e) {
      console.error("Failed to add fieldwork to DB", e);
      toast.error("Failed to save field work");
    }
  };

  const updateFieldWork = async (id: string, updatedFw: FieldWork) => {
    const getInclusiveDays = (start: string, end: string) => {
      if (!start || !end) return 1;
      const s = new Date(start);
      const e = new Date(end);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    };
    const days = getInclusiveDays(updatedFw.startDate, updatedFw.endDate);
    const totalPerDiem = updatedFw.workers.reduce((s, w) => s + (Number(w.perDiem) || 0) * days, 0);
    const fuelCost = (Number(updatedFw.fuelAmount) || 0) * (Number(updatedFw.fuelPrice) || 0);
    const totalCost = totalPerDiem + fuelCost;

    const dbJob: DBFieldWork & { payload?: any } = {
      id: updatedFw.id,
      title: updatedFw.pumpModel || "",
      description: updatedFw.notes || "",
      customer_name: "",
      location: updatedFw.location || "",
      assigned_to: updatedFw.workers.map(w => w.name).join(", "),
      status: updatedFw.status || "in-progress",
      priority: "medium",
      scheduled_date: updatedFw.startDate,
      completed_date: updatedFw.endDate,
      cost: totalCost,
      notes: updatedFw.notes || "",
      payload: updatedFw
    };

    try {
      await fieldWorkDB.update(id, dbJob);
      await refreshStoreData();
    } catch (e) {
      console.error("Failed to update fieldwork in DB", e);
      toast.error("Failed to update field work");
    }
  };

  const deleteFieldWork = async (id: string) => {
    try {
      await fieldWorkDB.delete(id);
      await refreshStoreData();
    } catch (e) {
      console.error("Failed to delete fieldwork in DB", e);
      toast.error("Failed to delete field work");
    }
  };

  const addFinancePayment = (payment: FinancePayment) => {
    setFinancePayments(prev => [normalizePayment(payment), ...prev]);
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        setProducts,
        sales,
        setSales,
        addSale,
        updateProduct,
        addProduct,
        deleteProduct,
        fieldWorks,
        setFieldWorks,
        addFieldWork,
        updateFieldWork,
        deleteFieldWork,
        addReturnForm,
        financePayments,
        addFinancePayment,
        financeEntity,
        setFinanceEntity,
        refreshStoreData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
}
