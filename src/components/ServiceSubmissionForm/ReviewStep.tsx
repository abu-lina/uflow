'use client';

import { useFormContext } from 'react-hook-form';
import Image from 'next/image';

export default function ReviewStep() {
  const { watch } = useFormContext();
  const formData = watch();
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Review Your Service</h3>
        <p className="text-gray-500 text-sm mb-6">
          Please review the information before submitting.
        </p>
      </div>
      
      <div className="space-y-6">
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-medium">Basic Information</h4>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <span className="text-gray-500 text-sm">Service Name:</span>
              <p className="font-medium">{formData.name}</p>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Category:</span>
              <p className="font-medium capitalize">{formData.category}</p>
            </div>
          </div>
        </div>
        
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-medium">Service Details</h4>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <span className="text-gray-500 text-sm">Description:</span>
              <p className="whitespace-pre-wrap">{formData.description}</p>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Price:</span>
              <p className="font-medium">${formData.price}</p>
            </div>
          </div>
        </div>
        
        {formData.images && formData.images.length > 0 && (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h4 className="font-medium">Media</h4>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative rounded-md overflow-hidden h-32 bg-gray-100">
                    <Image
                      src={image.url || image.path || ''}
                      alt={`Image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800 text-sm">
            Your service will be reviewed by our team before being published. This typically takes 1-2 business days.
          </p>
        </div>
      </div>
    </div>
  );
} 