
export default async function handler(req, res) {
  try {
    const response = await fetch(
      'https://radiofrenzy.duckdns.org/icecast-stats',
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`Icecast returned ${response.status}`);
    }

    const data = await response.json();
    const source = data.icestats?.source;

    // Find the SNAP 107 stream
    const streams = Array.isArray(source) ? source : [source];
    const snapStream = streams.find(stream =>
      stream?.listenurl?.endsWith('/stream')
    );

    const listeners = Number(snapStream?.listeners) || 0;

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ listeners });

  } catch (err) {
    console.error('Icecast listener count error:', err);
    res.status(200).json({ listeners: 0 });
  }
}
