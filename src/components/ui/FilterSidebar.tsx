import { ReactNode, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
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
  const instanceId = useId();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  return (
    <aside className={cn('w-full max-w-[280px] shrink-0', className)}>
      {groups.map((group) => {
        const isOpen = openMap[group.id] ?? group.defaultOpen ?? true;
        const groupId = `${instanceId}-${group.id}`;

        return (
          <div key={group.id} className="border-b border-line-light last:border-b-0">
            <button
              id={groupId}
              type="button"
              onClick={() => setOpenMap(current => ({ ...current, [group.id]: !isOpen }))}
              aria-expanded={isOpen}
              aria-controls={`${groupId}-options`}
              className="flex w-full items-center justify-between gap-2 rounded-sm py-3.5 text-left text-sm font-semibold text-content-primary hover:text-content-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span>{group.title}</span>
              <ChevronDown
                size={15}
                aria-hidden="true"
                className={cn('shrink-0 text-content-muted transition-transform motion-reduce:transition-none', isOpen && 'rotate-180')}
              />
            </button>

            <div id={`${groupId}-options`} role="group" aria-labelledby={groupId} className="pb-4" hidden={!isOpen}>
              {group.content}
            </div>
          </div>
        );
      })}

      {footer && <div className="pt-5">{footer}</div>}
    </aside>
  );
}
