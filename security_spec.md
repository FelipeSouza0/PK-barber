# Security Specification for PK Barbershop

## Data Invariants
1. Appointments must have a valid date and time.
2. Prices and fees must be numeric and non-negative.
3. Appointments created by users default to 'pendente' status.
4. Users can only see their own appointments (via phone number lookup in this version, but we should secure it).
5. Admins have full control over all collections.

## The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Payload 1: Price Spoofing**
   - Goal: Create appointment with `bookingFee: 0`.
   - Expected: `PERMISSION_DENIED`.
2. **Payload 2: Status Escalation**
   - Goal: Create appointment with `status: 'confirmado'` bypassing payment.
   - Expected: `PERMISSION_DENIED`.
3. **Payload 3: Admin Key Injection**
   - Goal: Add `isAdmin: true` to a user profile or appointment.
   - Expected: `PERMISSION_DENIED`.
4. **Payload 4: Shadow Field Update**
   - Goal: Update appointment and change `totalPrice`.
   - Expected: `PERMISSION_DENIED`.
5. **Payload 5: ID Poisoning**
   - Goal: Create appointment with a 1MB string as ID.
   - Expected: `PERMISSION_DENIED`.
6. **Payload 6: Timestamp Manipulation**
   - Goal: Set `createdAt` to a future date.
   - Expected: `PERMISSION_DENIED`.
7. **Payload 7: Unauthenticated Admin Access**
   - Goal: Access `/services` write without being an admin.
   - Expected: `PERMISSION_DENIED`.
8. **Payload 8: PII Leak**
   - Goal: List all appointments as an unauthenticated user (currently allowed, must fix).
   - Expected: `PERMISSION_DENIED`.
9. **Payload 9: Orphaned Appointment**
   - Goal: Create appointment for a non-existent barbershop.
   - Expected: `PERMISSION_DENIED`.
10. **Payload 10: Negative Fee**
    - Goal: Set `bookingFee: -100`.
    - Expected: `PERMISSION_DENIED`.
11. **Payload 11: Bulk Read Attack**
    - Goal: Query all appointments without a filter.
    - Expected: `PERMISSION_DENIED`.
12. **Payload 12: Resource Exhaustion**
    - Goal: Send 100 services in a single array (if used).
    - Expected: `PERMISSION_DENIED`.

## Implementation Strategy
- Use `isValidAppointment()` for all writes.
- Enforce `status: 'pendente'` on user creation.
- Enforce `paid: false` and specific fee calculations.
- Restrict `list` to specific phone filter if not admin.
