"use client";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

function Row<T extends { id: string }>({ item, children }: { item: T; children: (item: T, handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  // The handle is the only drag target, so scrolling the page with a finger still works.
  const handle = (
    <button
      type="button"
      aria-label="Drag to reorder"
      className="flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      ⋮⋮
    </button>
  );
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }} className={isDragging ? "opacity-80 shadow-card" : ""}>
      {children(item, handle)}
    </li>
  );
}

/** Drag-and-drop (and keyboard) reordering. Calls onReorder with the new id order. */
export function Sortable<T extends { id: string }>({ items, onReorder, children, className }: { items: T[]; onReorder: (items: T[]) => void; children: (item: T, handle: ReactNode) => ReactNode; className?: string }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    onReorder(arrayMove(items, from, to));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {items.map((item) => (
            <Row key={item.id} item={item}>
              {children}
            </Row>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
