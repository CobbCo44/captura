-- Consolidate all brands under james@cobbcohunters.com
-- Transfers brands from cobber111@gmail.com and apply@cobbcohunters.com

DO $$
DECLARE
  main_user_id UUID;
BEGIN
  -- Get the main user
  SELECT id INTO main_user_id FROM auth.users WHERE email = 'james@cobbcohunters.com';

  IF main_user_id IS NULL THEN
    RAISE EXCEPTION 'Main user james@cobbcohunters.com not found';
  END IF;

  -- Transfer brands from the other two accounts
  UPDATE brands
  SET user_id = main_user_id
  WHERE user_id IN (
    SELECT id FROM auth.users WHERE email IN ('cobber111@gmail.com', 'apply@cobbcohunters.com')
  );

  RAISE NOTICE 'All brands transferred to james@cobbcohunters.com (%)' , main_user_id;
END $$;
