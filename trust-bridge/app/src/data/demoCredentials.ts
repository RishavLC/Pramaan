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
    id: "TB-SAMPLE-001",
    type: "Residential Address",
    agencyId: "municipal",
    sampleText: "SAMPLE|TB-SAMPLE-001|Residential Address|Ward 10, Kathmandu (sample)",
    hashHex: "bdbe354cf442b952843d428d485e47c7e55e139c535eab6068efaca63fbc7a9f",
    issuedAt: 1790831700,
    verifiedAt: [1790934000, 1791111900],
    revokedAt: null,
  },
  {
    id: "TB-SAMPLE-002",
    type: "Education Certificate",
    agencyId: "education",
    sampleText: "SAMPLE|TB-SAMPLE-002|Education Certificate|Bachelor of Science (sample)",
    hashHex: "726415a19364792f4afa04f1e39bd6dca9cd8c4a627c04f9d33b98bedca4eef6",
    issuedAt: 1790922600,
    verifiedAt: [1791022320],
    revokedAt: null,
  },
  {
    id: "TB-SAMPLE-003",
    type: "Vehicle Registration",
    agencyId: "transport",
    sampleText: "SAMPLE|TB-SAMPLE-003|Vehicle Registration|Registration BA 1 PA 0000 (sample)",
    hashHex: "de0e7a493c5014154a699b1510125908e7a6aa3468ed7378f8a6a621b4a070a5",
    issuedAt: 1790927100,
    verifiedAt: [1791015600],
    revokedAt: 1791201600,
  },
  {
    id: "TB-SAMPLE-004",
    type: "Social Security Enrollment",
    agencyId: "social",
    sampleText: "SAMPLE|TB-SAMPLE-004|Social Security Enrollment|Enrollment record (sample)",
    hashHex: "ed4e64cbc9b234c1495296f4556799d2128cc2519ad89ec15acadf45f14db640",
    issuedAt: 1791003000,
    verifiedAt: [1791120600],
    revokedAt: null,
  },
  {
    id: "TB-SAMPLE-005",
    type: "Driving License",
    agencyId: "transport",
    sampleText: "SAMPLE|TB-SAMPLE-005|Driving License|Category B licence (sample)",
    hashHex: "64e461cac47c9c70d55eebcb238e815cc54244a24a779eb5aa4ad45634969b9d",
    issuedAt: 1791090300,
    verifiedAt: [],
    revokedAt: null,
  },
];
