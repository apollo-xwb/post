# Security Specification for Postnet Print OS

This document outlines the Security Rules design, explicit Data Invariants, and adversarial Red Team payloads designed to stress-test the Zero-Trust Firestore Security model of Postnet Print OS.

## 1. Core Data Invariants
- **User Integrity**: Users can only register profiles (`/users/{userId}`) where the document ID matches their authenticated Firebase UID (`request.auth.uid`). Users cannot alter their own `role` or privilege tags once created.
- **Order Ownership & Visibility**: Customers can read and write only their own order documents (`/orders/{orderId}`). Operators (Staff/Admins) have comprehensive read & update privileges over all active orders in the queue.
- **Spec Integrity**: Anyone can calculate quotes using mock local calculations or server-side rules. Submitted orders cannot contain unverified fields and must start with status `Received`.
- **Status Locking**: Once an order status is marked as ready for collection or dispatched, standard customers cannot modify specifications or delete the record. Only Staff can advance statuses.
- **Temporal Consistency**: Immutable fields like `createdAt` cannot be modified after document compilation. The field `updatedAt` must match the server timestamp (`request.time`).
- **File Validation**: Files (`/orders/{orderId}/order_files/{fileId}`) can only be registered if the active user owns the matching order. File entries are immutable once uploaded.

---

## 2. The "Dirty Dozen" Adversarial Payloads
Below are 12 specific payloads or access patterns designed to compromise system integrity, all of which are blocked (`PERMISSION_DENIED`) by the Fortress Rules:

### Integrity & Identity Violations
1. **The Spoofed Registration**: Creating a user document with someone else's UID.
   - *Target Path*: `/users/attacker_uid` (where `request.auth.uid` is `victim_uid`)
2. **Standard Account Privilege Escalation**: A standard customer attempting to modify their professional role to 'staff' or 'admin'.
   - *Target Document*: `/users/customer_uid`
   - *Payload*: `{"role": "staff", "tags": ["VIP"]}`
3. **The Invisible Order Siphon**: A customer requesting a bulk list of all database orders without matching ownership filter constraints.
   - *Operation*: `getDocs(collection(db, 'orders'))` without query constraint `where('userId', '==', uid)`

### Order Fraud & State Bypass Attacks
4. **Self-Approved Price Reduction**: Submitting an order with a pre-adjusted low price.
   - *Payload*: `{"totalPrice": 1.00, "status": "Received", "userId": "victim_uid"}`
5. **Fast-Track Status Skipping**: A customer submitting an order pre-marked as `Ready for Collection`.
   - *Payload*: `{"totalPrice": 350.00, "status": "Ready for Collection", "userId": "customer_uid"}`
6. **The Orphaned File Injection**: Registering an upload file against an order owned by another customer.
   - *Path*: `/orders/victim_order_id/order_files/file_abc`
   - *Payload*: `{"fileUrl": "http://attacker-content.com/malicious.pdf", "fileName": "exploit.pdf"}`

### Immutable Field / Temporal Hacks
7. **The Retroactive Order Date-Back**: Attempting to alter the `createdAt` timestamp of an order to skip turnaround priority queue.
   - *Update Payload*: `{"createdAt": "2020-01-01T00:00:00Z"}`
8. **Malicious Staff-Note Infiltration**: A non-authenticated visitor inserting an arbitrary administrative note into a customer order.
   - *Path*: `/orders/order_123`
   - *Payload*: `{"staffNote": "COMPROMISED - Ship instantly without payment"}`

### Denial of Wallet & Injection Loops
9. **Junk Character ID Attack**: Creating a collection document with a massive 10KB string ID to trigger billing/indexing overflows.
   - *Path*: `/orders/AAAA[x10000]`
10. **Array Poisoning Attack**: Submitting specs with a dirty multi-tier array containing nested dictionary objects of 5MB size.
    - *Path*: `/orders/order_123`
    - *Payload*: `{"specs": {"oversized_payload": ["A", "B", ... 10000 items]}}`
11. **Negative Value Pricing Hack**: Creating a draft item listing negative quantities to obtain negative quote credits.
    - *Payload*: `{"productType": "Flyers", "quantity": -5000}`
12. **Bypassing the Default Deny Net**: Direct write attempt to a system telemetry or tracking directory that has no defined endpoints.
    - *Path*: `/system_diagnostic_logs/log_987`

---

## 3. Security Test Assertions
All standard write validations are locked with secure attribute-based tests:
- `isValidId(id)` verifies length and string bounds.
- `isSignedIn()` checks request token status.
- `resource.data.userId == request.auth.uid` enforces user-level tenancy for orders.
- `affectedKeys().hasOnly(...)` guards update tracks.

The rules implementation in `firestore.rules` enforces these vectors rigidly.
