import { Sale, formatCurrency } from "@/lib/data";

interface PrintableInvoiceProps {
  sale: Sale;
}

export function PrintableInvoice({ sale }: PrintableInvoiceProps) {
  return (
    <div className="print-invoice hidden print:block p-8 bg-white text-black max-w-[800px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">SolarPump</h1>
          <p className="text-sm text-gray-600">Management System</p>
          <p className="text-xs text-gray-500 mt-2">Solar Pump Installation & Sales</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">INVOICE</h2>
          <p className="text-sm">#{sale.id}</p>
          <p className="text-sm">Date: {sale.date}</p>
        </div>
      </div>

      {/* Customer */}
      <div className="mb-6">
        <h3 className="font-bold text-sm mb-1">Bill To:</h3>
        <p className="font-medium">{sale.customer.name}</p>
        {sale.customer.phone && <p className="text-sm">{sale.customer.phone}</p>}
        {sale.customer.location && <p className="text-sm">{sale.customer.location}</p>}
      </div>

      {/* Items */}
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-2 font-bold">#</th>
            <th className="text-left py-2 font-bold">Product</th>
            <th className="text-center py-2 font-bold">Qty</th>
            <th className="text-right py-2 font-bold">Unit Price</th>
            <th className="text-right py-2 font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, i) => (
            <tr key={item.productId} className="border-b border-gray-300">
              <td className="py-2">{i + 1}</td>
              <td className="py-2">{item.productName}</td>
              <td className="py-2 text-center">{item.quantity}</td>
              <td className="py-2 text-right">{formatCurrency(item.price)}</td>
              <td className="py-2 text-right">{formatCurrency(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(sale.totalSell)}</span>
          </div>
          {sale.vatIncluded && (
            <>
              <div className="flex justify-between">
                <span>VAT (15%):</span>
                <span>{formatCurrency(sale.vatAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Net Amount:</span>
                <span>{formatCurrency(sale.netAmount)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-bold text-base border-t-2 border-black pt-2">
            <span>Total:</span>
            <span>{formatCurrency(sale.totalSell)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
        <p>Thank you for your business!</p>
        <p>SolarPump Management System</p>
      </div>
    </div>
  );
}
