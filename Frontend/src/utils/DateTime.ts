export const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);

  // Format date in user's timezone
  const dateStr = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  // Format time in user's timezone with 24-hour format
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return {
    dateStr,
    timeStr,
    fullStr: `${dateStr}, ${timeStr}`,
  };
};
