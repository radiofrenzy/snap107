import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const response = await fetch('http://sapircast.caster.fm:13044/status-json.xsl');
    const data = await response.json();
    const listeners = data.icestats?.source?.listeners || 0;
    res.status(200).json({ listeners });
  } catch (err) {
    console.error(err);
    res.status(200).json({ listeners: 0 });
  }
}
