interface BismaDEProps {
  className?: string;
}

export function BismaDE({ className = '' }: BismaDEProps) {
  return (
    <div 
      className={`w-[369px] h-[18px] font-['Baskerville'] font-normal text-[16px] leading-[18px] flex items-center justify-center text-center flex-none order-1 flex-grow-0 ${className}`}
      style={{
        background: 'linear-gradient(180deg, #D2B581 -49.22%, #DCC391 -3.81%, #AF8650 88.33%, #E5D1A0 228.56%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}
    >
      Im Namen Allahs des Allerbarmers, des Allbarmherzigen
    </div>
  );
} 