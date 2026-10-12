// SAMPLE DATA ONLY. These records are NOT on Solana. Hashes are real SHA-256 digests of the illustrative
// sample text beside them; timestamps are invented for the UI. The registry labels them "Sample".
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
    id: "PR-SAMPLE-001",
    type: "Residential Address",
    agencyId: "municipal",
    sampleText: "SAMPLE|PR-SAMPLE-001|Residential Address|Ward 10, Kathmandu (sample)",
    hashHex: "7168ad55d35c6540a5fd887182fcfa151e9a313b896fed64dc86f2bfbfd07fbd",
    issuedAt: 1790831700,
    verifiedAt: [1790934000, 1791111900],
    revokedAt: null,
  },
  {
    id: "PR-SAMPLE-002",
    type: "Education Certificate",
    agencyId: "education",
    sampleText: "SAMPLE|PR-SAMPLE-002|Education Certificate|Bachelor of Science (sample)",
    hashHex: "edfa19ed0aa80925532e1e65908c81bce82e22b2074b27d246eb3d85ae2f9e90",
    issuedAt: 1790922600,
    verifiedAt: [1791022320],
    revokedAt: null,
  },
  {
    id: "PR-SAMPLE-003",
    type: "Vehicle Registration",
    agencyId: "transport",
    sampleText: "SAMPLE|PR-SAMPLE-003|Vehicle Registration|Registration BA 1 PA 0000 (sample)",
    hashHex: "79fd4d71716656a734464cd0a91bad14ea6f3efddcde476a009694979b45f212",
    issuedAt: 1790927100,
    verifiedAt: [1791015600],
    revokedAt: 1791201600,
  },
  {
    id: "PR-SAMPLE-004",
    type: "Social Security Enrollment",
    agencyId: "social",
    sampleText: "SAMPLE|PR-SAMPLE-004|Social Security Enrollment|Enrollment record (sample)",
    hashHex: "76a8d20a78b9e95c9f9a3d3f47d3f2af1fc2a29df4ec8a046427387e79483bb3",
    issuedAt: 1791003000,
    verifiedAt: [1791120600],
    revokedAt: null,
  },
  {
    id: "PR-SAMPLE-005",
    type: "Driving License",
    agencyId: "transport",
    sampleText: "SAMPLE|PR-SAMPLE-005|Driving License|Category B licence (sample)",
    hashHex: "647815e4632fd8e3f1e64a7b133f51e6f9098c136ac446722f7466bc3e59390a",
    issuedAt: 1791090300,
    verifiedAt: [],
    revokedAt: null,
  },
];
