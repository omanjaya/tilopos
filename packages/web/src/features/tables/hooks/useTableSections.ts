import { useState, useMemo, useEffect } from 'react';
import type { LayoutTable } from '../types/layout.types';

interface UseTableSectionsProps {
  tables: LayoutTable[];
}

export function useTableSections({ tables }: UseTableSectionsProps) {
  const sections = useMemo(() => {
    const set = new Set<string>();
    for (const t of tables) {
      set.add(t.section || 'Lainnya');
    }
    return Array.from(set);
  }, [tables]);

  const [activeSection, setActiveSection] = useState<string>(sections[0] || 'Semua');

  // Update active section when sections change
  useEffect(() => {
    if (sections.length > 0 && !sections.includes(activeSection) && activeSection !== 'Semua') {
      setActiveSection(sections[0] ?? 'Semua');
    }
  }, [sections, activeSection]);

  const filteredTables = useMemo(() => {
    if (activeSection === 'Semua') return tables;
    return tables.filter((t) => (t.section || 'Lainnya') === activeSection);
  }, [tables, activeSection]);

  return {
    sections,
    activeSection,
    setActiveSection,
    filteredTables,
  };
}
