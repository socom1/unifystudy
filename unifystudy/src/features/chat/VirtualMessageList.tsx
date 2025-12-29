import React, { useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

interface VirtualMessageListProps<T> {
  messages: T[];
  renderRow: (msg: T, index: number) => React.ReactNode;
  onScroll?: (props: {
    scrollDirection: 'forward' | 'backward';
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
  }) => void;
}

const VirtualMessageList = <T,>({
  messages,
  renderRow,
}: VirtualMessageListProps<T>) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Virtuoso
        ref={virtuosoRef}
        style={{ height: '100%', width: '100%' }}
        totalCount={messages.length}
        itemContent={(index) => renderRow(messages[index], index)}
        initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
        followOutput="auto"
        alignToBottom
      />
    </div>
  );
};

export default VirtualMessageList;
