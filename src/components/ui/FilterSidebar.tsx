import { ReactNode, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface FilterGroup {
  id: string;
  title: string;
  defaultOpen?: boolean;
  content: ReactNode;
}

export interface FilterSidebarProps {
  groups: FilterGroup[];
  footer?: ReactNode;
  className?: string;
}

export default function FilterSidebar({
  groups,
  footer,
  className = '',
}: FilterSidebarProps) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((group) => [group.id, group.defaultOpen ?? true]))
  );

  const toggleGroup = (id: string) => {
    setOpenMap((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  return (
    <aside className={cn('w-full max-w-[280px] shrink-0', className)}>
      {groups.map((group) => {
        const isOpen = openMap[group.id] ?? true;

        return (
          <div key={group.id} className="border-b border-line-light py-5 first:pt-0">
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between text-left text-base font-bold uppercase tracking-wide text-content-primary hover:text-content-secondary"
            >
              <span>{group.title}</span>
              {isOpen ? <Minus size={16} /> : <Plus size={16} />}
            </button>

            {isOpen && <div className="mt-4">{group.content}</div>}
          </div>
        );
      })}

      {footer && <div className="pt-5">{footer}</div>}
    </aside>
  );
}
