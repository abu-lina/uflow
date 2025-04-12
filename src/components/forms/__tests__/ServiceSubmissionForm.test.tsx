import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/router';

const ServiceSubmissionForm = () => {
  const [serviceName, setServiceName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'serviceName') {
      setServiceName(value);
    } else if (name === 'category') {
      setCategory(value);
    } else if (name === 'description') {
      setDescription(value);
    } else if (name === 'price') {
      setPrice(value);
    }
  };

  const handleImageUpload = (e) => {
    const files = e.target.files;
    const imageUrls = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      imageUrls.push(url);
    }
    setImages(imageUrls);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Handle form submission
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Render form fields and components */}
    </form>
  );
};

test('advances to second step after completing first step', async () => {
  render(<ServiceSubmissionForm />);
  
  // Fill out first step
  fireEvent.change(screen.getByLabelText(/Service Name/i), {
    target: { value: 'Test Service' },
  });
  
  fireEvent.change(screen.getByLabelText(/Category/i), {
    target: { value: 'technology' },
  });
  
  // Click continue
  fireEvent.click(screen.getByText('Continue'));
  
  // Check if step 2 is rendered
  await waitFor(() => {
    expect(screen.getByText('Service Details')).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Price/i)).toBeInTheDocument();
  });
});

test('validates second step fields', async () => {
  render(<ServiceSubmissionForm />);
  
  // Go to step 2
  fireEvent.change(screen.getByLabelText(/Service Name/i), {
    target: { value: 'Test Service' },
  });
  fireEvent.change(screen.getByLabelText(/Category/i), {
    target: { value: 'technology' },
  });
  fireEvent.click(screen.getByText('Continue'));
  
  // Wait for step 2 to appear
  await waitFor(() => {
    expect(screen.getByText('Service Details')).toBeInTheDocument();
  });
  
  // Click continue without filling required fields
  fireEvent.click(screen.getByText('Continue'));
  
  // Check for validation errors
  await waitFor(() => {
    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(screen.getByText('Price is required')).toBeInTheDocument();
  });
  
  // Test invalid price format
  fireEvent.change(screen.getByLabelText(/Description/i), {
    target: { value: 'This is a detailed description of the service being offered.' },
  });
  fireEvent.change(screen.getByLabelText(/Price/i), {
    target: { value: 'invalid-price' },
  });
  fireEvent.click(screen.getByText('Continue'));
  
  await waitFor(() => {
    expect(screen.getByText('Price must be a valid number')).toBeInTheDocument();
  });
});

test('uploads images correctly in step 3', async () => {
  render(<ServiceSubmissionForm />);
  
  // Go to step 1
  fireEvent.change(screen.getByLabelText(/Service Name/i), {
    target: { value: 'Test Service' },
  });
  fireEvent.change(screen.getByLabelText(/Category/i), {
    target: { value: 'technology' },
  });
  fireEvent.click(screen.getByText('Continue'));
  
  // Go to step 2
  await waitFor(() => {
    expect(screen.getByText('Service Details')).toBeInTheDocument();
  });
  
  fireEvent.change(screen.getByLabelText(/Description/i), {
    target: { value: 'This is a detailed description of the service being offered.' },
  });
  fireEvent.change(screen.getByLabelText(/Price/i), {
    target: { value: '49.99' },
  });
  fireEvent.click(screen.getByText('Continue'));
  
  // Check if step 3 is rendered
  await waitFor(() => {
    expect(screen.getByText('Service Media')).toBeInTheDocument();
  });
  
  // Create a mock file
  const file = new File(['test image content'], 'test-image.jpg', { type: 'image/jpeg' });
  
  // Upload file
  const input = screen.getByLabelText(/Service Images/i);
  await userEvent.upload(input, file);
  
  // Check if image preview appears
  await waitFor(() => {
    expect(screen.getByText('Image Previews')).toBeInTheDocument();
    expect(screen.getByText('Primary Image')).toBeInTheDocument();
  });
  
  // Test remove image functionality
  const removeButton = screen.getByLabelText('Remove image');
  fireEvent.click(removeButton);
  
  await waitFor(() => {
    expect(screen.queryByText('Image Previews')).not.toBeInTheDocument();
  });
});

test('shows review step and submits the form correctly', async () => {
  const router = useRouter();
  render(<ServiceSubmissionForm />);
  
  // Complete step 1
  fireEvent.change(screen.getByLabelText(/Service Name/i), {
    target: { value: 'Complete Test Service' },
  });
  fireEvent.change(screen.getByLabelText(/Category/i), {
    target: { value: 'education' },
  });
  fireEvent.click(screen.getByText('Continue'));
  
  // Complete step 2
  await waitFor(() => {
    expect(screen.getByText('Service Details')).toBeInTheDocument();
  });
  
  fireEvent.change(screen.getByLabelText(/Description/i), {
    target: { value: 'This is a comprehensive test service with all the details and information needed for approval.' },
  });
  fireEvent.change(screen.getByLabelText(/Price/i), {
    target: { value: '99.99' },
  });
  fireEvent.click(screen.getByText('Continue'));
  
  // Complete step 3
  await waitFor(() => {
    expect(screen.getByText('Service Media')).toBeInTheDocument();
  });
  
  // Skip image upload for simplicity
  fireEvent.click(screen.getByText('Continue'));
  
  // Check if review step is rendered
  await waitFor(() => {
    expect(screen.getByText('Review Your Service')).toBeInTheDocument();
    expect(screen.getByText('Complete Test Service')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });
  
  // Submit the form
  fireEvent.click(screen.getByText('Submit Service'));
  
  // Verify form submission
  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith('/api/services', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('Complete Test Service'),
    }));
    
    expect(router.push).toHaveBeenCalledWith('/services/submission-success?id=test-service-id');
  });
});

test('handles API errors correctly', async () => {
  // Mock a failed API response
  (global.fetch as jest.Mock).mockImplementationOnce(() =>
    Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ message: 'API Error' }),
    })
  );
  
  render(<ServiceSubmissionForm />);
  
  // Complete step 1
  fireEvent.change(screen.getByLabelText(/Service Name/i), {
    target: { value: 'Error Test Service' },
  });
  fireEvent.change(screen.getByLabelText(/Category/i), {
    target: { value: 'technology' },
  });
  fireEvent.click(screen.getByText('Continue'));
  
  // Complete step 2
  await waitFor(() => {
    expect(screen.getByText('Service Details')).toBeInTheDocument();
  });
  
  fireEvent.change(screen.getByLabelText(/Description/i), {
    target: { value: 'This is a test to check error handling.' },
  });
  fireEvent.change(screen.getByLabelText(/Price/i), {
    target: { value: '29.99' },
  });
  fireEvent.click(screen.getByText('Continue'));
  
  // Complete step 3
  await waitFor(() => {
    expect(screen.getByText('Service Media')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('Continue'));
  
  // Submit form
  await waitFor(() => {
    expect(screen.getByText('Submit Service')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('Submit Service'));
  
  // Check for error message
  await waitFor(() => {
    expect(screen.getByText('API Error')).toBeInTheDocument();
  });
}); 