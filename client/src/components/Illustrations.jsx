/** Original SVG illustration: two people passing knowledge both ways. */
export function HeroIllustration() {
  return (
    <svg viewBox="0 0 560 480" className="hero-art" role="img" aria-label="Two people exchanging skills">
      <defs>
        <linearGradient id="hBlob" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#E8E1FF" /><stop offset="1" stopColor="#DCEAFF" /></linearGradient>
        <filter id="hShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#5B44C9" floodOpacity="0.12" /></filter>
      </defs>
      <path d="M90 250c0-120 90-200 200-196s190 70 186 180-80 210-200 212S90 370 90 250z" fill="url(#hBlob)" />
      <circle cx="470" cy="90" r="26" fill="#DDF4F0" />
      <circle cx="70" cy="380" r="16" fill="#E8E1FF" />

      {/* exchange arcs */}
      <path d="M170 170 C 240 90, 320 90, 390 170" fill="none" stroke="#7357E8" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 12" className="hero-arc" />
      <path d="M390 330 C 320 410, 240 410, 170 330" fill="none" stroke="#2E9E8F" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 12" className="hero-arc rev" />

      {/* person left */}
      <g filter="url(#hShadow)">
        <rect x="80" y="250" width="150" height="150" rx="60" fill="#7357E8" />
        <circle cx="155" cy="205" r="44" fill="#FFE2D1" />
        <path d="M111 200c0-30 20-50 46-50 24 0 42 16 44 40-14-8-34-12-50-6-14 6-26 10-40 16z" fill="#2B2350" />
        <rect x="185" y="300" width="84" height="56" rx="10" fill="#fff" />
        <rect x="195" y="312" width="44" height="6" rx="3" fill="#E8E1FF" />
        <rect x="195" y="324" width="62" height="6" rx="3" fill="#EAE7F2" />
        <rect x="195" y="336" width="34" height="6" rx="3" fill="#EAE7F2" />
      </g>
      {/* person right */}
      <g filter="url(#hShadow)">
        <rect x="330" y="250" width="150" height="150" rx="60" fill="#2E9E8F" />
        <circle cx="405" cy="205" r="44" fill="#C98B62" />
        <path d="M361 196c4-30 26-48 52-46 22 2 38 18 38 42-10-4-20-14-30-20-14 10-36 18-60 24z" fill="#1F1A33" />
        <circle cx="330" cy="315" r="30" fill="#fff" />
        <path d="M318 300v30M330 296v38M342 304v22" stroke="#2E9E8F" strokeWidth="5" strokeLinecap="round" />
      </g>

      {/* floating skill chips */}
      <g className="float a"><rect x="208" y="64" width="144" height="44" rx="22" fill="#fff" filter="url(#hShadow)" /><circle cx="232" cy="86" r="10" fill="#7357E8" /><text x="250" y="91" className="hero-chip">Python → </text></g>
      <g className="float b"><rect x="214" y="384" width="134" height="44" rx="22" fill="#fff" filter="url(#hShadow)" /><circle cx="238" cy="406" r="10" fill="#2E9E8F" /><text x="256" y="411" className="hero-chip">← React</text></g>
      <g className="float c"><rect x="410" y="120" width="112" height="56" rx="18" fill="#fff" filter="url(#hShadow)" /><text x="426" y="143" className="hero-mini">Match</text><text x="426" y="164" className="hero-big">94%</text></g>
      <g className="float d"><rect x="28" y="140" width="118" height="54" rx="18" fill="#fff" filter="url(#hShadow)" /><text x="44" y="162" className="hero-mini">Credits</text><text x="44" y="182" className="hero-big lav">+10 ✦</text></g>
    </svg>
  );
}

export function StepArt({ n }) {
  const colors = ['#E8E1FF', '#DCEAFF', '#DDF4F0', '#FDE7D8'];
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
      <rect width="56" height="56" rx="18" fill={colors[(n - 1) % 4]} />
      <text x="28" y="36" textAnchor="middle" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="700" fontSize="22" fill="#24213A">{n}</text>
    </svg>
  );
}
