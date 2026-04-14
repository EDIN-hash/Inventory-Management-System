# Inventory Management System / System Zarządzania Inwentarzem

[English](#english) | [Polski](#polski)

---

## English

A full-stack warehouse inventory management web application with PWA support. Tracks equipment, electronics, and furniture across multiple categories with complete audit history.

### 🚀 Key Features

| Feature | Description |
|---------|-------------|
| **CRUD Operations** | Add, edit, delete inventory items |
| **Categories** | TVs, Fridges, Coffee Machines, Chairs, NM, LADY |
| **Audit History** | Complete log of all changes (who, what, when) |
| **Search & Filter** | By name, description, status |
| **Auto ID Generator** | Automatically assigns next free ID per category |
| **Image Gallery** | Lazy loading, modal viewer, multi-photo support |
| **Device Tracking** | Tracks which device made each change |
| **Role Management** | Admin panel to manage user roles |
| **Auth0 Authentication** | Secure OAuth 2.0 / OIDC login |
| **PWA** | Offline support, installable |
| **Responsive** | Works on mobile and desktop |

### 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS, DaisyUI |
| Backend | Neon (PostgreSQL serverless) |
| Functions | Netlify Serverless Functions |
| Auth | Auth0 (OAuth 2.0 / OIDC) |
| PWA | Service Worker + Web Manifest |
| Images | Cloudinary, Google Drive API |

### 🏗 Project Structure

```
src/
├── components/          # React components
│   ├── Card.tsx          # Item card with gallery
│   ├── HistoryCard.tsx   # History entry card
│   └── RoleManager.tsx   # Admin role management
├── services/
│   └── api.ts           # API client (all DB queries)
├── utils/
│   └── device.ts       # Device ID, image optimization
├── types/
│   └── index.ts        # TypeScript interfaces
├── context/            # React Context (Auth, Items)
└── App.tsx             # Main application
```

### 👥 User Roles

| Role | Permissions |
|------|-------------|
| `spectator` | View items only |
| `moder` | View + History + Settings |
| `admin` | Full CRUD + Role Management |

### 📦 Installation

```bash
npm install
npm run dev      # Development server
npm run build    # Production build
```

### ☁️ Deployment

Configured for **Netlify**:
1. Connect repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Environment variables: `AUTH0_CLIENT_ID`, `AUTH0_DOMAIN`, `DATABASE_URL`

Auto-deploys on push to main.

### 🔐 Security Features

- Auth0 OAuth 2.0 / OIDC authentication
- JWT token verification
- Parameterized SQL queries (SQL-injection protection)
- Role-based access control
- Device fingerprinting for audit trail

---

## Polski

Pełnostackowa aplikacja webowa do zarządzania inwentarzem magazynowym z obsługą PWA. Śledzi wyposażenie, elektronikę i meble w wielu kategoriach z pełną historią zmian.

### 🚀 Główne Funkcjonalności

| Funkcja | Opis |
|--------|-----|
| **CRUD** | Dodawanie, edycja, usuwanie przedmiotów |
| **Kategorie** | Telewizory, Lodówki, Ekspresy, Krzesła, NM, LADY |
| **Historia zmian** | Pełny log (kto, co, kiedy) |
| **Wyszukiwanie i filtrowanie** | Po nazwie, opisie, statusie |
| **Auto generator ID** | Automatycznie przypisuje następne wolne ID |
| **Galeria obrazów** | Lazy loading, modal, wiele zdjęć |
| **Śledzenie urządzeń** | Które urządzenie wykonało zmianę |
| **Zarządzanie rolami** | Panel admina do zarządzania rolami |
| **Autentykacja Auth0** | Bezpieczne logowanie OAuth 2.0 / OIDC |
| **PWA** | Obsługa offline, instalowalna |
| **Responsywność** | Działa na mobilnych i desktopach |

### 🛠 Technologie

| Warstwa | Technologia |
|--------|--------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS, DaisyUI |
| Backend | Neon (PostgreSQL serverless) |
| Functions | Netlify Functions |
| Auth | Auth0 (OAuth 2.0 / OIDC) |
| PWA | Service Worker + Web Manifest |
| Obrazy | Cloudinary, Google Drive API |

### 🏗 Struktura Projektu

```
src/
├── components/          # Komponenty React
│   ├── Card.tsx          # Karta przedmiotu z galerią
│   ├── HistoryCard.tsx  # Karta historii
│   └── RoleManager.tsx  # Zarządzanie rolami
├── services/
│   └── api.ts           # Klient API (zapytania DB)
├── utils/
│   └── device.ts        # ID urządzenia, optymalizacja obrazów
├── types/
│   └── index.ts       # Interfejsy TypeScript
├── context/           # React Context (Auth, Items)
└── App.tsx            # Główna aplikacja
```

### 👥 Role Użytkowników

| Rola | Uprawnienia |
|------|-------------|
| `spectator` | Tylko podgląd |
| `moder` | Podgląd + Historia + Ustawienia |
| `admin` | Pełny CRUD + Zarządzanie rolami |

### 📦 Instalacja

```bash
npm install
npm run dev      # Serwer deweloperski
npm run build   # Build produkcyjny
```

### ☁️ Deployment

Skonfigurowany do **Netlify**:
1. Połącz repozytorium
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Zmienne środowiskowe: `AUTH0_CLIENT_ID`, `AUTH0_DOMAIN`, `DATABASE_URL`

Auto-deploy przy push do main.

### 🔐 Funkcje Bezpieczeństwa

- Auth0 OAuth 2.0 / OIDC autentykacja
- Weryfikacja tokenów JWT
- Sparametryzowane zapytania SQL (ochrona przed SQL injection)
- Role-based access control
- Device fingerprinting dla śladu audytowego

---

## 💼 Project Summary for Resume

### What I Built
Full-stack warehouse inventory management system with:
- React 18 + TypeScript frontend with Vite
- Neon PostgreSQL serverless database
- Netlify serverless functions backend
- Auth0 OAuth 2.0 authentication
- PWA with offline support
- TailwindCSS + DaisyUI styling

### Key Technical Achievements
- Implemented complete CRUD with audit history
- Built custom ID generator algorithm per category
- Integrated Auth0 with role-based access control stored in PostgreSQL
- Created image gallery with lazy loading and modal viewer
- Device fingerprinting for change tracking
- Responsive design for mobile and desktop

### Technologies Used
- React 18, TypeScript, Vite
- TailwindCSS, DaisyUI
- Neon (PostgreSQL serverless)
- Netlify Functions
- Auth0
- Service Worker / Web Manifest
- Cloudinary, Google Drive API

### Business Value
- Replaced manual Excel/spreadsheet tracking
- Real-time inventory visibility
- Audit trail for compliance
- Multi-category organization
- Role-based access for different user types

---

## 📄 License / Licencja

MIT