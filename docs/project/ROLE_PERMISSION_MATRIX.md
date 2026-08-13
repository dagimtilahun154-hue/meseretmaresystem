# Role & Permission Matrix

## Roles Defined
The system recognizes 5 main organizational roles:

| Role Name | Scope / Access Level | Handled Permissions |
|-----------|----------------------|---------------------|
| **manager** | General Manager (GM) | Full access (`*:*`) |
| **fieldwork** | Technical Manager (TM) | `fieldwork:read`, `fieldwork:write`, `pumps:read` |
| **finance** | Finance Admin | `finance:read`, `finance:write`, `reports:read` |
| **storekeeper** | Stock Manager | `inventory:read`, `inventory:write`, `pumps:read` |
| **attendance** | Attendance Clerk | `attendance:read`, `attendance:write` |

## Seeding Structure
- General Manager sits at the top.
- Department heads (TM, Finance Admin, Stock Manager) report to the GM.
- TTL reports to the TM.
- Accountant & Cashier report to the Finance Admin.
