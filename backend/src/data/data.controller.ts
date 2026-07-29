import { Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseInterceptors, Req } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DataService } from "./data.service";
import { Roles } from "../common/decorators/roles.decorator";

@Controller()
export class DataController {
  constructor(private readonly data: DataService) {}

  @Get("products") products() { return this.data.products(); }
  @Post("products") saveProduct(@Body() body: any) { return this.data.saveProduct(body); }
  @Put("products/:id") updateProduct(@Param("id") id: string, @Body() body: any) { return this.data.updateProduct(id, body); }
  @Delete("products/:id") deleteProduct(@Param("id") id: string) { return this.data.deleteProduct(id); }

  @Get("pumps") pumpProducts() { return this.data.pumpProducts(); }
  @Get("pump-categories") pumpCategories() { return this.data.pumpCategories(); }
  @Post("pump-categories") savePumpCategory(@Body() body: any) { return this.data.savePumpCategory(body); }
  @Put("pump-categories/:id") updatePumpCategory(@Param("id") id: string, @Body() body: any) { return this.data.updatePumpCategory(id, body); }
  @Delete("pump-categories/:id") deletePumpCategory(@Param("id") id: string) { return this.data.deletePumpCategory(id); }
  @Get("pumps/:id") pumpProduct(@Param("id") id: string) { return this.data.pumpProduct(id); }
  @Post("pumps") savePumpProduct(@Body() body: any) { return this.data.savePumpProduct(body); }
  @Put("pumps/:id") updatePumpProduct(@Param("id") id: string, @Body() body: any) { return this.data.updatePumpProduct(id, body); }
  @Delete("pumps/:id") deletePumpProduct(@Param("id") id: string) { return this.data.deletePumpProduct(id); }

  @Get("sales") sales() { return this.data.sales(); }
  @Post("sales") saveSale(@Body() body: any) { return this.data.saveSale(body); }

  @Get("fieldwork") fieldwork() { return this.data.fieldwork(); }
  @Post("fieldwork") saveFieldwork(@Body() body: any) { return this.data.saveFieldwork(body); }
  @Put("fieldwork/:id") updateFieldwork(@Param("id") id: string, @Body() body: any) { return this.data.updateFieldwork(id, body); }
  @Delete("fieldwork/:id") deleteFieldwork(@Param("id") id: string) { return this.data.deleteFieldwork(id); }

  @Get("customers") customers() { return this.data.customers(); }
  @Post("customers") saveCustomer(@Body() body: any) { return this.data.saveCustomer(body); }
  @Delete("customers/:id") deleteCustomer(@Param("id") id: string) { return this.data.deleteCustomer(id); }
  @Get("vendors") vendors() { return this.data.vendors(); }
  @Post("vendors") saveVendor(@Body() body: any) { return this.data.saveVendor(body); }
  @Delete("vendors/:id") deleteVendor(@Param("id") id: string) { return this.data.deleteVendor(id); }
  @Get("accounts")
  @Roles('manager', 'finance')
  accounts() { return this.data.accounts(); }
  @Post("accounts")
  @Roles('manager', 'finance')
  saveAccount(@Body() body: any) { return this.data.saveAccount(body); }
  @Delete("accounts/:id")
  @Roles('manager', 'finance')
  deleteAccount(@Param("id") id: string) { return this.data.deleteAccount(id); }
  @Get("invoices")
  @Roles('manager', 'finance')
  invoices() { return this.data.invoices(); }
  @Post("invoices")
  @Roles('manager', 'finance')
  saveInvoice(@Body() body: any) { return this.data.saveInvoice(body); }
  @Get("bills")
  @Roles('manager', 'finance')
  bills() { return this.data.bills(); }
  @Post("bills")
  @Roles('manager', 'finance')
  saveBill(@Body() body: any) { return this.data.saveBill(body); }
  @Get("payments")
  @Roles('manager', 'finance')
  payments() { return this.data.payments(); }
  @Post("payments")
  @Roles('manager', 'finance')
  savePayment(@Body() body: any) { return this.data.savePayment(body); }
  @Get("expenses")
  @Roles('manager', 'finance')
  expenses() { return this.data.expenses(); }
  @Post("expenses")
  @Roles('manager', 'finance')
  saveExpense(@Body() body: any) { return this.data.saveExpense(body); }
  @Delete("expenses/:id")
  @Roles('manager', 'finance')
  deleteExpense(@Param("id") id: string) { return this.data.deleteExpense(id); }
  @Get("journal")
  @Roles('manager', 'finance')
  journal() { return this.data.journal(); }
  @Post("journal")
  @Roles('manager', 'finance')
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
  @Roles('manager', 'finance')
  financeCenter(@Param("type") type: string) { return this.data.financeCenter(type); }
  @Post("finance-center/:type")
  @Roles('manager', 'finance')
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
}
