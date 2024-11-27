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
    ear: '/icons/ear.svg',
    eyebrow: '/icons/eyebrow.svg',
    save: '/icons/save.svg',
    speaker: '/icons/speaker.svg',
    settings: '/icons/settings.svg',
    arrow: '/icons/arrow.svg',
    check: '/icons/check.svg',
    x: '/icons/x.svg',
    pencil: '/icons/pencil.svg',
    chevright: '/icons/chevright.svg',
    bin: '/icons/bin.svg',
    plus: '/icons/plus.svg',
    folder: '/icons/folder.svg',
    folderDown: '/icons/folder-down.svg',
    addfolder: '/icons/addfolder.svg',
    dictionary: '/icons/dictionary.svg',
  } as const;
  
  export type IconName = keyof typeof IconPaths;
  
  export const getIconUrl = (name: IconName): string => {
    return IconPaths[name];
  };