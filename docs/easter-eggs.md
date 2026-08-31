# Easter eggs

Each route renders an unlabeled, top-to-bottom timing diagram. The waveforms are
generated from complete logical transactions rather than arbitrary payload bits.
Scrolling reveals the diagram; scroll speed is not bus timing. Within one
diagram, every equal vertical step represents one equal time quantum.

Both protocols carry the same CVE of the day. On the first visit each UTC
day, the site requests the end of the public CVE catalog from the official
[NIST National Vulnerability Database CVE API](https://nvd.nist.gov/developers/vulnerabilities).
It selects the most recently published, non-rejected CVE ID and encodes a message
such as `CVE-2026-12345`.

Because Home and Bottoms Up share the same origin and cache, both routes encode
the same CVE ID for the rest of the UTC day. The result is stored in
`localStorage` under `signal-trace-cves`, limiting the site to one refresh (two
compact requests) per browser per day. A new visitor may receive a newer CVE if
NVD publishes a record during that day.

The first small request obtains the catalog size. The second requests the final
20 records, sorts them by publication time, ignores rejected entries, and keeps
the newest one. NVD permits direct cross-origin requests, so this works from the
static site without an RSS proxy or server-side component.

When the feed succeeds, the signal sidebar becomes a keyboard-accessible link to
that CVE's NVD detail page, where its description and vulnerability references
are available. The link opens in a new tab. If the local fallback is active,
there is no CVE reference and the trace remains non-interactive.

If the feed, network, or browser storage is unavailable, the trace falls back to
the editable local list at the top of `src/scripts/protocol-traces.ts`:

```ts
const FALLBACK_MESSAGES = [
  "READ THE DATASHEET",
  "TRUST, BUT VERIFY",
  "FOLLOW THE SIGNAL",
  "ROOT ACCESS GRANTED",
  "THE BUS NEVER LIES",
  "PATCH THE PHYSICAL WORLD",
  "BOTTOMS UP!",
];
```

These encoders model digital bus states and protocol framing. They do not attempt
to reproduce analog voltage thresholds, rise times, propagation delay, oscillator
tolerance, or a particular physical bitrate.

## CAN CC on the Home route

CAN CC does not use a preamble. Nodes already know the configured nominal bit
rate, and the dominant Start of Frame bit performs hard synchronization. Later
edges support resynchronization, while CAN bit stuffing prevents long
transition-free runs.

The page emits acknowledged Classical CAN base-format data frames:

```text
bus idle
SOF
11-bit identifier
RTR
IDE
r0
DLC
0-8 data bytes
CRC-15-CAN
CRC delimiter
ACK slot
ACK delimiter
EOF
3-bit intermission
```

The UTF-8 message is divided into chunks of at most eight bytes. Frame identifiers
start at `0x555`; its 11-bit representation, `10101010101`, is both a legal
identifier and the timing clue. Subsequent message fragments use consecutive
identifiers.

The encoder calculates CRC-15-CAN using:

```text
x^15 + x^14 + x^10 + x^8 + x^7 + x^4 + x^3 + 1
```

It then applies dynamic bit stuffing from SOF through the CRC sequence: after five
equal bits, the opposite stuff bit is inserted. The observed ACK slot is dominant,
which represents at least one receiver acknowledging the frame.

To decode it:

1. Use the alternating `0x555` identifier to recover one bit-cell height.
2. Read dominant/recessive states from top to bottom.
3. Remove a complementary bit after every run of five identical bits, stopping
   after the CRC sequence.
4. Parse the 11-bit identifier, control field, DLC, and data bytes.
5. Verify CRC-15-CAN and concatenate data from consecutive identifiers.

## SPI on the Bottoms Up 🍻 route

SPI does not define a universal packet format, address, checksum, or preamble.
Those details belong to the selected peripheral. The site implements one concrete,
internally consistent Motorola/NXP-style transaction:

```text
8-bit words
MSB first
Mode 0: CPOL=0, CPHA=0
active-low slave select
sample MOSI/MISO on rising SCLK edges
```

Slave select goes low with the first MOSI bit already valid. MOSI begins with the
legal data bytes `0x55 0xAA`, providing alternating transitions and byte
alignment, then carries the UTF-8 message. MISO returns zeros while selected and
is shown pulled high while idle. Slave select returns high after the final falling
edge.

To decode it:

1. Find the lane that idles low and toggles regularly; that is SCLK.
2. Find the active-low framing lane; that is slave select.
3. Sample MOSI on every rising clock edge while selected.
4. Confirm `0x55 0xAA`, then decode the remaining bytes as UTF-8.

## Standards and primary references

- [CAN CC overview, frame fields, ACK, intermission, and bit stuffing - CAN in Automation](https://www.can-cia.org/can-knowledge/can-cc)
- [CRC polynomials used by CAN - CAN in Automation](https://www.can-cia.org/can-knowledge/cyclic-redundancy-check-crc-in-can-frames)
- [Using the Serial Peripheral Interface, AN991 - NXP/Freescale](https://www.nxp.com/docs/en/application-note/AN991.pdf)

ISO 11898-1 is the normative CAN data-link-layer standard. The linked CAN in
Automation material is used here as the publicly accessible technical reference
for the implemented CAN CC fields and safeguards.
