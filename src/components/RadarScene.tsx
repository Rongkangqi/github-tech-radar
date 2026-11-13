export default function RadarScene() {
  return <div className="radar-scene" aria-hidden="true">
    <div className="scene-aura" />
    <svg viewBox="0 0 800 620" fill="none" className="scene-drawing">
      <defs>
        <linearGradient id="chip-top" x1="260" y1="150" x2="500" y2="320" gradientUnits="userSpaceOnUse"><stop stopColor="#424a42" /><stop offset=".45" stopColor="#252c24" /><stop offset="1" stopColor="#10150f" /></linearGradient>
        <linearGradient id="chip-side" x1="260" y1="260" x2="540" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#2c3c20" /><stop offset=".5" stopColor="#8dbd43" /><stop offset="1" stopColor="#283b19" /></linearGradient>
        <linearGradient id="board-top" x1="200" y1="300" x2="550" y2="450" gradientUnits="userSpaceOnUse"><stop stopColor="#202b1b" /><stop offset="1" stopColor="#0a1008" /></linearGradient>
        <linearGradient id="trace" x1="100" y1="300" x2="700" y2="500" gradientUnits="userSpaceOnUse"><stop stopColor="#b4ed2a" stopOpacity="0" /><stop offset=".5" stopColor="#b4ed2a" /><stop offset="1" stopColor="#b4ed2a" stopOpacity="0" /></linearGradient>
        <radialGradient id="ground-glow"><stop stopColor="#9fe323" stopOpacity=".22" /><stop offset="1" stopColor="#9fe323" stopOpacity="0" /></radialGradient>
        <filter id="green-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" /></filter>
      </defs>
      <ellipse cx="400" cy="431" rx="325" ry="156" fill="url(#ground-glow)" />
      <g stroke="#527638" opacity=".23">
        {[0, 1, 2, 3, 4, 5, 6].map(n => <path key={'a'+n} d={`M ${56 + n * 65} ${306 - n * 20} l 360 208`} />)}
        {[0, 1, 2, 3, 4, 5, 6].map(n => <path key={'b'+n} d={`M ${744 - n * 65} ${306 - n * 20} l -360 208`} />)}
      </g>
      <ellipse cx="400" cy="373" rx="320" ry="146" stroke="#86bb45" strokeOpacity=".16" strokeDasharray="4 10" />
      <ellipse cx="400" cy="373" rx="273" ry="123" stroke="#a4e52b" strokeOpacity=".32" />
      <g className="scene-board">
        <path d="M400 230 620 356 400 484 180 356 400 230Z" fill="#121b0d" stroke="#47632b" />
        <path d="m180 356 220 128 220-128v15L400 500 180 371v-15Z" fill="#0b1108" stroke="#344924" />
        <path d="M400 210 620 337 400 465 180 337 400 210Z" fill="url(#board-top)" stroke="#78984f" />
        <path d="m180 337 220 128 220-128v14L400 480 180 351v-14Z" fill="#192512" stroke="#4d6b2f" />
        <g stroke="#b4ed2a" strokeWidth="2" opacity=".65">
          <path d="m309 317-49 28 68 40-51 30M488 316l62 36-69 40 42 24M350 361l-1 35 51 30 50-29v-35M354 265l-49-29-84 49M448 265l49-29 84 49" />
        </g>
        <g fill="#b4ed2a"><circle cx="277" cy="415" r="4" /><circle cx="523" cy="416" r="4" /><circle cx="221" cy="285" r="3" /><circle cx="581" cy="285" r="3" /></g>
      </g>
      <g className="scene-chip">
        <path d="M400 163 555 252 400 342 245 252 400 163Z" fill="#aff029" opacity=".35" filter="url(#green-glow)" />
        <path d="m258 220 142 82 142-82v35L400 338 258 255v-35Z" fill="url(#chip-side)" stroke="#b7e67b" strokeOpacity=".6" />
        <path d="M400 138 542 220 400 302 258 220 400 138Z" fill="url(#chip-top)" stroke="#c8d7ba" strokeWidth="1.2" />
        <path d="M400 151 519 220 400 289 281 220 400 151Z" stroke="#8aab65" strokeOpacity=".48" />
        <g stroke="#b4ed2a" strokeOpacity=".8">
          {[0,1,2,3,4,5,6,7].map(n => <path key={n} d={`M${272 + n*16} ${237 + n*9.2} v14 M${528 - n*16} ${237 + n*9.2} v14`} />)}
        </g>
        <g transform="matrix(.866 .5 -.866 .5 400 181)">
          <rect x="-39" y="-20" width="78" height="65" rx="9" fill="#b4ed2a" />
          <circle cx="0" cy="12" r="23" stroke="#183008" strokeWidth="3" />
          <path d="M0 12 16-4M0-10v44M-22 12h44" stroke="#183008" strokeWidth="2" />
          <circle cx="0" cy="12" r="4" fill="#183008" />
        </g>
        <text x="397" y="269" textAnchor="middle" fill="#d8e4cf" fontSize="12" letterSpacing="4" transform="rotate(0 397 269)">R A D A R</text>
      </g>
      <g stroke="url(#trace)" strokeWidth="1.5"><path d="M180 337 100 291V209M620 337l76-44v-94M400 484v57" /></g>
      <g fill="#b4ed2a"><circle cx="100" cy="209" r="5" /><circle cx="696" cy="199" r="5" /><circle cx="400" cy="541" r="4" /></g>
      <g fill="#93a185" fontSize="11" letterSpacing="2" fontFamily="monospace"><text x="55" y="184">NEW IDEAS</text><text x="647" y="174">OPEN SOURCE</text><text x="357" y="569">NEXT / TECH</text></g>
      <path d="M400 109V70m-7 7 7-7 7 7" stroke="#b4ed2a" strokeOpacity=".4" />
    </svg>
    <div className="scene-caption"><span /> OPEN SOURCE. OPEN POSSIBILITIES.</div>
  </div>;
}
