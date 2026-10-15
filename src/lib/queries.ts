import type { SupabaseClient } from "@supabase/supabase-js";
import type { Circle, Member, PickupMode, Round } from "./types";

const AVATAR_COLORS = ["#55684a", "#8a6a3a", "#4a6b6e", "#6e5a8a", "#9c6b52", "#817a6a"];

function colorForIndex(i: number) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

function formatRelativeDate(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays <= 0) return "今天";
  if (diffDays === 1) return "昨天";
  return `${diffDays} 天前`;
}

type RawRoundMember = {
  user_id: string;
  ordered: boolean;
  paid: boolean;
  amount: number | null;
  users: { nickname: string } | null;
};

type RawRound = {
  id: string;
  mode: PickupMode;
  deadline_at: string;
  platform: string;
  status: string;
  group_order_url?: string;
  host_id?: string;
  circle_id?: string | null;
  free_shipping_threshold: number | null;
  delivery_fee: number | null;
  deliver_to: string | null;
  pickup_time: string | null;
  pickup_location: string | null;
  pickup_person: string | null;
  shops: { name: string } | null;
  circles: { name: string } | null;
  host: { nickname: string } | null;
  round_members: RawRoundMember[];
};

type RawRoundMemberWithRound = {
  ordered: boolean;
  paid: boolean;
  rounds: RawRound | null;
};

export async function fetchViewerNickname(
  supabase: SupabaseClient,
  viewerId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("nickname")
    .eq("id", viewerId)
    .maybeSingle();

  if (error) throw error;
  return data?.nickname ?? null;
}

export async function fetchViewerRounds(
  supabase: SupabaseClient,
  viewerId: string,
): Promise<Round[]> {
  const { data, error } = await supabase
    .from("round_members")
    .select(
      `ordered, paid,
       rounds!inner (
         id, mode, deadline_at, platform, status,
         free_shipping_threshold, delivery_fee, deliver_to,
         pickup_time, pickup_location, pickup_person,
         shops ( name ),
         circles ( name ),
         host:users!rounds_host_id_fkey ( nickname ),
         round_members ( user_id, ordered, paid, amount, users ( nickname ) )
       )`,
    )
    .eq("user_id", viewerId)
    .eq("rounds.status", "open");

  if (error) throw error;

  const rows = (data ?? []) as unknown as RawRoundMemberWithRound[];

  return rows
    .map((row) => row.rounds)
    .filter((round): round is RawRound => round !== null)
    .map((round) => {
      const members: Member[] = round.round_members.map((rm, i) => ({
        id: rm.user_id,
        nickname: rm.users?.nickname ?? "?",
        avatarColor: colorForIndex(i),
        ordered: rm.ordered,
      }));

      const currentTotal = round.round_members
        .filter((rm) => rm.ordered && rm.amount !== null)
        .reduce((sum, rm) => sum + Number(rm.amount), 0);

      const viewerRow = round.round_members.find((rm) => rm.user_id === viewerId);

      return {
        id: round.id,
        name: round.circles?.name ?? round.shops?.name ?? "揪團",
        shopName: round.shops?.name ?? "",
        platform: round.platform,
        hostNickname: round.host?.nickname ?? "?",
        mode: round.mode,
        deadline: round.deadline_at,
        members,
        viewerOrdered: viewerRow?.ordered ?? false,
        viewerPaid: viewerRow?.paid ?? false,
        freeShippingThreshold: round.free_shipping_threshold ?? undefined,
        currentTotal,
        deliverTo: round.deliver_to ?? undefined,
        pickupTime: round.pickup_time ?? undefined,
        pickupLocation: round.pickup_location ?? undefined,
        pickupPerson: round.pickup_person ?? undefined,
      } satisfies Round;
    });
}

type RawCircleMember = {
  user_id: string;
  users: { nickname: string } | null;
};

type RawCircle = {
  id: string;
  name: string;
  circle_members: RawCircleMember[];
};

type RawCircleMembership = {
  circles: RawCircle | null;
};

