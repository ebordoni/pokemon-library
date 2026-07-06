import { useParams } from "react-router-dom";

export default function CardDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Card Detail</h1>
      <p className="text-gray-500 text-sm">
        Card <span className="font-mono">{id}</span> — detail view coming in
        Sprint 3.
      </p>
    </div>
  );
}
