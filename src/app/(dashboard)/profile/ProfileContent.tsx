'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { User, LogOut, Loader2 } from 'lucide-react';

import { FilledButton } from '@/components/ui/button/filled';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card/card';
import { Input } from '@/components/ui/input/input';
import { Label } from '@/components/ui/label/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/features/auth/context/AuthContext';
import { createServerClient } from '@/lib/database/supabase-server';
import { Database } from '@/types/database';

type ProfileData = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
  created_at: string | null;
  role: Database['public']['Enums']['user_role'];
  about: string | null;
};

interface FormData {
  full_name: string;
  about: string;
}

export default function ProfileContent() {
  const { user, isLoading } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    about: '',
  });
  const [isActionLoading, setIsActionLoading] = useState(false);

  const supabase = createServerClient();

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user || isLoading) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Profile doesn't exist, create it
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert([{ id: user.id, email: user.email }])
              .select()
              .single();

            if (createError) throw createError;
            const sanitizedProfile = {
              ...newProfile,
              email: newProfile.email || user.email || '',
              full_name: newProfile.full_name || '',
              avatar_url: newProfile.avatar_url || '',
              updated_at: newProfile.updated_at || new Date().toISOString(),
              created_at: newProfile.created_at || new Date().toISOString(),
              role: newProfile.role || 'customer',
              about: newProfile.about || '',
            } as ProfileData;
            setProfileData(sanitizedProfile);
            setFormData({
              full_name: sanitizedProfile.full_name || '',
              about: sanitizedProfile.about || '',
            });
          } else {
            throw error;
          }
        } else {
          const sanitizedProfile = {
            ...data,
            email: data.email || user.email || '',
            full_name: data.full_name || '',
            avatar_url: data.avatar_url || '',
            updated_at: data.updated_at || new Date().toISOString(),
            created_at: data.created_at || new Date().toISOString(),
            role: data.role || 'customer',
            about: data.about || '',
          } as ProfileData;
          setProfileData(sanitizedProfile);
          setFormData({
            full_name: sanitizedProfile.full_name || '',
            about: sanitizedProfile.about || '',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setUpdateMessage({
          text: 'Failed to load profile data. Please try again.',
          type: 'error',
        });
      }
    };

    fetchProfileData();
  }, [user, isLoading, supabase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          about: formData.about || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      const sanitizedData: ProfileData = {
        ...data,
        id: data.id,
        email: data.email || null,
        full_name: data.full_name || null,
        avatar_url: data.avatar_url || null,
        updated_at: data.updated_at || null,
        created_at: data.created_at || null,
        role: data.role,
        about: data.about || null,
      };

      setUpdateMessage({
        text: 'Profile updated successfully!',
        type: 'success',
      });

      // Refresh profile data
      setProfileData(sanitizedData);
    } catch (error) {
      console.error('Error updating profile:', error);
      setUpdateMessage({
        text: 'Error updating profile. Please try again.',
        type: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const updateRole = async (role: Database['public']['Enums']['user_role']) => {
    if (!profileData) return;
    setIsActionLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', profileData.id);
      if (error) throw error;
      setProfileData({ ...profileData, role });
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <User className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Please sign in</h2>
        <p className="text-center text-muted-foreground">
          You need to be signed in to view your profile.
        </p>
        <FilledButton variant="primary">
          <Link href="/auth/signin">Sign In</Link>
        </FilledButton>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                {profileData?.avatar_url ? (
                  <Image
                    alt="Profile"
                    className="h-full w-full rounded-full object-cover"
                    height={64}
                    src={profileData.avatar_url}
                    width={64}
                  />
                ) : (
                  <User className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div>
                <CardTitle>{profileData?.full_name || 'Your Profile'}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {updateMessage && (
              <div
                className={`mb-4 rounded-md p-3 ${
                  updateMessage.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {updateMessage.text}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  placeholder="Enter your full name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="about">About</Label>
                <textarea
                  className="min-h-[100px] w-full rounded-md border p-2"
                  id="about"
                  name="about"
                  placeholder="Tell us about yourself"
                  value={formData.about}
                  onChange={handleInputChange}
                />
              </div>

              <div className="flex justify-between pt-4">
                <FilledButton
                  className="flex items-center gap-2"
                  disabled={isUpdating}
                  type="submit"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Profile'
                  )}
                </FilledButton>

                <FilledButton
                  className="flex items-center gap-2"
                  type="button"
                  variant="outline"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </FilledButton>
              </div>
            </form>

            <div className="mt-8 border-t pt-4">
              <h3 className="mb-2 font-medium">Account Information</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium">Role:</span> {profileData?.role || 'Not set'}
                </p>
                <p>
                  <span className="font-medium">Member since:</span>{' '}
                  {new Date(profileData?.created_at || '').toLocaleDateString()}
                </p>
                <p>
                  <span className="font-medium">Last updated:</span>{' '}
                  {profileData?.updated_at
                    ? new Date(profileData.updated_at).toLocaleString()
                    : 'Never'}
                </p>
              </div>
            </div>

            <div>
              <Label>Email</Label>
              <Input readOnly value={user.email || ''} />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                disabled={isActionLoading}
                value={profileData?.role}
                onValueChange={(value: Database['public']['Enums']['user_role']) =>
                  updateRole(value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="souk_owner">Souk Owner</SelectItem>
                  <SelectItem value="halal_reviewer">Halal Reviewer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Created At</Label>
              <Input readOnly value={profileData?.created_at || ''} />
            </div>
            <div>
              <Label>Updated At</Label>
              <Input readOnly value={profileData?.updated_at || ''} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
