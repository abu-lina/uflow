'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function DetailsStep() {
  const { register, formState: { errors } } = useFormContext();
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Service Details</h3>
        <p className="text-gray-500 text-sm mb-6">
          Provide more information about your service.
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="description">
            Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Describe your service in detail"
            className="mt-1 min-h-[150px]"
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description.message as string}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="price">
            Price <span className="text-red-500">*</span>
          </Label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <Input
              id="price"
              type="text"
              {...register('price')}
              placeholder="0.00"
              className="pl-7"
            />
          </div>
          {errors.price && (
            <p className="text-red-500 text-sm mt-1">{errors.price.message as string}</p>
          )}
        </div>
      </div>
    </div>
  );
} 