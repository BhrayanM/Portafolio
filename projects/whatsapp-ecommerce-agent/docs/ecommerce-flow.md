# Ecommerce Flow — WhatsApp Commerce Agent

## Customer Journey

```
Customer sends WhatsApp message
  ↓
Twilio Webhook Received
  ↓
Fast-ACK (200 OK, immediate)
  ↓
Message ID Deduplication Check
  ↓
Payload Parsing & Validation
  ↓
Load Conversation Memory
  ↓
AI Intent Classification
  ↓
Tool Selection
  ├── lookup_order → Shopify API → Return Status
  ├── faq_engine → Knowledge Base → Return Answer
  ├── product_search → Catalog API → Return Results
  ├── qualify_lead → CRM Query → Update Profile
  └── escalate_human → Notify Team + Pause Bot
  ↓
Generate AI Response (with context)
  ↓
Send via Twilio WhatsApp API
  ↓
Log Interaction + Update Memory
```

## Order Inquiry Flow

```
Customer: "Where is my order #12345?"
  ↓
Agent extracts order ID from message
  ↓
Calls Shopify API: GET /admin/api/orders/12345.json
  ↓
Formats response with status, tracking, ETA
  ↓
Sends: "Your order #12345 is out for delivery. Tracking: 1Z999AA1234567890. Expected: July 28."
```

## FAQ Resolution Flow

```
Customer: "What's your return policy?"
  ↓
Agent searches knowledge base for "return policy"
  ↓
Finds relevant article with high confidence
  ↓
Sends: "We offer 30-day returns on all products. Items must be unused and in original packaging."
  ↓
If confidence low: "Let me connect you with our support team for that question."
```

## Product Search Flow

```
Customer: "Do you have wireless headphones?"
  ↓
Agent queries catalog API: /api/products?q=wireless+headphones
  ↓
Returns top 3 results with name, price, availability
  ↓
Sends: "Yes! Here are our wireless options:
1. SoundPro X1 - $79.99 - In Stock
2. AudioMax Plus - $129.99 - In Stock
3. BudgetBuds - $29.99 - Backordered"
```
