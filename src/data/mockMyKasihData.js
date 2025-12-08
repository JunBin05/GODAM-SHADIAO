export const myKasihData = {
  // Eligible User (e.g., Ah Gong)
  "111": {
    eligible: true,
    balance: "RM 1,200.00",
    myKasihExpiry: "31 Dec 2025",
    saraBalance: "RM 600.00",
    saraNextPayment: "01 Jan 2026",
    lastTransaction: "RM 50.00 at 99 Speedmart",
    status: "Active"
  },
  // Not Eligible User
  "222": {
    eligible: false
  }
};

export const myKasihShops = [
  { 
    id: 1, 
    name: "99 Speedmart", 
    address: "No. 12, Jalan 1/1, Taman Contoh",
    distance: "0.5 km",
    type: "Grocery"
  },
  { 
    id: 2, 
    name: "Mydin Hypermarket", 
    address: "Lot 123, Jalan Besar",
    distance: "2.1 km",
    type: "Hypermarket"
  },
  { 
    id: 3, 
    name: "Kedai Runcit Ali", 
    address: "No. 5, Kampung Baru",
    distance: "1.2 km",
    type: "Local Store"
  },
  { 
    id: 4, 
    name: "Lotus's", 
    address: "Jalan Utara, Petaling Jaya",
    distance: "5.0 km",
    type: "Hypermarket"
  }
];
