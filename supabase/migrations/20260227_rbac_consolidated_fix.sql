-- Consolidated RBAC fix - removes vehicle_movements and sets up RLS policies cleanly

DROP TABLE IF EXISTS vehicle_movements CASCADE;

-- Create RLS policies for professional_profiles
CREATE POLICY "Public can view published profiles"
  ON professional_profiles
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "Users can manage own professional profile"
  ON professional_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON professional_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

-- Create RLS policies for subscription_plans
CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
  ON subscription_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

-- Create RLS policies for role_permissions
CREATE POLICY "Anyone can view role permissions"
  ON role_permissions
  FOR SELECT
  USING (true);
