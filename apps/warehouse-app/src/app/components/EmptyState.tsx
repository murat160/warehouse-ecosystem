export interface EmptyStateProps {
  emoji?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ emoji = '📦', title, subtitle }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl p-8 text-center">
      <div className="text-[40px] mb-2">{emoji}</div>
      <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 700 }}>{title}</div>
      {subtitle && (
        <div className="text-[12px] text-[#6B7280] mt-1" style={{ fontWeight: 500 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
