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
    address: "No. 12, Jalan 1/1, Taman Contoh, Petaling Jaya",
    distance: 0.5,
    distance_km: 0.5,
    type: "grocery",
    latitude: 3.1088,
    longitude: 101.6415
  },
  { 
    id: 2, 
    name: "Mydin Hypermarket", 
    address: "Lot 123, Jalan Besar, Kuala Lumpur",
    distance: 2.1,
    distance_km: 2.1,
    type: "hypermarket",
    latitude: 3.1390,
    longitude: 101.6869
  },
  { 
    id: 3, 
    name: "Kedai Runcit Ali", 
    address: "No. 5, Kampung Baru, Kuala Lumpur",
    distance: 1.2,
    distance_km: 1.2,
    type: "grocery",
    latitude: 3.1725,
    longitude: 101.7014
  },
  { 
    id: 4, 
    name: "Lotus's", 
    address: "Jalan Utara, Petaling Jaya, Selangor",
    distance: 5.0,
    distance_km: 5.0,
    type: "hypermarket",
    latitude: 3.0989,
    longitude: 101.6078
  },
  { 
    id: 5, 
    name: "Village Grocer", 
    address: "Bangsar Village, Kuala Lumpur",
    distance: 2.8,
    distance_km: 2.8,
    type: "grocery",
    latitude: 3.1284,
    longitude: 101.6693
  }
];
