// Smart Customer Deduplication and Auto-Merge Engine
// Matches incoming Peachtree accounting records with existing SolarFlow customer dossiers

import { Customer } from "./finance-hub-store";

export interface DuplicateMatchResult {
  sourceCustomer: Customer;
  matchedCustomer: Customer;
  matchScore: number; // 0 to 100
  matchReason: string;
}

// Normalize phone numbers (e.g. "+251 911 234 567" -> "0911234567")
export function normalizePhoneNumber(phone?: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+251")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("251")) {
    cleaned = "0" + cleaned.slice(3);
  }
  return cleaned;
}

// Clean string for fuzzy name matching
export function normalizeString(str?: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Calculate similarity score between two strings (Dice coefficient / token overlap)
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 85;

  const words1 = new Set(s1.split(" ").filter((w) => w.length > 2));
  const words2 = new Set(s2.split(" ").filter((w) => w.length > 2));
  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  words1.forEach((w) => {
    if (words2.has(w)) intersection++;
  });

  const overlap = (2 * intersection) / (words1.size + words2.size);
  return Math.round(overlap * 100);
}

/**
 * Checks whether an incoming Peachtree customer record matches an existing local customer
 */
export function findMatchingCustomer(
  incoming: Partial<Customer>,
  existingCustomers: Customer[]
): DuplicateMatchResult | null {
  if (!incoming || !existingCustomers || existingCustomers.length === 0) {
    return null;
  }

  const incomingPhone = normalizePhoneNumber(incoming.phone);
  const incomingTin = incoming.tin ? normalizeString(incoming.tin) : "";
  const incomingId = incoming.id ? normalizeString(incoming.id) : "";
  const incomingName = incoming.name || "";

  let bestMatch: DuplicateMatchResult | null = null;

  for (const existing of existingCustomers) {
    // 1. Direct ID match
    if (incomingId && normalizeString(existing.id) === incomingId) {
      return {
        sourceCustomer: incoming as Customer,
        matchedCustomer: existing,
        matchScore: 100,
        matchReason: `Exact Peachtree Customer ID Match (${existing.id})`,
      };
    }

    // 2. TIN Number Match (Tax ID is globally unique)
    if (incomingTin && existing.tin && normalizeString(existing.tin) === incomingTin) {
      return {
        sourceCustomer: incoming as Customer,
        matchedCustomer: existing,
        matchScore: 98,
        matchReason: `Exact Tax Identification Number (TIN) Match (${existing.tin})`,
      };
    }

    // 3. Phone Number Match
    const existingPhone = normalizePhoneNumber(existing.phone);
    if (incomingPhone && existingPhone && incomingPhone === existingPhone && incomingPhone.length >= 9) {
      return {
        sourceCustomer: incoming as Customer,
        matchedCustomer: existing,
        matchScore: 95,
        matchReason: `Exact Phone Number Match (${existing.phone})`,
      };
    }

    // 4. Fuzzy Name Match
    const nameScore = calculateStringSimilarity(incomingName, existing.name);
    if (nameScore >= 75) {
      if (!bestMatch || nameScore > bestMatch.matchScore) {
        bestMatch = {
          sourceCustomer: incoming as Customer,
          matchedCustomer: existing,
          matchScore: nameScore,
          matchReason: `Name similarity match (${nameScore}% match)`,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Merges Peachtree customer data into an existing customer profile, preserving history
 */
export function mergeCustomerRecords(
  existing: Customer,
  incoming: Partial<Customer>
): Customer {
  return {
    ...existing,
    // Prefer incoming Peachtree balance as source of truth
    balance: typeof incoming.balance === "number" ? incoming.balance : existing.balance,
    creditLimit: incoming.creditLimit || existing.creditLimit,
    // Fill in missing contact details if present in Peachtree
    phone: existing.phone || incoming.phone,
    email: existing.email || incoming.email,
    address: existing.address || incoming.address,
    city: existing.city || incoming.city,
    state: existing.state || incoming.state,
    tin: existing.tin || incoming.tin,
    contact: existing.contact || incoming.contact,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Ingests an array of Peachtree customer records into the existing customer database.
 * Merges matching records and appends new ones.
 */
export function autoMergePeachtreeCustomerList(
  peachtreeCustomers: Partial<Customer>[],
  currentList: Customer[]
): {
  mergedList: Customer[];
  mergedCount: number;
  newCount: number;
} {
  const resultList: Customer[] = [...currentList];
  let mergedCount = 0;
  let newCount = 0;

  peachtreeCustomers.forEach((ptCust) => {
    if (!ptCust.name && !ptCust.id) return;

    const match = findMatchingCustomer(ptCust, resultList);

    if (match && match.matchScore >= 75) {
      // Merge with existing record
      const idx = resultList.findIndex((c) => c.id === match.matchedCustomer.id);
      if (idx >= 0) {
        resultList[idx] = mergeCustomerRecords(resultList[idx], ptCust);
        mergedCount++;
      }
    } else {
      // Register as fresh customer
      const newCustomer: Customer = {
        id: ptCust.id || `CUST-PT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: ptCust.name || "Unnamed Customer",
        phone: ptCust.phone || "",
        email: ptCust.email || "",
        address: ptCust.address || "",
        city: ptCust.city || "",
        state: ptCust.state || "",
        zip: ptCust.zip || "",
        tin: ptCust.tin || "",
        contact: ptCust.contact || "",
        creditLimit: Number(ptCust.creditLimit) || 0,
        balance: Number(ptCust.balance) || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      resultList.push(newCustomer);
      newCount++;
    }
  });

  return {
    mergedList: resultList,
    mergedCount,
    newCount,
  };
}
