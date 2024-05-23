'use client';

import React from 'react';

import { cn } from '@udecode/cn';
import {
  type TCommentText,
  useCommentLeaf,
  useCommentLeafState,
} from '@udecode/plate-comments';
import {
  PlateLeaf,
  type PlateLeafProps,
  type Value,
} from '@udecode/plate-common';

export function CommentLeaf({
  className,
  ...props
}: PlateLeafProps<Value, TCommentText>) {
  const { children, leaf, nodeProps } = props;

  const state = useCommentLeafState({ leaf });
  const { props: rootProps } = useCommentLeaf(state);

  if (!state.commentCount) return <>{children}</>;

  let aboveChildren = <>{children}</>;

  if (!state.isActive) {
    for (let i = 1; i < state.commentCount; i++) {
      aboveChildren = <span className='ab-bg-primary/20'>{aboveChildren}</span>;
    }
  }

  return (
    <PlateLeaf
      {...props}
      className={cn(
        'ab-border-b-2 ab-border-b-primary/40',
        state.isActive ? 'ab-bg-primary/40' : 'ab-bg-primary/20',
        className
      )}
      nodeProps={{
        ...rootProps,
        ...nodeProps,
      }}
    >
      {aboveChildren}
    </PlateLeaf>
  );
}
