import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  email: string;
  fullName: string;
  phoneNumber: string;
  companyName: string;
  companyAddress: string;
  mailingAddress: string | null;
  permitRegistryNumber: string;
  representativeId: string | null;
  role: "user" | "admin";
  profileComplete: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type UserRole = "user" | "admin";
