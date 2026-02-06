import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { selfOrderApi } from '@/api/endpoints/self-order.api';

/**
 * Hook to fetch and filter menu items
 * @param outletId - The outlet ID from session
 * @returns Menu data with filtering capabilities
 */
export function useMenu(outletId: string | undefined) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch menu items
  const { data: menuItems, isLoading } = useQuery({
    queryKey: ['self-order-menu', outletId],
    queryFn: () => selfOrderApi.getMenu(outletId || ''),
    enabled: !!outletId,
  });

  // Extract unique categories
  const categories = useMemo(() => {
    if (!menuItems) return ['all'];
    return ['all', ...Array.from(new Set(menuItems.map((item) => item.categoryName)))];
  }, [menuItems]);

  // Filter menu items based on category, search, and availability
  const filteredItems = useMemo(() => {
    if (!menuItems) return [];

    return menuItems.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.categoryName === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isAvailable = item.isAvailable;
      return matchesCategory && matchesSearch && isAvailable;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  return {
    menuItems: menuItems || [],
    filteredItems,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    isLoading,
  };
}
