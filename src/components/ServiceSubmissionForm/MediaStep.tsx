'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';

export default function MediaStep() {
  const { register } = useFormContext();

  return (
    <div className="space-y-4">
      <div className="p-6 bg-white rounded-lg border">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Media & Images</h3>
            <p className="text-sm text-gray-500">Upload photos of your business or products</p>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="images" className="block text-sm font-medium">Images</label>
            <Input
              id="images"
              type="file"
              accept="image/*"
              multiple
              {...register('images')}
            />
            <p className="text-xs text-gray-500">
              Upload up to 5 images of your service or products
            </p>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="logo" className="block text-sm font-medium">Logo (Optional)</label>
            <Input
              id="logo"
              type="file"
              accept="image/*"
              {...register('logo')}
            />
            <p className="text-xs text-gray-500">
              Upload your business logo (if available)
            </p>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="videoUrl" className="block text-sm font-medium">Video URL (Optional)</label>
            <Input
              id="videoUrl"
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              {...register('videoUrl')}
            />
            <p className="text-xs text-gray-500">
              Add a YouTube or Vimeo URL showcasing your service
            </p>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="additionalMedia" className="block text-sm font-medium">Additional Information</label>
            <textarea
              id="additionalMedia"
              placeholder="Any other information you'd like to share..."
              rows={4}
              className="w-full px-3 py-2 border rounded-md"
              {...register('additionalMedia')}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 