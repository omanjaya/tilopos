import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Menu,
    FileText,
    Users,
    Settings,
    LogOut,
    PlusCircle,
    MinusCircle,
    RefreshCw,
    Tag,
    LayoutGrid,
    User,
    Keyboard,
    ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth.store';
import { OrderTypeButtons } from './order-type-selector';

interface PosHeaderProps {
    customerId?: string;
    customerName?: string;
    tableId?: string;
    tableName?: string;
    discountTotal: number;
    heldBillsCount: number;
    cartItemsCount: number;
    onCustomerClick: () => void;
    onTableClick: () => void;
    onDiscountClick: () => void;
    onHeldBillsClick: () => void;
    onShortcutHelpClick: () => void;
    onCartClick: () => void;
    onRefreshProducts: () => void;
}

export function PosHeader({
    customerId,
    customerName,
    tableId,
    tableName,
    discountTotal,
    heldBillsCount,
    cartItemsCount,
    onCustomerClick,
    onTableClick,
    onDiscountClick,
    onHeldBillsClick,
    onShortcutHelpClick,
    onCartClick,
    onRefreshProducts,
}: PosHeaderProps) {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);

    return (
        <header className="h-14 md:h-16 bg-card border-b flex items-center justify-between px-3 md:px-4 shrink-0">
            <div className="flex items-center gap-2 md:gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/app')}
                    className="min-h-[44px] min-w-[44px]"
                    aria-label="Kembali ke dashboard"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="font-semibold text-base md:text-lg">POS Terminal</h1>
                    <p className="text-xs text-muted-foreground">
                        {user?.name} {user?.outletName ? `• ${user.outletName}` : ''}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
                {/* Order Type - hidden on small screens, in dropdown */}
                <div className="hidden md:block">
                    <OrderTypeButtons />
                </div>

                {/* Customer Button */}
                <Button
                    variant={customerId ? 'default' : 'outline'}
                    size="sm"
                    className="gap-2 min-h-[44px]"
                    onClick={onCustomerClick}
                >
                    <User className="h-4 w-4" />
                    <span className="hidden lg:inline">{customerName || 'Pelanggan'}</span>
                </Button>

                {/* Table Button (only for dine-in) */}
                <Button
                    variant={tableId ? 'default' : 'outline'}
                    size="sm"
                    className="gap-2 min-h-[44px]"
                    onClick={onTableClick}
                >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden lg:inline">{tableName || 'Meja'}</span>
                </Button>

                {/* Discount Button */}
                <Button
                    variant={discountTotal > 0 ? 'default' : 'outline'}
                    size="sm"
                    className="gap-2 min-h-[44px] hidden sm:inline-flex"
                    onClick={onDiscountClick}
                >
                    <Tag className="h-4 w-4" />
                    <span className="hidden lg:inline">Diskon</span>
                    {discountTotal > 0 && (
                        <Badge variant="secondary" className="ml-1 bg-green-500/20 text-green-400">
                            -{discountTotal.toLocaleString('id-ID')}
                        </Badge>
                    )}
                </Button>

                {/* Held Bills Button */}
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 min-h-[44px] hidden sm:inline-flex"
                    onClick={onHeldBillsClick}
                >
                    <FileText className="h-4 w-4" />
                    <span className="hidden lg:inline">Ditahan</span>
                    {heldBillsCount > 0 && (
                        <Badge variant="destructive" className="ml-1">
                            {heldBillsCount}
                        </Badge>
                    )}
                </Button>

                {/* Keyboard Shortcut Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-[44px] min-w-[44px] hidden sm:inline-flex"
                    onClick={onShortcutHelpClick}
                    title="Pintasan Keyboard (F10)"
                >
                    <Keyboard className="h-4 w-4" />
                </Button>

                {/* Cart button for mobile/tablet */}
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 min-h-[44px] lg:hidden relative"
                    onClick={onCartClick}
                >
                    <ShoppingCart className="h-4 w-4" />
                    {cartItemsCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                        >
                            {cartItemsCount}
                        </Badge>
                    )}
                </Button>

                {/* Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="min-h-[44px] min-w-[44px]"
                            aria-label="Menu"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        {/* Order type toggle for mobile */}
                        <div className="md:hidden px-2 py-2">
                            <OrderTypeButtons className="w-full" />
                        </div>
                        <div className="md:hidden">
                            <DropdownMenuSeparator />
                        </div>
                        <DropdownMenuItem onClick={onRefreshProducts}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Produk
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Cash In
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <MinusCircle className="h-4 w-4 mr-2" />
                            Cash Out
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="sm:hidden" onClick={onDiscountClick}>
                            <Tag className="h-4 w-4 mr-2" />
                            Diskon
                        </DropdownMenuItem>
                        <DropdownMenuItem className="sm:hidden" onClick={onHeldBillsClick}>
                            <FileText className="h-4 w-4 mr-2" />
                            Pesanan Ditahan
                            {heldBillsCount > 0 && (
                                <Badge variant="destructive" className="ml-auto">
                                    {heldBillsCount}
                                </Badge>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onCustomerClick}>
                            <Users className="h-4 w-4 mr-2" />
                            Pilih Pelanggan
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onTableClick}>
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            Pilih Meja
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onShortcutHelpClick}>
                            <Keyboard className="h-4 w-4 mr-2" />
                            Pintasan Keyboard
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/app/settings')}>
                            <Settings className="h-4 w-4 mr-2" />
                            Pengaturan
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={logout} className="text-destructive">
                            <LogOut className="h-4 w-4 mr-2" />
                            Keluar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
