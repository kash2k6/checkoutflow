import { ArrowDown } from 'lucide-react';

export default function ConnectorLine() {
  return (
    <div className="flex items-center justify-center py-3 md:py-4">
      <div className="flex flex-col items-center gap-2">
        <div className="w-0.5 h-6 md:h-8 bg-[#E5E6EA]" />
        <ArrowDown className="w-4 h-4 md:w-5 md:h-5 text-accent-500" />
        <div className="w-0.5 h-6 md:h-8 bg-[#E5E6EA]" />
      </div>
    </div>
  );
}

