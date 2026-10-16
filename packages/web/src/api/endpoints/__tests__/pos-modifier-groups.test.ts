import { describe, expect, it } from 'vitest';
import { toPOSModifierGroup } from '../pos.api';

const base = {
    id: 'g1',
    name: 'Topping',
    isRequired: false,
    minSelection: 0,
    modifiers: [{ id: 'm1', name: 'Keju', price: 3000 }],
};

describe('toPOSModifierGroup', () => {
    it('uses maxSelection when set and 1 for a single-select group without it', () => {
        expect(toPOSModifierGroup({ ...base, selectionType: 'single', maxSelection: 3 }).maxSelect).toBe(3);
        expect(toPOSModifierGroup({ ...base, selectionType: 'single', maxSelection: null }).maxSelect).toBe(1);
        expect(toPOSModifierGroup({ ...base, selectionType: 'multiple', maxSelection: null }).maxSelect).toBe(0);
    });

    it('treats a positive minimum as required', () => {
        const g = toPOSModifierGroup({ ...base, selectionType: 'multiple', maxSelection: null, minSelection: 2 });
        expect(g.required).toBe(true);
        expect(g.minSelect).toBe(2);
        expect(g.modifiers).toEqual([{ id: 'm1', name: 'Keju', price: 3000 }]);
    });
});
