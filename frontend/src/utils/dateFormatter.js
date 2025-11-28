/**
 * Format date to IST (Indian Standard Time) in 24-hour format
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date string in DD/MM/YYYY, HH:MM:SS format
 */
export const formatToIST = (date) => {
  if (!date) return '-';
  
  try {
    const dateObj = new Date(date);
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return '-';
    }
    
    // Format using Intl.DateTimeFormat for reliable IST conversion
    const formatter = new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata'
    });
    
    return formatter.format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', date, error);
    return '-';
  }
};
