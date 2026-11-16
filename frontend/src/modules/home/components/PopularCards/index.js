import hdfcImg from '../CreditCards/image/HDFC/hdfc.webp';
import sbiImg from '../CreditCards/image/SBI/SBI.webp';
import axisImg from '../CreditCards/image/AXIS/AXIS.webp';
import iciciImg from '../CreditCards/image/icici/ICICI.webp';
import yesImg from '../CreditCards/image/yes/yes bank.webp';
import kotakImg from '../CreditCards/image/kotak/KOTAK.webp';

export const popularCards = [
  { 
    name: "HDFC Millennia", 
    bank: "HDFC Bank", 
    features: ["5% Cashback", "Lounge Access", "Zero Forex"],
    image: hdfcImg,
    badge: "Most Selling"
  },
  { 
    name: "SBI SimplyCLICK", 
    bank: "SBI Card", 
    features: ["10X Rewards", "Amazon Voucher", "Fuel Waiver"],
    image: sbiImg,
    badge: "Most Selling"
  },
  { 
    name: "Axis Neo", 
    bank: "Axis Bank", 
    features: ["10% Off Dining", "BookMyShow Deals", "Reward Points"],
    image: axisImg,
    badge: "Most Selling"
  },
  { 
    name: "ICICI Coral", 
    bank: "ICICI Bank", 
    features: ["Movie Discounts", "Dining Rewards", "Lounge Access"],
    image: iciciImg,
    badge: "Most Selling"
  },
  { 
    name: "Kotak League", 
    bank: "Kotak Bank", 
    features: ["Premium Rewards", "Zero Annual Fee", "Travel Perks"],
    image: kotakImg,
    badge: "Most Selling"
  },
  { 
    name: "Yes Bank BYOC", 
    bank: "Yes Bank", 
    features: ["Custom Rewards", "Flexible Categories", "Welcome Bonus"],
    image: yesImg,
    badge: "Most Selling"
  }
];
