# Product Requirements

## Core Requirements
1. **Multi-Tenant Organizations:** Isolate data using `organizationId` and `companyId` parameters.
2. **AI Pump Calculator:** Calculate dynamic head (TDH), fetch NASA climatology datasets, and run an LLM (Llama 3) to recommend optimal pumps.
3. **Workflow Steppers:** Renders visual representations of sizing and job approvals.
4. **Offline Synchronization:** Store mutations in indexed DB / SQLite and flush to backend on reconnection.
5. **Real-time Notifications & Chat:** Channel and DM structures powered by Socket.io.
6. **Peachtree Ledger Bridge:** Double-entry journal inputs exportable to Peachtree Desktop formats via CSV mapping.
