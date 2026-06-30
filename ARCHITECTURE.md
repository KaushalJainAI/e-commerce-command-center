# Admin Panel Architecture

This document explains the design principles and patterns specific to the admin panel.

---

## Design Principles

### 1. CRUD-Centric Pages
Each page manages one resource type with consistent patterns:
- **List view** — table with actions
- **Create dialog** — form modal
- **Edit dialog** — form modal with pre-filled data
- **Delete/Toggle** — inline actions

### 2. Optimistic Updates
Status toggles update the UI immediately, then sync to the backend:
```typescript
// Update UI first
setProducts(prev => prev.map(p =>
  p.id === id ? { ...p, is_active: !p.is_active } : p
));

// Then sync to backend
await updateProduct(id, { is_active: !isActive });
```

### 3. Admin-Only Access
All routes require `is_staff=True`. Auth check happens at:
- **Frontend**: Route guard redirects to `/login`
- **Backend**: `IsAdminUser` permission class on all write endpoints

---

## Application Flow

### Page Load Pattern

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Route  │────▶│  Page   │────▶│  Fetch  │────▶│  Table  │
│         │     │  Init   │     │  Data   │     │ Render  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
```

### CRUD Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                        Table View                           │
├─────────────────────────────────────────────────────────────┤
│  [+ Add New]                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Name    │ Price  │ Status │ Actions              │   │
│  │ Item 1  │ ₹100   │ Active │ [Edit] [Toggle]      │   │
│  │ Item 2  │ ₹200   │ Draft  │ [Edit] [Toggle]      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                               │
         ▼                               ▼
   ┌──────────┐                   ┌──────────┐
   │  Create  │                   │   Edit   │
   │  Dialog  │                   │  Dialog  │
   └──────────┘                   └──────────┘
```

---

## Key Implementation Details

### 1. Auth Context

Same cookie-based auth as the customer frontend, with admin-specific checks:
- Login validates `is_staff` on the backend; non-staff accounts are rejected
- JWTs are stored in **HttpOnly cookies** — the Axios instance sends them automatically via `withCredentials: true`
- On 401, the Axios interceptor clears `admin_token`/`refresh_token` from localStorage and redirects to `/login` (unless already on the login page, to avoid a refresh loop)
- On 403, localStorage is also cleared but no redirect is forced

### 2. Products: Gallery Image Upload

Products support a primary image and multiple gallery images:
```typescript
const [galleryImages, setGalleryImages] = useState<ProductImage[]>([]);
const [newGalleryImages, setNewGalleryImages] = useState<File[]>([]);

// On submit, product saved first, then gallery images uploaded individually
await createProductImage(productId, file, altText);
```

**Upload flow:**
1. User selects multiple images
2. Images previewed locally
3. On form submit, product saved first
4. Gallery images uploaded individually
5. Existing images deleted via API

### 3. Order Status Management

Orders follow this workflow:
```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → CANCELLED
```
Admin updates status via a dropdown in the order detail view.

### 4. Homepage Sections (Admin-Ordered)

The **Sections** page uses `django-admin-sortable2` on the backend. Admins can drag
products within a section to set their display order. The `position` column on
`ProductSection` persists this order.

### 5. Policy Pages (Shipping/Return)

Policies may not exist initially:
```typescript
const fetchPolicy = async () => {
  try {
    const response = await getPolicy('shipping');
    setContent(response.data.content);
  } catch (error) {
    if (error?.response?.status === 404) {
      setNotConfigured(true);
      setContent('');  // Empty editor for creation
    }
  }
};
```
Saving to a non-existent policy auto-creates it (PUT upsert).

### 6. Conversations (Chat Support)

The **Conversations** page (`/conversations`) is the admin inbox for the unified AI + human chat system.

**Data sources:**
- `GET /api/assistant/conversations/admin/` — lists all threads (supports `?needs_human=true` and `?status=resolved` filters)
- `GET /api/assistant/conversations/{id}/messages/` — full message history for a thread
- `POST /api/assistant/conversations/{id}/admin-reply/` — send an admin message into a thread
- `PATCH /api/assistant/conversations/{id}/` — update thread status (`active`/`resolved`/`archived`) or assignment

**Polling:**
- Thread list refreshes every **10 seconds**
- Open thread messages refresh every **5 seconds**

**Filter tabs:** All / Needs Human / Resolved — mapped to `?needs_human` and `?status` query params.

**Message roles displayed:** `user` (customer), `assistant` (AI), `admin` (human staff reply), `tool` (internal agent step — shown collapsed).

```typescript
// Marking a thread resolved
await patchConversation(convId, { status: 'resolved' });
setConversations(prev => prev.map(c =>
  c.conversation_id === convId ? { ...c, status: 'resolved' } : c
));
```

### 8. Dashboard Caching

Dashboard stats are cached server-side for ~60 seconds (Redis `ngu:dashboard:*` key) to
avoid expensive aggregations on every page load.

---

## Page Responsibilities

| Page | Manages |
|------|---------|
| Dashboard | Stats overview, recent orders |
| Products | Product CRUD + gallery images |
| Combos | Combo CRUD + product items |
| Categories | Category CRUD |
| Sections | Homepage section product ordering |
| Orders | Order list, status updates |
| Coupons | Discount code CRUD |
| Conversations | All customer chat threads (AI + human); admin reply, status management |
| Contact | Contact form submissions |
| Shipping Policy | Editable policy content |
| Return Policy | Editable policy content |
| Admin Info | Admin account settings |

---

## Form Patterns

### FormData for File Uploads

```typescript
const buildFormData = () => {
  const form = new FormData();
  form.append('name', formData.name);
  form.append('price', String(formData.price));
  if (imageFile) form.append('image', imageFile);
  return form;
};
```

### Combo Items as JSON

Combo items are serialized as JSON within FormData:
```typescript
form.append('items', JSON.stringify(
  comboItems.map(item => ({
    product: item.productId,
    quantity: item.quantity,
  }))
));
```

---

## Error Handling

### Toast Notifications
```typescript
try {
  await saveProduct(data);
  toast({ title: 'Success', description: 'Product saved' });
} catch {
  toast({ title: 'Error', variant: 'destructive' });
}
```

### Form Validation
Client-side validation runs before submit:
```typescript
if (!formData.name.trim()) {
  toast({ title: 'Error', description: 'Name is required' });
  return;
}
```

---

## Extending the Admin Panel

### Adding a New Resource Page

1. Create API functions in `src/api/resource.ts`
2. Create page component `src/pages/Resources.tsx`
3. Add route in `App.tsx`
4. Add sidebar link if needed

### Adding a New Field to an Existing Resource

1. Add to the TypeScript interface
2. Add to form state
3. Add form input in dialog
4. Add to `buildFormData()` if applicable
5. Add column to the table (optional)
