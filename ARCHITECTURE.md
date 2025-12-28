# Admin Panel Architecture

This document explains the design principles and patterns specific to the admin panel.

---

## Design Principles

### 1. **CRUD-Centric Pages**
Each page manages one resource type with consistent patterns:
- **List view** (table with actions)
- **Create dialog** (form modal)
- **Edit dialog** (form modal with pre-filled data)
- **Delete/Toggle** (inline actions)

### 2. **Optimistic Updates**
Status toggles update UI immediately:
```typescript
// Update UI first
setProducts(prev => prev.map(p => 
  p.id === id ? { ...p, is_active: !p.is_active } : p
));

// Then sync to backend
await updateProduct(id, { is_active: !isActive });
```

### 3. **Admin-Only Access**
All routes require `is_staff=True`. Auth check happens at:
- **Frontend**: Route guard redirects to login
- **Backend**: `IsAdminUser` permission class

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

Same pattern as customer frontend but with admin-specific checks:
```typescript
// Login validates is_staff on backend
// Token stored in localStorage
// All API calls include Authorization header
```

### 2. Products: Gallery Image Upload

Products support multiple gallery images:
```typescript
// State
const [galleryImages, setGalleryImages] = useState<ProductImage[]>([]);
const [newGalleryImages, setNewGalleryImages] = useState<File[]>([]);

// On submit, upload new images after product save
await createProductImage(productId, file, altText);
```

**Upload Flow**:
1. User selects multiple images
2. Images stored locally with preview
3. On form submit, product saved first
4. Then gallery images uploaded individually
5. Delete existing images via API

### 3. Order Status Management

Orders have a status workflow:
```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → CANCELLED
```

Admin can update status via dropdown in order detail.

### 4. Policy Pages (Shipping/Return)

Policies may not exist initially. The page handles this:
```typescript
const fetchPolicy = async () => {
  try {
    const response = await getPolicy('shipping');
    setContent(response.data.content);
  } catch (error) {
    if (error?.response?.status === 404) {
      // Policy not configured yet
      setNotConfigured(true);
      setContent('');  // Empty editor for creation
    }
  }
};
```

Save/PATCH to non-existent policy auto-creates it.

### 5. Dashboard Caching

Dashboard stats are cached server-side (2 minutes):
```typescript
// Backend caches expensive aggregations
// Frontend shows cached data with quick load
```

---

## Page Responsibilities

| Page | Manages |
|------|---------|
| Dashboard | Stats overview, recent orders |
| Products | Product CRUD + gallery images |
| Combos | Combo CRUD + product items |
| Orders | Order list, status updates |
| Coupons | Discount code CRUD |
| Chat Support | Customer chat messages |
| Contact | Contact form submissions |
| Shipping Policy | Editable policy content |
| Return Policy | Editable policy content |
| Admin Info | Admin account settings |

---

## Form Patterns

### FormData for File Uploads

When forms include files, use FormData:
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
    quantity: item.quantity
  }))
));
```

---

## Error Handling

### Toast Notifications
All operations show feedback:
```typescript
try {
  await saveProduct(data);
  toast({ title: 'Success', description: 'Product saved' });
} catch {
  toast({ title: 'Error', variant: 'destructive' });
}
```

### Form Validation
Client-side validation before submit:
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
4. Add sidebar link (if needed)

### Adding a New Field to Existing Resource

1. Add to TypeScript interface
2. Add to form state
3. Add form input in dialog
4. Add to buildFormData() if applicable
5. Add column to table (optional)
