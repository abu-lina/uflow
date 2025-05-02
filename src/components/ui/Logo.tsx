interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className = '', width = 40, height = 40 }: LogoProps) {
  // Calculate scale based on the original SVG dimensions (385x384)
  const scale = Math.min(width / 385, height / 384);
  const scaledWidth = 385 * scale;
  const scaledHeight = 384 * scale;

  return (
    <svg
      className={className}
      height={scaledHeight}
      viewBox="0 0 385 384"
      width={scaledWidth}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_3037_7879)">
        <rect fill="#589D96" height="369.231" rx="184.615" width="369.231" x="7.88672" y="7.38672" />
        <g filter="url(#filter0_i_3037_7879)">
          <path d="M253.006 222.827C212.353 221.242 186.029 228.189 182.156 272.899C207.296 274.561 242.617 256.901 253.006 222.827Z" fill="#DBF7F4" />
        </g>
        <g filter="url(#filter1_i_3037_7879)">
          <path d="M182.156 156.927C182.156 130.214 203.812 108.559 230.525 108.559H291.526C305.479 108.559 316.791 119.87 316.791 133.823C316.791 147.777 305.479 159.088 291.526 159.088H230.525H182.156V156.927Z" fill="white" />
          <path d="M182.156 159.088L182.156 218.095C182.212 198.426 191.963 159.088 230.525 159.088H182.156Z" fill="white" />
        </g>
        <g filter="url(#filter2_i_3037_7879)">
          <path d="M146.28 272.656L201.712 272.656C182.044 272.6 146.28 262.736 146.28 223.73L146.28 272.656Z" fill="url(#paint0_linear_3037_7879)" />
          <path clipRule="evenodd" d="M95.7501 223.73C95.7501 250.751 117.655 272.656 144.676 272.656L146.28 272.656C109.047 272.656 95.7501 240.375 95.7501 223.73Z" fill="url(#paint1_linear_3037_7879)" fillRule="evenodd" />
          <path d="M121.015 108.519C107.061 108.519 95.75 119.83 95.75 133.783L95.7501 223.73C95.7501 240.375 109.047 272.656 146.28 272.656L146.28 223.73L146.28 133.783C146.279 119.83 134.968 108.519 121.015 108.519Z" fill="url(#paint2_linear_3037_7879)" />
        </g>
        <g filter="url(#filter3_i_3037_7879)">
          <path d="M182.156 221.468C182.156 194.755 203.812 173.099 230.525 173.099L262.463 172.242C276.747 171.859 288.534 183.334 288.534 197.623C288.534 211.38 277.58 222.635 263.828 223.004C253.009 223.294 240.529 223.629 230.525 223.897C211.636 223.897 182.156 223.897 182.156 223.897V221.468Z" fill="#F1FFFF" />
          <path d="M182.156 223.897C182.156 223.897 182.157 289.556 182.156 273.765C182.156 257.975 191.963 223.897 230.525 223.897C211.636 223.897 182.156 223.897 182.156 223.897Z" fill="#F1FFFF" />
        </g>
        <path d="M268.453 335.723C273.369 328.516 278.161 321.345 283.078 314.137C289.309 305.002 295.7 296.824 303.418 288.998C308.158 284.193 316.582 277.288 321.841 273.396C321.841 273.396 370.339 245.083 376 220.37L375.936 222.372C375.344 232.836 375.004 242.179 372.706 251.932C368.511 269.726 354.847 294.336 344.142 309.105C328.517 330.661 304.428 351.325 280.634 361.537C263.453 368.911 237.054 372.029 218.711 375.495C214.135 376.36 229.092 373.151 232.373 371.433C250.338 366.932 258.494 350.322 268.453 335.723Z" fill="url(#paint3_linear_3037_7879)" />
        <path d="M239.398 374.784C285.924 351.777 274.397 324.645 299.218 308.098C312.782 299.055 327.368 296.294 341.647 289.704C352.62 284.64 362.384 268.467 367.749 257.738C332.484 333.483 267.489 367.959 239.398 374.784Z" fill="white" fillOpacity="0.25" />
        <path d="M373.034 240.723C350.027 287.249 322.895 275.721 306.348 300.542C297.305 314.107 294.544 328.693 287.954 342.971C282.89 353.945 266.717 363.709 255.988 369.073C331.733 333.808 366.209 268.814 373.034 240.723Z" fill="white" fillOpacity="0.17" />
      </g>
      <rect fill="none" height="376.615" rx="188.308" stroke="url(#paint4_linear_3037_7879)" strokeWidth="7.38462" width="376.615" x="4.19441" y="3.69441" />
      <defs>
        <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="52.5962" id="filter0_i_3037_7879" width="70.8496" x="182.156" y="222.625">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
          <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
          <feOffset dy="2.95385" />
          <feGaussianBlur stdDeviation="1.10769" />
          <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0" />
          <feBlend in2="shape" mode="normal" result="effect1_innerShadow_3037_7879" />
        </filter>
        <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="112.489" id="filter1_i_3037_7879" width="134.635" x="182.156" y="108.559">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
          <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
          <feOffset dy="2.95385" />
          <feGaussianBlur stdDeviation="1.47692" />
          <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend in2="shape" mode="normal" result="effect1_innerShadow_3037_7879" />
        </filter>
        <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="167.093" id="filter2_i_3037_7879" width="105.963" x="95.75" y="108.518">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
          <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
          <feOffset dy="2.95385" />
          <feGaussianBlur stdDeviation="1.47692" />
          <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend in2="shape" mode="normal" result="effect1_innerShadow_3037_7879" />
        </filter>
        <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="106.938" id="filter3_i_3037_7879" width="106.377" x="182.156" y="172.232">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
          <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
          <feOffset dy="2.95385" />
          <feGaussianBlur stdDeviation="1.47692" />
          <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend in2="shape" mode="normal" result="effect1_innerShadow_3037_7879" />
        </filter>
        <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_3037_7879" x1="148.919" x2="148.731" y1="127.372" y2="272.656">
          <stop stopColor="#F1F2F2" />
          <stop offset="1" stopColor="#DBF7F4" />
        </linearGradient>
        <linearGradient gradientUnits="userSpaceOnUse" id="paint1_linear_3037_7879" x1="148.919" x2="148.731" y1="127.372" y2="272.656">
          <stop stopColor="#F1F2F2" />
          <stop offset="1" stopColor="#DBF7F4" />
        </linearGradient>
        <linearGradient gradientUnits="userSpaceOnUse" id="paint2_linear_3037_7879" x1="148.919" x2="148.731" y1="127.372" y2="272.656">
          <stop stopColor="#F1F2F2" />
          <stop offset="1" stopColor="#DBF7F4" />
        </linearGradient>
        <linearGradient gradientUnits="userSpaceOnUse" id="paint3_linear_3037_7879" x1="339.081" x2="290.711" y1="316.049" y2="271.003">
          <stop stopColor="#DBF7F4" />
          <stop offset="1" stopColor="#589D96" />
        </linearGradient>
        <linearGradient gradientUnits="userSpaceOnUse" id="paint4_linear_3037_7879" x1="320.625" x2="21.1791" y1="334.525" y2="35.0791">
          <stop stopColor="#DBF7F4" />
          <stop offset="1" stopColor="#589D96" />
        </linearGradient>
        <clipPath id="clip0_3037_7879">
          <rect fill="white" height="369.231" rx="184.615" width="369.231" x="7.88672" y="7.38672" />
        </clipPath>
      </defs>
    </svg>
  );
} 