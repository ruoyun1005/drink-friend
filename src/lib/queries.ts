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
