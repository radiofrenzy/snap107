// /api/listeners.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const response = await fetch(`http://sapircast.caster.fm:13044/status-json.xsl?cb=${Date.now()}`);
    const json = await response.json();

    // Sometimes Icecast wraps JSON in "contents"
    let data = json;
    if (json.contents) {
      data = JSON.parse(json.contents);
    }

    // Optional: just return listeners
    const listeners = data.icestats?.source?.listeners || 0;

    res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate"); // cache 5s
    res.status(200).json({ listeners });
  } catch (err) {
    console.error(err);
    res.status(500).json({ listeners: 0 });
  }
}
