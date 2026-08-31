type ProtocolName = "CAN" | "SPI";

type Lane = {
  bits: number[];
  mirror?: boolean;
};

type NvdCve = {
  id?: unknown;
  published?: unknown;
  vulnStatus?: unknown;
};

type NvdResponse = {
  totalResults?: unknown;
  vulnerabilities?: Array<{ cve?: NvdCve }>;
};

type CachedCveFeed = {
  date: string;
  message: string;
};

// my favorite beers
const FALLBACK_MESSAGES = [
  "Hefeweizen",
  "Indian Pale Ale",
  "Stout",
  "Barleywine",
  "Sour",
  "Lager",
  "BOTTOMS UP!",
] as const;

const NVD_CVE_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0/";
const CVE_CACHE_KEY = "signal-trace-cves";
const CVE_COUNT = 1;
const CVE_PAGE_SIZE = 20;
const FEED_TIMEOUT_MS = 8_000;
const MILLISECONDS_PER_DAY = 86_400_000;

const utcDate = () => new Date().toISOString().slice(0, 10);

const fallbackMessage = () => {
  const dayNumber = Math.floor(Date.now() / MILLISECONDS_PER_DAY);
  return FALLBACK_MESSAGES[dayNumber % FALLBACK_MESSAGES.length];
};

const normalizeCveMessage = (value: unknown) => {
  if (typeof value !== "string") return undefined;

  const cveIds = value
    .split(" | ")
    .map((cveId) => cveId.trim().toUpperCase())
    .filter((cveId) => /^CVE-\d{4}-\d{4,}$/.test(cveId));

  return cveIds.length > 0 ? cveIds.slice(0, CVE_COUNT).join(" | ") : undefined;
};

const normalizeCachedMessage = (value: unknown) => {
  const cveMessage = normalizeCveMessage(value);
  if (cveMessage) return cveMessage;

  return typeof value === "string" &&
      (FALLBACK_MESSAGES as readonly string[]).includes(value)
    ? value
    : undefined;
};

const readCachedCveFeed = (date: string) => {
  try {
    const cached = JSON.parse(
      window.localStorage.getItem(CVE_CACHE_KEY) ?? "null",
    ) as Partial<CachedCveFeed> | null;
    const message = normalizeCachedMessage(cached?.message);

    return cached?.date === date ? message : undefined;
  } catch {
    return undefined;
  }
};

const cacheCveFeed = (date: string, message: string) => {
  try {
    window.localStorage.setItem(
      CVE_CACHE_KEY,
      JSON.stringify({ date, message } satisfies CachedCveFeed),
    );
  } catch {
    // The trace still works when storage is disabled; it just cannot share a cache.
  }
};

const fetchNvdPage = async (query: string, signal: AbortSignal) => {
  const response = await fetch(`${NVD_CVE_API_URL}?${query}`, { signal });
  if (!response.ok) throw new Error(`NVD request failed: ${response.status}`);

  return await response.json() as NvdResponse;
};

const createCveMessage = (feed: NvdResponse) => {
  const records = Array.isArray(feed.vulnerabilities)
    ? feed.vulnerabilities
    : [];

  const cves = records
    .map(({ cve }) => ({
      id: typeof cve?.id === "string" ? cve.id.toUpperCase() : "",
      published: typeof cve?.published === "string"
        ? Date.parse(cve.published)
        : 0,
      status: typeof cve?.vulnStatus === "string" ? cve.vulnStatus : "",
    }))
    .filter(({ id, status }) =>
      /^CVE-\d{4}-\d{4,}$/.test(id) && status.toLowerCase() !== "rejected"
    )
    .sort((left, right) => right.published - left.published)
    .map(({ id }) => id);

  return normalizeCveMessage([...new Set(cves)].slice(0, CVE_COUNT).join(" | "));
};

const getMessageOfTheDay = async () => {
  const date = utcDate();
  const cached = readCachedCveFeed(date);
  if (cached) return cached;

  let message: string = fallbackMessage();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

  try {
    const index = await fetchNvdPage("resultsPerPage=1", controller.signal);
    const totalResults = typeof index.totalResults === "number"
      ? index.totalResults
      : 0;
    const startIndex = Math.max(0, totalResults - CVE_PAGE_SIZE);
    const latest = await fetchNvdPage(
      `resultsPerPage=${CVE_PAGE_SIZE}&startIndex=${startIndex}`,
      controller.signal,
    );
    const cveMessage = createCveMessage(latest);

    if (cveMessage) message = cveMessage;
  } catch {
    // Network and privacy controls may block the feed; use the local daily message.
  } finally {
    window.clearTimeout(timeout);
  }

  cacheCveFeed(date, message);
  return message;
};

