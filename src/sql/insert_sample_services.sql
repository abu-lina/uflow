-- Insert sample services data for testing
-- Run this script in Supabase SQL Editor to populate your database with test data

-- Make sure to select a valid user ID from your database
-- Replace the user_id values with actual IDs from your auth.users table
-- You can get a list of user IDs with: SELECT id FROM auth.users;

-- For this example, we'll use a placeholder user ID
-- Replace '00000000-0000-0000-0000-000000000000' with a real user ID
DO $$
DECLARE
  user_id UUID;
BEGIN
  -- Get the first user from the auth.users table
  SELECT id INTO user_id FROM auth.users LIMIT 1;
  
  -- If no user exists, use a placeholder (this won't work properly but prevents script failure)
  IF user_id IS NULL THEN
    user_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- Insert sample services in different categories
  
  -- Islamic Education Services
  INSERT INTO services (provider_id, title, description, category, image_urls, price, location, status)
  VALUES
    (user_id, 'Quran Lessons for Children', 'Professional Quran teaching with tajweed for children ages 5-12. Individual and group sessions available.', 'Education', ARRAY['https://images.unsplash.com/photo-1609599006353-e629aaabeb37?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cXVyYW58ZW58MHx8MHx8&ixlib=rb-1.2.1&w=1000&q=80'], 25.00, 'Online', 'active'),
    (user_id, 'Arabic Language Course', 'Learn conversational Arabic with focus on pronunciation and everyday phrases. All levels welcome.', 'Education', ARRAY['https://images.unsplash.com/photo-1581693363879-35718a7bcd5d?ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8YXJhYmljfGVufDB8fDB8fA%3D%3D&ixlib=rb-1.2.1&w=1000&q=80'], 150.00, 'Online', 'active'),
    (user_id, 'Islamic Studies Classes', 'Comprehensive Islamic studies program covering fiqh, hadith, and seerah. Weekly classes for adults.', 'Education', ARRAY['https://images.unsplash.com/photo-1585036156281-b5f8b2df08e9?ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8bW9zcXVlfGVufDB8fDB8fA%3D%3D&ixlib=rb-1.2.1&w=1000&q=80'], 75.00, 'Birmingham', 'active');

  -- Food Services
  INSERT INTO services (provider_id, title, description, category, image_urls, price, location, status)
  VALUES
    (user_id, 'Halal Catering Service', 'Full-service halal catering for weddings, corporate events, and family gatherings. Custom menus available.', 'Food', ARRAY['https://images.unsplash.com/photo-1555244162-803834f70033?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8Y2F0ZXJpbmd8ZW58MHx8MHx8&ixlib=rb-1.2.1&w=1000&q=80'], 500.00, 'London', 'active'),
    (user_id, 'Home-Made Biryani Delivery', 'Authentic Pakistani-style biryani made with premium halal meat. Available for delivery within 10 miles.', 'Food', ARRAY['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8YmlyeWFuaXxlbnwwfHwwfHw%3D&ixlib=rb-1.2.1&w=1000&q=80'], 35.00, 'Manchester', 'active'),
    (user_id, 'Ramadan Iftar Boxes', 'Nutritious and delicious iftar boxes delivered to your door during Ramadan. Pre-order available.', 'Food', ARRAY['https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8ZGF0ZXN8ZW58MHx8MHx8&ixlib=rb-1.2.1&w=1000&q=80'], 15.00, 'Birmingham', 'active');

  -- Health & Wellness
  INSERT INTO services (provider_id, title, description, category, image_urls, price, location, status)
  VALUES
    (user_id, 'Islamic Counseling', 'Faith-based counseling services for individuals and couples. Addressing mental health from an Islamic perspective.', 'Health', ARRAY['https://images.unsplash.com/photo-1573497161161-c3e73707e25c?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8Y291bnNlbGluZ3xlbnwwfHwwfHw%3D&ixlib=rb-1.2.1&w=1000&q=80'], 80.00, 'Online', 'active'),
    (user_id, 'Hijama (Cupping) Therapy', 'Traditional Islamic cupping therapy performed by certified practitioners. Helps with pain and circulation.', 'Health', ARRAY['https://images.unsplash.com/photo-1512675828443-4f454c42253a?ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8Y3VwcGluZ3xlbnwwfHwwfHw%3D&ixlib=rb-1.2.1&w=1000&q=80'], 65.00, 'Leeds', 'active'),
    (user_id, 'Halal Fitness Training', 'Women-only fitness classes with female trainers in a private environment. All fitness levels welcome.', 'Health', ARRAY['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8d29tZW4lMjBmaXRuZXNzfGVufDB8fDB8fA%3D%3D&ixlib=rb-1.2.1&w=1000&q=80'], 40.00, 'London', 'active');

  -- Fashion & Clothing
  INSERT INTO services (provider_id, title, description, category, image_urls, price, location, status)
  VALUES
    (user_id, 'Custom Modest Fashion Design', 'Bespoke modest fashion design service. Custom abayas, jilbabs, and occasion wear tailored to your preferences.', 'Fashion', ARRAY['https://images.unsplash.com/photo-1558769132-cb1aea458c5e?ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8YWJheWF8ZW58MHx8MHx8&ixlib=rb-1.2.1&w=1000&q=80'], 200.00, 'London', 'active'),
    (user_id, 'Handmade Prayer Garments', 'Handcrafted premium prayer dresses and garments. Comfortable materials and beautiful designs.', 'Fashion', ARRAY['https://images.unsplash.com/photo-1513694203232-719a280e022f?ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8aGFuZG1hZGUlMjBjbG90aGVzfGVufDB8fDB8fA%3D%3D&ixlib=rb-1.2.1&w=1000&q=80'], 85.00, 'Birmingham', 'active'),
    (user_id, 'Modest Styling Consultation', 'Personal styling service for modest fashion. Wardrobe assessment and shopping assistance available.', 'Fashion', ARRAY['https://images.unsplash.com/photo-1483985988355-763728e1935b?ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8ZmFzaGlvbnxlbnwwfHwwfHw%3D&ixlib=rb-1.2.1&w=1000&q=80'], 120.00, 'Online', 'active');

END $$; 