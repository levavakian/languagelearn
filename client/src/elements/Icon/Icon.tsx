import React from 'react';
import { IconName, getIconUrl } from '../../utils/icons';

interface IconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  name: IconName;
  scale?: number;
  flipX?: boolean;
}

export const Icon: React.FC<IconProps> = ({ name, alt, scale, flipX, ...props }) => {
  return (
    <div style={{ display: 'inline-block' }}>
      <img
        src={getIconUrl(name)}
        alt={alt || `${name} icon`}
        width={scale}
        height={scale}
        style={{ 
          transform: flipX ? 'scaleX(-1)' : undefined,
          ...props.style 
        }}
        {...props}
      />
    </div>
  );
};