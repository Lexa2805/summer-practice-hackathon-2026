import type { EventItem, Group, Message, Profile, Sport } from "@/lib/types";

export const demoUserId = "demo-alex";

export const sports: Sport[] = [
  { id: "football", name: "Football", min_players: 10, max_players: 14 },
  { id: "tennis", name: "Tennis", min_players: 2, max_players: 4 },
  { id: "basketball", name: "Basketball", min_players: 6, max_players: 10 },
  { id: "running", name: "Running", min_players: 2, max_players: 20 },
  { id: "volleyball", name: "Volleyball", min_players: 8, max_players: 12 }
];

export const profile: Profile = {
  id: demoUserId,
  full_name: "Alex Popescu",
  username: "alexruns",
  description: "Weekend runner, casual tennis player, always up for after-work matches.",
  avatar_url: "",
  city: "Bucharest",
  sports: ["Running", "Tennis"]
};

export const groups: Group[] = [
  {
    id: "demo-running-group",
    sport_id: "running",
    sport_name: "Running",
    captain_id: demoUserId,
    captain_name: "Alex Popescu",
    status: "ready",
    member_count: 3,
    members: [
      profile,
      {
        id: "demo-mira",
        full_name: "Mira Ionescu",
        username: "mira_moves",
        description: "Basketball guard and volleyball fan.",
        city: "Bucharest",
        sports: ["Basketball", "Volleyball", "Running"]
      },
      {
        id: "demo-vlad",
        full_name: "Vlad Matei",
        username: "vladfc",
        description: "Football defender and casual runner.",
        city: "Bucharest",
        sports: ["Football", "Running"]
      }
    ],
    created_at: new Date().toISOString()
  }
];

export const events: EventItem[] = [
  {
    id: "demo-event-1",
    title: "Sunset run in Herastrau",
    created_by: demoUserId,
    sport_id: "running",
    sport_name: "Running",
    location_name: "King Michael I Park",
    event_time: new Date().toISOString(),
    price_estimate: 0
  },
  {
    id: "demo-event-2",
    title: "Friendly tennis doubles",
    created_by: "demo-mira",
    sport_id: "tennis",
    sport_name: "Tennis",
    location_name: "Tineretului Courts",
    event_time: new Date().toISOString(),
    price_estimate: 60
  }
];

export const messages: Message[] = [
  {
    id: "message-1",
    group_id: "demo-running-group",
    sender_name: "Alex",
    content: "I can bring the route. Who is in for 7 PM?",
    created_at: new Date().toISOString()
  },
  {
    id: "message-2",
    group_id: "demo-running-group",
    sender_name: "Mira",
    content: "In. Easy pace works best for me today.",
    created_at: new Date().toISOString()
  }
];