export async function fetchViewerCircles(
  supabase: SupabaseClient,
  viewerId: string,
): Promise<Circle[]> {
  const { data, error } = await supabase
    .from("circle_members")
    .select(`circles ( id, name, circle_members ( user_id, users ( nickname ) ) )`)
    .eq("user_id", viewerId);

  if (error) throw error;

  const circles = ((data ?? []) as unknown as RawCircleMembership[])
    .map((row) => row.circles)
    .filter((circle): circle is RawCircle => circle !== null);

  if (circles.length === 0) return [];

  const { data: roundRows, error: roundError } = await supabase
    .from("rounds")
    .select("circle_id, created_at")
    .in(
      "circle_id",
      circles.map((c) => c.id),
    );

  if (roundError) throw roundError;

  const roundCount = new Map<string, number>();
  const lastActive = new Map<string, string>();
  (roundRows ?? []).forEach((r: { circle_id: string; created_at: string }) => {
    roundCount.set(r.circle_id, (roundCount.get(r.circle_id) ?? 0) + 1);
    const prev = lastActive.get(r.circle_id);
    if (!prev || r.created_at > prev) lastActive.set(r.circle_id, r.created_at);
  });

  return circles.map((circle) => {
    const members: Member[] = circle.circle_members.map((cm, i) => ({
      id: cm.user_id,
      nickname: cm.users?.nickname ?? "?",
      avatarColor: colorForIndex(i),
      ordered: true,
    }));

    const lastActiveIso = lastActive.get(circle.id);

    return {
      id: circle.id,
      name: circle.name,
      memberCount: members.length,
      roundCount: roundCount.get(circle.id) ?? 0,
      lastActiveLabel: lastActiveIso ? formatRelativeDate(lastActiveIso) : "尚未揪過團",
      members,
    } satisfies Circle;
  });
}

// --- 團頁面（F-20 ~ F-35） -------------------------------------------

export type RoundMemberDetail = Member & { amount: number | null; paid: boolean };

export type RoundDetail = {
  id: string;
  name: string;
  shopName: string;
  platform: string;
  groupOrderUrl: string;
  status: string;
  circleId: string | null;
  hostId: string;
  hostNickname: string;
  mode: PickupMode;
  deadline: string;
  freeShippingThreshold?: number;
  currentTotal: number;
  deliverTo?: string;
  pickupTime?: string;
  pickupLocation?: string;
  pickupPerson?: string;
  members: RoundMemberDetail[];
};

export async function fetchRoundDetail(
  supabase: SupabaseClient,
  roundId: string,
): Promise<RoundDetail | null> {
  const { data, error } = await supabase
    .from("rounds")
    .select(
      `id, mode, deadline_at, platform, status, group_order_url, host_id, circle_id,
       free_shipping_threshold, delivery_fee, deliver_to,
       pickup_time, pickup_location, pickup_person,
       shops ( name ),
       circles ( name ),
       host:users!rounds_host_id_fkey ( nickname ),
       round_members ( user_id, ordered, paid, amount, users ( nickname ) )`,
    )
    .eq("id", roundId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const round = data as unknown as RawRound;

  const members: RoundMemberDetail[] = round.round_members.map((rm, i) => ({
    id: rm.user_id,
    nickname: rm.users?.nickname ?? "?",
    avatarColor: colorForIndex(i),
    ordered: rm.ordered,
    amount: rm.amount,
    paid: rm.paid,
  }));

  const currentTotal = round.round_members
    .filter((rm) => rm.ordered && rm.amount !== null)
    .reduce((sum, rm) => sum + Number(rm.amount), 0);

  return {
    id: round.id,
    name: round.circles?.name ?? round.shops?.name ?? "揪團",
    shopName: round.shops?.name ?? "",
    platform: round.platform,
    groupOrderUrl: round.group_order_url ?? "",
    status: round.status,
    circleId: round.circle_id ?? null,
    hostId: round.host_id ?? "",
    hostNickname: round.host?.nickname ?? "?",
    mode: round.mode,
    deadline: round.deadline_at,
    freeShippingThreshold: round.free_shipping_threshold ?? undefined,
    currentTotal,
    deliverTo: round.deliver_to ?? undefined,
    pickupTime: round.pickup_time ?? undefined,
    pickupLocation: round.pickup_location ?? undefined,
    pickupPerson: round.pickup_person ?? undefined,
    members,
  };
}

export async function markOrdered(
  supabase: SupabaseClient,
  roundId: string,
  viewerId: string,
  amount: number,
) {
  const { error } = await supabase
    .from("round_members")
    .update({ ordered: true, amount })
    .eq("round_id", roundId)
    .eq("user_id", viewerId);
  if (error) throw error;
}

export async function markPaid(
  supabase: SupabaseClient,
  roundId: string,
  viewerId: string,
  paid: boolean,
) {
  const { error } = await supabase
    .from("round_members")
    .update({ paid })
    .eq("round_id", roundId)
    .eq("user_id", viewerId);
  if (error) throw error;
}

export async function removeMember(supabase: SupabaseClient, roundId: string, memberId: string) {
  const { error } = await supabase
    .from("round_members")
    .delete()
    .eq("round_id", roundId)
    .eq("user_id", memberId);
  if (error) throw error;
}

export type CommentItem = {
  id: string;
  userId: string;
  nickname: string;
  content: string;
  createdAt: string;
};

type RawComment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  users: { nickname: string } | null;
};

