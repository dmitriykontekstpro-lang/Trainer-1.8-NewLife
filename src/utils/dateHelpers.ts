export const getLocalDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
    return getLocalDateKey(d1) === getLocalDateKey(d2);
};
