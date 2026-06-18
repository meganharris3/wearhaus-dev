-- Seed data for Wearhaus
-- Run after 001_initial_schema.sql
-- Note: seed users bypass the handle_new_user trigger; rows are inserted directly.
-- In production, real users are created via Supabase Auth signup.

-- users (3 seed users)
insert into public.users (id, email, display_name, avatar_url, university, bio, items_listed, rentals_completed, rating)
values
  ('a1000000-0000-0000-0000-000000000001', 'maya@nyu.edu',    'Maya Chen',    'https://i.pravatar.cc/150?u=maya',   'NYU',       'Fashion lover. Renting out my barely-worn event pieces.', 4, 12, 4.9),
  ('a1000000-0000-0000-0000-000000000002', 'jordan@columbia.edu', 'Jordan Reyes', 'https://i.pravatar.cc/150?u=jordan', 'Columbia',  'Sustainable fashion advocate.',                           3, 7,  4.7),
  ('a1000000-0000-0000-0000-000000000003', 'priya@stern.nyu.edu', 'Priya Patel',  'https://i.pravatar.cc/150?u=priya',  'NYU Stern', 'Love dressing up for formals and galas.',                 1, 3,  5.0);

-- hauses (2 seed hauses)
insert into public.hauses (id, name, description, member_count, piece_count)
values
  ('b2000000-0000-0000-0000-000000000001', 'NYU Village Collective', 'Lower Manhattan students sharing formal and festival wear.', 2, 5),
  ('b2000000-0000-0000-0000-000000000002', 'Uptown Closet',          'Columbia and Barnard students for uptown events.',          1, 3);

-- memberships (3 seed memberships)
insert into public.haus_memberships (user_id, haus_id, role)
values
  ('a1000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'admin'),
  ('a1000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000001', 'member'),
  ('a1000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', 'admin');

-- items (8 seed items, prices in cents)
insert into public.items (id, owner_id, name, description, photo_url, category, size_label, price_per_day, price_per_week, status, location_label)
values
  (
    'c3000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'Silk Slip Dress',
    'Ivory silk bias-cut slip dress, worn once to a gala.',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    'dress', 'S', 800, 3500, 'available', '0.3 mi · NYU'
  ),
  (
    'c3000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001',
    'Black Blazer',
    'Structured black blazer, perfect for recruiting events.',
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400',
    'jacket', 'M', 500, 2000, 'lent', '0.3 mi · NYU'
  ),
  (
    'c3000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000001',
    'Festival Cowboy Boots',
    'Brown leather boots, fits true to size.',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    'shoes', 'US 8', 600, 2500, 'available', '0.3 mi · NYU'
  ),
  (
    'c3000000-0000-0000-0000-000000000004',
    'a1000000-0000-0000-0000-000000000001',
    'Sequin Mini Skirt',
    'Gold sequin mini, great for date nights and formals.',
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400',
    'skirt', 'XS', 700, 2800, 'wash', '0.3 mi · NYU'
  ),
  (
    'c3000000-0000-0000-0000-000000000005',
    'a1000000-0000-0000-0000-000000000002',
    'Velvet Blazer',
    'Deep burgundy velvet blazer. Size runs slightly large.',
    'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400',
    'jacket', 'M', 900, 3800, 'available', '1.2 mi · Columbia'
  ),
  (
    'c3000000-0000-0000-0000-000000000006',
    'a1000000-0000-0000-0000-000000000002',
    'Wrap Midi Dress',
    'Floral wrap midi — perfect for spring formals.',
    'https://images.unsplash.com/photo-1485231183945-fffde7cc051e?w=400',
    'dress', 'S', 650, 2600, 'available', '1.2 mi · Columbia'
  ),
  (
    'c3000000-0000-0000-0000-000000000007',
    'a1000000-0000-0000-0000-000000000002',
    'Strappy Heels',
    'Nude strappy heels. Heel is 3.5 inches.',
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400',
    'shoes', 'US 7', 400, 1500, 'lent', '1.2 mi · Columbia'
  ),
  (
    'c3000000-0000-0000-0000-000000000008',
    'a1000000-0000-0000-0000-000000000003',
    'Emerald Gown',
    'Floor-length emerald green gown. Perfect for formal galas.',
    'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400',
    'dress', 'XS', 1200, 5000, 'available', '0.5 mi · NYU Stern'
  );
