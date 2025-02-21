// components/PropertyGallery.js
import Image from 'next/image';

export default function PropertyGallery({ media }) {
  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {media.slice(0, 4).map((url, index) => (
          <div key={index} className="relative h-64 rounded-lg overflow-hidden">
            <Image
              src={url}
              alt={`Property image ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {index === 3 && media.length > 4 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">
                  +{media.length - 4} more
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}