const utf8Bytes = (message: string) =>
  Array.from(new TextEncoder().encode(message));

const numberToBits = (value: number, width: number) =>
  Array.from({ length: width }, (_, index) => (value >> (width - 1 - index)) & 1);

const byteToBitsMsbFirst = (byte: number) => numberToBits(byte, 8);

const repeatBit = (bit: number, count: number) =>
  Array.from({ length: count }, () => bit);

// CAN CC base frame format (11-bit identifier), ISO 11898-1 logical framing.
// CRC-15-CAN polynomial: x^15 + x^14 + x^10 + x^8 + x^7 + x^4 + x^3 + 1.
const calculateCanCrc = (bits: number[]) => {
  let crc = 0;

  for (const bit of bits) {
    const feedback = ((crc >> 14) & 1) ^ bit;
    crc = (crc << 1) & 0x7fff;
    if (feedback) crc ^= 0x4599;
  }

  return numberToBits(crc, 15);
};

// CAN inserts the complement after five consecutive equal bits from SOF through
// the CRC sequence. Stuff bits participate in the next run count.
const applyCanBitStuffing = (bits: number[]) => {
  const stuffed: number[] = [];
  let previous = -1;
  let runLength = 0;

  for (const bit of bits) {
    if (bit === previous) {
      runLength += 1;
    } else {
      previous = bit;
      runLength = 1;
    }

    stuffed.push(bit);

    if (runLength === 5) {
      const stuffBit = bit ^ 1;
      stuffed.push(stuffBit);
      previous = stuffBit;
      runLength = 1;
    }
  }

  return stuffed;
};

const createCanBaseFrame = (identifier: number, data: number[]) => {
  const protectedFields = [
    0, // SOF: dominant
    ...numberToBits(identifier & 0x7ff, 11),
    0, // RTR: data frame
    0, // IDE: base frame format
    0, // reserved bit r0
    ...numberToBits(data.length, 4),
    ...data.flatMap(byteToBitsMsbFirst),
  ];

  const stuffedRegion = applyCanBitStuffing([
    ...protectedFields,
    ...calculateCanCrc(protectedFields),
  ]);

  return [
    ...stuffedRegion,
    1, // CRC delimiter
    0, // ACK slot: a receiver drives the observed bus dominant
    1, // ACK delimiter
    ...repeatBit(1, 7), // EOF
    ...repeatBit(1, 3), // intermission
  ];
};

const createCanLanes = (message: string): Lane[] => {
  const bytes = utf8Bytes(message);
  const frames: number[] = [...repeatBit(1, 5)]; // bus idle before SOF

  for (
    let offset = 0, frameIndex = 0;
    offset < bytes.length;
    offset += 8, frameIndex += 1
  ) {
    const payload = bytes.slice(offset, offset + 8);
    // 0x555 is 10101010101: a legal CAN-ID that exposes the bit cell immediately.
    frames.push(...createCanBaseFrame(0x555 + frameIndex, payload));
  }

  return [
    { bits: frames, mirror: true },
    { bits: frames },
  ];
};

// SPI has no universal packet format. This is a concrete Motorola/NXP-style
// 8-bit, MSB-first, Mode-0 transaction: CPOL=0, CPHA=0, active-low SS.
const createSpiLanes = (message: string): Lane[] => {
  const clock: number[] = [];
  const mosi: number[] = [];
  const miso: number[] = [];
  const select: number[] = [];
  const bits = [0x55, 0xaa, ...utf8Bytes(message)]
    .flatMap(byteToBitsMsbFirst);

  const pushState = (
    clockState: number,
    mosiState: number,
    misoState: number,
    selectState: number,
    count = 1,
  ) => {
    for (let index = 0; index < count; index += 1) {
      clock.push(clockState);
      mosi.push(mosiState);
      miso.push(misoState);
      select.push(selectState);
    }
  };

  const firstBit = bits[0];
  pushState(0, firstBit, 1, 1, 2); // idle; MISO is pulled high
  pushState(0, firstBit, 0, 0); // select the target with data already valid

  bits.forEach((bit) => {
    pushState(0, bit, 0, 0); // set up MOSI while SCK is low
    pushState(1, bit, 0, 0); // Mode 0 samples on the rising edge
  });

  pushState(0, bits[bits.length - 1], 0, 0);
  pushState(0, bits[bits.length - 1], 1, 1); // deassert SS
  pushState(0, bits[bits.length - 1], 1, 1, 2);

  return [
    { bits: clock },
    { bits: mosi },
    { bits: miso },
    { bits: select },
  ];
};

