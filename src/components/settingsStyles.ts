export const settingsCardBase = "bg-white rounded-2xl shadow-xl transition-shadow focus-within:ring-2 focus-within:ring-indigo-500";

export const settingsHeaderButton = "w-full p-6 text-left focus:outline-none";

export const statusPill = (isReady: boolean) =>
  `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
    isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
  }`;

export const accordionIconActive = "h-5 w-5 text-gray-400";

export const toggleWrapper = (enabled: boolean) =>
  `relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
    enabled ? 'bg-indigo-600' : 'bg-gray-200'
  }`;

export const toggleThumb = (enabled: boolean) =>
  `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
    enabled ? 'translate-x-6' : 'translate-x-1'
  }`;