export async function fetchComments(
  supabase: SupabaseClient,
  roundId: string,
): Promise<CommentItem[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("id, user_id, content, created_at, users ( nickname )")
    .eq("round_id", roundId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as unknown as RawComment[]).map((c) => ({
    id: c.id,
    userId: c.user_id,
    nickname: c.users?.nickname ?? "?",
    content: c.content,
    createdAt: c.created_at,
  }));
}

export async function addComment(
  supabase: SupabaseClient,
  roundId: string,
  viewerId: string,
  content: string,
) {
  const { error } = await supabase
    .from("comments")
    .insert({ round_id: roundId, user_id: viewerId, content });
  if (error) throw error;
}

export async function fetchPaymentAccount(
  supabase: SupabaseClient,
  roundId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("round_payment_info")
    .select("payment_account")
    .eq("round_id", roundId)
    .maybeSingle();

  // 沒權限（還沒點好了）時 Supabase 會回傳空結果而不是錯誤，這裡保守地把任何錯誤當作「看不到」處理。
  if (error) return null;
  return data?.payment_account ?? null;
}

export async function savePaymentAccount(
  supabase: SupabaseClient,
  roundId: string,
  account: string,
) {
  const { error } = await supabase
    .from("round_payment_info")
    .upsert({ round_id: roundId, payment_account: account });
  if (error) throw error;
}

// --- 開團表單（F-10 ~ F-15） -------------------------------------------

export type Platform = "you_order" | "uber_eats" | "foodpanda" | "shop_own";

export type ShopOption = { id: string; name: string };

