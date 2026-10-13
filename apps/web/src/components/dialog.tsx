'use client';

import type * as React from 'react';
import * as Primitive from '@radix-ui/react-dialog';

// Local shadcn-style wrapper. Radix supplies focus trapping, escape handling and focus return;
// Inside supplies its own surfaces and motion in redesign.css.
export const Dialog = Primitive.Root;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;
export const DialogClose = Primitive.Close;

type ContentProps = React.ComponentPropsWithoutRef<typeof Primitive.Content>;

export function DialogContent({
  className = '',
  children,
  ...props
}: ContentProps) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="inside-dialog-overlay" />
      <Primitive.Content
        className={`inside-dialog-content ${className}`}
        {...props}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
}
