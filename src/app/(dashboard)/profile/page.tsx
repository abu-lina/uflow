'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { Loader2, LogOut, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/context/AuthContext';
import { supabase } from '@/lib/supabase/client';

interface ProfileData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'customer' | 'business_owner' | 'halal_reviewer' | 'admin' | null;
  phone: string | null;
  bio: string | null;
  updated_at: string | null;
  created_at: string;
}

export default function UserPage() {
  const { user, isLoading } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    bio: '',
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;

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
              .insert([
                {
                  id: user.id,
                  email: user.email,
                  full_name: user.user_metadata?.full_name || null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ])
              .select()
              .single();

            if (createError) throw createError;
            setProfileData(newProfile);
            setFormData({
              full_name: newProfile.full_name || '',
              phone: newProfile.phone || '',
              bio: newProfile.bio || '',
            });
          } else {
            throw error;
          }
        } else {
          setProfileData(data);
          setFormData({
            full_name: data.full_name || '',
            phone: data.phone || '',
            bio: data.bio || '',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setUpdateMessage({
          text: 'Error loading profile data',
          type: 'error',
        });
      }
    };

    fetchProfileData();
  }, [user]);

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
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          phone: formData.phone || null,
          bio: formData.bio || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setUpdateMessage({
        text: 'Profile updated successfully!',
        type: 'success',
      });

      // Refresh profile data
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();

      setProfileData(data);
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

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Not Logged In</CardTitle>
            <CardDescription>Please log in to view your profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
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
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  className="min-h-[100px] w-full rounded-md border p-2"
                  id="bio"
                  name="bio"
                  placeholder="Tell us about yourself"
                  value={formData.bio}
                  onChange={handleInputChange}
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button className="flex items-center gap-2" disabled={isUpdating} type="submit">
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Profile'
                  )}
                </Button>

                <Button
                  className="flex items-center gap-2"
                  type="button"
                  variant="outline"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