const laneFactories: Record<ProtocolName, (message: string) => Lane[]> = {
  CAN: createCanLanes,
  SPI: createSpiLanes,
};

const canvas = document.querySelector<HTMLCanvasElement>("#protocol-canvas");
const page = document.querySelector<HTMLElement>("#signal-page");
const sidebar = document.querySelector<HTMLAnchorElement>(".protocol-sidebar");

if (canvas && page && sidebar) {
  const context = canvas.getContext("2d");
  const protocol = page.dataset.protocol as ProtocolName;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let lanes: Lane[] | undefined;

  const clamp = (value: number, minimum: number, maximum: number) =>
    Math.min(maximum, Math.max(minimum, value));

  const createVerticalPath = (
    ctx: CanvasRenderingContext2D,
    x: number,
    startY: number,
    height: number,
    amplitude: number,
    lane: Lane,
  ) => {
    const steps = lane.bits.length;
    const stepHeight = height / Math.max(steps, 1);
    const direction = lane.mirror ? -1 : 1;
    const level = (bit: number) => x + (bit ? amplitude : -amplitude) * direction;

    ctx.beginPath();
    ctx.moveTo(level(lane.bits[0]), startY);

    for (let index = 0; index < steps; index += 1) {
      const bit = lane.bits[index];
      const nextBit = lane.bits[Math.min(index + 1, lane.bits.length - 1)];
      const nextY = Math.min(startY + (index + 1) * stepHeight, startY + height);
      ctx.lineTo(level(bit), nextY);
      if (nextY < startY + height && nextBit !== bit) {
        ctx.lineTo(level(nextBit), nextY);
      }
    }
  };

  const drawLanes = (
    ctx: CanvasRenderingContext2D,
    lanes: Lane[],
    startY: number,
    traceHeight: number,
    revealHeight: number,
  ) => {
    const styles = getComputedStyle(document.documentElement);
    const traceColor = styles.getPropertyValue("--signal").trim();
    const width = sidebar.clientWidth;
    const sidePadding = width < 100 ? 12 : 30;
    const usableWidth = Math.max(30, width - sidePadding * 2);
    const laneSpacing = lanes.length === 1 ? 0 : usableWidth / (lanes.length - 1);
    const amplitude = width < 100 ? 3.5 : 7;

    ctx.save();
    ctx.strokeStyle = traceColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.rect(0, startY, width, revealHeight);
    ctx.clip();

    lanes.forEach((lane, index) => {
      const laneX = lanes.length === 1
        ? width / 2
        : sidePadding + laneSpacing * index;
      createVerticalPath(ctx, laneX, startY, traceHeight, amplitude, lane);
      ctx.stroke();
    });

    ctx.restore();
  };

  const draw = () => {
    if (!context || !lanes) return;

    const deviceScale = Math.min(window.devicePixelRatio || 1, 2);
    const width = sidebar.clientWidth;
    const height = sidebar.clientHeight;

    if (canvas.width !== Math.round(width * deviceScale) || canvas.height !== Math.round(height * deviceScale)) {
      canvas.width = Math.round(width * deviceScale);
      canvas.height = Math.round(height * deviceScale);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
    context.clearRect(0, 0, width, height);

    const pageRect = page.getBoundingClientRect();
    const startY = 32;
    const traceHeight = Math.max(0, height - startY - 34);
    const viewportReveal = window.innerHeight * 0.74 - pageRect.top - startY;
    const revealHeight = reducedMotion.matches
      ? traceHeight
      : clamp(viewportReveal, 0, traceHeight);
    drawLanes(context, lanes, startY, traceHeight, revealHeight);
  };

  const scheduleDraw = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(draw);
  };

  const resizeObserver = new ResizeObserver(scheduleDraw);
  resizeObserver.observe(page);
  window.addEventListener("scroll", scheduleDraw, { passive: true });
  window.addEventListener("resize", scheduleDraw, { passive: true });
  window.addEventListener("themechange", scheduleDraw);
  reducedMotion.addEventListener("change", scheduleDraw);

  void getMessageOfTheDay().then((message) => {
    lanes = laneFactories[protocol]?.(message);

    const cveId = normalizeCveMessage(message);
    if (cveId) {
      sidebar.href = `https://nvd.nist.gov/vuln/detail/${cveId}`;
      sidebar.ariaLabel = `View ${cveId} in the National Vulnerability Database`;
      sidebar.title = `View ${cveId} in the NVD`;
    }

    scheduleDraw();
  });
}
