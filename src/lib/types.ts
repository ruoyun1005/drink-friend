export type PickupMode = "delivery" | "pickup";

export type Member = {
  id: string;
  nickname: string;
  avatarColor: string;
  ordered: boolean;
};

export type Round = {
  id: string;
  name: string;
  shopName: string;
  platform: string;
  hostNickname: string;
  mode: PickupMode;
  deadline: string; // ISO timestamp
  members: Member[];
  viewerOrdered: boolean;
  viewerPaid: boolean;
  // delivery-only
  freeShippingThreshold?: number;
  currentTotal?: number;
  deliverTo?: string;
  // pickup-only
  pickupTime?: string;
  pickupLocation?: string;
  pickupPerson?: string;
};

export type Circle = {
  id: string;
  name: string;
  memberCount: number;
  roundCount: number;
  lastActiveLabel: string;
  members: Member[];
};
