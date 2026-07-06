export default function DuplicateBadge({ count }: { count: number }) {
  if (count <= 1) return null;
  return (
    <span className="absolute top-1.5 right-1.5 bg-pokemon-red text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center shadow leading-none">
      ×{count}
    </span>
  );
}
