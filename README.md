# 🎛️ NGU Spices - Admin Panel

A React + TypeScript dashboard for managing the NGU Spices e-commerce platform.

## ✨ Features

- **Dashboard** - Sales overview, recent orders, stats
- **Products** - CRUD operations, gallery images, stock
- **Combos** - Create/manage product combos
- **Categories** - Organize products
- **Orders** - View, update status, manage deliveries
- **Coupons** - Create discount codes
- **Policies** - Edit shipping/return policies
- **Chat Support** - Respond to customer inquiries
- **Contact Submissions** - View contact form entries

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| TailwindCSS | Styling |
| Shadcn/UI | Component library |
| React Router | Navigation |
| Axios | API calls |

## 📦 Project Structure

```
src/
├── components/     # UI components
├── pages/          # Admin pages
├── api/            # API client functions
├── contexts/       # Auth context
└── hooks/          # Custom hooks
```

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build for Production

```bash
npm run build
```

### Docker

```bash
docker build -t ngu-admin .
docker run -p 3001:80 ngu-admin
```

## 🔧 Environment Variables

Create `.env.local`:

```env
VITE_API_URL=http://localhost:8000/api
```

## 📱 Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Stats overview |
| `/products` | Products | Manage products + gallery |
| `/combos` | Combos | Manage combos |
| `/orders` | Orders | Order management |
| `/coupons` | Coupons | Discount codes |
| `/chat` | Chat Support | Customer messages |
| `/contact` | Contact | Form submissions |
| `/shipping-policy` | Shipping | Edit shipping policy |
| `/return-policy` | Returns | Edit return policy |
| `/admin-info` | Admin Info | Account settings |
| `/login` | Login | Admin authentication |

## 🔐 Access Control

All pages require admin authentication (`is_staff=True`).

## 🎨 UI Features

- **Dark Mode** - Easy on the eyes
- **Responsive** - Works on tablets
- **Tables** - Sortable, searchable
- **Forms** - Validation, file uploads
- **Toasts** - Success/error feedback
- **Modals** - Edit dialogs

## 🚢 Deployment

See [DEPLOYMENT.md](../../DEPLOYMENT.md) for EC2 deployment instructions.

---

Made with ❤️ for NGU Spices
