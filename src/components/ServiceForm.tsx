'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

const formSchema = z.object({
  service_name: z.string().min(1, 'Service name is required'),
  service_description: z.string().optional(),
  category_id: z.string().min(1, 'Category is required'),
  contact_email: z.string().email('Valid email is required'),
  contact_phone: z.string().optional(),
  social_instagram: z.string().optional(),
  social_website: z.string().optional(),
  address_street: z.string().optional(),
  address_zip: z.string().optional(),
  address_country: z.string().optional(),
  service_logo: z.any().optional(), // We'll handle file upload separately
  location_latitude: z.number().optional(),
  location_longitude: z.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Category {
  category_id: string;
  name_en: string;
}

export default function ServiceForm() {
  // Always use useForm at the top level - never conditionally
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;
  const { user, isLoading: authLoading, supabase, userRole, hasRole } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Debug output of current auth state
  const authDebugInfo = useMemo(() => {
    return {
      isAuthenticated: !!user,
      userEmail: user?.email,
      userRole,
      isLoading: authLoading,
      hasServiceOwnerRole: hasRole('service_owner')
    };
  }, [user, userRole, authLoading, hasRole]);

  // IMPORTANT: Direct output of raw auth state
  useEffect(() => {
    console.log('ServiceForm: DIRECT AUTH STATE CHECK', {
      user: user ? {
        id: user.id, 
        email: user.email
      } : null,
      userRole, 
      authLoading,
      hasServiceOwnerRole: hasRole('service_owner'),
      timestamp: new Date().toISOString()
    });
  }, [user, userRole, authLoading, hasRole]);

  console.log('ServiceForm: Auth Debug Info:', authDebugInfo);

  useEffect(() => {
    console.log('ServiceForm: Component rendered, authLoading:', authLoading, 'user:', user?.email, 'role:', userRole);
    
    const fetchCategories = async () => {
      try {
        console.log('ServiceForm: Fetching categories...');
        const { data, error } = await supabase
          .from('categories')
          .select('category_id, name_en')
          .order('name_en');

        if (error) {
          console.error('ServiceForm: Error fetching categories:', error);
          toast.error('Failed to load categories');
          setFormError('Error loading categories. Please refresh the page.');
          return;
        }

        console.log('ServiceForm: Categories fetched successfully:', data);
        setCategories(data || []);
      } catch (error) {
        console.error('ServiceForm: Error in fetchCategories:', error);
        toast.error('Failed to load categories');
        setFormError('Error loading categories. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchCategories();
    }
  }, [authLoading, supabase, user?.email, userRole]);

  const onSubmit = async (data: FormData) => {
    try {
      setFormError(null);
      setIsLoading(true);
      
      if (!user) {
        setFormError('You must be logged in to create a service');
        toast.error('You must be logged in to create a service');
        setIsLoading(false);
        return;
      }

      console.log('ServiceForm DEBUG: User ID:', user.id);
      console.log('ServiceForm DEBUG: User object:', JSON.stringify(user, null, 2));

      // First verify the user exists in the users table with correct role
      console.log('ServiceForm DEBUG: Checking user role in database...');
      let userData;
      let userError;

      // First try with user_id
      const userResult = await supabase
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      userData = userResult.data;
      userError = userResult.error;

      console.log('ServiceForm DEBUG: User data from DB (user_id):', userData);
      console.log('ServiceForm DEBUG: User error from DB (user_id):', userError);

      // If that fails, try with id
      if (userError) {
        console.log('ServiceForm DEBUG: Trying to find user with id field instead...');
        const userByIdResult = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
          
        userData = userByIdResult.data;
        userError = userByIdResult.error;
        
        console.log('ServiceForm DEBUG: User data from DB (id):', userData);
        console.log('ServiceForm DEBUG: User error from DB (id):', userError);
      }

      if (userError || !userData) {
        console.error('ServiceForm: Error checking user role:', userError);
        setFormError('Failed to verify user permissions. Please try again.');
        toast.error('Failed to verify user permissions');
        setIsLoading(false);
        return;
      }

      if (!['service_owner', 'admin'].includes(userData.role)) {
        setFormError('Only service owners can create services');
        toast.error('Only service owners can create services');
        setIsLoading(false);
        return;
      }

      // Prepare the service data object
      const formData = {
        service_name: data.service_name,
        service_description: data.service_description,
        category_id: data.category_id,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        social_instagram: data.social_instagram,
        social_website: data.social_website,
        address_street: data.address_street,
        address_zip: data.address_zip,
        address_country: data.address_country,
        location_latitude: data.location_latitude,
        location_longitude: data.location_longitude,
        service_logo: data.service_logo || null,
        service_owner_id: user.id,
        service_status: 'draft',
        is_verified: false
      };
      
      console.log('ServiceForm DEBUG: Service data to insert:', JSON.stringify(formData, null, 2));
      
      // First try with direct Supabase insert
      let insertError = null;
      const { error: serviceError } = await supabase
        .from('services')
        .insert({
          service_owner_id: user.id,
          service_name: data.service_name,
          service_description: data.service_description,
          category_id: data.category_id,
          service_logo: data.service_logo || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          contact_email: data.contact_email,
          contact_phone: data.contact_phone || null,
          social_instagram: data.social_instagram || null,
          social_website: data.social_website || null,
          address_street: data.address_street || null,
          address_zip: data.address_zip || null,
          address_country: data.address_country || null,
          location_latitude: data.location_latitude || null,
          location_longitude: data.location_longitude || null,
          service_status: 'draft',
          is_verified: false
        })
        .select()
        .single();
      
      insertError = serviceError;
      
      console.log('ServiceForm DEBUG: Insert error with user.id:', insertError);
      
      // If direct insert fails due to RLS, try using server API
      if (insertError) {
        console.log('ServiceForm DEBUG: Direct insert failed, trying server API...');
        
        // Server-side create (bypasses RLS)
        const response = await fetch('/api/service/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userData: user,
            serviceData: formData
          }),
        });
        
        const result = await response.json();
        console.log('ServiceForm DEBUG: Server API result:', result);
        
        if (!response.ok) {
          console.error('ServiceForm: Server API error:', result.error);
          setFormError(`Server API Error: ${result.error}`);
          toast.error('Failed to create service via API');
          setIsLoading(false);
          return;
        }
        
        if (result.success) {
          toast.success('Service created successfully via API');
          router.push('/dashboard/services');
          return;
        }
      } else {
        // Direct insert succeeded
        toast.success('Service created successfully');
        router.push('/dashboard/services');
      }
    } catch (error) {
      console.error('ServiceForm: Error in onSubmit:', error);
      setFormError('An unexpected error occurred');
      toast.error('Failed to create service');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    console.log('ServiceForm: Showing auth loading state');
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-2">Checking authentication...</p>
      </div>
    );
  }

  console.log('ServiceForm: Auth state:', {
    isAuthenticated: !!user,
    userEmail: user?.email,
    userRole,
    isLoading: authLoading
  });

  if (!user) {
    console.log('ServiceForm: User not logged in');
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">You must be logged in to create a service</p>
        <button
          onClick={() => router.push('/auth/login?redirectTo=/services/create')}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
        >
          Sign In
        </button>
      </div>
    );
  }

  const isServiceOwner = hasRole('service_owner');
  console.log('ServiceForm: Role check:', { isServiceOwner, currentRole: userRole });

  if (!isServiceOwner) {
    console.log('ServiceForm: User is not a service owner');
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">Only service owners can create services</p>
        <p className="text-sm text-gray-500">Your current role: {userRole || 'none'}</p>
        <p className="text-sm text-gray-500 mt-2">Please contact an administrator to become a service owner.</p>
        <div className="mt-4">
          <button
            onClick={() => {
              // Force role refresh
              window.location.reload();
            }}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
          >
            Refresh Role
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    console.log('ServiceForm: Showing categories loading state');
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-2">Loading categories...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto p-6">
      <div className="mb-6 bg-yellow-50 p-4 rounded-md border border-yellow-200">
        <h3 className="font-medium text-yellow-800 mb-1">Service Verification Notice</h3>
        <p className="text-sm text-yellow-700">
          All services submitted to Uflow are subject to verification by our halal reviewers.
          Your service will be in draft status until reviewed and approved.
        </p>
      </div>
      
      {formError && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          {formError}
        </div>
      )}
      
      <div className="bg-primary-light text-primary p-4 rounded-md mb-4">
        <p><strong>Auth Debug</strong></p>
        <p>User: {user?.email}</p>
        <p>Role: {userRole || 'none'}</p>
        <p>Is Service Owner: {isServiceOwner ? 'Yes' : 'No'}</p>
      </div>

      {/* Required Fields Section */}
      <div className="space-y-6 p-6 bg-white rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900">Required Information</h3>
        
        <div>
          <label htmlFor="service_name" className="block text-sm font-medium text-gray-700">
            Service Name *
          </label>
          <input
            type="text"
            id="service_name"
            {...register('service_name')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
          {errors.service_name && (
            <p className="mt-1 text-sm text-red-600">{errors.service_name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
            Category *
          </label>
          <select
            id="category_id"
            {...register('category_id')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.category_id} value={category.category_id}>
                {category.name_en}
              </option>
            ))}
          </select>
          {errors.category_id && (
            <p className="mt-1 text-sm text-red-600">{errors.category_id.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
            Contact Email *
          </label>
          <input
            type="email"
            id="contact_email"
            {...register('contact_email')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
          {errors.contact_email && (
            <p className="mt-1 text-sm text-red-600">{errors.contact_email.message}</p>
          )}
        </div>
      </div>

      {/* Optional Fields Section */}
      <div className="space-y-6 p-6 bg-white rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
        
        <div>
          <label htmlFor="service_description" className="block text-sm font-medium text-gray-700">
            Service Description
          </label>
          <textarea
            id="service_description"
            {...register('service_description')}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
            Contact Phone
          </label>
          <input
            type="tel"
            id="contact_phone"
            {...register('contact_phone')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="social_instagram" className="block text-sm font-medium text-gray-700">
              Instagram Profile
            </label>
            <input
              type="text"
              id="social_instagram"
              {...register('social_instagram')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              placeholder="@username"
            />
          </div>

          <div>
            <label htmlFor="social_website" className="block text-sm font-medium text-gray-700">
              Website
            </label>
            <input
              type="url"
              id="social_website"
              {...register('social_website')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              placeholder="https://"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Address (Optional)</h4>
          
          <div>
            <label htmlFor="address_street" className="block text-sm font-medium text-gray-700">
              Street Address
            </label>
            <input
              type="text"
              id="address_street"
              {...register('address_street')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="address_zip" className="block text-sm font-medium text-gray-700">
                ZIP Code
              </label>
              <input
                type="text"
                id="address_zip"
                {...register('address_zip')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="address_country" className="block text-sm font-medium text-gray-700">
                Country
              </label>
              <input
                type="text"
                id="address_country"
                {...register('address_country')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={async () => {
            try {
              // Check JWT token directly
              const { data: tokenData } = await supabase.auth.getSession();
              console.log('DEBUG: Access Token:', tokenData?.session?.access_token);
              
              // Check if token works by making a simple authenticated request
              const { error: authTestError } = await supabase.from('users').select('count').limit(1);
              console.log('DEBUG: Auth test error:', authTestError);
              
              // Check current session
              const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
              console.log('DEBUG: Current session:', sessionData);
              console.log('DEBUG: Session error:', sessionError);
              
              // Check user
              const { data: userData, error: userError } = await supabase.auth.getUser();
              console.log('DEBUG: Current user:', userData);
              console.log('DEBUG: User error:', userError);
              
              // Try to get data from a public table
              const { data: catData, error: catError } = await supabase
                .from('categories')
                .select('category_id, name_en')
                .limit(1);
              console.log('DEBUG: Categories data:', catData);
              console.log('DEBUG: Categories error:', catError);
              
              // Try to get data from the users table
              const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('*')
                .eq('user_id', userData?.user?.id || '')
                .single();
              console.log('DEBUG: User data from users table:', usersData);
              console.log('DEBUG: Users error:', usersError);
              
              // Try to get services table structure
              const { data: servicesData, error: servicesError } = await supabase
                .from('services')
                .select('*')
                .limit(0);
              console.log('DEBUG: Services data structure:', servicesData);
              console.log('DEBUG: Services error:', servicesError);
              
              toast.success('Debug info logged to console');
            } catch (error) {
              console.error('DEBUG Error:', error);
              toast.error('Debug check failed');
            }
          }}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          Debug Auth
        </button>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : 'Create Service'}
        </button>
      </div>
    </form>
  );
} 