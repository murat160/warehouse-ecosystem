interface EmptyStateProps {
  emoji?: string;
  title: string;
  /** Поддерживаются оба для совместимости */
  subtitle?: string;
  description?: string;
}

export function EmptyState({ emoji = '📭', title, subtitle, description }: EmptyStateProps) {
  const subtext = subtitle ?? description;
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-3">{emoji}</div>
      <h3 className="text-[16px] text-[#1F2430] mb-1" style={{ fontWeight: 800 }}>
        {title}
      </h3>
      {subtext && (
        <p className="text-[13px] text-[#6B7280] max-w-xs" style={{ fontWeight: 500 }}>
          {subtext}
        </p>
      )}
    </div>
  );
}
