import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const STATION_KEY  = process.env.STATION_KEY || "SNAP107_SECRET";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: { headers: { "x-station-key": STATION_KEY } }
});

const PROXIES = [
  url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  url => `https://thingproxy.freeboard.io/fetch/${url}`
];

let proxyIndex = 0;

export default async function handler(req, res) {
  try {
    const proxyUrl = PROXIES[proxyIndex](`http://sapircast.caster.fm:13044/status-json.xsl?cb=${Date.now()}`);
    
    // Fetch with 10s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeout);

    const json = await response.json();
    const content = json.contents ? JSON.parse(json.contents) : json;

    const nowTrack = content.icestats.source["display-title"]?.trim();
    if (!nowTrack) {
      return res.status(200).json({ message: "No track currently playing" });
    }

    const { data: lastData } = await supabase
      .from("radio_history")
      .select("track_title")
      .order("created_at", { ascending: false })
      .limit(1);

    const lastLogged = lastData?.[0]?.track_title?.trim();

    if (nowTrack !== lastLogged) {
      const createdAt = new Date().toISOString();
      await supabase.from("radio_history").insert([{ track_title: nowTrack, created_at: createdAt }]);
      console.log(`Logged new track: ${nowTrack}`);
    }

    res.status(200).json({ message: "Checked successfully", track: nowTrack });

  } catch (err) {
    console.error("Error fetching track:", err);
    proxyIndex = (proxyIndex + 1) % PROXIES.length;
    res.status(500).json({ error: err.message });
  }
}
