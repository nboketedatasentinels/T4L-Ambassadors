-- ============================================
-- Impact Log v3 - ESG Taxonomy & Benchmark Rates
-- ============================================
-- Seeds the rate_configuration table with the full
-- Environmental / Social / Governance activity list
-- and benchmark USD rates from the spec.
--
-- Safe to run multiple times (ON CONFLICT DO UPDATE keeps names/rates fresh).

-- Helper: upsert a single ESG rate row
-- We key by activity_key (lowercase snake_case identifier).

INSERT INTO rate_configuration (
  activity_key,
  esg_category,
  activity_label,
  description,
  impact_unit,
  unit_rate_usd,
  rate_source,
  volunteer_hour_rate,
  effective_date,
  sasb_topic,
  is_active,
  sort_order
) VALUES

-- ========== ENVIRONMENTAL ==========
(
  'env_tree_planting',
  'environmental',
  'Tree Planting',
  'Number of trees planted or restored as part of environmental projects.',
  'Trees planted',
  5.00,
  'One Tree Planted / Eden Reforestation Projects – average cost per tree planted in sub-Saharan Africa.',
  33.49,
  DATE '2026-01-01',
  'Ecological Impacts',
  TRUE,
  10
),
(
  'env_cleanup_drive',
  'environmental',
  'Clean-up Drive',
  'Kilograms of waste collected through clean-up activities.',
  'Kg waste collected',
  2.50,
  'Municipal waste collection cost estimates for emerging markets.',
  33.49,
  DATE '2026-01-01',
  'Waste & Hazardous Materials',
  TRUE,
  20
),
(
  'env_carbon_reduction',
  'environmental',
  'Carbon Reduction',
  'Tonnes of CO2 emissions avoided.',
  'Tonnes CO2 avoided',
  50.00,
  'US EPA Interagency Working Group – Social cost of carbon (2024 central estimate).',
  33.49,
  DATE '2026-01-01',
  'GHG Emissions',
  TRUE,
  30
),
(
  'env_water_conservation',
  'environmental',
  'Water Conservation',
  'Litres of water saved through conservation interventions.',
  'Litres saved',
  0.005,
  'World Bank WASH sector data – cost of treated water delivery in developing regions.',
  33.49,
  DATE '2026-01-01',
  'Water & Wastewater Mgmt',
  TRUE,
  40
),
(
  'env_renewable_energy',
  'environmental',
  'Renewable Energy',
  'Kilowatt-hours of renewable energy generated.',
  'kWh generated',
  0.10,
  'IRENA – global average levelised cost of solar PV (2024).',
  33.49,
  DATE '2026-01-01',
  'Energy Management',
  TRUE,
  50
),

-- ========== SOCIAL ==========
(
  'soc_training_workshop',
  'social',
  'Training / Workshop',
  'People trained through workshops, trainings, or learning sessions.',
  'People trained',
  150.00,
  'ATD State of the Industry Report (2024) – average per-employee training expenditure.',
  33.49,
  DATE '2026-01-01',
  'Human Capital Development',
  TRUE,
  110
),
(
  'soc_mentorship',
  'social',
  'Mentorship',
  'People receiving structured mentorship.',
  'People mentored',
  500.00,
  'MENTOR: The National Mentoring Partnership – cost-benefit analysis of mentorship programmes.',
  33.49,
  DATE '2026-01-01',
  'Human Capital Development',
  TRUE,
  120
),
(
  'soc_community_engagement',
  'social',
  'Community Engagement',
  'People reached through community engagement activities.',
  'People reached',
  25.00,
  'NGO programme budget benchmarks for community-level engagement cost per beneficiary.',
  33.49,
  DATE '2026-01-01',
  'Community Relations',
  TRUE,
  130
),
(
  'soc_health_initiative',
  'social',
  'Health Initiative',
  'People served through health-related initiatives or screenings.',
  'People served',
  75.00,
  'WHO CHOICE database – community-level primary health service delivery costs.',
  33.49,
  DATE '2026-01-01',
  'Access & Affordability',
  TRUE,
  140
),
(
  'soc_education_access',
  'social',
  'Education Access',
  'Learners supported through education access programmes.',
  'Learners supported',
  100.00,
  'UNESCO Global Education Monitoring Report – per-learner cost estimates for non-formal education.',
  33.49,
  DATE '2026-01-01',
  'Human Capital Development',
  TRUE,
  150
),
(
  'soc_job_creation',
  'social',
  'Job Creation / Placement',
  'Jobs created or job placements secured.',
  'Jobs created',
  2000.00,
  'ILO employment programme evaluation data for job creation schemes.',
  33.49,
  DATE '2026-01-01',
  'Labour Practices',
  TRUE,
  160
),
(
  'soc_volunteering',
  'social',
  'Volunteering',
  'Volunteer hours contributed to community or social good.',
  'Volunteer hours',
  0.00, -- USD comes entirely from volunteer_hour_rate for this activity
  'Independent Sector – Value of Volunteer Time (2024).',
  33.49,
  DATE '2026-01-01',
  'Community Relations',
  TRUE,
  170
),

-- ========== GOVERNANCE ==========
(
  'gov_policy_development',
  'governance',
  'Policy Development',
  'Number of governance or compliance policies developed.',
  'Policies created',
  3000.00,
  'Governance consulting fee benchmarks for policy development.',
  33.49,
  DATE '2026-01-01',
  'Business Ethics',
  TRUE,
  210
),
(
  'gov_compliance_training',
  'governance',
  'Compliance Training',
  'People trained on compliance, ethics, or legal topics.',
  'People trained',
  200.00,
  'Society for Corporate Compliance and Ethics – per-person compliance training benchmarks.',
  33.49,
  DATE '2026-01-01',
  'Business Ethics',
  TRUE,
  220
),
(
  'gov_board_advisory',
  'governance',
  'Board Advisory',
  'Organisations advised at board / governance level.',
  'Orgs advised',
  5000.00,
  'BoardSource advisory fee benchmarks adjusted for non-profit context.',
  33.49,
  DATE '2026-01-01',
  'Mgmt of Legal & Regulatory',
  TRUE,
  230
),
(
  'gov_digital_transformation',
  'governance',
  'Digital Transformation',
  'Organisations transformed through digital transformation programmes.',
  'Orgs transformed',
  10000.00,
  'Strategic consulting rate proxies, discounted for T4L development context.',
  33.49,
  DATE '2026-01-01',
  'Systemic Risk Mgmt',
  TRUE,
  240
),
(
  'gov_transparency_initiative',
  'governance',
  'Transparency Initiative',
  'Sustainability or transparency reports published.',
  'Reports published',
  2500.00,
  'GRI SME sustainability reporting cost estimates.',
  33.49,
  DATE '2026-01-01',
  'Business Ethics',
  TRUE,
  250
)
ON CONFLICT (activity_key) DO UPDATE
SET
  esg_category        = EXCLUDED.esg_category,
  activity_label      = EXCLUDED.activity_label,
  description         = EXCLUDED.description,
  impact_unit         = EXCLUDED.impact_unit,
  unit_rate_usd       = EXCLUDED.unit_rate_usd,
  rate_source         = EXCLUDED.rate_source,
  volunteer_hour_rate = EXCLUDED.volunteer_hour_rate,
  effective_date      = EXCLUDED.effective_date,
  sasb_topic          = EXCLUDED.sasb_topic,
  is_active           = EXCLUDED.is_active,
  sort_order          = EXCLUDED.sort_order,
  updated_at          = CURRENT_TIMESTAMP;

