import { useState } from 'react';
import { Shapes } from 'lucide-react';

// Collection of SVG path data
const SVG_PATHS = {
  heart: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  cloud: "M19 18H6c-3.31 0-6-2.69-6-6s2.69-6 6-6h.71C7.37 4.85 8.59 4 10 4c1.41 0 2.63.85 3.29 2h.71c3.31 0 6 2.69 6 6s-2.69 6-6 6z",
  leaf: "M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z",
  droplet: "M12 21.5c-4.42 0-8-3.58-8-8 0-5.5 8-13 8-13s8 7.5 8 13c0 4.42-3.58 8-8 8z"
};

interface SvgLibraryProps {
  onSelect: (pathData: string) => void;
}

export default function SvgLibrary({ onSelect }: SvgLibraryProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-md"
        title="Add Shape"
      >
        <Shapes className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute left-full ml-2 top-0 bg-white rounded-lg shadow-lg border p-2 z-10">
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(SVG_PATHS).map(([name, path]) => (
              <button
                key={name}
                onClick={() => {
                  onSelect(path);
                  setIsOpen(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-md"
                title={`Add ${name}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="currentColor"
                  className="text-gray-700"
                >
                  <path d={path} />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}