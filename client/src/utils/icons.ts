export const IconPaths = {
    chat: '/icons/chat.svg',
    back: '/icons/back.svg',
  } as const;
  
  export type IconName = keyof typeof IconPaths;
  
  export const getIconUrl = (name: IconName): string => {
    return IconPaths[name];
  };