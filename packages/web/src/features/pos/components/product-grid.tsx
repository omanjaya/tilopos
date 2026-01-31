import { useState, useMemo } from 'react';
import { Search, Grid3X3, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTouchDevice } from '@/hooks/use-touch-device';
import type { POSProduct, POSCategory } from '@/types/pos.types';

interface ProductGridProps {
    products: POSProduct[];
    categories: POSCategory[];
    isLoading?: boolean;
    onProductClick: (product: POSProduct) => void;
    searchInputRef?: React.Ref<HTMLInputElement>;
    /** Externally controlled view mode. Falls back to internal state when omitted. */
    viewMode?: 'grid' | 'list';
    /** Called when the user toggles view mode via the UI buttons. */
    onViewModeChange?: (mode: 'grid' | 'list') => void;
}

export function ProductGrid({
    products,
    categories,
    isLoading = false,
    onProductClick,
    searchInputRef,
    viewMode: controlledViewMode,
    onViewModeChange,
}: ProductGridProps) {
    const [search, setSearch] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [internalViewMode, setInternalViewMode] = useState<'grid' | 'list'>('grid');
    const { isTouchDevice, isTablet } = useTouchDevice();

    const viewMode = controlledViewMode ?? internalViewMode;
    const setViewMode = (mode: 'grid' | 'list') => {
        setInternalViewMode(mode);
        onViewModeChange?.(mode);
    };

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesSearch =
                search === '' ||
                product.name.toLowerCase().includes(search.toLowerCase()) ||
                product.sku.toLowerCase().includes(search.toLowerCase());

            const matchesCategory =
                selectedCategoryId === null || product.categoryId === selectedCategoryId;

            return matchesSearch && matchesCategory;
        });
    }, [products, search, selectedCategoryId]);

    if (isLoading) {
        return (
            <div className="flex h-full flex-col">
                {/* Search skeleton */}
                <div className="p-4 border-b">
                    <Skeleton className="h-10 w-full" />
                </div>
                {/* Categories skeleton */}
                <div className="flex gap-2 p-4 border-b overflow-x-auto">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-24 shrink-0" />
                    ))}
                </div>
                {/* Products skeleton */}
                <div className="flex-1 overflow-auto p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <Skeleton key={i} className="h-40 rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-background">
            {/* Search Bar */}
            <div className="p-4 border-b bg-card">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder="Cari produk atau scan barcode..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 min-h-[44px]"
                        />
                    </div>
                    <div className="flex border rounded-lg">
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setViewMode('grid')}
                        >
                            <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Category Tabs - swipeable on touch devices */}
            <div
                className={cn(
                    'flex gap-2 p-3 border-b bg-muted/30 overflow-x-auto scrollbar-hide',
                    isTouchDevice && 'pos-category-tabs touch-none-highlight',
                )}
            >
                <Button
                    variant={selectedCategoryId === null ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                        'shrink-0',
                        isTouchDevice && 'min-h-[44px]',
                        isTablet && 'text-[0.9375rem] px-4',
                    )}
                    onClick={() => setSelectedCategoryId(null)}
                >
                    Semua
                    <Badge variant="secondary" className="ml-2">
                        {products.length}
                    </Badge>
                </Button>
                {categories.map((category) => (
                    <Button
                        key={category.id}
                        variant={selectedCategoryId === category.id ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                            'shrink-0',
                            isTouchDevice && 'min-h-[44px]',
                            isTablet && 'text-[0.9375rem] px-4',
                        )}
                        onClick={() => setSelectedCategoryId(category.id)}
                    >
                        {category.name}
                        <Badge variant="secondary" className="ml-2">
                            {category.productCount}
                        </Badge>
                    </Button>
                ))}
            </div>

            {/* Products */}
            <div className="flex-1 overflow-auto p-4">
                {filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Search className="h-12 w-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">Produk tidak ditemukan</p>
                        <p className="text-sm">Coba kata kunci lain atau ubah kategori</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div
                        className={cn(
                            'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3',
                            isTablet && 'pos-product-grid-tablet',
                        )}
                    >
                        {filteredProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onClick={() => onProductClick(product)}
                                isTablet={isTablet}
                                isTouchDevice={isTouchDevice}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredProducts.map((product) => (
                            <ProductListItem
                                key={product.id}
                                product={product}
                                onClick={() => onProductClick(product)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

interface ProductCardProps {
    product: POSProduct;
    onClick: () => void;
    isTablet?: boolean;
    isTouchDevice?: boolean;
}

function ProductCard({ product, onClick, isTablet = false, isTouchDevice = false }: ProductCardProps) {
    const hasVariants = product.variants.length > 0;
    const price = hasVariants
        ? Math.min(product.basePrice, ...product.variants.map((v) => v.price))
        : product.basePrice;
    const isOutOfStock = product.trackStock && product.stockLevel === 0;

    return (
        <button
            onClick={onClick}
            disabled={isOutOfStock}
            className={cn(
                'group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200',
                'hover:shadow-lg hover:border-primary/50 hover:-translate-y-0.5',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                'active:scale-[0.97]',
                isOutOfStock && 'opacity-50 cursor-not-allowed',
                isTouchDevice && 'touch-none-highlight',
                isTablet && 'pos-product-card-tablet min-h-[200px]',
            )}
        >
            {/* Image */}
            <div className="relative aspect-square bg-muted/50 overflow-hidden">
                {product.imageUrl ? (
                    <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <span className={cn(
                            'text-3xl font-bold text-primary/30',
                            isTablet && 'text-4xl',
                        )}>
                            {product.name.charAt(0)}
                        </span>
                    </div>
                )}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <Badge variant="destructive">Habis</Badge>
                    </div>
                )}
                {hasVariants && !isOutOfStock && (
                    <Badge className="absolute top-2 right-2 bg-primary/90">
                        {product.variants.length} varian
                    </Badge>
                )}
            </div>

            {/* Info */}
            <div className={cn(
                'flex flex-col flex-1 p-3 product-card-info',
                isTablet && 'p-4',
            )}>
                <h3 className={cn(
                    'font-medium text-sm line-clamp-2 text-left leading-tight product-card-name',
                    isTablet && 'text-[0.9375rem]',
                )}>
                    {product.name}
                </h3>
                <div className="mt-auto pt-2">
                    <p className={cn(
                        'font-bold text-primary product-card-price',
                        isTablet && 'text-base',
                    )}>
                        {hasVariants && 'Mulai '}
                        Rp {price.toLocaleString('id-ID')}
                    </p>
                </div>
            </div>
        </button>
    );
}

function ProductListItem({ product, onClick }: ProductCardProps) {
    const hasVariants = product.variants.length > 0;
    const price = hasVariants
        ? Math.min(product.basePrice, ...product.variants.map((v) => v.price))
        : product.basePrice;
    const isOutOfStock = product.trackStock && product.stockLevel === 0;

    return (
        <button
            onClick={onClick}
            disabled={isOutOfStock}
            className={cn(
                'w-full flex items-center gap-4 p-3 rounded-lg border bg-card transition-all',
                'hover:shadow-md hover:border-primary/50',
                isOutOfStock && 'opacity-50 cursor-not-allowed',
            )}
        >
            {/* Thumbnail */}
            <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-muted/50">
                {product.imageUrl ? (
                    <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <span className="text-xl font-bold text-primary/30">
                            {product.name.charAt(0)}
                        </span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 text-left">
                <h3 className="font-medium text-sm">{product.name}</h3>
                <p className="text-xs text-muted-foreground">{product.sku}</p>
            </div>

            {/* Price & Stock */}
            <div className="text-right">
                <p className="font-bold text-primary">
                    {hasVariants && 'Mulai '}Rp {price.toLocaleString('id-ID')}
                </p>
                {isOutOfStock && (
                    <Badge variant="destructive" className="mt-1">
                        Habis
                    </Badge>
                )}
                {hasVariants && !isOutOfStock && (
                    <span className="text-xs text-muted-foreground">
                        {product.variants.length} varian
                    </span>
                )}
            </div>
        </button>
    );
}
