-- Fix script for qaasimqayum@gmail.com
-- This will create a proper confirmation token for the user
-- Run this in Supabase SQL Editor

-- First, check if user exists
DO $$
DECLARE
    user_id_val UUID;
    token_val TEXT;
    confirmation_url TEXT;
BEGIN
    -- Get user ID
    SELECT id INTO user_id_val 
    FROM auth.users 
    WHERE email = 'qaasimqayum@gmail.com';
    
    IF user_id_val IS NULL THEN
        RAISE NOTICE 'User qaasimqayum@gmail.com not found in auth.users';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found user with ID: %', user_id_val;
    
    -- Generate a new token (64 character hex string)
    token_val := encode(gen_random_bytes(32), 'hex');
    
    -- Insert token into email_confirmation_tokens table
    INSERT INTO public.email_confirmation_tokens (
        user_id,
        email,
        token,
        type,
        expires_at,
        used,
        created_at,
        updated_at
    ) VALUES (
        user_id_val,
        'qaasimqayum@gmail.com',
        token_val,
        'signup',
        NOW() + INTERVAL '24 hours',
        false,
        NOW(),
        NOW()
    );
    
    -- Create the confirmation URL
    confirmation_url := 'https://ummahflow.com/auth/confirm?token=' || token_val || '&email=qaasimqayum%40gmail.com';
    
    RAISE NOTICE 'Created token: %', token_val;
    RAISE NOTICE 'Confirmation URL: %', confirmation_url;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error: %', SQLERRM;
END $$;