export async function fetchShops(supabase: SupabaseClient): Promise<ShopOption[]> {
  const { data, error } = await supabase.from("shops").select("id, name").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createShop(supabase: SupabaseClient, name: string, viewerId: string) {
  const { data, error } = await supabase
    .from("shops")
    .insert({ name, created_by: viewerId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export type NewRoundInput = {
  hostId: string;
  shopId: string;
  platform: Platform;
  groupOrderUrl: string;
  mode: PickupMode;
  deadlineAt: string;
  circleId?: string;
  // 外送
  freeShippingThreshold?: number;
  deliveryFee?: number;
  deliverTo?: string;
  // 自取
  pickupTime?: string;
  pickupLocation?: string;
  pickupPerson?: string;
  notifyMemberIds?: string[];
};

export async function createRound(supabase: SupabaseClient, input: NewRoundInput): Promise<string> {
  const { data, error } = await supabase
    .from("rounds")
    .insert({
      host_id: input.hostId,
      shop_id: input.shopId,
      platform: input.platform,
      group_order_url: input.groupOrderUrl,
      mode: input.mode,
      deadline_at: input.deadlineAt,
      circle_id: input.circleId ?? null,
      free_shipping_threshold: input.freeShippingThreshold ?? null,
      delivery_fee: input.deliveryFee ?? null,
      deliver_to: input.deliverTo ?? null,
      pickup_time: input.pickupTime ?? null,
      pickup_location: input.pickupLocation ?? null,
      pickup_person: input.pickupPerson ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;

  const notifyIds = (input.notifyMemberIds ?? []).filter((id) => id !== input.hostId);
  const memberRows = [input.hostId, ...notifyIds].map((userId) => ({
    round_id: data.id,
    user_id: userId,
  }));

  const { error: memberError } = await supabase.from("round_members").insert(memberRows);

  if (memberError) throw memberError;

  return data.id as string;
}

// --- 加入流程（F-01） ---------------------------------------------------

export async function updateNickname(supabase: SupabaseClient, viewerId: string, nickname: string) {
  const { error } = await supabase.from("users").update({ nickname }).eq("id", viewerId);
  if (error) throw error;
}

export async function isRoundMember(
  supabase: SupabaseClient,
  roundId: string,
  viewerId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("round_members")
    .select("user_id")
    .eq("round_id", roundId)
    .eq("user_id", viewerId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function joinRound(
  supabase: SupabaseClient,
  roundId: string,
  viewerId: string,
  circleId?: string | null,
) {
  const { error } = await supabase
    .from("round_members")
    .upsert({ round_id: roundId, user_id: viewerId }, { onConflict: "round_id,user_id" });
  if (error) throw error;

  // 續團時，透過連結加入的人預設自動成為團友圈成員（F-41）。
  if (circleId) {
    const { error: circleError } = await supabase
      .from("circle_members")
      .upsert({ circle_id: circleId, user_id: viewerId }, { onConflict: "circle_id,user_id" });
    if (circleError) throw circleError;
  }
}

// --- 個人頁（我） --------------------------------------------------------

export type UserProfile = {
  nickname: string;
  pushEnabled: boolean;
  defaultPaymentAccount: string | null;
};

export async function fetchUserProfile(
  supabase: SupabaseClient,
  viewerId: string,
): Promise<UserProfile> {
  const [{ data: userRow, error: userError }, { data: settingsRow, error: settingsError }] =
    await Promise.all([
      supabase.from("users").select("nickname, push_enabled").eq("id", viewerId).single(),
      supabase
        .from("user_settings")
        .select("default_payment_account")
        .eq("user_id", viewerId)
        .maybeSingle(),
    ]);

  if (userError) throw userError;
  if (settingsError) throw settingsError;

  return {
    nickname: userRow.nickname,
    pushEnabled: userRow.push_enabled,
    defaultPaymentAccount: settingsRow?.default_payment_account ?? null,
  };
}

export async function updatePushEnabled(supabase: SupabaseClient, viewerId: string, enabled: boolean) {
  const { error } = await supabase.from("users").update({ push_enabled: enabled }).eq("id", viewerId);
  if (error) throw error;
}

export async function saveDefaultPaymentAccount(
  supabase: SupabaseClient,
  viewerId: string,
  account: string,
) {
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: viewerId, default_payment_account: account }, { onConflict: "user_id" });
  if (error) throw error;
}

// --- 團友圈詳情頁（F-40 ~ F-46） -----------------------------------------

export type CircleRoundSummary = {
  id: string;
  name: string;
  shopName: string;
  status: string;
  deadline: string;
  createdAt: string;
};

export type CircleDetail = {
  id: string;
  name: string;
  members: Member[];
  rounds: CircleRoundSummary[];
};

type RawCircleWithMembers = {
  id: string;
  name: string;
  circle_members: RawCircleMember[];
};

export type NotifyCandidate = Member & { pushEnabled: boolean };

export async function fetchCircleNotifyCandidates(
  supabase: SupabaseClient,
  circleId: string,
  excludeUserId: string,
): Promise<NotifyCandidate[]> {
  const { data, error } = await supabase
    .from("circle_members")
    .select("user_id, users ( nickname, push_enabled )")
    .eq("circle_id", circleId);

  if (error) throw error;

  return ((data ?? []) as unknown as {
    user_id: string;
    users: { nickname: string; push_enabled: boolean } | null;
  }[])
    .filter((row) => row.user_id !== excludeUserId)
    .map((row, i) => ({
      id: row.user_id,
      nickname: row.users?.nickname ?? "?",
      avatarColor: colorForIndex(i),
      ordered: false,
      pushEnabled: row.users?.push_enabled ?? false,
    }));
}

export async function fetchCircleDetail(
  supabase: SupabaseClient,
  circleId: string,
): Promise<CircleDetail | null> {
  const { data: circleRow, error: circleError } = await supabase
    .from("circles")
    .select("id, name, circle_members ( user_id, users ( nickname ) )")
    .eq("id", circleId)
    .maybeSingle();

  if (circleError) throw circleError;
  if (!circleRow) return null;

  const circle = circleRow as unknown as RawCircleWithMembers;

  const { data: roundRows, error: roundError } = await supabase
    .from("rounds")
    .select("id, status, deadline_at, created_at, shops ( name ), circles ( name )")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: false });

  if (roundError) throw roundError;

  const members: Member[] = circle.circle_members.map((cm, i) => ({
    id: cm.user_id,
    nickname: cm.users?.nickname ?? "?",
    avatarColor: colorForIndex(i),
    ordered: true,
  }));

  const rounds: CircleRoundSummary[] = (
    (roundRows ?? []) as unknown as {
      id: string;
      status: string;
      deadline_at: string;
      created_at: string;
      shops: { name: string } | null;
      circles: { name: string } | null;
    }[]
  ).map((r) => ({
    id: r.id,
    name: r.circles?.name ?? r.shops?.name ?? "揪團",
    shopName: r.shops?.name ?? "",
    status: r.status,
    deadline: r.deadline_at,
    createdAt: r.created_at,
  }));

  return { id: circle.id, name: circle.name, members, rounds };
}

export async function leaveCircle(supabase: SupabaseClient, circleId: string, viewerId: string) {
  const { error } = await supabase
    .from("circle_members")
    .delete()
    .eq("circle_id", circleId)
    .eq("user_id", viewerId);
  if (error) throw error;
}

// --- 品牌/店家頁（F-60 ~ F-65） ------------------------------------------

export type ShopListItem = {
  id: string;
  name: string;
  lastOrderedLabel: string | null;
};

export async function fetchShopList(
  supabase: SupabaseClient,
  viewerId: string,
): Promise<ShopListItem[]> {
  const [{ data: shopRows, error: shopError }, { data: memberRows, error: memberError }] =
    await Promise.all([
      supabase.from("shops").select("id, name").order("name"),
      supabase
        .from("round_members")
        .select("rounds ( shop_id, created_at )")
        .eq("user_id", viewerId),
    ]);

  if (shopError) throw shopError;
  if (memberError) throw memberError;

  const lastOrderedAt = new Map<string, string>();
  (
    (memberRows ?? []) as unknown as { rounds: { shop_id: string; created_at: string } | null }[]
  ).forEach((row) => {
    if (!row.rounds) return;
    const prev = lastOrderedAt.get(row.rounds.shop_id);
    if (!prev || row.rounds.created_at > prev) lastOrderedAt.set(row.rounds.shop_id, row.rounds.created_at);
  });

  return (shopRows ?? []).map((shop) => ({
    id: shop.id,
    name: shop.name,
    lastOrderedLabel: lastOrderedAt.has(shop.id) ? formatRelativeDate(lastOrderedAt.get(shop.id)!) : null,
  }));
}

export type ShopPlatformItem = {
  id: string;
  platform: Platform;
  url: string;
  supportsPickup: boolean;
  supportsDelivery: boolean;
};

export type ShopDetail = {
  id: string;
  name: string;
  platforms: ShopPlatformItem[];
};

export async function fetchShopDetail(
  supabase: SupabaseClient,
  shopId: string,
): Promise<ShopDetail | null> {
  const { data: shopRow, error: shopError } = await supabase
    .from("shops")
    .select("id, name")
    .eq("id", shopId)
    .maybeSingle();

  if (shopError) throw shopError;
  if (!shopRow) return null;

  const { data: platformRows, error: platformError } = await supabase
    .from("shop_platforms")
    .select("id, platform, url, supports_pickup, supports_delivery")
    .eq("shop_id", shopId);

  if (platformError) throw platformError;

  return {
    id: shopRow.id,
    name: shopRow.name,
    platforms: (platformRows ?? []).map((p) => ({
      id: p.id,
      platform: p.platform,
      url: p.url,
      supportsPickup: p.supports_pickup,
      supportsDelivery: p.supports_delivery,
    })),
  };
}

export type DrinkSummary = {
  id: string;
  name: string;
  category: string | null;
  referencePrice: number | null;
  avgStars: number | null;
  reviewCount: number;
  topSweetness: string | null;
  topIce: string | null;
};

function mostCommon(values: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  values.forEach((v) => {
    if (!v) return;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  });
  let best: string | null = null;
  let bestCount = 0;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  });
  return best;
}

export async function fetchShopDrinks(
  supabase: SupabaseClient,
  shopId: string,
): Promise<DrinkSummary[]> {
  const { data: drinkRows, error: drinkError } = await supabase
    .from("drinks")
    .select("id, name, category, reference_price")
    .eq("shop_id", shopId)
    .eq("is_discontinued", false)
    .order("category");

  if (drinkError) throw drinkError;
  if (!drinkRows || drinkRows.length === 0) return [];

  const drinkIds = drinkRows.map((d) => d.id);
  const { data: reviewRows, error: reviewError } = await supabase
    .from("reviews")
    .select("drink_id, stars, sweetness, ice")
    .in("drink_id", drinkIds);

  if (reviewError) throw reviewError;

  const reviewsByDrink = new Map<string, { stars: number; sweetness: string | null; ice: string | null }[]>();
  (reviewRows ?? []).forEach((r) => {
    const list = reviewsByDrink.get(r.drink_id) ?? [];
    list.push({ stars: r.stars, sweetness: r.sweetness, ice: r.ice });
    reviewsByDrink.set(r.drink_id, list);
  });

  return drinkRows.map((drink) => {
    const reviews = reviewsByDrink.get(drink.id) ?? [];
    const avgStars =
      reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length : null;

    return {
      id: drink.id,
      name: drink.name,
      category: drink.category,
      referencePrice: drink.reference_price,
      avgStars,
      reviewCount: reviews.length,
      topSweetness: mostCommon(reviews.map((r) => r.sweetness)),
      topIce: mostCommon(reviews.map((r) => r.ice)),
    } satisfies DrinkSummary;
  });
}

export type ViewerReview = {
  stars: number;
  sweetness: string | null;
  ice: string | null;
  comment: string | null;
};

export async function fetchViewerReview(
  supabase: SupabaseClient,
  drinkId: string,
  viewerId: string,
): Promise<ViewerReview | null> {
  const { data, error } = await supabase
    .from("reviews")
    .select("stars, sweetness, ice, comment")
    .eq("drink_id", drinkId)
    .eq("user_id", viewerId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function fetchViewerIsAnonymous(supabase: SupabaseClient, viewerId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .select("is_anonymous")
    .eq("id", viewerId)
    .single();
  if (error) throw error;
  return data.is_anonymous;
}

export async function upsertReview(
  supabase: SupabaseClient,
  drinkId: string,
  viewerId: string,
  review: ViewerReview,
) {
  const { error } = await supabase.from("reviews").upsert(
    {
      drink_id: drinkId,
      user_id: viewerId,
      stars: review.stars,
      sweetness: review.sweetness,
      ice: review.ice,
      comment: review.comment,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "drink_id,user_id" },
  );
  if (error) throw error;
}
