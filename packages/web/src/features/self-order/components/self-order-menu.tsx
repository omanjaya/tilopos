/**
 * Self-Order Menu Component
 * Customer-facing QR ordering interface
 */

'use client';

import { useState } from 'react';

interface MenuItem {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    price: number;
    variants?: { id: string; name: string; price: number }[];
}

interface Category {
    id: string;
    name: string;
    products: MenuItem[];
}

interface CartItem {
    productId: string;
    variantId?: string;
    name: string;
    quantity: number;
    price: number;
}

interface Props {
    outletName: string;
    tableName?: string;
    categories: Category[];
    onSubmitOrder: (items: CartItem[]) => void;
}

export function SelfOrderMenu({ outletName, tableName, categories, onSubmitOrder }: Props) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id);
    const [showCart, setShowCart] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const addToCart = (item: MenuItem, variantId?: string) => {
        const variant = variantId ? item.variants?.find(v => v.id === variantId) : null;
        const price = variant?.price || item.price;
        const name = variant ? `${item.name} - ${variant.name}` : item.name;

        setCart(prev => {
            const existing = prev.find(c => c.productId === item.id && c.variantId === variantId);
            if (existing) {
                return prev.map(c => c === existing ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { productId: item.id, variantId, name, quantity: 1, price }];
        });
        setSelectedItem(null);
    };

    const updateQuantity = (index: number, delta: number) => {
        setCart(prev => {
            const updated = [...prev];
            const item = updated[index];
            if (item) {
                item.quantity += delta;
            }
            return updated.filter(i => i.quantity > 0);
        });
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', padding: '24px 20px', paddingTop: 48 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>{outletName}</h1>
                {tableName && <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>📍 {tableName}</p>}
            </div>

            {/* Categories */}
            <div style={{ background: 'white', padding: '12px 16px', overflowX: 'auto', display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0' }}>
                {categories.map(cat => (
                    <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{ padding: '8px 16px', border: 'none', borderRadius: 20, background: selectedCategory === cat.id ? '#6366f1' : '#f1f5f9', color: selectedCategory === cat.id ? 'white' : '#64748b', fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Menu Items */}
            <div style={{ padding: 16 }}>
                {categories.filter(c => c.id === selectedCategory).map(cat => (
                    <div key={cat.id}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 16 }}>{cat.name}</h2>
                        <div style={{ display: 'grid', gap: 12 }}>
                            {cat.products.map(item => (
                                <div key={item.id} onClick={() => item.variants?.length ? setSelectedItem(item) : addToCart(item)} style={{ background: 'white', borderRadius: 16, padding: 16, display: 'flex', gap: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer' }}>
                                    {item.imageUrl && <img src={item.imageUrl} alt={item.name} loading="lazy" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover' }} />}
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>{item.name}</h3>
                                        {item.description && <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8 }}>{item.description}</p>}
                                        <div style={{ fontWeight: 700, color: '#6366f1' }}>Rp {item.price.toLocaleString()}</div>
                                    </div>
                                    <button style={{ width: 36, height: 36, borderRadius: '50%', background: '#6366f1', color: 'white', border: 'none', fontSize: '1.25rem', cursor: 'pointer', alignSelf: 'center' }}>+</button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Variant Modal */}
            {selectedItem && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }} onClick={() => setSelectedItem(null)}>
                    <div style={{ background: 'white', borderRadius: '24px 24px 0 0', padding: 24, width: '100%' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>{selectedItem.name}</h3>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 20 }}>Select variant</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {selectedItem.variants?.map(v => (
                                <button key={v.id} onClick={() => addToCart(selectedItem, v.id)} style={{ display: 'flex', justifyContent: 'space-between', padding: 16, border: '1px solid #e2e8f0', borderRadius: 12, background: 'white', cursor: 'pointer' }}>
                                    <span style={{ fontWeight: 500 }}>{v.name}</span>
                                    <span style={{ color: '#6366f1', fontWeight: 600 }}>Rp {v.price.toLocaleString()}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Button */}
            {cartCount > 0 && !showCart && (
                <div style={{ position: 'fixed', bottom: 20, left: 20, right: 20, zIndex: 50 }}>
                    <button onClick={() => setShowCart(true)} style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 10px 40px rgba(99,102,241,0.4)' }}>
                        <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>{cartCount} items</span>
                        <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>Rp {cartTotal.toLocaleString()}</span>
                    </button>
                </div>
            )}

            {/* Cart Modal */}
            {showCart && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}>
                    <div style={{ background: 'white', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxHeight: '80vh', overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Your Order</h3>
                            <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                        </div>
                        {cart.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                                <div>
                                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                                    <div style={{ fontSize: '0.875rem', color: '#6366f1', fontWeight: 600 }}>Rp {item.price.toLocaleString()}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <button onClick={() => updateQuantity(i, -1)} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>−</button>
                                    <span style={{ fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(i, 1)} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#6366f1', color: 'white', cursor: 'pointer' }}>+</button>
                                </div>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, marginBottom: 20, fontSize: '1.25rem', fontWeight: 700 }}>
                            <span>Total</span>
                            <span style={{ color: '#6366f1' }}>Rp {cartTotal.toLocaleString()}</span>
                        </div>
                        <button onClick={() => onSubmitOrder(cart)} style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                            Place Order
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SelfOrderMenu;
