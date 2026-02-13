import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const STATION_KEY  = process.env.STATION_KEY || "SNAP107_SECRET";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: { headers: { "x-station-key": STATION_KEY } }
});

// Proxy list to bypass CORS if needed
const PROXIES = [
  url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  url => `https://thingproxy.freeboard.io/fetch/${url}`
];

let proxyIndex = 0;

export default async function handler(req, res) {
  try {
    // Fetch current track
    const response = await fetch(PROXIES[proxyIndex](
      `http://sapircast.caster.fm:13044/status-json.xsl?cb=${Date.now()}`
    ));

    const json = await response.json();
    const data = json.contents ? JSON.parse(json.contents) : json;

    const nowTrack = data.icestats.source["display-title"]?.trim();
    if (!nowTrack) {
      return res.status(200).json({ message: "No track currently playing" });
    }

    // Check last logged track
    const { data: lastData } = await supabase
      .from("radio_history")
      .select("track_title")
      .order("created_at", { ascending: false })
      .limit(1);

    const lastLogged = lastData?.[0]?.track_title?.trim();

    if (nowTrack && nowTrack !== lastLogged) {
      const createdAt = new Date().toISOString();
      await supabase
        .from("radio_history")
        .insert([{ track_title: nowTrack, created_at: createdAt }]);
      console.log(`Logged new track: ${nowTrack}`);
    } else {
      console.log("Track already logged or empty");
    }

    res.status(200).json({ message: "Checked successfully" });
  } catch (err) {
    console.error("Error fetching track:", err);
    proxyIndex = (proxyIndex + 1) % PROXIES.length; // rotate proxy
    res.status(500).json({ error: err.message });
  }
}
