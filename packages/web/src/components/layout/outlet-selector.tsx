import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings.api';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { can } from '@/config/permissions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function OutletSelector() {
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const setSelectedOutletId = useUIStore((s) => s.setSelectedOutletId);
  const user = useAuthStore((s) => s.user);

  // GET /settings/outlets is @Roles(owner, manager): only they can switch outlets
  const canSwitchOutlets = can(user?.role, 'outlets.switch');

  const { data: outlets } = useQuery({
    queryKey: ['outlets'],
    queryFn: settingsApi.getOutlets,
    enabled: canSwitchOutlets,
  });

  if (!outlets || outlets.length <= 1) return null;

  return (
    <Select value={selectedOutletId ?? undefined} onValueChange={setSelectedOutletId}>
      <SelectTrigger className="w-[180px]" aria-label="Pilih outlet">
        <SelectValue placeholder="Pilih outlet" />
      </SelectTrigger>
      <SelectContent>
        {outlets.map((outlet) => (
          <SelectItem key={outlet.id} value={outlet.id}>
            {outlet.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
