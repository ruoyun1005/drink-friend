import type { Circle, Round } from "./types";

// 暫時資料，之後由 Supabase 查詢取代（見 F-70、F-71）。
export const mockRounds: Round[] = [
  {
    id: "r1",
    name: "呵呵團",
    shopName: "迷客夏",
    platform: "你訂",
    hostNickname: "囉囉囉",
    mode: "delivery",
    deadline: new Date(Date.now() + 36 * 60 * 1000 + 57 * 1000).toISOString(),
    freeShippingThreshold: 500,
    currentTotal: 380,
    deliverTo: "信義松仁路",
    viewerOrdered: false,
    viewerPaid: false,
    members: [
      { id: "m1", nickname: "囉", avatarColor: "#55684a", ordered: true },
      { id: "m2", nickname: "哈", avatarColor: "#8a6a3a", ordered: true },
      { id: "m3", nickname: "阿", avatarColor: "#4a6b6e", ordered: true },
      { id: "m4", nickname: "小", avatarColor: "#6e5a8a", ordered: true },
      { id: "m5", nickname: "嗚", avatarColor: "#817a6a", ordered: false },
      { id: "m6", nickname: "姐", avatarColor: "#817a6a", ordered: false },
    ],
  },
  {
    id: "r2",
    name: "哈哈團",
    shopName: "50嵐",
    platform: "foodpanda",
    hostNickname: "哈哈",
    mode: "pickup",
    deadline: new Date(Date.now() + 110 * 60 * 1000).toISOString(),
    pickupTime: "15:30",
    pickupLocation: "50嵐信義松仁店",
    pickupPerson: "嗚嗚",
    viewerOrdered: true,
    viewerPaid: false,
    members: [
      { id: "m7", nickname: "哈", avatarColor: "#8a6a3a", ordered: true },
      { id: "m8", nickname: "嗚", avatarColor: "#6e5a8a", ordered: true },
      { id: "m9", nickname: "阿", avatarColor: "#817a6a", ordered: false },
    ],
  },
];

export const mockCircles: Circle[] = [
  {
    id: "c1",
    name: "呵呵團",
    memberCount: 6,
    roundCount: 7,
    lastActiveLabel: "今天",
    members: [
      { id: "m1", nickname: "囉", avatarColor: "#55684a", ordered: true },
      { id: "m2", nickname: "哈", avatarColor: "#8a6a3a", ordered: true },
      { id: "m3", nickname: "阿", avatarColor: "#4a6b6e", ordered: true },
      { id: "m4", nickname: "小", avatarColor: "#6e5a8a", ordered: true },
      { id: "m5", nickname: "嗚", avatarColor: "#817a6a", ordered: true },
      { id: "m6", nickname: "姐", avatarColor: "#817a6a", ordered: true },
    ],
  },
  {
    id: "c2",
    name: "哈哈團",
    memberCount: 3,
    roundCount: 3,
    lastActiveLabel: "今天",
    members: [
      { id: "m7", nickname: "哈", avatarColor: "#8a6a3a", ordered: true },
      { id: "m8", nickname: "嗚", avatarColor: "#6e5a8a", ordered: true },
      { id: "m9", nickname: "阿", avatarColor: "#817a6a", ordered: true },
    ],
  },
];
