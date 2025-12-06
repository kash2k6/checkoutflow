-- Allow initial_product_plan_id to be NULL (flows can be created without it initially)
ALTER TABLE company_flows 
ALTER COLUMN initial_product_plan_id DROP NOT NULL;

