'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const CATEGORIES = [
  'Technology',
  'Health',
  'Education',
  'Finance',
  'Legal',
  'Marketing',
  'Food',
  'Travel',
  'Other',
];

export default function BasicInfoStep() {
  const { register, formState: { errors } } = useFormContext();
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Basic Information</h3>
        <p className="text-gray-500 text-sm mb-6">
          Let&apos;s start with the basic details of your service.
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">
            Service Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="e.g., Website Development"
            className="mt-1"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message as string}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="category">
            Category <span className="text-red-500">*</span>
          </Label>
          <Select
            id="category"
            {...register('category')}
            className="mt-1"
            defaultValue=""
          >
            <option value="" disabled>
              Select a category
            </option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category.toLowerCase()}>
                {category}
              </option>
            ))}
          </Select>
          {errors.category && (
            <p className="text-red-500 text-sm mt-1">{errors.category.message as string}</p>
          )}
        </div>
      </div>
    </div>
  );
} 