# Inventory Management System / System Zarządzania Inwentarzem

[English](#english) | [Polski](#polski)

---

## English

A web application for inventory management and tracking. PWA with offline support.

### 🚀 Features

- **Inventory Management** — Add, edit, delete items
- **Categories** — TVs, Fridge, Coffee Machines, Chairs, NM, LADY
- **Change History** — Log of all user actions
- **Search & Filter** — By name, description, status, dimensions
- **Authentication** — JWT tokens, roles (spectator/moder/admin)
- **ID Generator** — Automatic free SKU assignment
- **Images** — Lazy loading, gallery with zoom
- **PWA** — Offline mode, installable

### 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS, DaisyUI |
| Backend | Neon (PostgreSQL), Netlify Functions |
| Auth | Auth0 (OAuth 2.0 / OIDC) |
| PWA | Service Worker, Web Manifest |

### 🏗 Project Structure

```
src/
├── components/       # React components (Card, HistoryCard)
├── services/       # API client (Neon DB queries)
├── utils/          # Utilities (device ID, image optimization)
├── types/          # TypeScript types
├── hooks/          # Custom hooks (future)
├── context/        # React Context (future)
└── styles/         # CSS files
```

### 📦 Installation & Dev

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Production build
npm run build

# Preview build
npm run serve
```

### 🔧 Environment Variables

Create `.env` file:

```env
VITE_SERVER_URL=http://localhost:8888/.netlify/functions/neon-proxy
```

### ☁️ Deploy

Configured for **Netlify**:

1. Connect repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add `VITE_SERVER_URL` env variable

Auto-deploy on push to main.

### 👥 User Roles

| Role | Permissions |
|------|-------------|
| `spectator` | View only |
| `moder` | View + history + settings |
| `admin` | Full access + CRUD |

### 🔐 Security

- JWT tokens in localStorage
- Token verification on every request
- SQL-injection protection via parameterized queries

---

## Polski

Aplikacja webowa do zarządzania i śledzenia inwentaryzacji magazynowej. PWA z możliwością pracy offline.

### 🚀 Funkcjonalność

- **Zarządzanie inwentarzem** — dodawanie, edycja, usuwanie produktów
- **Kategorie** — Telewizory, Lodówki, Ekspresy, Krzesła, NM, LADY
- **Historia zmian** — log wszystkich działań użytkowników
- **Wyszukiwanie i filtrowanie** — po nazwie, opisie, statusie, wymiarach
- **Autoryzacja** — tokeny JWT, role (spectator/moder/admin)
- **Generator ID** — automatyczne przypisywanie wolnych artykułów
- **Obrazy** — lazy loading, galeria ze zoomem
- **PWA** — tryb offline, instalacja na urządzeniu

### 🛠 Technologie

| Kategoria | Technologia |
|-----------|-------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS, DaisyUI |
| Backend | Neon (PostgreSQL), Netlify Functions |
| Auth | JWT |
| PWA | Service Worker, Web Manifest |

### 🏗 Struktura projektu

```
src/
├── components/       # Komponenty React (Card, HistoryCard)
├── services/       # Klient API (zapytania do Neon DB)
├── utils/          # Narzędzia (ID urządzenia, optymalizacja obrazów)
├── types/          # Typy TypeScript
├── hooks/          # Custom hooks (przyszłość)
├── context/        # React Context (przyszłość)
└── styles/        # Pliki CSS
```

### 📦 Instalacja i uruchomienie

```bash
# Instalacja zależności
npm install

# Uruchomienie serwera dev
npm run dev

# Build na produkcję
npm run build

# Podgląd builda
npm run serve
```

### 🔧 Zmienne środowiskowe

Utwórz plik `.env`:

```env
VITE_SERVER_URL=http://localhost:8888/.netlify/functions/neon-proxy
```

### ☁️ Deploy

Projekt skonfigurowany do deployu na **Netlify**:

1. Połącz repozytorium z Netlify
2. Ustaw build command: `npm run build`
3. Ustaw publish directory: `dist`
4. Dodaj zmienną `VITE_SERVER_URL`

Automatyczny deploy przy push do main.

### 👥 Role użytkowników

| Rola | Uprawnienia |
|------|-------------|
| `spectator` | Tylko podgląd |
| `moder` | Podgląd + historia + ustawienia |
| `admin` | Pełny dostęp + CRUD |

### 📝 API Endpoints

Wszystkie zapytania przechodzą przez `/.netlify/functions/neon-proxy`:

```typescript
// Auth
POST { action: 'login', username, password }
POST { action: 'register', username, password, role }
POST { action: 'verify', token }

// Items
GET  SELECT * FROM items WHERE category = $1
POST  INSERT INTO items ...
POST  UPDATE items SET ... WHERE name = $1
POST  DELETE FROM items WHERE name = $1
```

### 🔐 Bezpieczeństwo

- Tokeny JWT w localStorage
- Weryfikacja tokena przy każdym zapytaniu
- Ochrona przed SQL-injection przez sparametryzowane zapytania

---

## 📄 License / Licencja

MIT