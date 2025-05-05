interface LogoProps {
  className?: string;
  height?: number;
  width?: number;
}

export function Logo({ className = '', height = 32, width = 32 }: LogoProps) {
  return (
    <svg
      className={className}
      fill="none"
      height={height}
      viewBox="0 0 32 32"
      width={width}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_3037_7775)">
        <rect
          fill="#589D96"
          height="30.7692"
          rx="15.3846"
          width="30.7692"
          x="0.615234"
          y="0.615234"
        />
        <g filter="url(#filter0_i_3037_7775)">
          <path
            d="M21.0428 18.5695C17.6551 18.4375 15.4614 19.0164 15.1387 22.7422C17.2337 22.8807 20.1771 21.409 21.0428 18.5695Z"
            fill="#DBF7F4"
          />
        </g>
        <g filter="url(#filter1_i_3037_7775)">
          <path
            d="M15.1387 13.0776C15.1387 10.8515 16.9433 9.04688 19.1694 9.04688L24.2528 9.04688C25.4156 9.04688 26.3582 9.98949 26.3582 11.1523C26.3582 12.315 25.4156 13.2577 24.2528 13.2577L19.1694 13.2577H15.1387V13.0776Z"
            fill="white"
          />
          <path
            d="M15.1387 13.2577L15.1387 18.1749C15.1433 16.5358 15.9559 13.2577 19.1694 13.2577H15.1387Z"
            fill="white"
          />
        </g>
        <g filter="url(#filter2_i_3037_7775)">
          <path
            d="M12.1483 22.7207L16.7677 22.7207C15.1286 22.716 12.1483 21.894 12.1483 18.6435L12.1483 22.7207Z"
            fill="url(#paint0_linear_3037_7775)"
          />
          <path
            clipRule="evenodd"
            d="M7.9375 18.6435C7.9375 20.8953 9.76292 22.7207 12.0147 22.7207L12.1483 22.7207C9.04561 22.7207 7.9375 20.0306 7.9375 18.6435Z"
            fill="url(#paint1_linear_3037_7775)"
            fillRule="evenodd"
          />
          <path
            d="M10.0429 9.04256C8.88012 9.04256 7.9375 9.98518 7.9375 11.148L7.9375 18.6435C7.9375 20.0306 9.04561 22.7207 12.1483 22.7207L12.1483 18.6435L12.1483 11.148C12.1483 9.98518 11.2057 9.04256 10.0429 9.04256Z"
            fill="url(#paint2_linear_3037_7775)"
          />
        </g>
        <g filter="url(#filter3_i_3037_7775)">
          <path
            d="M15.1387 18.4554C15.1387 16.2292 16.9433 14.4246 19.1694 14.4246L21.8309 14.3532C23.0213 14.3213 24.0035 15.2775 24.0035 16.4683C24.0035 17.6147 23.0907 18.5526 21.9447 18.5833C21.0431 18.6075 20.003 18.6354 19.1694 18.6578C17.5953 18.6578 15.1387 18.6578 15.1387 18.6578V18.4554Z"
            fill="#F1FFFF"
          />
          <path
            d="M15.1387 18.6578C15.1387 18.6578 15.1387 24.1293 15.1387 22.8135C15.1386 21.4976 15.9559 18.6578 19.1694 18.6578C17.5953 18.6578 15.1387 18.6578 15.1387 18.6578Z"
            fill="#F1FFFF"
          />
        </g>
        <path
          d="M22.3297 27.9776C22.7394 27.377 23.1387 26.7794 23.5485 26.1787C24.0678 25.4175 24.6003 24.7359 25.2435 24.0838C25.6385 23.6834 26.3405 23.108 26.7788 22.7837C26.7788 22.7837 30.8203 20.4243 31.292 18.3649L31.2867 18.5317C31.2373 19.4036 31.209 20.1822 31.0175 20.995C30.6679 22.4778 29.5293 24.5287 28.6372 25.7594C27.3351 27.5558 25.3277 29.2777 23.3448 30.1287C21.9131 30.7432 19.7131 31.0031 18.1846 31.2919C17.8032 31.364 19.0497 31.0965 19.3231 30.9534C20.8202 30.5783 21.4999 29.1941 22.3297 27.9776Z"
          fill="url(#paint3_linear_3037_7775)"
        />
        <path
          d="M19.9085 31.2324C23.7857 29.3151 22.8251 27.0541 24.8935 25.6751C26.0239 24.9216 27.2394 24.6915 28.4292 24.1424C29.3437 23.7203 30.1574 22.3726 30.6044 21.4785C27.6657 27.7905 22.2494 30.6635 19.9085 31.2324Z"
          fill="white"
          fillOpacity="0.25"
        />
        <path
          d="M31.0449 20.0609C29.1276 23.938 26.8666 22.9774 25.4876 25.0458C24.7341 26.1762 24.504 27.3917 23.9549 28.5816C23.5328 29.496 22.1851 30.3097 21.291 30.7567C27.603 27.818 30.476 22.4018 31.0449 20.0609Z"
          fill="white"
          fillOpacity="0.17"
        />
      </g>
      <rect
        fill="none"
        height="31.3846"
        rx="15.6923"
        stroke="url(#paint4_linear_3037_7775)"
        strokeWidth="0.615385"
        width="31.3846"
        x="0.307542"
        y="0.307542"
      />
      <defs>
        <filter
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          height="4.38383"
          id="filter0_i_3037_7775"
          width="5.9043"
          x="15.1387"
          y="18.5527"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <feOffset dy="0.246154" />
          <feGaussianBlur stdDeviation="0.0923077" />
          <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0" />
          <feBlend in2="shape" mode="normal" result="effect1_innerShadow_3037_7775" />
        </filter>
        <filter
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          height="9.37506"
          id="filter1_i_3037_7775"
          width="11.2188"
          x="15.1387"
          y="9.04688"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <feOffset dy="0.246154" />
          <feGaussianBlur stdDeviation="0.123077" />
          <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend in2="shape" mode="normal" result="effect1_innerShadow_3037_7775" />
        </filter>
        <filter
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          height="13.9239"
          id="filter2_i_3037_7775"
          width="8.83008"
          x="7.9375"
          y="9.04297"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <feOffset dy="0.246154" />
          <feGaussianBlur stdDeviation="0.123077" />
          <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend in2="shape" mode="normal" result="effect1_innerShadow_3037_7775" />
        </filter>
        <filter
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          height="8.91217"
          id="filter3_i_3037_7775"
          width="8.86523"
          x="15.1387"
          y="14.3516"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <feOffset dy="0.246154" />
          <feGaussianBlur stdDeviation="0.123077" />
          <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend in2="shape" mode="normal" result="effect1_innerShadow_3037_7775" />
        </filter>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint0_linear_3037_7775"
          x1="12.3683"
          x2="12.3526"
          y1="10.6137"
          y2="22.7207"
        >
          <stop stopColor="#F1F2F2" />
          <stop offset="1" stopColor="#DBF7F4" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint1_linear_3037_7775"
          x1="12.3683"
          x2="12.3526"
          y1="10.6137"
          y2="22.7207"
        >
          <stop stopColor="#F1F2F2" />
          <stop offset="1" stopColor="#DBF7F4" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint2_linear_3037_7775"
          x1="12.3683"
          x2="12.3526"
          y1="10.6137"
          y2="22.7207"
        >
          <stop stopColor="#F1F2F2" />
          <stop offset="1" stopColor="#DBF7F4" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint3_linear_3037_7775"
          x1="28.2154"
          x2="24.1846"
          y1="26.338"
          y2="22.5842"
        >
          <stop stopColor="#DBF7F4" />
          <stop offset="1" stopColor="#589D96" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint4_linear_3037_7775"
          x1="26.6768"
          x2="1.72293"
          y1="27.8768"
          y2="2.92293"
        >
          <stop stopColor="#DBF7F4" />
          <stop offset="1" stopColor="#589D96" />
        </linearGradient>
        <clipPath id="clip0_3037_7775">
          <rect
            fill="white"
            height="30.7692"
            rx="15.3846"
            width="30.7692"
            x="0.615234"
            y="0.615234"
          />
        </clipPath>
      </defs>
    </svg>
  );
}
