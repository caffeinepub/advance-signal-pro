export function formatTimestamp(timestamp: bigint): string {
  // Convert nanoseconds to milliseconds
  const ms = Number(timestamp) / 1000000;
  const date = new Date(ms);

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  hours = hours % 24;

  return `${day} de ${month} de ${year} às ${hours}:${minutes}`;
}
