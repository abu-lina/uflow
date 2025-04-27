'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card/card';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { Service } from '@/features/auth/types/service';
import { supabase } from '@/lib/supabase/client';

interface DashboardStats {
  totalSouks: number;
  pendingReviews: number;
  approvedSouks: number;
  rejectedSouks: number;
}

export default function ReviewerDashboardPage() {
  const { user, supabase: authSupabase, isLoading: authLoading, userRole } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [pendingServices, setPendingServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalSouks: 0,
    pendingReviews: 0,
    approvedSouks: 0,
    rejectedSouks: 0,
  });

  // Check if user has the halal_reviewer role
  const isHalalReviewer = userRole === 'halal_reviewer' || userRole === 'admin';

  // Fetch pending services
  useEffect(() => {
    const fetchPendingServices = async () => {
      if (!user || !isHalalReviewer) return;

      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await authSupabase
          .from('services')
          .select(
            `
            service_id,
            service_owner_id,
            service_name,
            service_description,
            is_verified,
            service_status,
            created_at,
            contact_email,
            category_id,
            users!services_service_owner_id_fkey1 (
              user_id,
              email
            ),
            categories (
              category_id,
              name
            )
          `
          )
          .eq('is_verified', false)
          .in('service_status', ['draft', 'pending']);

        if (error) {
          console.error('Error fetching pending services:', error);
          setError('Failed to load pending services. Please try again.');
          return;
        }

        const services: Service[] = (data || []).map((service) => ({
          id: service.service_id,
          service_id: service.service_id,
          service_owner_id: service.service_owner_id,
          service_name: service.service_name,
          service_description: service.service_description,
          is_verified: service.is_verified,
          service_status: service.service_status,
          created_at: service.created_at,
          updated_at: new Date().toISOString(),
          contact_email: service.contact_email,
          category_id: service.category_id,
          users: service.users,
          categories: service.categories,
        }));

        setPendingServices(services);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchPendingServices();
    }
  }, [user, authSupabase, authLoading, isHalalReviewer, userRole]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.from('souks').select('status');

        if (error) throw error;

        const counts: DashboardStats = {
          totalSouks: data.length,
          pendingReviews: data.filter((souk) => souk.status === 'pending').length,
          approvedSouks: data.filter((souk) => souk.status === 'approved').length,
          rejectedSouks: data.filter((souk) => souk.status === 'rejected').length,
        };

        setStats(counts);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        <p className="ml-2">Loading pending services...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-8 text-center">
        <p className="mb-4 text-gray-600">You must be logged in to access the reviewer dashboard</p>
        <button
          className="rounded bg-primary px-4 py-2 text-white hover:bg-primary-dark"
          onClick={() => router.push('/auth/login?redirectTo=/reviewer/dashboard')}
        >
          Sign In
        </button>
      </div>
    );
  }

  if (!isHalalReviewer) {
    return (
      <div className="py-8 text-center">
        <p className="mb-4 text-gray-600">
          You need Halal Reviewer permissions to access this page
        </p>
        <p className="text-sm text-gray-500">Your current role: {userRole || 'none'}</p>
        <p className="mt-2 text-sm text-gray-500">
          Please contact an administrator if you believe this is an error.
        </p>
        <button
          className="mt-4 rounded bg-primary px-4 py-2 text-white hover:bg-primary-dark"
          onClick={() => router.push('/')}
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  const handleReviewClick = (service: Service) => {
    setSelectedService(service);
    setSelectedStatus(service.service_status);
  };

  const handleStatusUpdate = () => {
    // Implementation of status update logic
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Halal Reviewer Dashboard</h1>

      {error && <div className="mb-6 rounded-md bg-red-50 p-4 text-red-600">{error}</div>}

      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        <div className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Services Pending Review</h2>

          {pendingServices.length === 0 ? (
            <p className="text-gray-500">No services are pending review at this time.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      scope="col"
                    >
                      Service Name
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      scope="col"
                    >
                      Category
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      scope="col"
                    >
                      Status
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      scope="col"
                    >
                      Submitted By
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      scope="col"
                    >
                      Date Submitted
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
                      scope="col"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {pendingServices.map((service) => {
                    // Handle cases where users might be an array or single object
                    const users = Array.isArray(service.users) ? service.users[0] : service.users;
                    const categories = Array.isArray(service.categories)
                      ? service.categories[0]
                      : service.categories;

                    const ownerEmail = users?.email || 'Unknown';
                    const categoryName = categories?.name || 'Unknown';
                    return (
                      <tr key={service.service_id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {service.service_name}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm text-gray-500">{categoryName}</div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              service.service_status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {service.service_status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm text-gray-500">{ownerEmail}</div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm text-gray-500">
                            {new Date(service.created_at || '').toLocaleDateString()}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <Button variant="primary" onClick={() => handleReviewClick(service)}>
                            Review
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedService && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Review Service</h2>

          {/* Review service form content */}

          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setSelectedService(null)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedStatus || selectedStatus === selectedService.service_status}
              variant="primary"
              onClick={() => handleStatusUpdate()}
            >
              Update Status
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Review Dashboard</h1>
          <Button variant="outline">
            <Link href="/review/souks">View All Services</Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.pendingReviews}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.approvedSouks}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.rejectedSouks}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalSouks}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
