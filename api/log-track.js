import { createClient } from "@supabase/supabase-js";

// Use dynamic import for fetch in Vercel
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const STATION_KEY = process.env.STATION_KEY || "SNAP107_SECRET";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Supabase env vars are missing!");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: { headers: { "x-station-key": STATION_KEY } },
});

const PROXIES = [
  url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  url => `https://thingproxy.freeboard.io/fetch/${url}`
];

let proxyIndex = 0;

export default async function handler(req, res) {
  try {
    let json, data;
    const url = `http://sapircast.caster.fm:13044/status-json.xsl?cb=${Date.now()}`;

    try {
      const response = await fetch(PROXIES[proxyIndex](url));
      json = await response.json();
      data = json.contents ? JSON.parse(json.contents) : json;
    } catch (err) {
      proxyIndex = (proxyIndex + 1) % PROXIES.length;
      console.warn("Proxy fetch failed, rotating proxy:", err.message);
      return res.status(500).json({ error: "Failed to fetch track via proxy" });
    }

    const nowTrack = data.icestats?.source?.["display-title"]?.trim();
    if (!nowTrack) return res.status(200).json({ message: "No track playing" });

    // Get last logged track safely
    const { data: lastData, error: supError } = await supabase
      .from("radio_history")
      .select("track_title")
      .order("created_at", { ascending: false })
      .limit(1);

    if (supError) throw supError;

    const lastLogged = lastData?.[0]?.track_title?.trim();

    if (nowTrack && nowTrack !== lastLogged) {
      await supabase.from("radio_history").insert([{ track_title: nowTrack, created_at: new Date().toISOString() }]);
      console.log("Logged new track:", nowTrack);
    }

    res.status(200).json({ message: "Checked successfully", track: nowTrack });
  } catch (err) {
    console.error("Handler error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
