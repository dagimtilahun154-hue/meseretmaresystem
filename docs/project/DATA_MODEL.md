# Data Model Schema

The data layer is managed with Prisma, structured into:
- **Identity & Access:** `Organization`, `Company`, `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `UserCompany`, `RefreshToken`, `AuditLog`.
- **Sales & Stock:** `Product`, `PosSale`, `Customer`, `Vendor`.
- **Ledger & Accounting:** `Account`, `Invoice`, `Bill`, `Payment`, `Expense`, `FinanceJournalEntry`, `FinanceCenterRecord`, `PeachtreeImport`.
- **Sizing & Fieldwork:** `SizingRequest`, `FieldWorkJob`, `CompanyAsset`, `FieldWorkAsset`, `HierarchyRequest`, `RequestAuditLog`, `InventoryRequest`, `EodReport`, `Task`, `Comment`.
- **Real-time & Communications:** `ChatChannel`, `ChannelMember`, `ChatMessage`, `Notification`.
- **Offline Sync Control:** `SyncDevice`, `SyncMutation`, `SyncConflict`.
- **Catalog:** `PumpProduct`, `PumpCategory`.
