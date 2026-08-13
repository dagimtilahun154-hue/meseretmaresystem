# User Flows

## Sizing Proposal Workflow
1. Field operator starts a sizing request in `/fieldwork/sizing`.
2. Interactive map click populates address via Nominatim reverse-geocoding.
3. Hydraulic metrics computed; FastAPI fetches solar database values.
4. Llama 3 generates proposal recommendations.
5. Proposal submitted -> goes to **PENDING_TM** status.
6. TM verifies specs -> status becomes **CHECKED**.
7. GM reviews feasibility -> status becomes **GM_APPROVED**.
8. Finance validates payment/credit limit -> status becomes **PAID**.
9. System auto-generates a **FieldWorkJob**.
