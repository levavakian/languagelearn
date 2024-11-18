export const IconPaths = {
    chat: '/icons/chat.svg',
    back: '/icons/back.svg',
    next: '/icons/next.svg',
    mic: '/icons/mic.svg',
    micOutline: '/icons/mic-outline.svg',
    micFilled: '/icons/microphone-black-shape.svg',
    user: '/icons/user.svg',
    profit: '/icons/profit.svg',
    shuttle: '/icons/shuttle.svg',
    writing: '/icons/writing.svg',
    learning: '/icons/learning.svg',
    plusCircleOutline: '/icons/plus-circle.svg',
    color: '/icons/color-swatch-theme.svg',
  } as const;
  
  export type IconName = keyof typeof IconPaths;
  
  export const getIconUrl = (name: IconName): string => {
    return IconPaths[name];
  };