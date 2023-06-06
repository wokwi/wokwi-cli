export const parseTimeRegex = /^(\d+(\.\d*)?)\s*(ns|us|ms|s)$|^0(\.?0*)$/i;

export function parseTime(time: string) {
  time = time.trim();
  const match = parseTimeRegex.exec(time);
  if (!match) {
    if (!isNaN(parseFloat(time))) {
      throw new Error(`Missing units: ${time}`);
    }
    throw new Error(`Invalid time: ${time}`);
  }

  if (match[1] == null) {
    return 0;
  }

  const value = parseFloat(match[1]);
  const unit = match[3].toLowerCase();
  switch (unit) {
    case 'ns':
      return value;
    case 'us':
      return value * 1_000;
    case 'ms':
      return value * 1_000_000;
    case 's':
    default:
      return value * 1_000_000_000;
  }
}
