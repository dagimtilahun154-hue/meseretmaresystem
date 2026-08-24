import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UploadedFile, UseInterceptors, Req } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DataService } from "./data.service";
import { Roles } from "../common/decorators/roles.decorator";

@Controller()
export class DataController {
  constructor(private readonly data: DataService) {}

  @Get("products") products() { return this.data.products(); }
  @Post("products") @Roles('storekeeper') saveProduct(@Body() body: any) { return this.data.saveProduct(body); }
  @Put("products/:id") @Roles('storekeeper') updateProduct(@Param("id") id: string, @Body() body: any) { return this.data.updateProduct(id, body); }
  @Delete("products/:id") @Roles('storekeeper') deleteProduct(@Param("id") id: string) { return this.data.deleteProduct(id); }

  @Get("pumps") pumpProducts() { return this.data.pumpProducts(); }
  @Get("pump-categories") pumpCategories() { return this.data.pumpCategories(); }
  @Post("pump-categories") @Roles('storekeeper') savePumpCategory(@Body() body: any) { return this.data.savePumpCategory(body); }
  @Put("pump-categories/:id") @Roles('storekeeper') updatePumpCategory(@Param("id") id: string, @Body() body: any) { return this.data.updatePumpCategory(id, body); }
  @Delete("pump-categories/:id") @Roles('storekeeper') deletePumpCategory(@Param("id") id: string) { return this.data.deletePumpCategory(id); }
  @Get("pumps/:id") pumpProduct(@Param("id") id: string) { return this.data.pumpProduct(id); }
  @Post("pumps") @Roles('storekeeper') savePumpProduct(@Body() body: any) { return this.data.savePumpProduct(body); }
  @Put("pumps/:id") @Roles('storekeeper') updatePumpProduct(@Param("id") id: string, @Body() body: any) { return this.data.updatePumpProduct(id, body); }
  @Delete("pumps/:id") @Roles('storekeeper') deletePumpProduct(@Param("id") id: string) { return this.data.deletePumpProduct(id); }

  @Get("sales") sales() { return this.data.sales(); }
  @Post("sales") @Roles('sales', 'storekeeper', 'finance') saveSale(@Body() body: any) { return this.data.saveSale(body); }

  @Get("fieldwork") fieldwork() { return this.data.fieldwork(); }
  @Post("fieldwork") saveFieldwork(@Body() body: any) { return this.data.saveFieldwork(body); }
  @Put("fieldwork/:id") updateFieldwork(@Param("id") id: string, @Body() body: any) { return this.data.updateFieldwork(id, body); }
  @Delete("fieldwork/:id") deleteFieldwork(@Param("id") id: string) { return this.data.deleteFieldwork(id); }

  @Get("customers") customers() { return this.data.customers(); }
  @Get("customers/:id/360") getCustomer360(@Param("id") id: string) { return this.data.getCustomer360(id); }
  @Post("customers/:id/notes") addCustomerNote(@Param("id") id: string, @Req() req: any, @Body() body: { note: string }) { return this.data.addCustomerNote(id, req.user.id, body.note); }
  @Post("customers") saveCustomer(@Body() body: any) { return this.data.saveCustomer(body); }
  @Delete("customers/:id") deleteCustomer(@Param("id") id: string) { return this.data.deleteCustomer(id); }
  @Get("vendors") vendors() { return this.data.vendors(); }
  @Post("vendors") saveVendor(@Body() body: any) { return this.data.saveVendor(body); }
  @Delete("vendors/:id") deleteVendor(@Param("id") id: string) { return this.data.deleteVendor(id); }
  @Get("accounts")
  @Roles('finance')
  accounts() { return this.data.accounts(); }
  @Post("accounts")
  @Roles('finance')
  saveAccount(@Body() body: any) { return this.data.saveAccount(body); }
  @Delete("accounts/:id")
  @Roles('finance')
  deleteAccount(@Param("id") id: string) { return this.data.deleteAccount(id); }
  @Get("invoices")
  @Roles('finance')
  invoices() { return this.data.invoices(); }
  @Post("invoices")
  @Roles('finance')
  saveInvoice(@Body() body: any) { return this.data.saveInvoice(body); }
  @Get("bills")
  @Roles('finance')
  bills() { return this.data.bills(); }
  @Post("bills")
  @Roles('finance')
  saveBill(@Body() body: any) { return this.data.saveBill(body); }
  @Get("payments")
  @Roles('finance')
  payments() { return this.data.payments(); }
  @Post("payments")
  @Roles('finance')
  savePayment(@Body() body: any) { return this.data.savePayment(body); }
  @Get("expenses")
  @Roles('finance')
  expenses() { return this.data.expenses(); }
  @Post("expenses")
  @Roles('finance')
  saveExpense(@Body() body: any) { return this.data.saveExpense(body); }
  @Delete("expenses/:id")
  @Roles('finance')
  deleteExpense(@Param("id") id: string) { return this.data.deleteExpense(id); }
  @Get("journal")
  @Roles('finance')
  journal() { return this.data.journal(); }
  @Post("journal")
  @Roles('finance')
  saveJournal(@Body() body: any) { return this.data.saveJournal(body); }

