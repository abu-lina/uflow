const REDACTED = '[redacted]';

export function maskEmail(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[^\s@]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(
      value,
    )
  ) {
    return REDACTED;
  }

  const [local, domain] = value.split('@');
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return REDACTED;
  }
  return `${local[0]}***@${domain}`;
}

function maskIpv4(value: string): string | null {
  const octets = value.split('.');
  if (
    octets.length !== 4 ||
    octets.some((octet) => !/^(0|[1-9]\d{0,2})$/.test(octet) || Number(octet) > 255)
  ) {
    return null;
  }

  return `${octets[0]}.${octets[1]}.${octets[2]}.0`;
}

function expandIpv6(value: string): string[] | null {
  try {
    const canonical = new URL(`http://[${value}]/`).hostname.slice(1, -1);
    const [left, right = ''] = canonical.split('::');
    const leading = left ? left.split(':') : [];
    const trailing = right ? right.split(':') : [];
    const zeroCount = 8 - leading.length - trailing.length;

    if (zeroCount < 0 || (canonical.includes('::') && zeroCount < 1)) {
      return null;
    }

    const hextets = [...leading, ...Array<string>(zeroCount).fill('0'), ...trailing];
    return hextets.length === 8 ? hextets : null;
  } catch {
    return null;
  }
}

export function maskIp(value: unknown): string {
  if (typeof value !== 'string' || !value || value === 'unknown') {
    return REDACTED;
  }

  const ipv4 = maskIpv4(value);
  if (ipv4) {
    return ipv4;
  }

  const hextets = expandIpv6(value);
  if (!hextets) {
    return REDACTED;
  }

  if (hextets.slice(0, 6).every((hextet, index) => hextet === (index === 5 ? 'ffff' : '0'))) {
    const high = Number.parseInt(hextets[6], 16);
    const low = Number.parseInt(hextets[7], 16);
    return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`.replace(/\.\d+$/, '.0');
  }

  const firstThree = hextets.slice(0, 3);
  return firstThree.every((hextet) => hextet === '0') ? '::' : `${firstThree.join(':')}::`;
}

export function maskIdentifier(value: unknown): string {
  if (typeof value !== 'string') {
    return REDACTED;
  }
  if (value.startsWith('ip:')) {
    return `ip:${maskIp(value.slice(3))}`;
  }
  return value.startsWith('user:') ? value : REDACTED;
}

const TEXT_TOKEN = /[^\s"'`<>()[\]{},;:=]+/g;
const LEADING_EMAIL = /^([^@]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)(.*)$/;

export function redactEmails(text: string): string {
  return text.replace(TEXT_TOKEN, (token) => {
    if (!token.includes('@')) {
      return token;
    }
    const match = LEADING_EMAIL.exec(token);
    return match ? `${maskEmail(match[1])}${match[2]}` : REDACTED;
  });
}

const ERROR_FIELDS = ['name', 'message', 'code', 'status', 'details', 'hint'] as const;

export function redactError(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== 'object') {
    return { message: redactEmails(String(error)) };
  }

  const source = error as Record<string, unknown>;
  return Object.fromEntries(
    ERROR_FIELDS.filter((field) => source[field] !== undefined && source[field] !== null).map(
      (field) => {
        const value = source[field];
        return [field, typeof value === 'string' ? redactEmails(value) : value];
      },
    ),
  );
}
