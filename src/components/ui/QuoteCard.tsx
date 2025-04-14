import WhiteBox from './WhiteBox';
import Ornament from './Ornament';

interface QuoteCardProps {
  className?: string;
}

export default function QuoteCard({ className = '' }: QuoteCardProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="bg-[#BFDBD8] rounded-[40px] w-[720px] h-[482px]">
        <WhiteBox>
          <Ornament position="top" />
          <div className="flex flex-col items-center px-24 pt-32 text-center">
            <h1 className="text-[40px] font-inter">
              <span className="text-black">Viele Muslime</span>
              <br />
              <span className="text-black">aber</span>{' '}
              <span className="text-white">wenig Gemeinschaft</span>
            </h1>
            
            <p className="mt-16 text-[24px] font-inter italic text-black">
              &ldquo;Es wird eine Zeit kommen, in der die Muslime viele sein werden, doch ihr Zusammenhalt wird so schwach sein wie der Schaum des Meeres.&rdquo;
            </p>
            
            <p className="mt-4 text-[16px] font-inter italic text-black">
              -Der Prophet Mohammed ﷺ, Sahih Muslim
            </p>
          </div>
          <Ornament position="bottom" />
        </WhiteBox>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        <div className="w-3 h-3 rounded-full bg-[#BFDBD8]" />
        <div className="w-3 h-3 rounded-full bg-white opacity-50" />
        <div className="w-3 h-3 rounded-full bg-white opacity-50" />
      </div>
    </div>
  );
} 