  @Get("hr/departments") departments() { return this.data.departments(); }
  @Post("hr/departments") saveDepartment(@Body() body: any) { return this.data.saveDepartment(body); }
  @Delete("hr/departments/:id") deleteDepartment(@Param("id") id: string) { return this.data.deleteDepartment(id); }
  @Get("hr/workers") workers() { return this.data.workers(); }
  @Post("hr/workers") saveWorker(@Body() body: any) { return this.data.saveWorker(body); }
  @Delete("hr/workers/:id") deleteWorker(@Param("id") id: string) { return this.data.deleteWorker(id); }
  @Get("hr/settings") settings() { return this.data.settings(); }
  @Put("hr/settings") saveSettings(@Body() body: any) { return this.data.saveSettings(body); }
  @Post("hr/attendance/scan") scanAttendance(@Body() body: any) { return this.data.scanAttendance(body.fingerprintId); }
  @Get("hr/attendance/logs") attendanceLogs(@Query() query: any) { return this.data.attendanceLogs(query); }

  @Get("inventory-requests") inventoryRequests() { return this.data.inventoryRequests(); }
  @Post("inventory-requests") saveInventoryRequest(@Body() body: any) { return this.data.saveInventoryRequest(body); }

  @Get("finance-center/:type")
  @Roles('finance', 'manager')
  financeCenter(@Param("type") type: string) { return this.data.financeCenter(type); }
  @Post("finance-center/:type")
  @Roles('finance', 'manager')
  saveFinanceCenter(@Param("type") type: string, @Body() body: any) { return this.data.saveFinanceCenter(type, body); }

  @Get("peachtree/imports") peachtreeImports(@Query() query: any) { return this.data.peachtreeImports(query); }
  @Get("peachtree/imports/:id") peachtreeImport(@Param("id") id: string) { return this.data.peachtreeImport(id); }
  @Post("peachtree/imports/upload")
  @UseInterceptors(FileInterceptor("file"))
  uploadPeachtreeImport(@UploadedFile() file: any, @Body() body: any, @Req() req: any) {
    return this.data.uploadPeachtreeImport(file, body, req.user);
  }

  @Get("hierarchy/requests")
  getHierarchyRequests(@Req() req: any) {
    return this.data.getHierarchyRequests(req.user.id);
  }

  @Post("hierarchy/requests")
  createHierarchyRequest(@Req() req: any, @Body() body: any) {
    return this.data.createHierarchyRequest(req.user.id, body);
  }

  @Post("hierarchy/requests/:id/action")
  handleHierarchyRequestAction(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    return this.data.handleHierarchyRequestAction(req.user.id, id, body.action, body.comment);
  }

  @Patch("hierarchy/requests/:id/details")
  updateHierarchyRequestDetails(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    return this.data.updateHierarchyRequestDetails(req.user.id, id, body.details, body.comment);
  }

  @Get("hierarchy/users-presence")
  getUsersPresence() {
    return this.data.getUsersPresence();
  }

  @Get("eod-reports")
  getEodReports(@Query("date") date?: string) {
    return this.data.getEodReports(date);
  }

  @Post("eod-reports")
  createEodReport(@Req() req: any, @Body() body: any) {
    return this.data.createEodReport(req.user.id, body);
  }

  @Post("eod-reports/:id/forward")
  forwardEodReportToGm(@Param("id") id: string, @Req() req: any, @Body() body: { summaryNote: string }) {
    return this.data.forwardEodReportToGm(id, req.user.id, body.summaryNote);
  }

  @Post("eod-reports/:id/comments")
  addEodComment(@Param("id") id: string, @Req() req: any, @Body() body: { comment: string }) {
    return this.data.addEodComment(id, req.user.id, body.comment);
  }
}
