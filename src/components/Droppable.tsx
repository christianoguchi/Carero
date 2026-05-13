import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DroppableProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  isOverClassName?: string;
}

export function Droppable({ 
  id, 
  children, 
  className, 
  activeClassName,
  isOverClassName 
}: DroppableProps) {
  const { isOver, setNodeRef, active } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        active && activeClassName,
        isOver && isOverClassName
      )}
    >
      {children}
    </div>
  );
}
