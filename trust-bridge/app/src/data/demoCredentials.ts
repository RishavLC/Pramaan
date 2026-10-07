// DEMO DATA ONLY. These records are NOT on Solana. Hashes are real SHA-256 digests of the fictional
// sample text beside them; timestamps are invented for the UI. The registry labels them "Demo".
export interface DemoCredential {
  id: string;
  type: string;
  agencyId: string;
  sampleText: string;
  hashHex: string;
  issuedAt: number;
  verifiedAt: number[];
  revokedAt: number | null;
}

export const DEMO_CREDENTIALS: DemoCredential[] = [
  {
    id: "TB-DEMO-001",
    type: "Residential Address",
    agencyId: "municipal",
    sampleText: "DEMO|TB-DEMO-001|Residential Address|Ward 10, Kathmandu (fictional)",
    hashHex: "2a6d295c1d8d25ca496125c1d46ef2854f643a818f0dd8ac84cd356644753011",
    issuedAt: 1790831700,
    verifiedAt: [1790934000, 1791111900],
    revokedAt: null,
  },
  {
    id: "TB-DEMO-002",
    type: "Education Certificate",
    agencyId: "education",
    sampleText: "DEMO|TB-DEMO-002|Education Certificate|Bachelor of Science (fictional)",
    hashHex: "975343678933c89d837856692461be4b6bc25047db922699ef9f7b5ac8fd108e",
    issuedAt: 1790922600,
    verifiedAt: [1791022320],
    revokedAt: null,
  },
  {
    id: "TB-DEMO-003",
    type: "Vehicle Registration",
    agencyId: "transport",
    sampleText: "DEMO|TB-DEMO-003|Vehicle Registration|Registration BA 1 PA 0000 (fictional)",
    hashHex: "e201c6845d3a53eea36b1b3aec6a2b5f2c038c4bffc01d5ddfb9f2c5c6f4c8cb",
    issuedAt: 1790927100,
    verifiedAt: [1791015600],
    revokedAt: 1791201600,
  },
  {
    id: "TB-DEMO-004",
    type: "Social Security Enrollment",
    agencyId: "social",
    sampleText: "DEMO|TB-DEMO-004|Social Security Enrollment|Enrollment record (fictional)",
    hashHex: "a06ccf6f14d65ed0c2415f0fa0784de7f0834590334f54bee562b3ce70d45815",
    issuedAt: 1791003000,
    verifiedAt: [1791120600],
    revokedAt: null,
  },
  {
    id: "TB-DEMO-005",
    type: "Driving License",
    agencyId: "transport",
    sampleText: "DEMO|TB-DEMO-005|Driving License|Category B licence (fictional)",
    hashHex: "2da7d48569618e453c505f86294d7e9a3efdb46c1421750ba869ce42e4a798b3",
    issuedAt: 1791090300,
    verifiedAt: [],
    revokedAt: null,
  },
];
