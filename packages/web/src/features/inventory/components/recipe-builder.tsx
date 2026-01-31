/**
 * Recipe Builder Component
 * Interactive UI for creating and editing product recipes
 */

'use client';

import { useState, useCallback } from 'react';

interface Ingredient {
    id: string;
    name: string;
    unit: string;
    costPerUnit: number;
    stockLevel?: number;
}

interface RecipeItem {
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    cost: number;
}

interface RecipeBuilderProps {
    productId: string;
    productName: string;
    variantId?: string;
    variantName?: string;
    existingRecipe?: {
        id: string;
        items: RecipeItem[];
        notes?: string;
    };
    ingredients: Ingredient[];
    onSave: (recipe: { items: RecipeItem[]; notes?: string }) => void;
    onCancel: () => void;
}

export function RecipeBuilder({
    productId: _productId,
    productName,
    variantId: _variantId,
    variantName,
    existingRecipe,
    ingredients,
    onSave,
    onCancel,
}: RecipeBuilderProps) {
    const [recipeItems, setRecipeItems] = useState<RecipeItem[]>(existingRecipe?.items || []);
    const [notes, setNotes] = useState(existingRecipe?.notes || '');
    const [searchTerm, setSearchTerm] = useState('');
    const [showIngredientSearch, setShowIngredientSearch] = useState(false);

    const totalCost = recipeItems.reduce((sum, item) => sum + item.cost, 0);

    const filteredIngredients = ingredients.filter(
        ing =>
            ing.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !recipeItems.some(item => item.ingredientId === ing.id)
    );

    const addIngredient = useCallback((ingredient: Ingredient) => {
        setRecipeItems(prev => [
            ...prev,
            {
                ingredientId: ingredient.id,
                ingredientName: ingredient.name,
                quantity: 1,
                unit: ingredient.unit,
                cost: ingredient.costPerUnit,
            },
        ]);
        setSearchTerm('');
        setShowIngredientSearch(false);
    }, []);

    const updateQuantity = useCallback((index: number, quantity: number) => {
        setRecipeItems(prev => {
            const updated = [...prev];
            const currentItem = updated[index];
            if (!currentItem) return updated;
            const ingredient = ingredients.find(ing => ing.id === currentItem.ingredientId);
            updated[index] = {
                ingredientId: currentItem.ingredientId,
                ingredientName: currentItem.ingredientName,
                unit: currentItem.unit,
                quantity,
                cost: quantity * (ingredient?.costPerUnit || 0),
            };
            return updated;
        });
    }, [ingredients]);

    const removeIngredient = useCallback((index: number) => {
        setRecipeItems(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleSave = () => {
        onSave({ items: recipeItems, notes: notes || undefined });
    };

    return (
        <div className="recipe-builder">
            <style>{`
                .recipe-builder {
                    background: var(--surface-primary, #ffffff);
                    border-radius: 16px;
                    padding: 24px;
                    max-width: 800px;
                    margin: auto;
                }

                .header {
                    margin-bottom: 24px;
                }

                .title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary, #1a1a2e);
                    margin: 0 0 8px;
                }

                .subtitle {
                    color: var(--text-secondary, #64748b);
                    font-size: 0.875rem;
                }

                .section {
                    margin-bottom: 24px;
                }

                .section-title {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-secondary, #64748b);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 12px;
                }

                .ingredient-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .ingredient-row {
                    display: grid;
                    grid-template-columns: 1fr 120px 80px 100px 40px;
                    gap: 12px;
                    align-items: center;
                    padding: 12px 16px;
                    background: var(--surface-secondary, #f8fafc);
                    border-radius: 8px;
                    transition: all 0.2s ease;
                }

                .ingredient-row:hover {
                    background: var(--surface-hover, #f1f5f9);
                }

                .ingredient-name {
                    font-weight: 500;
                    color: var(--text-primary, #1a1a2e);
                }

                .quantity-input {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .quantity-input input {
                    width: 60px;
                    padding: 6px 8px;
                    border: 1px solid var(--border-color, #e2e8f0);
                    border-radius: 6px;
                    text-align: center;
                    font-size: 0.875rem;
                }

                .quantity-input input:focus {
                    outline: none;
                    border-color: var(--primary-color, #6366f1);
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                }

                .unit {
                    color: var(--text-secondary, #64748b);
                    font-size: 0.875rem;
                }

                .cost {
                    font-weight: 600;
                    color: var(--primary-color, #6366f1);
                    text-align: right;
                }

                .remove-btn {
                    width: 32px;
                    height: 32px;
                    border: none;
                    background: transparent;
                    color: var(--error-color, #ef4444);
                    cursor: pointer;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .remove-btn:hover {
                    background: rgba(239, 68, 68, 0.1);
                }

                .add-ingredient {
                    position: relative;
                }

                .search-input {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px dashed var(--border-color, #e2e8f0);
                    border-radius: 8px;
                    background: transparent;
                    font-size: 0.875rem;
                    transition: all 0.2s ease;
                }

                .search-input:focus {
                    outline: none;
                    border-color: var(--primary-color, #6366f1);
                    border-style: solid;
                }

                .search-results {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: var(--surface-primary, #ffffff);
                    border: 1px solid var(--border-color, #e2e8f0);
                    border-radius: 8px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
                    max-height: 240px;
                    overflow-y: auto;
                    z-index: 10;
                    margin-top: 4px;
                }

                .search-item {
                    padding: 12px 16px;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: background 0.15s ease;
                }

                .search-item:hover {
                    background: var(--surface-secondary, #f8fafc);
                }

                .search-item-name {
                    font-weight: 500;
                }

                .search-item-details {
                    font-size: 0.75rem;
                    color: var(--text-secondary, #64748b);
                }

                .total-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    border-radius: 12px;
                    color: white;
                    margin-bottom: 24px;
                }

                .total-label {
                    font-size: 0.875rem;
                    opacity: 0.9;
                }

                .total-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                }

                .notes-input {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid var(--border-color, #e2e8f0);
                    border-radius: 8px;
                    font-size: 0.875rem;
                    resize: vertical;
                    min-height: 80px;
                }

                .notes-input:focus {
                    outline: none;
                    border-color: var(--primary-color, #6366f1);
                }

                .actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }

                .btn {
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                }

                .btn-secondary {
                    background: var(--surface-secondary, #f1f5f9);
                    color: var(--text-primary, #1a1a2e);
                }

                .btn-secondary:hover {
                    background: var(--surface-hover, #e2e8f0);
                }

                .btn-primary {
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    color: white;
                }

                .btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
                }

                .btn-primary:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                .empty-state {
                    text-align: center;
                    padding: 40px 20px;
                    color: var(--text-secondary, #64748b);
                }

                .empty-state-icon {
                    font-size: 3rem;
                    margin-bottom: 12px;
                }
            `}</style>

            <div className="header">
                <h2 className="title">Recipe Builder</h2>
                <p className="subtitle">
                    {productName}
                    {variantName && ` - ${variantName}`}
                </p>
            </div>

            <div className="section">
                <div className="section-title">Ingredients</div>

                {recipeItems.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🧪</div>
                        <p>No ingredients added yet</p>
                        <p>Search and add ingredients below</p>
                    </div>
                ) : (
                    <div className="ingredient-list">
                        {recipeItems.map((item, index) => (
                            <div key={item.ingredientId} className="ingredient-row">
                                <span className="ingredient-name">{item.ingredientName}</span>
                                <div className="quantity-input">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.quantity}
                                        onChange={e => updateQuantity(index, parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <span className="unit">{item.unit}</span>
                                <span className="cost">Rp {item.cost.toLocaleString()}</span>
                                <button className="remove-btn" onClick={() => removeIngredient(index)}>
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="add-ingredient" style={{ marginTop: 12 }}>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="+ Search and add ingredient..."
                        value={searchTerm}
                        onChange={e => {
                            setSearchTerm(e.target.value);
                            setShowIngredientSearch(true);
                        }}
                        onFocus={() => setShowIngredientSearch(true)}
                        onBlur={() => setTimeout(() => setShowIngredientSearch(false), 200)}
                    />
                    {showIngredientSearch && searchTerm && (
                        <div className="search-results">
                            {filteredIngredients.length === 0 ? (
                                <div className="search-item">
                                    <span className="search-item-name">No ingredients found</span>
                                </div>
                            ) : (
                                filteredIngredients.slice(0, 10).map(ing => (
                                    <div
                                        key={ing.id}
                                        className="search-item"
                                        onClick={() => addIngredient(ing)}
                                    >
                                        <div>
                                            <div className="search-item-name">{ing.name}</div>
                                            <div className="search-item-details">
                                                Rp {ing.costPerUnit.toLocaleString()} / {ing.unit}
                                            </div>
                                        </div>
                                        {ing.stockLevel !== undefined && (
                                            <span className="search-item-details">
                                                Stock: {ing.stockLevel} {ing.unit}
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="total-section">
                <span className="total-label">Total Recipe Cost</span>
                <span className="total-value">Rp {totalCost.toLocaleString()}</span>
            </div>

            <div className="section">
                <div className="section-title">Notes (Optional)</div>
                <textarea
                    className="notes-input"
                    placeholder="Add preparation notes, cooking instructions, or other details..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                />
            </div>

            <div className="actions">
                <button className="btn btn-secondary" onClick={onCancel}>
                    Cancel
                </button>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={recipeItems.length === 0}
                >
                    Save Recipe
                </button>
            </div>
        </div>
    );
}

export default RecipeBuilder;
