export const strData = {
  // Eligible User (e.g., Ah Gong)
  "111": {
    eligible: true,
    upcoming: [
      {
        phase: "Phase 4 (2025)",
        amount: "RM 800",
        date: "November 2025",
        status: "Scheduled"
      },
      {
        phase: "Phase 1 (2026)",
        amount: "RM 500",
        date: "February 2026",
        status: "Pending"
      },
      {
        phase: "Phase 2 (2026)",
        amount: "RM 300",
        date: "May 2026",
        status: "Pending"
      }
    ],
    recent: {
      phase: "Phase 3 (2025)",
      amount: "RM 300",
      date: "August 2025",
      status: "depositedStatus",
      bankDetails: "(Bank Simpanan Nasional - ****1234)"
    }
  },
  // Not Eligible User
  "222": {
    eligible: false
  }
};

export const bsnBranches = [
  { 
    id: 1, 
    name: "BSN KL Main Branch", 
    address: "Wisma BSN, 117, Jalan Ampang, 50450 Kuala Lumpur",
    distance: "2.5 km"
  },
  { 
    id: 2, 
    name: "BSN Lebuh Ampang", 
    address: "No. 28-30, Lebuh Ampang, 50100 Kuala Lumpur",
    distance: "3.1 km"
  },
  { 
    id: 3, 
    name: "BSN Chow Kit", 
    address: "No. 389, Jalan Tuanku Abdul Rahman, 50100 Kuala Lumpur",
    distance: "4.2 km"
  }
];