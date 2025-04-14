import React from 'react';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

const Logo: React.FC<LogoProps> = ({ className = '', width = 34, height = 34 }) => {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 34 34" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_2646_2752)">
        <rect x="1" y="1" width="32" height="32" rx="16" fill="#589D96"/>
        <g filter="url(#filter0_i_2646_2752)">
          <path d="M22.2457 19.6718C18.7226 19.5344 16.4411 20.1365 16.1055 24.0114C18.2843 24.1554 21.3454 22.6249 22.2457 19.6718Z" fill="#DBF7F4"/>
        </g>
        <g filter="url(#filter1_i_2646_2752)">
          <path d="M16.1055 13.9595C16.1055 11.6444 17.9823 9.76758 20.2974 9.76758L25.5842 9.76758C26.7935 9.76758 27.7738 10.7479 27.7738 11.9572C27.7738 13.1665 26.7935 14.1468 25.5842 14.1468L20.2974 14.1468H16.1055V13.9595Z" fill="white"/>
          <path d="M16.1055 14.1468V19.2607C16.1103 17.5561 16.9554 14.1468 20.2974 14.1468H16.1055Z" fill="white"/>
        </g>
        <g filter="url(#filter2_i_2646_2752)">
          <path d="M12.9945 23.9902L17.7986 23.9902C16.094 23.9854 12.9945 23.1305 12.9945 19.75L12.9945 23.9902Z" fill="url(#paint0_linear_2646_2752)"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M8.61524 19.75C8.61524 22.0918 10.5137 23.9902 12.8555 23.9902L12.9945 23.9902C9.76767 23.9902 8.61524 21.1925 8.61524 19.75Z" fill="url(#paint1_linear_2646_2752)"/>
          <path d="M10.8048 9.76496C9.59556 9.76496 8.61523 10.7453 8.61524 11.9546L8.61524 19.75C8.61524 21.1925 9.76767 23.9902 12.9945 23.9902L12.9945 19.75L12.9945 11.9546C12.9945 10.7453 12.0141 9.76496 10.8048 9.76496Z" fill="url(#paint2_linear_2646_2752)"/>
        </g>
        <g filter="url(#filter3_i_2646_2752)">
          <path d="M16.1055 19.5534C16.1055 17.2383 17.9823 15.3615 20.2974 15.3615L23.0654 15.2872C24.3034 15.254 25.3249 16.2485 25.3249 17.4868C25.3249 18.6791 24.3756 19.6545 23.1837 19.6865C22.2461 19.7117 21.1644 19.7407 20.2974 19.7639C18.6604 19.7639 16.1055 19.7639 16.1055 19.7639V19.5534Z" fill="#F1FFFF"/>
          <path d="M16.1055 19.7639C16.1055 19.7639 16.1055 25.4544 16.1055 24.0858C16.1054 22.7173 16.9554 19.7639 20.2974 19.7639C18.6604 19.7639 16.1055 19.7639 16.1055 19.7639Z" fill="#F1FFFF"/>
        </g>
        <path d="M23.5837 29.4561C24.0098 28.8315 24.425 28.2101 24.8512 27.5853C25.3913 26.7937 25.9451 26.0848 26.614 25.4066C27.0248 24.9902 27.7549 24.3918 28.2107 24.0545C28.2107 24.0545 32.4139 21.6007 32.9045 19.4589L32.8989 19.6324C32.8476 20.5392 32.8182 21.3489 32.6189 22.1942C32.2554 23.7364 31.0712 25.8693 30.1434 27.1493C28.7893 29.0174 26.7016 30.8083 24.6394 31.6933C23.1504 32.3324 20.8624 32.6027 19.2728 32.903C18.8761 32.978 20.1725 32.6999 20.4568 32.551C22.0137 32.1609 22.7206 30.7214 23.5837 29.4561Z" fill="url(#paint3_linear_2646_2752)"/>
        <path d="M21.0642 32.8413C25.0965 30.8473 24.0974 28.4959 26.2486 27.0617C27.4242 26.278 28.6883 26.0388 29.9258 25.4677C30.8768 25.0287 31.723 23.6271 32.1879 22.6973C29.1317 29.2618 23.4988 32.2497 21.0642 32.8413Z" fill="white" fillOpacity="0.25"/>
        <path d="M32.6479 21.2244C30.6539 25.2567 28.3025 24.2576 26.8684 26.4088C26.0847 27.5843 25.8454 28.8485 25.2743 30.0859C24.8354 31.037 23.4337 31.8832 22.5039 32.3481C29.0684 29.2918 32.0563 23.6589 32.6479 21.2244Z" fill="white" fillOpacity="0.17"/>
      </g>
      <rect x="0.68" y="0.68" width="32.64" height="32.64" rx="16.32" stroke="url(#paint4_linear_2646_2752)" strokeWidth="0.64"/>
      <defs>
        <filter id="filter0_i_2646_2752" x="16.1055" y="19.6543" width="6.14062" height="4.55919" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="0.256"/>
          <feGaussianBlur stdDeviation="0.096"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0"/>
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_2646_2752"/>
        </filter>
        <filter id="filter1_i_2646_2752" x="16.1055" y="9.76758" width="11.668" height="9.74819" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="0.256"/>
          <feGaussianBlur stdDeviation="0.128"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_2646_2752"/>
        </filter>
        <filter id="filter2_i_2646_2752" x="8.61523" y="9.76562" width="9.18359" height="14.4806" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="0.256"/>
          <feGaussianBlur stdDeviation="0.128"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_2646_2752"/>
        </filter>
        <filter id="filter3_i_2646_2752" x="16.1055" y="15.2871" width="9.21875" height="9.26772" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="0.256"/>
          <feGaussianBlur stdDeviation="0.128"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_2646_2752"/>
        </filter>
        <linearGradient id="paint0_linear_2646_2752" x1="13.2232" y1="11.3989" x2="13.2069" y2="23.9902" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1F2F2"/>
          <stop offset="1" stopColor="#DBF7F4"/>
        </linearGradient>
        <linearGradient id="paint1_linear_2646_2752" x1="13.2232" y1="11.3989" x2="13.2069" y2="23.9902" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1F2F2"/>
          <stop offset="1" stopColor="#DBF7F4"/>
        </linearGradient>
        <linearGradient id="paint2_linear_2646_2752" x1="13.2232" y1="11.3989" x2="13.2069" y2="23.9902" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1F2F2"/>
          <stop offset="1" stopColor="#DBF7F4"/>
        </linearGradient>
        <linearGradient id="paint3_linear_2646_2752" x1="29.7048" y1="27.751" x2="25.5128" y2="23.847" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DBF7F4"/>
          <stop offset="1" stopColor="#589D96"/>
        </linearGradient>
        <linearGradient id="paint4_linear_2646_2752" x1="28.104" y1="29.352" x2="2.152" y2="3.4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DBF7F4"/>
          <stop offset="1" stopColor="#589D96"/>
        </linearGradient>
        <clipPath id="clip0_2646_2752">
          <rect x="1" y="1" width="32" height="32" rx="16" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
};

export default Logo; 