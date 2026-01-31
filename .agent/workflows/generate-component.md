# Generate React Component

Buat React component sesuai design system MokaPOS:

1. Baca `Docs/04-SHARED-COMPONENTS.md` dan `Docs/06-UI-UX-DESIGN.md` untuk referensi
2. Buat folder component:
   ```
   src/shared/components/{ComponentName}/
   ├── {ComponentName}.tsx        # Main component
   ├── {ComponentName}.styles.ts  # Styled components / CSS
   ├── {ComponentName}.types.ts   # TypeScript interfaces
   ├── {ComponentName}.test.tsx   # Unit tests
   └── index.ts                   # Export
   ```
3. Component conventions:
   - Functional component dengan React.FC
   - Props interface di file terpisah (.types.ts)
   - Semua props harus typed, TIDAK ADA `any`
   - Icon menggunakan Lucide Icons
   - Touch target minimum 44x44px untuk elemen interaktif
   - Support dark mode via CSS variables / data-theme
4. Design tokens (dari Docs/06-UI-UX-DESIGN.md):
   - Primary: `#2563EB`
   - Success: `#10B981`
   - Warning: `#F59E0B`
   - Danger: `#EF4444`
   - Font: Inter (sans-serif)
   - Border radius: 4px (sm), 8px (md), 12px (lg)
5. Buat unit test di file .test.tsx
