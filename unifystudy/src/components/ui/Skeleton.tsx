import React from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface SkeletonProps {
  count?: number;
  height?: number | string;
  width?: number | string;
  circle?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const GlobalSkeleton: React.FC<SkeletonProps> = (props) => {
  return (
    <SkeletonTheme baseColor="#202020" highlightColor="#444">
      <Skeleton {...props} />
    </SkeletonTheme>
  );
};

export default GlobalSkeleton;
