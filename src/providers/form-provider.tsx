'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ProviderCreationMode = 'owner' | 'recommendation';

export interface ProviderFormData {
  // Creation mode
  creationMode: ProviderCreationMode;
  
  // Entity type (determined by category selection)
  entityType: 'provider' | 'community_service';
  
  // Basics
  title: string;
  category: string;
  description: string;
  
  // Location
  isOnlineBusiness: boolean;
  street: string;
  zip: string;
  city: string;
  country: string;
  showAddress: boolean;
  
  // Contact
  website: string;
  instagram: string;
  phone: string;
  email: string;
  
  // Offers & Needs
  offers_ids: string[];
  needs_ids: string[];
  
  // Media
  images: File[];
  
  // Community Services (multiple selection)
  selectedCommunityServiceIds: string[];
  
  // Tags
  tags: string[];
  
  // Social Project specific fields
  socialCategory: string;
  socialTitle: string;
  socialDescription: string;
}

const initialFormData: ProviderFormData = {
  creationMode: 'owner', // Default to owner mode
  entityType: 'provider', // Default to provider
  title: '',
  category: '',
  description: '',
  isOnlineBusiness: false,
  street: '',
  zip: '',
  city: '',
  country: '',
  showAddress: true,
  website: '',
  instagram: '',
  phone: '',
  email: '',
  offers_ids: [],
  needs_ids: [],
  images: [],
  selectedCommunityServiceIds: [],
  tags: [],
  socialCategory: '',
  socialTitle: '',
  socialDescription: '',
};

interface FormContextType {
  formData: ProviderFormData;
  updateFormData: (data: Partial<ProviderFormData>) => void;
  clearFormData: () => void;
  setCreationMode: (mode: ProviderCreationMode) => void;
  isLoading: boolean;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

interface FormProviderProps {
  children: React.ReactNode;
}

export function FormProvider({ children }: FormProviderProps) {
  const [formData, setFormData] = useState<ProviderFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(true);

  // Load form data from localStorage on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('providerFormData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // Convert base64 image data back to File objects if they exist
        if (parsedData.images && parsedData.images.length > 0) {
          const imageFiles = parsedData.images.map((img: { name: string; data: string; type: string }) => {
            try {
              const byteCharacters = atob(img.data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              return new File([byteArray], img.name, { type: img.type });
            } catch (error) {
              console.error('Error converting image data:', error);
              return null;
            }
          }).filter(Boolean);
          parsedData.images = imageFiles;
        }
        
        setFormData(parsedData);
      }
    } catch (error) {
      console.error('[FormProvider] Error loading form data from localStorage:', error);
      // Keep default form data if loading fails
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        // Convert File objects to serializable format for localStorage
        const dataToSave = { ...formData };
        if (dataToSave.images && dataToSave.images.length > 0) {
          const imageData = dataToSave.images.map(file => ({
            name: file.name,
            type: file.type,
            data: '' // Will be filled by converting to base64
          }));

          // Convert files to base64 and save
          Promise.all(dataToSave.images.map(file => {
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
              };
              reader.readAsDataURL(file);
            });
          })).then(base64Data => {
            const imageDataWithBase64 = imageData.map((img, index) => ({
              ...img,
              data: base64Data[index]
            }));
            
            const finalData = { ...dataToSave, images: imageDataWithBase64 };
            localStorage.setItem('providerFormData', JSON.stringify(finalData));
          }).catch(error => {
            console.error('Error saving images to localStorage:', error);
            // Save without images if conversion fails
            localStorage.setItem('providerFormData', JSON.stringify(dataToSave));
          });
        } else {
          localStorage.setItem('providerFormData', JSON.stringify(dataToSave));
        }
      } catch (error) {
        console.error('Error saving form data to localStorage:', error);
      }
    }
  }, [formData, isLoading]);

  const updateFormData = useCallback((data: Partial<ProviderFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  const setCreationMode = useCallback((mode: ProviderCreationMode) => {
    setFormData(prev => ({ ...prev, creationMode: mode }));
  }, []);

  const clearFormData = useCallback(() => {
    setFormData(initialFormData);
    localStorage.removeItem('providerFormData');
    localStorage.removeItem('providerCreationMode');
  }, []);

  return (
    <FormContext.Provider value={{ formData, updateFormData, clearFormData, setCreationMode, isLoading }}>
      {children}
    </FormContext.Provider>
  );
}

export function useFormData() {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error('useFormData must be used within a FormProvider');
  }
  return context;
}
