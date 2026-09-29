# M-Pesa / Bank SMS Parsing Spec

**Purpose:** machine-readable reference for identifying and extracting payment data
from Safaricom M-Pesa and Kenyan bank SMS messages. Feed this file to an AI model
(or regex engine) to classify a message and extract its fields.

**Input:** one raw SMS body. **Output:** JSON —
`{ type, tx_code, amount, counterparty_name, counterparty_phone, occurred_at, balance? }`
or `{ type: 'not_payment' }`.

---

## 1. Sender identification

Only parse messages whose sender address matches:

```
M-PESA, MPESA, MPesa, SAFARICOM
EQUITY, EquityBank, KCB, KCBank, COOP, CoopBank, ABSA, DTB, STANBIC, NCBA, FAMILY
```

Reject everything else (`type: 'not_payment'`).

## 2. Transaction code

The unique identifier — always the **first token** of the message, immediately
before `Confirmed.`:

```
QGH7X2K4LM Confirmed. ...
```

Pattern: `^([A-Z0-9]{9,12})\s+Confirmed`
→ extract group 1 as `tx_code`. This is the dedupe key — one `tx_code` must only
ever reconcile once.

## 3. Message types

### 3a. Money RECEIVED (personal M-Pesa) — collector's own M-Pesa use case

```
SGH41RT2KL Confirmed. You have received Ksh500.00 from JOHN KAMAU MAINA
0712345678 on 16/6/25 at 2:30 PM. New M-PESA balance is Ksh12,450.75.
Transaction cost, Ksh0.00. Amount you can transact within the day is 499,500.00.
```

| field | extraction |
|---|---|
| `type` | `received` |
| `amount` | `Ksh([\d,]+\.?\d*)` after "received" |
| `counterparty_name` | `from (.+?) (\d{9,12})` — name before the phone |
| `counterparty_phone` | the 9–12 digit number |
| `occurred_at` | `on (d+/m+/yy) at (h:mm AM\|PM)` |
| `balance` | `balance is Ksh([\d,]+\.?\d*)` |

### 3b. PayBill payment (member pays church PayBill)

```
RGK29XN8PW Confirmed. Ksh1,000.00 paid to KISERIAN MAIN SDA. on 15/6/25 at
10:12 AM. New M-PESA balance is Ksh340.00. Transaction cost, Ksh23.00.
```

| field | extraction |
|---|---|
| `type` | `paybill` |
| `amount` | `Ksh([\d,]+\.?\d*) paid to` |
| `counterparty_name` | `paid to (.+?)\. on` |
| `counterparty_phone` | null |
| `occurred_at` | same `on … at …` pattern |

Variants: `paid to X. Account no: Y` (PayBill with account ref — capture the
account ref as `reference`), `for account 12345`.

### 3c. Buy Goods / Till

```
THK55MZ1QA Confirmed. Ksh250.00 paid to JOSEPH'S STORE - 5554444. on 14/6/25 at
6:45 PM. ...
```

→ same extraction as paybill; `type: 'till'`.

### 3d. Money SENT (collector forwards to church — outgoing)

```
QHJ88PL3NB Confirmed. Ksh5,000.00 sent to CHURCH TREASURER 0722000111 on
17/6/25 at 9:05 AM. ...
```

→ `type: 'sent'`, `sent to (.+?) (\d{9,12})`. Used to verify the collector
remitted collected funds.

### 3e. Bank deposit SMS (Equity example)

```
EQ12345678 Confirmed. KES 5,000.00 deposited to Account 0123****789 on
16/06/2025 at 14:22. Ref: CASH DEPOSIT. Balance: KES 45,100.00
```

→ `type: 'bank_deposit'`, `KES\s?([\d,]+\.?\d*)`, date format may be
`dd/mm/yyyy`. Bank formats vary — if `tx_code` + `Confirmed` + amount extract
cleanly, accept; else `type: 'unparsed_bank'` and surface for manual review.

### 3f. Reversal

```
QGH7X2K4LM Confirmed. Your transaction has been reversed. ...
```

→ `type: 'reversal'`, link back to the original `tx_code`; if a reconciliation
exists for that code, flag it `reversed` instead of deleting.

## 4. Rejection rules

- No `Confirmed` after the code → `not_payment` (adverts, OTPs, statements).
- `type` unresolved or amount unparsable → `unparsed`, never auto-reconcile.
- Amount currency must be `Ksh`/`KES` — other currencies → reject.

## 5. Matching priority (server-side, after extraction)

1. `tx_code` already in `mpesa_reconciliations` → duplicate, reject.
2. `obligation_id` explicitly chosen by the collector → reconcile to it.
3. Auto-suggest only (never auto-post): match `counterparty_phone` to a
   member's `phone` + amount == their outstanding obligation amount → surface as
   a suggestion the collector must confirm.
4. No match → park as `unassigned`; treasurer can attach later.
