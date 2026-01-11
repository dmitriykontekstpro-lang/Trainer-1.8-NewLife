export const getLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
    return getLocalDateKey(d1) === getLocalDateKey(d2);
};
