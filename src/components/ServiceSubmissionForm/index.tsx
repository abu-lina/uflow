'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/components/ui/toast';
import supabase from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import BasicInfoStep from './BasicInfoStep';
import DetailsStep from './DetailsStep';
import MediaStep from './MediaStep';
import ReviewStep from './ReviewStep';
import FormNavigation from './FormNavigation';

// Define the form schema using Zod
const serviceFormSchema = z.object({
  name: z.string().min(5, 'Service name must be at least 5 characters').max(100),
  category: z.string().min(1, 'Please select a category'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid number'),
  images: z.array(z.object({
    file: z.instanceof(File).optional(),
    url: z.string().optional(),
    path: z.string().optional(),
  })).optional(),
  logo_url: z.string().optional(),
});

type ServiceFormData = z.infer<typeof serviceFormSchema>;

// Define a type for the form data instead of using any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormData = {
  service_name: string;
  service_description: string;
  category_id: string;
  contact_email: string;
  contact_phone?: string;
  social_instagram?: string;
  social_website?: string;
  address_street?: string;
  address_zip?: string;
  address_country?: string;
  [key: string]: string | undefined;
};

export default function ServiceSubmissionForm() {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const methods = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      category: '',
      description: '',
      price: '',
      images: [],
    },
  });
  
  const steps = [
    { title: 'Basic Information', component: <BasicInfoStep /> },
    { title: 'Service Details', component: <DetailsStep /> },
    { title: 'Media', component: <MediaStep setUploadProgress={setUploadProgress} /> },
    { title: 'Review', component: <ReviewStep /> },
  ];
  
  const nextStep = async () => {
    const isValid = await methods.trigger(
      step === 0 ? ['name', 'category'] : 
      step === 1 ? ['description', 'price'] : 
      step === 2 ? ['images'] : 
      undefined
    );
    
    if (isValid) {
      setStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };
  
  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (data: any) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to submit a service',
        variant: 'destructive',
      });
      router.push('/auth/login');
      return;
    }
    
    setIsSubmitting(true);
    setUploadProgress(0);
    
    try {
      // Handle image uploads
      const uploadPromises = [];
      const imageUrls = [];
      
      if (data.images && data.images.length > 0) {
        for (const image of data.images) {
          if (image.file) {
            const fileName = `${user.id}/${Date.now()}-${image.file.name}`;
            
            uploadPromises.push(
              supabase.storage
                .from('service-images')
                .upload(fileName, image.file, {
                  cacheControl: '3600',
                  upsert: false,
                })
                .then(({ data: uploadData, error }) => {
                  if (error) throw error;
                  
                  // Get public URL for the uploaded image
                  const { data: { publicUrl } } = supabase.storage
                    .from('service-images')
                    .getPublicUrl(uploadData.path);
                  
                  imageUrls.push(publicUrl);
                  setUploadProgress((prev) => prev + (100 / data.images!.length));
                })
            );
          } else if (image.url) {
            imageUrls.push(image.url);
          }
        }
      }
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
      // Save the first image as logo_url if available
      const logo_url = imageUrls.length > 0 ? imageUrls[0] : null;
      
      // Submit the service to the API
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.service_name,
          description: data.service_description,
          category: data.category_id,
          price: parseFloat(data.price),
          logo_url,
          image_urls: imageUrls,
          status: 'pending',
          owner_id: user.id,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit service');
      }
      
      const result = await response.json();
      
      // Navigate to success page
      router.push(`/services/submission-success?id=${result.id}`);
      
    } catch (error: any) {
      console.error('Error submitting service:', error);
      toast({
        title: 'Submission failed',
        description: error.message || 'There was an error submitting your service',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-center">Submit Your Service</h2>
        <div className="flex justify-between items-center mt-6">
          {steps.map((s, i) => (
            <div 
              key={i} 
              className={`flex-1 text-center ${
                i < step 
                  ? 'text-primary' 
                  : i === step 
                    ? 'text-primary font-medium' 
                    : 'text-gray-400'
              }`}
            >
              <div 
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-2 ${
                  i <= step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i + 1}
              </div>
              <span className="text-sm hidden sm:block">{s.title}</span>
            </div>
          ))}
        </div>
      </div>
      
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            {steps[step].component}
            
            {isSubmitting && step === steps.length - 1 && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-primary h-2.5 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-center mt-2">
                  {uploadProgress < 100 
                    ? 'Uploading images...' 
                    : 'Processing submission...'}
                </p>
              </div>
            )}
            
            <FormNavigation 
              isFirstStep={step === 0}
              isLastStep={step === steps.length - 1}
              isSubmitting={isSubmitting}
              onBack={prevStep}
              onNext={nextStep}
            />
          </div>
        </form>
      </FormProvider>
    </div>
  );
} 