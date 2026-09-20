import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CustomerDocumentsManager, CustomerDocumentItem } from "@/components/customers/CustomerDocumentsManager";
import { customersDB } from "@/lib/db-service";

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock customersDB
vi.mock("@/lib/db-service", () => ({
  customersDB: {
    getDocuments: vi.fn(),
    uploadDocument: vi.fn().mockResolvedValue({ success: true }),
    deleteDocument: vi.fn().mockResolvedValue({ success: true }),
  },
}));

const mockDocuments: CustomerDocumentItem[] = [
  {
    id: "doc-1",
    customerId: "cust-101",
    title: "Signed Solar Water Pumping Contract",
    fileName: "solar_contract_signed.pdf",
    fileUrl: "/uploads/customer-documents/custdoc-101.pdf",
    fileType: "application/pdf",
    fileSize: 2.5 * 1024 * 1024, // 2.5 MB
    category: "AGREEMENT",
    notes: "3-year solar warranty clause included",
    uploadedBy: {
      id: "u-1",
      displayName: "Abebe Kebede (Finance)",
      username: "abebe",
    },
    createdAt: "2026-03-15T10:00:00.000Z",
  },
  {
    id: "doc-2",
    customerId: "cust-101",
    title: "CBE Bank Deposit Slip #9948",
    fileName: "cbe_deposit_slip.jpg",
    fileUrl: "/uploads/customer-documents/custdoc-102.jpg",
    fileType: "image/jpeg",
    fileSize: 450 * 1024, // 450 KB
    category: "PAYMENT_PROOF",
    notes: "30% advance payment confirmed",
    uploadedBy: {
      id: "u-2",
      displayName: "Sara Tesfaye",
      username: "sara",
    },
    createdAt: "2026-03-16T14:30:00.000Z",
  },
];

describe("CustomerDocumentsManager Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload section with 50 MB limit indicator and existing documents", () => {
    render(
      <CustomerDocumentsManager
        customerId="cust-101"
        customerName="Almaz Mengistu"
        documents={mockDocuments}
      />
    );

    // 1. Verify 50MB limit banner
    expect(screen.getByText(/Max Single File Size:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/50 MB/i).length).toBeGreaterThanOrEqual(1);

    // 2. Verify rendered documents
    expect(screen.getByText("Signed Solar Water Pumping Contract")).toBeInTheDocument();
    expect(screen.getByText("CBE Bank Deposit Slip #9948")).toBeInTheDocument();
    expect(screen.getByText("solar_contract_signed.pdf")).toBeInTheDocument();
    expect(screen.getByText("2.50 MB")).toBeInTheDocument();
    expect(screen.getByText("450.0 KB")).toBeInTheDocument();
  });

  it("filters documents by search query", () => {
    render(
      <CustomerDocumentsManager
        customerId="cust-101"
        customerName="Almaz Mengistu"
        documents={mockDocuments}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search files...");
    fireEvent.change(searchInput, { target: { value: "Deposit" } });

    // Should only show the deposit slip
    expect(screen.getByText("CBE Bank Deposit Slip #9948")).toBeInTheDocument();
    expect(screen.queryByText("Signed Solar Water Pumping Contract")).not.toBeInTheDocument();
  });

  it("filters documents by category dropdown", () => {
    render(
      <CustomerDocumentsManager
        customerId="cust-101"
        customerName="Almaz Mengistu"
        documents={mockDocuments}
      />
    );

    const categorySelect = screen.getByRole("combobox", { name: /Filter documents by category/i });
    fireEvent.change(categorySelect, { target: { value: "PAYMENT_PROOF" } });

    expect(screen.getByText("CBE Bank Deposit Slip #9948")).toBeInTheDocument();
    expect(screen.queryByText("Signed Solar Water Pumping Contract")).not.toBeInTheDocument();
  });

  it("blocks files exceeding the 50 MB limit and warns the user", async () => {
    const { toast } = await import("sonner");
    const { container } = render(
      <CustomerDocumentsManager
        customerId="cust-101"
        customerName="Almaz Mengistu"
        documents={mockDocuments}
      />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    // Create a mock 55 MB file
    const oversizedFile = new File(["a".repeat(100)], "huge_raw_scan.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(oversizedFile, "size", { value: 55 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("exceeds the maximum 50 MB single file limit")
    );
  });

  it("successfully handles valid file selection and form submission", async () => {
    const onDocumentsChange = vi.fn();
    const { container } = render(
      <CustomerDocumentsManager
        customerId="cust-101"
        customerName="Almaz Mengistu"
        documents={mockDocuments}
        onDocumentsChange={onDocumentsChange}
      />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(["dummy pdf content"], "site_survey_agreement.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(validFile, "size", { value: 1.2 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Auto-filled title
    const titleInput = screen.getByLabelText(/Document Name \/ Title/i);
    expect((titleInput as HTMLInputElement).value).toBe("site survey agreement");

    // Click upload
    const uploadBtn = screen.getByRole("button", { name: /Upload to Customer File/i });
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(customersDB.uploadDocument).toHaveBeenCalledWith("cust-101", expect.any(FormData));
      expect(onDocumentsChange).toHaveBeenCalled();
    });
  });

  it("provides on-demand direct download links with correct href", () => {
    render(
      <CustomerDocumentsManager
        customerId="cust-101"
        customerName="Almaz Mengistu"
        documents={mockDocuments}
      />
    );

    const downloadLinks = screen.getAllByRole("link", { name: /Download/i });
    expect(downloadLinks.length).toBe(2);

    // Verify download link points to static uploads URL
    expect(downloadLinks[0].getAttribute("href")).toContain("/uploads/customer-documents/custdoc-101.pdf");
    expect(downloadLinks[0].getAttribute("download")).toBe("solar_contract_signed.pdf");
  });
});
